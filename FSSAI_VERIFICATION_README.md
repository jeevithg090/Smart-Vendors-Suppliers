# FSSAI Certificate Verification System

This system provides automated verification of FSSAI (Food Safety and Standards Authority of India) certificates using OCR technology and AI analysis.

## Features

- **OCR Text Extraction**: Uses OCR Space API to extract text from uploaded certificate images
- **AI Analysis**: Uses OpenRouter with multiple AI models to analyze and validate extracted information
- **License Validation**: Validates FSSAI license number format (14 digits)
- **Business Verification**: Compares certificate details with supplier profile information
- **Status Tracking**: Tracks verification status (pending, verified, rejected, expired, invalid)
- **User Interface**: Clean, intuitive UI for certificate upload and status monitoring

## API Keys Used

- **OCR Space API Key**: `K85010851588957`
- **OpenRouter API Key**: `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`

## System Architecture

### 1. Backend (Convex Functions)

#### `convex/fssaiVerification.ts`
- `verifyFSSAICertificate`: Main verification mutation
- `getFSSAIVerificationStatus`: Query to get verification status
- OCR text extraction using OCR Space API
- AI analysis using OpenRouter with fallback models
- License validation and business verification

#### Database Schema Updates
Added to `convex/schema.ts`:
```typescript
fssaiVerificationStatus: v.optional(v.string()), // "pending", "verified", "rejected", "expired", "invalid"
fssaiVerificationDate: v.optional(v.number()),
fssaiCertificateData: v.optional(v.object({
  licenseNumber: v.string(),
  businessName: v.string(),
  ownerName: v.string(),
  address: v.string(),
  validityDate: v.string(),
  category: v.string(),
  confidence: v.number()
})),
fssaiVerificationError: v.optional(v.string()),
```

### 2. Frontend Components

#### `src/components/FSSAIVerification.tsx`
- File upload with image preview
- Progress tracking during verification
- Status display with color-coded indicators
- Certificate details display
- Error handling and user feedback

#### Integration Points
- **SupplierDetails.tsx**: Added to Business Info tab for vendor viewing
- **SupplierDashboard.tsx**: Added to Profile tab for supplier management

## Verification Process

### Step 1: Image Upload
- User uploads FSSAI certificate image (JPEG, PNG up to 5MB)
- Image is converted to base64 for processing

### Step 2: OCR Text Extraction
- Image sent to OCR Space API
- Text extracted from certificate image
- Error handling for failed OCR

### Step 3: AI Analysis
- Extracted text sent to OpenRouter AI
- Multiple AI models used as fallback:
  - `openai/gpt-4o-mini`
  - `anthropic/claude-3-haiku`
  - `meta-llama/llama-3.1-8b-instruct`
  - `google/gemini-flash-1.5`

### Step 4: Data Validation
- FSSAI license number format validation (14 digits)
- Business name similarity check
- Owner name similarity check
- Address verification
- Validity date check

### Step 5: Status Determination
- **Verified**: All checks passed
- **Rejected**: Failed business/owner name match or low confidence
- **Expired**: Certificate validity date in the past
- **Invalid**: Incorrect license number format
- **Pending**: Initial state

## Usage

### For Suppliers
1. Navigate to Supplier Dashboard
2. Go to Profile tab
3. Upload FSSAI certificate image
4. Wait for verification process
5. View verification status and details

### For Vendors
1. View supplier details
2. Go to Business Info tab
3. View FSSAI verification status
4. See certificate details if verified

## Testing

Run the test script to verify API integrations:
```bash
node test-fssai-verification.js
```

The test script checks:
- OCR Space API connectivity
- OpenRouter AI integration
- FSSAI license validation
- String similarity calculations

## Error Handling

### OCR Failures
- Network errors
- Invalid image format
- No text found in image
- API rate limiting

### AI Analysis Failures
- Model unavailability
- Invalid response format
- Network timeouts
- Fallback to next model

### Validation Failures
- Invalid license number format
- Business name mismatch
- Owner name mismatch
- Expired certificate

## Security Considerations

- API keys are stored securely in Convex environment
- Image data is processed securely
- No sensitive data is logged
- Verification results are stored in database

## Performance Optimizations

- Multiple AI model fallbacks for reliability
- Image size limits (5MB max)
- Progress tracking for user feedback
- Efficient string similarity calculations
- Cached verification results

## Future Enhancements

1. **Batch Processing**: Verify multiple certificates simultaneously
2. **Manual Review**: Admin interface for manual verification
3. **Certificate Renewal**: Automatic expiry notifications
4. **Advanced Validation**: Integration with FSSAI database
5. **Mobile Optimization**: Better mobile upload experience

## Troubleshooting

### Common Issues

1. **OCR fails to extract text**
   - Ensure image is clear and well-lit
   - Check image format (JPEG, PNG)
   - Verify image size (under 5MB)

2. **AI analysis fails**
   - Check OpenRouter API key validity
   - Verify network connectivity
   - Check API rate limits

3. **Verification rejected**
   - Ensure business name matches profile
   - Check owner name spelling
   - Verify license number format

### Debug Mode
Enable debug logging in Convex functions to troubleshoot issues:
```typescript
console.log('OCR Result:', ocrResult);
console.log('AI Analysis:', aiAnalysis);
console.log('Verification Status:', verificationStatus);
```

## API Documentation

### OCR Space API
- **Endpoint**: `https://api.ocr.space/parse/image`
- **Method**: POST
- **Parameters**: 
  - `apikey`: API key
  - `url` or `file`: Image source
  - `language`: 'eng'
  - `OCREngine`: '2' (more accurate)

### OpenRouter API
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Method**: POST
- **Headers**: Authorization, Content-Type, HTTP-Referer, X-Title
- **Models**: Multiple fallback models for reliability

## Support

For technical support or questions about the FSSAI verification system, please refer to the project documentation or contact the development team. 