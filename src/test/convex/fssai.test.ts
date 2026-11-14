import { describe, expect, it } from 'vitest';
import {
  calculateSimilarity,
  determineVerificationStatus,
  levenshteinDistance,
  normalizeCertificateData,
  validateFSSAILicense,
  type FSSAICertificateData,
} from '../../../convex/lib/fssai';

const supplier = { businessName: 'Sharma Spice Traders', ownerName: 'Ravi Sharma' };
const certificate: FSSAICertificateData = {
  licenseNumber: '12345678901234',
  businessName: 'Sharma Spice Traders',
  ownerName: 'Ravi Sharma',
  address: 'MG Road, Pune',
  validityDate: '2030-01-01',
  category: 'Trader',
  confidence: 0.9,
};
const now = new Date('2026-06-01');

describe('validateFSSAILicense', () => {
  it('accepts 14-digit numbers not starting with zero', () => {
    expect(validateFSSAILicense('12345678901234')).toEqual({ isValid: true });
  });

  it.each(['1234', '1234567890123a', '123456789012345', '02345678901234'])('rejects %s', (value) => {
    expect(validateFSSAILicense(value).isValid).toBe(false);
  });
});

describe('string similarity', () => {
  it('computes edit distance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('same', 'same')).toBe(0);
  });

  it('is case and whitespace insensitive', () => {
    expect(calculateSimilarity('  Ravi   SHARMA ', 'ravi sharma')).toBe(1);
    expect(calculateSimilarity('', '')).toBe(1);
    expect(calculateSimilarity('abc', 'xyz')).toBe(0);
  });
});

describe('determineVerificationStatus', () => {
  it('verifies a matching, valid, unexpired certificate', () => {
    expect(determineVerificationStatus(certificate, supplier, now)).toBe('verified');
  });

  it('flags invalid license numbers', () => {
    expect(determineVerificationStatus({ ...certificate, licenseNumber: '123' }, supplier, now)).toBe('invalid');
  });

  it('rejects low-confidence or mismatched certificates', () => {
    expect(determineVerificationStatus({ ...certificate, confidence: 0.2 }, supplier, now)).toBe('rejected');
    expect(determineVerificationStatus({ ...certificate, businessName: 'Gupta Dairy' }, supplier, now)).toBe(
      'rejected',
    );
    expect(determineVerificationStatus({ ...certificate, ownerName: 'Anita Iyer' }, supplier, now)).toBe('rejected');
  });

  it('rejects unparseable validity dates and marks past dates expired', () => {
    expect(determineVerificationStatus({ ...certificate, validityDate: 'unknown' }, supplier, now)).toBe('rejected');
    expect(determineVerificationStatus({ ...certificate, validityDate: '2025-12-31' }, supplier, now)).toBe('expired');
  });
});

describe('normalizeCertificateData', () => {
  it('coerces AI output into the stored shape', () => {
    expect(
      normalizeCertificateData({
        licenseNumber: '1234 5678 9012 34',
        businessName: ' Sharma Spice Traders ',
        ownerName: 'Ravi Sharma',
        validityDate: '2030-01-01',
        confidence: '1.4',
        extra: 'ignored',
      }),
    ).toEqual({
      licenseNumber: '12345678901234',
      businessName: 'Sharma Spice Traders',
      ownerName: 'Ravi Sharma',
      address: '',
      validityDate: '2030-01-01',
      category: '',
      confidence: 1,
    });
  });

  it('returns null when required fields are missing', () => {
    expect(normalizeCertificateData({ businessName: 'X' })).toBeNull();
    expect(normalizeCertificateData('nope')).toBeNull();
  });
});
