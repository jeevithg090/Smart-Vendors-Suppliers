# Voice Query Feature Implementation

## Overview

The Voice Query feature allows vendors and suppliers to ask questions using voice commands in multiple Indian languages. The system transcribes speech using Sarvam AI, translates to English if needed, and provides intelligent responses using OpenRouter AI.

## Features

- 🎤 **Voice Recording**: High-quality audio recording with visualization
- 🌍 **Multilingual Support**: Supports Hindi, Tamil, Telugu, and other Indian languages
- 🤖 **AI-Powered Responses**: Context-aware responses based on user data
- 📊 **Role-Specific Context**: Different responses for vendors vs suppliers
- 📝 **Query History**: Logs all voice queries for future reference

## Technical Implementation

### Frontend Components

#### VoiceQuery.tsx
- **Location**: `src/components/VoiceQuery.tsx`
- **Features**:
  - Audio recording with MediaRecorder API
  - Real-time audio level visualization
  - Auto-stop after 30 seconds
  - Error handling and user feedback
  - Beautiful UI with animations

#### Integration Points
- **Vendor Dashboard**: `src/pages/VendorDashboard.tsx`
- **Supplier Dashboard**: `src/pages/SupplierDashboard.tsx`
- **Position**: Header area with mic button

### Backend Functions

#### voiceQuery.ts
- **Location**: `convex/voiceQuery.ts`
- **Functions**:
  - `processVoiceQuery`: Main processing function
  - `getVoiceQueryHistory`: Query history retrieval

#### Database Schema
- **Table**: `voiceQueries`
- **Fields**:
  - `userId`: Clerk user ID
  - `userRole`: "vendor" or "supplier"
  - `queryText`: Original transcribed text
  - `language`: Detected language code
  - `englishText`: Translated to English
  - `response`: AI response
  - `audioDuration`: Recording duration
  - `createdAt`: Timestamp

## API Integration

### Sarvam AI (Speech-to-Text)
- **Endpoint**: `https://api.sarvam.ai/speech-to-text`
- **API Key**: `sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg`
- **Features**:
  - Multilingual speech recognition
  - Auto-language detection
  - High accuracy for Indian languages

### OpenRouter (AI Responses)
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Model**: `openai/gpt-4o-mini`
- **Features**:
  - Context-aware responses
  - Role-specific data integration
  - Professional business language

### Google Translate (Optional)
- **Purpose**: Translation fallback
- **Usage**: Only if Sarvam doesn't provide English translation

## User Flow

1. **User clicks mic button** in dashboard header
2. **Recording starts** with visual feedback
3. **User speaks** in any supported language
4. **Auto-stop** after 30 seconds or manual stop
5. **Processing**:
   - Audio sent to Sarvam for transcription
   - Text translated to English if needed
   - Context data gathered based on user role
   - Query sent to OpenRouter with context
   - Response displayed in chat bubble
6. **History logged** for future reference

## Context Data by Role

### Vendor Context
- Business profile and preferences
- Recent orders and status
- Active requests
- Spending statistics

### Supplier Context
- Business profile and verification status
- Inventory levels and availability
- Recent orders and fulfillment
- Stock alerts and recommendations

## Example Queries

### Vendor Queries
- "मेरे पास कितने ऑर्डर हैं?" (How many orders do I have?)
- "मेरा कुल खर्च क्या है?" (What is my total spending?)
- "कौन से सप्लायर सबसे अच्छे हैं?" (Which suppliers are the best?)

### Supplier Queries
- "मेरा इन्वेंटरी स्टेटस क्या है?" (What is my inventory status?)
- "कितने प्रोडक्ट्स लो स्टॉक में हैं?" (How many products are low in stock?)
- "आज कितने ऑर्डर आए हैं?" (How many orders came today?)

## Error Handling

- **Microphone Access**: Graceful handling of permission denials
- **Network Issues**: Retry mechanisms and user feedback
- **API Failures**: Fallback responses and error logging
- **Audio Quality**: Clear instructions for better recording

## Performance Optimizations

- **Audio Compression**: WebM format for efficient transmission
- **Chunked Processing**: 1-second audio chunks for real-time feedback
- **Caching**: Query history for faster responses
- **Rate Limiting**: Built-in protection against spam

## Security Considerations

- **Authentication**: All queries require valid user session
- **Data Privacy**: Audio data not stored, only transcribed text
- **API Key Protection**: Keys stored securely in environment variables
- **Input Validation**: Sanitized inputs to prevent injection attacks

## Future Enhancements

- **Voice Response**: Text-to-speech in original language
- **Offline Support**: Local processing for basic queries
- **Advanced Analytics**: Query patterns and insights
- **Custom Prompts**: User-defined response styles
- **Integration**: Connect with other platform features

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install recordrtc @types/recordrtc
   ```

2. **Environment Variables**:
   ```bash
   # Required
   SARVAM_API_KEY=sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg
   OPENROUTER_API_KEY=your_openrouter_api_key
   
   # Optional
   GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
   ```

3. **Deploy Convex Functions**:
   ```bash
   npx convex deploy
   ```

4. **Test the Feature**:
   - Navigate to vendor or supplier dashboard
   - Click the mic button in the header
   - Speak a question in any supported language
   - Verify the response is contextually relevant

## Troubleshooting

### Common Issues

1. **"Microphone access denied"**
   - Check browser permissions
   - Ensure HTTPS connection (required for microphone)

2. **"No speech detected"**
   - Speak clearly and closer to microphone
   - Check audio input settings

3. **"API error"**
   - Verify API keys are correct
   - Check network connectivity
   - Review Convex function logs

### Debug Mode

Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('voiceQueryDebug', 'true');
```

## API Documentation

### Sarvam AI Response Format
```json
{
  "transcript": "मेरा इन्वेंटरी क्या है",
  "language": "hi",
  "confidence": 0.95
}
```

### OpenRouter Request Format
```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "System prompt with context..."
    },
    {
      "role": "user", 
      "content": "User query in English"
    }
  ],
  "max_tokens": 300,
  "temperature": 0.7
}
```

## Contributing

When contributing to the voice query feature:

1. **Test with multiple languages**
2. **Verify context accuracy**
3. **Check error handling**
4. **Update documentation**
5. **Follow existing code patterns**

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Convex function logs
3. Test with different browsers
4. Verify API key validity 