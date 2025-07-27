#!/bin/bash

# Voice Query Feature Setup Verification Script

echo "🔍 Verifying Voice Query Feature Setup"
echo "======================================"

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local file exists"
else
    echo "❌ .env.local file missing"
    exit 1
fi

# Check Sarvam API key
if grep -q "VITE_SARVAM_API_KEY=sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg" .env.local; then
    echo "✅ Sarvam API key configured"
else
    echo "❌ Sarvam API key not found or incorrect"
fi

# Check OpenRouter API key
if grep -q "VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here" .env.local; then
    echo "⚠️  OpenRouter API key needs to be set"
elif grep -q "VITE_OPENROUTER_API_KEY=" .env.local; then
    echo "✅ OpenRouter API key configured"
else
    echo "❌ OpenRouter API key missing"
fi

# Check Google Translate API key
if grep -q "VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here" .env.local; then
    echo "⚠️  Google Translate API key not set (optional)"
elif grep -q "VITE_GOOGLE_TRANSLATE_API_KEY=" .env.local; then
    echo "✅ Google Translate API key configured"
else
    echo "⚠️  Google Translate API key missing (optional)"
fi

# Check if .env.local is in .gitignore
if grep -q ".env.local" .gitignore; then
    echo "✅ .env.local is in .gitignore"
else
    echo "⚠️  .env.local not in .gitignore"
fi

# Check if required files exist
echo ""
echo "📁 Checking required files:"

if [ -f "src/components/VoiceQuery.tsx" ]; then
    echo "✅ VoiceQuery component exists"
else
    echo "❌ VoiceQuery component missing"
fi

if [ -f "convex/voiceQuery.ts" ]; then
    echo "✅ Convex voiceQuery function exists"
else
    echo "❌ Convex voiceQuery function missing"
fi

if [ -f "src/config/voiceQuery.ts" ]; then
    echo "✅ Voice query configuration exists"
else
    echo "❌ Voice query configuration missing"
fi

if [ -f "src/utils/apiKeys.ts" ]; then
    echo "✅ API key utilities exist"
else
    echo "❌ API key utilities missing"
fi

if [ -f "src/components/APIKeyConfig.tsx" ]; then
    echo "✅ API key configuration component exists"
else
    echo "❌ API key configuration component missing"
fi

# Check if schema includes voiceQueries table
if grep -q "voiceQueries" convex/schema.ts; then
    echo "✅ Voice queries schema exists"
else
    echo "❌ Voice queries schema missing"
fi

echo ""
echo "🎯 Setup Summary:"
echo "=================="

# Count configured vs missing
configured=0
missing=0
optional=0

if grep -q "VITE_SARVAM_API_KEY=sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg" .env.local; then
    ((configured++))
else
    ((missing++))
fi

if grep -q "VITE_OPENROUTER_API_KEY=" .env.local && ! grep -q "VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here" .env.local; then
    ((configured++))
else
    ((missing++))
fi

if grep -q "VITE_GOOGLE_TRANSLATE_API_KEY=" .env.local && ! grep -q "VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here" .env.local; then
    ((configured++))
else
    ((optional++))
fi

echo "✅ Configured: $configured"
echo "❌ Missing: $missing"
echo "⚠️  Optional: $optional"

if [ $missing -eq 0 ]; then
    echo ""
    echo "🎉 Setup is complete! You can now:"
    echo "1. Run: npm run dev"
    echo "2. Navigate to vendor/supplier dashboard"
    echo "3. Click the mic button to test voice queries"
    echo "4. Deploy: npx convex deploy"
else
    echo ""
    echo "⚠️  Setup incomplete. Please:"
    echo "1. Get OpenRouter API key from: https://openrouter.ai"
    echo "2. Update .env.local with your API key"
    echo "3. Run this script again to verify"
fi

echo ""
echo "📚 Documentation:"
echo "- Environment Setup: ENVIRONMENT_SETUP.md"
echo "- Voice Query Feature: VOICE_QUERY_README.md"
echo "- API Configuration: src/components/APIKeyConfig.tsx" 