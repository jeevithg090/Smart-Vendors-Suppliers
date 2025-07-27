#!/bin/bash

# Voice Query Feature Environment Setup Script

echo "🎤 Setting up Voice Query Feature Environment Variables"
echo "======================================================"

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOF
# Voice Query Feature API Keys

# Sarvam AI API Key (for multilingual speech-to-text)
# Get from: https://sarvam.ai
VITE_SARVAM_API_KEY=sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg

# OpenRouter API Key (for AI responses)
# Get from: https://openrouter.ai
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google Translate API Key (optional, for translation fallback)
# Get from: https://cloud.google.com/translate
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here

# Convex Configuration
CONVEX_DEPLOY_KEY=your_convex_deploy_key_here
EOF
    echo "✅ Created .env.local file"
else
    echo "⚠️  .env.local file already exists"
fi

# Create .env.example file
echo "Creating .env.example file..."
cat > .env.example << EOF
# Voice Query Feature API Keys

# Sarvam AI API Key (for multilingual speech-to-text)
# Get from: https://sarvam.ai
VITE_SARVAM_API_KEY=sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg

# OpenRouter API Key (for AI responses)
# Get from: https://openrouter.ai
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google Translate API Key (optional, for translation fallback)
# Get from: https://cloud.google.com/translate
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here

# Convex Configuration
CONVEX_DEPLOY_KEY=your_convex_deploy_key_here
EOF
echo "✅ Created .env.example file"

# Update .gitignore to include .env.local
if ! grep -q ".env.local" .gitignore; then
    echo "" >> .gitignore
    echo "# Environment variables" >> .gitignore
    echo ".env.local" >> .gitignore
    echo "✅ Added .env.local to .gitignore"
else
    echo "⚠️  .env.local already in .gitignore"
fi

echo ""
echo "🔑 Next Steps:"
echo "1. Get your OpenRouter API key from: https://openrouter.ai"
echo "2. Update the OPENROUTER_API_KEY in .env.local"
echo "3. (Optional) Get Google Translate API key for translation fallback"
echo "4. Deploy Convex functions: npx convex deploy"
echo ""
echo "📝 Current API Keys:"
echo "- Sarvam API Key: ✅ Configured"
echo "- OpenRouter API Key: ⚠️  Needs to be set"
echo "- Google Translate API Key: ⚠️  Optional"
echo ""
echo "🎯 Ready to test voice queries!" 