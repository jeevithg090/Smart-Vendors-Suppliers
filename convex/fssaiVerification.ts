import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  determineVerificationStatus,
  getVerificationMessage,
  normalizeCertificateData,
  validateFSSAILicense,
  type FSSAICertificateData,
  type FSSAIVerificationStatus,
} from "./lib/fssai";
import { completeWithFallback, extractJson } from "./lib/openRouter";

export type { FSSAICertificateData, FSSAIVerificationStatus } from "./lib/fssai";

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

const certificateValidator = v.object({
  licenseNumber: v.string(),
  businessName: v.string(),
  ownerName: v.string(),
  address: v.string(),
  validityDate: v.string(),
  category: v.string(),
  confidence: v.number(),
});

type VerificationResult =
  | {
      success: true;
      status: FSSAIVerificationStatus;
      certificateData: FSSAICertificateData;
      message: string;
    }
  | { success: false; status: FSSAIVerificationStatus; error: string };

export const getSupplierForVerification = internalQuery({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;
    return {
      businessName: supplier.businessName,
      ownerName: supplier.ownerName,
      address: supplier.location.address,
      city: supplier.location.city,
      state: supplier.location.state,
    };
  },
});

export const recordVerification = internalMutation({
  args: {
    supplierId: v.id("suppliers"),
    status: v.string(),
    certificateData: v.optional(certificateValidator),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verified = args.status === "verified";
    await ctx.db.patch(args.supplierId, {
      fssaiVerificationStatus: args.status,
      fssaiVerificationDate: Date.now(),
      fssaiVerificationError: args.error,
      ...(args.certificateData
        ? {
            fssaiCertificateData: args.certificateData,
            fssaiLicense: args.certificateData.licenseNumber,
            fssaiCertified: verified,
          }
        : {}),
      // Auto-verify the supplier when the FSSAI certificate checks out.
      ...(verified ? { isVerified: true } : {}),
    });
  },
});

// Verify an FSSAI certificate: OCR the image, extract fields with an LLM,
// then compare them against the supplier profile.
export const verifyFSSAICertificate = action({
  args: {
    supplierId: v.id("suppliers"),
    imageUrl: v.string(),
    imageData: v.optional(v.string()), // Base64 data URL
  },
  handler: async (ctx, args): Promise<VerificationResult> => {
    try {
      const supplier = await ctx.runQuery(internal.fssaiVerification.getSupplierForVerification, {
        supplierId: args.supplierId,
      });
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const text = await extractTextFromImage(args.imageUrl, args.imageData);
      const certificateData = await analyzeFSSAICertificate(text, supplier);
      const status = validateFSSAILicense(certificateData.licenseNumber).isValid
        ? determineVerificationStatus(certificateData, supplier)
        : "invalid";

      await ctx.runMutation(internal.fssaiVerification.recordVerification, {
        supplierId: args.supplierId,
        status,
        certificateData,
      });

      return { success: true, status, certificateData, message: getVerificationMessage(status) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("FSSAI verification error:", message);
      await ctx.runMutation(internal.fssaiVerification.recordVerification, {
        supplierId: args.supplierId,
        status: "rejected",
        error: message,
      });
      return { success: false, status: "rejected", error: message };
    }
  },
});

// Get FSSAI verification status for a supplier
export const getFSSAIVerificationStatus = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;

    return {
      status: supplier.fssaiVerificationStatus || "pending",
      certificateData: supplier.fssaiCertificateData,
      verificationDate: supplier.fssaiVerificationDate,
      error: supplier.fssaiVerificationError,
      isCertified: supplier.fssaiCertified || false,
      licenseNumber: supplier.fssaiLicense,
    };
  },
});

interface OcrSpaceResponse {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: Array<{ ParsedText?: string }>;
}

async function extractTextFromImage(imageUrl: string, imageData?: string): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    throw new Error("OCR_SPACE_API_KEY is not configured on the Convex deployment");
  }

  const formData = new FormData();
  if (imageData) {
    const match = imageData.match(/^data:(image\/[a-z+.-]+);base64,/i);
    const mimeType = match?.[1] ?? "image/jpeg";
    const binary = atob(imageData.slice(match?.[0].length ?? 0));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    formData.append("file", new Blob([bytes], { type: mimeType }), "certificate");
  } else if (imageUrl) {
    formData.append("url", imageUrl);
  } else {
    throw new Error("No certificate image provided");
  }
  formData.append("apikey", apiKey);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2");

  const response = await fetch(OCR_SPACE_ENDPOINT, { method: "POST", body: formData });
  if (!response.ok) {
    throw new Error(`OCR API error: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as OcrSpaceResponse;
  if (result.IsErroredOnProcessing) {
    const detail = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join("; ") : result.ErrorMessage;
    throw new Error(`OCR processing error: ${detail ?? "unknown"}`);
  }

  const text = (result.ParsedResults ?? []).map((r) => r.ParsedText ?? "").join("\n").trim();
  if (!text) {
    throw new Error("No text found in the image");
  }
  return text;
}

async function analyzeFSSAICertificate(
  extractedText: string,
  supplier: { businessName: string; ownerName: string; address: string; city: string; state: string },
): Promise<FSSAICertificateData> {
  const prompt = `Analyze the following text extracted from an FSSAI certificate and extract the key information.

Extracted text:
${extractedText}

Supplier information for verification:
- Business Name: ${supplier.businessName}
- Owner Name: ${supplier.ownerName}
- Address: ${supplier.address}, ${supplier.city}, ${supplier.state}

Respond with only a JSON object:
{
  "licenseNumber": "14-digit FSSAI license number",
  "businessName": "Business name as shown on certificate",
  "ownerName": "Owner/Proprietor name",
  "address": "Complete address from certificate",
  "validityDate": "Validity date (YYYY-MM-DD)",
  "category": "FSSAI category/type",
  "confidence": number between 0 and 1
}

Set confidence based on how legible the certificate is and how well it matches the supplier.
If information is unclear or missing, use a confidence between 0.3 and 0.7.`;

  return completeWithFallback(prompt, (content) => normalizeCertificateData(extractJson(content, "object")), {
    temperature: 0.1,
  });
}
