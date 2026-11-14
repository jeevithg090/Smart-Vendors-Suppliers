/**
 * Pure helpers for FSSAI certificate verification.
 */

export type FSSAIVerificationStatus = "pending" | "verified" | "rejected" | "expired" | "invalid";

export interface FSSAICertificateData {
  licenseNumber: string;
  businessName: string;
  ownerName: string;
  address: string;
  validityDate: string;
  category: string;
  confidence: number;
}

export interface SupplierIdentity {
  businessName: string;
  ownerName: string;
}

export const NAME_SIMILARITY_THRESHOLD = 0.6;
export const MIN_CONFIDENCE = 0.5;

/** FSSAI license numbers are exactly 14 digits and never start with 0. */
export function validateFSSAILicense(licenseNumber: string): { isValid: boolean; error?: string } {
  if (!/^\d{14}$/.test(licenseNumber)) {
    return { isValid: false, error: "FSSAI license number must be exactly 14 digits" };
  }
  if (licenseNumber.startsWith("0")) {
    return { isValid: false, error: "Invalid FSSAI license number format" };
  }
  return { isValid: true };
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

/** Similarity in [0, 1]; 1 means identical (case- and whitespace-insensitive). */
export function calculateSimilarity(a: string, b: string): number {
  const x = a.trim().toLowerCase().replace(/\s+/g, " ");
  const y = b.trim().toLowerCase().replace(/\s+/g, " ");
  const longest = Math.max(x.length, y.length);
  if (longest === 0) return 1;
  return (longest - levenshteinDistance(x, y)) / longest;
}

/**
 * Coerces an AI response into the strict certificate shape stored in the
 * database. Returns `null` if required fields are missing.
 */
export function normalizeCertificateData(raw: unknown): FSSAICertificateData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value));
  const licenseNumber = str(r.licenseNumber).replace(/\D/g, "");
  const businessName = str(r.businessName);
  if (!licenseNumber || !businessName) return null;
  const confidence = Number(r.confidence);
  return {
    licenseNumber,
    businessName,
    ownerName: str(r.ownerName),
    address: str(r.address),
    validityDate: str(r.validityDate),
    category: str(r.category),
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
  };
}

export function determineVerificationStatus(
  certificate: FSSAICertificateData,
  supplier: SupplierIdentity,
  now: Date = new Date(),
): FSSAIVerificationStatus {
  if (!validateFSSAILicense(certificate.licenseNumber).isValid) return "invalid";
  if (certificate.confidence < MIN_CONFIDENCE) return "rejected";
  if (calculateSimilarity(certificate.businessName, supplier.businessName) < NAME_SIMILARITY_THRESHOLD) {
    return "rejected";
  }
  if (calculateSimilarity(certificate.ownerName, supplier.ownerName) < NAME_SIMILARITY_THRESHOLD) {
    return "rejected";
  }
  const validity = new Date(certificate.validityDate);
  if (Number.isNaN(validity.getTime())) return "rejected";
  if (validity < now) return "expired";
  return "verified";
}

export function getVerificationMessage(status: FSSAIVerificationStatus): string {
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
  }
}
