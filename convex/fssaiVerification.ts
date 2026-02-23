import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// FSSAI Verification Status
export type FSSAIVerificationStatus = 
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "invalid";

// FSSAI Certificate Data
export interface FSSAICertificateData {
  licenseNumber: string;
  businessName: string;
  ownerName: string;
  address: string;
  validityDate: string;
  category: string;
  confidence: number;
}

// Verify FSSAI certificate using OCR Space API
export const verifyFSSAICertificate = mutation({
  args: {
    supplierId: v.id("suppliers"),
    imageUrl: v.string(),
    imageData: v.optional(v.string()), // Base64 encoded image
  },
  handler: async (ctx, args) => {
    try {
      // Get supplier details
      const supplier = await ctx.db.get(args.supplierId);
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      // Step 1: Extract text using OCR Space API
      const ocrResult = await extractTextFromImage(args.imageUrl, args.imageData);
      
      if (!ocrResult.success) {
        throw new Error(`OCR failed: ${ocrResult.error}`);
      }

      // Step 2: Analyze extracted text using OpenRouter AI
      const aiAnalysis = await analyzeFSSAICertificate(ocrResult.text!, supplier);
      
      // Step 3: Validate FSSAI license number format
      const licenseValidation = validateFSSAILicense(aiAnalysis.licenseNumber);
      
      // Step 4: Determine verification status
      const verificationStatus = determineVerificationStatus(
        aiAnalysis,
        licenseValidation,
        supplier
      );

      // Step 5: Update supplier record
      const updateData: any = {
        fssaiVerificationStatus: verificationStatus,
        fssaiVerificationDate: Date.now(),
        fssaiCertificateData: aiAnalysis,
        fssaiLicense: aiAnalysis.licenseNumber,
        fssaiCertified: verificationStatus === "verified",
      };

      if (verificationStatus === "verified") {
        updateData.isVerified = true; // Auto-verify supplier if FSSAI is valid
      }

      await ctx.db.patch(args.supplierId, updateData);

      return {
        success: true,
        status: verificationStatus,
        certificateData: aiAnalysis,
        message: getVerificationMessage(verificationStatus),
      };

    } catch (error) {
      console.error("FSSAI verification error:", error);
      
      // Update supplier with failed status
      await ctx.db.patch(args.supplierId, {
        fssaiVerificationStatus: "rejected",
        fssaiVerificationDate: Date.now(),
        fssaiVerificationError: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        status: "rejected",
        error: error instanceof Error ? error.message : "Unknown error",
      };
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

// Extract text from image using OCR Space API
async function extractTextFromImage(imageUrl: string, imageData?: string): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    
    if (imageData) {
      // Convert base64 to blob
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      formData.append('file', blob, 'certificate.jpg');
    } else {
      // Use image URL
      formData.append('url', imageUrl);
    }

    const ocrApiKey = process.env.OCR_SPACE_API_KEY;
    if (!ocrApiKey) {
      throw new Error("OCR API key not configured");
    }
    formData.append('apikey', ocrApiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', 'jpg');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // More accurate engine

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.IsErroredOnProcessing) {
      throw new Error(`OCR processing error: ${result.ErrorMessage}`);
    }

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error("No text found in the image");
    }

    const extractedText = result.ParsedResults
      .map((parsedResult: any) => parsedResult.ParsedText)
      .join('\n');

    return {
      success: true,
      text: extractedText,
    };

  } catch (error) {
    console.error("OCR extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "OCR extraction failed",
    };
  }
}

// Analyze FSSAI certificate using OpenRouter AI
async function analyzeFSSAICertificate(
  extractedText: string,
  supplier: any
): Promise<FSSAICertificateData> {
  const prompt = `Analyze the following text extracted from an FSSAI certificate and extract the key information. Return the result as a JSON object.

Extracted text:
${extractedText}

Supplier information for verification:
- Business Name: ${supplier.businessName}
- Owner Name: ${supplier.ownerName}
- Address: ${supplier.location.address}, ${supplier.location.city}, ${supplier.location.state}

Please extract and return the following information in JSON format:
{
  "licenseNumber": "14-digit FSSAI license number",
  "businessName": "Business name as shown on certificate",
  "ownerName": "Owner/Proprietor name",
  "address": "Complete address from certificate",
  "validityDate": "Validity date (YYYY-MM-DD format)",
  "category": "FSSAI category/type",
  "confidence": 0.95
}

Additional validation rules:
1. License number must be exactly 14 digits
2. Business name should match or be similar to the supplier's business name
3. Owner name should match or be similar to the supplier's owner name
4. Address should be in the same state/city as the supplier
5. Validity date should be in the future
6. Set confidence score based on how well the extracted data matches supplier information

If any information is unclear or missing, set confidence to a lower value (0.3-0.7).`;

  const models = [
    'openai/gpt-4o-mini',
    'anthropic/claude-3-haiku',
    'meta-llama/llama-3.1-8b-instruct',
    'google/gemini-flash-1.5'
  ];

  let analysis = null;
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        throw new Error("OpenRouter API key not configured");
      }
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://smart-vendors-suppliers.vercel.app',
          'X-Title': 'Smart Vendors Suppliers'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        
        // Try to parse JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
          break;
        }
      }
    } catch (error) {
      lastError = error;
      console.error(`Failed with model ${model}:`, error);
      continue;
    }
  }

  if (!analysis) {
    throw new Error(`AI analysis failed: ${lastError instanceof Error ? lastError.message : 'All models failed'}`);
  }

  return analysis;
}

