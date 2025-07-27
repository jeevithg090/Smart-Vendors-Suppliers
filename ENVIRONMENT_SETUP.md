# Environment Setup for Voice Query Feature

## 🎤 Overview

This document provides step-by-step instructions for setting up the environment variables and API keys required for the Voice Query feature.

## ✅ What's Already Configured

- **Sarvam AI API Key**: `sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg` ✅
- **Environment Files**: `.env.local` and `.env.example` ✅
- **Configuration Scripts**: `setup-env.sh` ✅
- **API Key Management**: Utilities and components ✅

## 🔑 Required API Keys

### 1. Sarvam AI (✅ Already Configured)
- **Purpose**: Multilingual speech-to-text
- **API Key**: `sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg`
- **Status**: ✅ Ready to use

### 2. OpenRouter (⚠️ Needs Setup)
- **Purpose**: AI response generation
- **URL**: https://openrouter.ai
- **Status**: ⚠️ Requires API key

### 3. Google Translate (⚠️ Optional)
- **Purpose**: Translation fallback
- **URL**: https://cloud.google.com/translate
- **Status**: ⚠️ Optional enhancement

## 🚀 Quick Setup

### Option 1: Automated Setup
```bash
# Run the setup script
./setup-env.sh
```

### Option 2: Manual Setup
1. **Get OpenRouter API Key**:
   - Visit: https://openrouter.ai
   - Sign up and get your API key
   - Update `.env.local`:
   ```bash
   VITE_OPENROUTER_API_KEY=your_actual_api_key_here
   ```

2. **Optional: Get Google Translate API Key**:
   - Visit: https://cloud.google.com/translate
   - Enable the API and get credentials
   - Update `.env.local`:
   ```bash
   VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_key_here
   ```

## 📁 Environment Files

### .env.local (Current)
```bash
# Voice Query Feature API Keys

# Sarvam AI API Key (for multilingual speech-to-text)
VITE_SARVAM_API_KEY=sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg

# OpenRouter API Key (for AI responses)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google Translate API Key (optional, for translation fallback)
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here

# Convex Configuration
CONVEX_DEPLOY_KEY=your_convex_deploy_key_here
```

### .env.example (Template)
- Contains the same structure as `.env.local`
- Used as a template for new installations
- Safe to commit to version control

## 🔧 Configuration Components

### 1. API Key Management (`src/utils/apiKeys.ts`)
- Validates API key configuration
- Provides status information
- Handles environment variable access

### 2. Configuration Component (`src/components/APIKeyConfig.tsx`)
- Visual API key status display
- Setup instructions
- Links to API providers

### 3. Voice Query Config (`src/config/voiceQuery.ts`)
- Feature configuration
- Example queries
- Error messages

## 🧪 Testing the Setup

### 1. Check API Key Status
```bash
# The APIKeyConfig component will show:
# ✅ Sarvam AI: Configured
# ❌ OpenRouter: Missing (until you add the key)
# ⚠️ Google Translate: Optional
```

### 2. Test Voice Query Feature
1. Start the development server: `npm run dev`
2. Navigate to vendor or supplier dashboard
3. Click the mic button in the header
4. Speak a question in any supported language
5. Verify the response

### 3. Example Test Queries
- **Hindi**: "मेरे पास कितने ऑर्डर हैं?"
- **Tamil**: "எனக்கு எத்தனை ஆர்டர்கள் உள்ளன?"
- **English**: "How many orders do I have?"

## 🚨 Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Check `.env.local` file exists
   - Verify VITE_ prefix is used
   - Restart development server

2. **"Microphone access denied"**
   - Check browser permissions
   - Ensure HTTPS connection
   - Try in incognito mode

3. **"No speech detected"**
   - Speak clearly and closer to microphone
   - Check audio input settings
   - Try different languages

4. **"Network error"**
   - Check internet connection
   - Verify API keys are valid
   - Check API service status

### Debug Mode
```javascript
// Enable debug logging in browser console
localStorage.setItem('voiceQueryDebug', 'true');
```

## 📊 API Usage Monitoring

### Sarvam AI
- **Cost**: Free tier available
- **Limits**: Check sarvam.ai for current limits
- **Languages**: Hindi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Marathi, Punjabi, Urdu

### OpenRouter
- **Cost**: Pay-per-use
- **Models**: GPT-4o-mini (cost-effective)
- **Limits**: Based on your plan

### Google Translate
- **Cost**: Free tier available
- **Limits**: 500,000 characters/month free
- **Usage**: Only for translation fallback

## 🔄 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build the application
npm run build

# Deploy Convex functions
npx convex deploy

# Deploy to your hosting platform
npm run deploy
```

### Environment Variables in Production
- Set the same environment variables in your production environment
- Use your hosting platform's environment variable management
- Ensure VITE_ prefix is maintained

## 📝 Next Steps

1. **Get OpenRouter API Key**: Visit https://openrouter.ai
2. **Update .env.local**: Add your API key
3. **Test the Feature**: Try voice queries in different languages
4. **Deploy**: Deploy Convex functions and test in production
5. **Monitor**: Check API usage and costs

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review browser console for errors
3. Verify API key configuration
4. Test with different browsers
5. Check API service status pages

## 📚 Additional Resources

- [Voice Query README](./VOICE_QUERY_README.md)
- [Sarvam AI Documentation](https://sarvam.ai)
- [OpenRouter Documentation](https://openrouter.ai)
- [Google Translate API](https://cloud.google.com/translate)
- [Convex Documentation](https://docs.convex.dev) 