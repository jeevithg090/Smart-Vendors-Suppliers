import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface FSSAIVerificationProps {
  supplierId: Id<"suppliers">;
  onVerificationComplete?: (status: string) => void;
}

export default function FSSAIVerification({ supplierId, onVerificationComplete }: FSSAIVerificationProps) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState('');

  const verifyFSSAI = useMutation(api.suppliers.verifyFSSAILicense);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseNumber || licenseNumber.length !== 14) {
      setError('Please enter a valid 14-digit FSSAI license number');
      return;
    }

    setIsVerifying(true);
    setError('');
    setVerificationResult(null);

    try {
      // For demo purposes, we'll simulate FSSAI verification
      // In a real implementation, this would call the actual FSSAI API
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      // Mock verification result
      const mockResult = {
        isValid: licenseNumber.startsWith('1') || licenseNumber.startsWith('2'), // Simple validation for demo
        licenseNumber,
        businessName: 'Demo Business Name',
        ownerName: 'Demo Owner',
        address: 'Demo Address, City, State',
        validityDate: '2025-12-31',
        category: 'Food Business Operator',
        confidence: 0.95
      };

      if (mockResult.isValid) {
        // Update supplier with FSSAI verification
        await verifyFSSAI({
          supplierId,
          licenseNumber,
          verificationData: mockResult
        });
        
        setVerificationResult(mockResult);
        onVerificationComplete?.('verified');
      } else {
        setError('Invalid FSSAI license number. Please check and try again.');
        onVerificationComplete?.('invalid');
      }
    } catch (err) {
      console.error('FSSAI verification error:', err);
      setError('Verification failed. Please try again later.');
      onVerificationComplete?.('error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">FSSAI License Verification</h3>
          <p className="text-sm text-gray-600">Verify your FSSAI license to build trust with vendors</p>
        </div>
      </div>

      {!verificationResult ? (
        <form onSubmit={handleVerification} className="space-y-4">
          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
              FSSAI License Number
            </label>
            <input
              type="text"
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="Enter 14-digit FSSAI license number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              maxLength={14}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: 12345678901234 (14 digits)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || licenseNumber.length !== 14}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isVerifying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </>
            ) : (
              'Verify FSSAI License'
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">FSSAI License Verified Successfully!</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">License Number:</span>
                <div className="font-medium text-gray-900">{verificationResult.licenseNumber}</div>
              </div>
              <div>
                <span className="text-gray-600">Business Name:</span>
                <div className="font-medium text-gray-900">{verificationResult.businessName}</div>
              </div>
              <div>
                <span className="text-gray-600">Owner Name:</span>
                <div className="font-medium text-gray-900">{verificationResult.ownerName}</div>
              </div>
              <div>
                <span className="text-gray-600">Valid Until:</span>
                <div className="font-medium text-gray-900">{verificationResult.validityDate}</div>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-600">Address:</span>
                <div className="font-medium text-gray-900">{verificationResult.address}</div>
              </div>
              <div>
                <span className="text-gray-600">Category:</span>
                <div className="font-medium text-gray-900">{verificationResult.category}</div>
              </div>
              <div>
                <span className="text-gray-600">Verification Confidence:</span>
                <div className="font-medium text-gray-900">{Math.round(verificationResult.confidence * 100)}%</div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setVerificationResult(null);
                setLicenseNumber('');
                setError('');
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Verify Another License
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Print Certificate
            </button>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Why verify your FSSAI license?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Increases your trust score and credibility</li>
          <li>• Helps vendors find you more easily</li>
          <li>• Required for food business operations in India</li>
          <li>• Builds confidence with potential customers</li>
        </ul>
      </div>
    </div>
  );
}