// Validate FSSAI license number format
function validateFSSAILicense(licenseNumber: string): {
  isValid: boolean;
  error?: string;
} {
  // FSSAI license number should be exactly 14 digits
  const fssaiRegex = /^\d{14}$/;
  
  if (!fssaiRegex.test(licenseNumber)) {
    return {
      isValid: false,
      error: "FSSAI license number must be exactly 14 digits",
    };
  }

  // Additional validation: Check if it's a valid FSSAI format
  // FSSAI numbers typically start with specific patterns
  const validPrefixes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  if (!validPrefixes.includes(licenseNumber[0])) {
    return {
      isValid: false,
      error: "Invalid FSSAI license number format",
    };
  }

  return { isValid: true };
}

// Determine verification status based on analysis
function determineVerificationStatus(
  analysis: FSSAICertificateData,
  licenseValidation: { isValid: boolean; error?: string },
  supplier: any
): FSSAIVerificationStatus {
  // Check license format
  if (!licenseValidation.isValid) {
    return "invalid";
  }

  // Check confidence score
  if (analysis.confidence < 0.5) {
    return "rejected";
  }

  // Check business name similarity
  const businessNameSimilarity = calculateSimilarity(
    analysis.businessName.toLowerCase(),
    supplier.businessName.toLowerCase()
  );

  if (businessNameSimilarity < 0.6) {
    return "rejected";
  }

  // Check owner name similarity
  const ownerNameSimilarity = calculateSimilarity(
    analysis.ownerName.toLowerCase(),
    supplier.ownerName.toLowerCase()
  );

  if (ownerNameSimilarity < 0.6) {
    return "rejected";
  }

  // Check validity date
  const validityDate = new Date(analysis.validityDate);
  const currentDate = new Date();
  
  if (validityDate < currentDate) {
    return "expired";
  }

  // All checks passed
  return "verified";
}

// Calculate similarity between two strings (simple implementation)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Get verification message based on status
function getVerificationMessage(status: FSSAIVerificationStatus): string {
  switch (status) {
    case "verified":
      return "FSSAI certificate verified successfully!";
    case "rejected":
      return "FSSAI certificate verification failed. Please check the certificate details.";
    case "expired":
      return "FSSAI certificate has expired. Please upload a valid certificate.";
    case "invalid":
      return "Invalid FSSAI license number format. Please check the certificate.";
    case "pending":
      return "FSSAI certificate verification is pending.";
    default:
      return "Unknown verification status.";
  }
} 
