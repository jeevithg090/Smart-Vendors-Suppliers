import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface FSSAIVerificationProps {
  supplierId: Id<"suppliers">;
  onVerificationComplete?: (status: string) => void;
}

export default function FSSAIVerification({ supplierId, onVerificationComplete }: FSSAIVerificationProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verifyFSSAI = useMutation(api.fssaiVerification.verifyFSSAICertificate);
  const verificationStatus = useQuery(api.fssaiVerification.getFSSAIVerificationStatus, { supplierId });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Convert file to base64
      const base64Data = await fileToBase64(selectedFile);

      // Call verification mutation
      const result = await verifyFSSAI({
        supplierId,
        imageUrl: '', // We'll use base64 data instead
        imageData: base64Data
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        alert(result.message);
        onVerificationComplete?.(result.status);
      } else {
        alert(`Verification failed: ${result.error}`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'expired': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'invalid': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'rejected':
      case 'invalid':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'expired':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          FSSAI Certificate Verification
        </h3>
        <p className="text-sm text-gray-600">
          Upload your FSSAI certificate for verification. We'll use AI to extract and validate the information.
        </p>
      </div>

      {/* Current Status */}
      {verificationStatus && (
        <div className="mb-6">
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${getStatusColor(verificationStatus.status)}`}>
            {getStatusIcon(verificationStatus.status)}
            <div>
              <h4 className="font-medium capitalize">
                Status: {verificationStatus.status}
              </h4>
              {verificationStatus.licenseNumber && (
                <p className="text-sm">License: {verificationStatus.licenseNumber}</p>
              )}
              {verificationStatus.verificationDate && (
                <p className="text-sm">
                  Verified: {new Date(verificationStatus.verificationDate).toLocaleDateString()}
                </p>
              )}
              {verificationStatus.error && (
                <p className="text-sm font-medium">Error: {verificationStatus.error}</p>
              )}
            </div>
          </div>

          {/* Certificate Details */}
          {verificationStatus.certificateData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">Certificate Details</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Business Name:</span>
                  <p className="text-gray-600">{verificationStatus.certificateData.businessName}</p>
                </div>
                <div>
                  <span className="font-medium">Owner Name:</span>
                  <p className="text-gray-600">{verificationStatus.certificateData.ownerName}</p>
                </div>
                <div>
                  <span className="font-medium">License Number:</span>
                  <p className="text-gray-600">{verificationStatus.certificateData.licenseNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <p className="text-gray-600">{verificationStatus.certificateData.category}</p>
                </div>
                <div>
                  <span className="font-medium">Validity Date:</span>
                  <p className="text-gray-600">{verificationStatus.certificateData.validityDate}</p>
                </div>
                <div>
                  <span className="font-medium">Confidence:</span>
                  <p className="text-gray-600">{(verificationStatus.certificateData.confidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!imagePreview ? (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Select Certificate Image
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              PNG, JPG, JPEG up to 5MB
            </p>
          </div>
        ) : (
          <div>
            <img
              src={imagePreview}
              alt="Certificate preview"
              className="mx-auto max-h-48 rounded-lg shadow-sm"
            />
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                Selected: {selectedFile?.name}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isUploading ? 'Verifying...' : 'Verify Certificate'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Change Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Processing certificate... {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Verification Process</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• We use OCR technology to extract text from your certificate</li>
          <li>• AI analyzes the extracted information for accuracy</li>
          <li>• We validate the FSSAI license number format</li>
          <li>• We verify business details match your profile</li>
          <li>• We check certificate validity dates</li>
        </ul>
      </div>
    </div>
  );
} 