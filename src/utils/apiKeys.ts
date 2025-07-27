// API Key Management Utility for Voice Query Feature

interface APIKeys {
  sarvam: string;
  openRouter: string;
  googleTranslate?: string;
}

// Get API keys from environment variables or use defaults
export const getAPIKeys = (): APIKeys => {
  return {
    sarvam: import.meta.env.VITE_SARVAM_API_KEY || "sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg",
    openRouter: import.meta.env.VITE_OPENROUTER_API_KEY || "",
    googleTranslate: import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || undefined,
  };
};

// Validate API keys
export const validateAPIKeys = (): { valid: boolean; missing: string[] } => {
  const keys = getAPIKeys();
  const missing: string[] = [];

  if (!keys.sarvam) {
    missing.push("SARVAM_API_KEY");
  }

  if (!keys.openRouter) {
    missing.push("OPENROUTER_API_KEY");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};

// Get API key status for UI display
export const getAPIKeyStatus = () => {
  const keys = getAPIKeys();
  const validation = validateAPIKeys();

  return {
    sarvam: {
      configured: !!keys.sarvam,
      status: keys.sarvam ? "✅ Configured" : "❌ Missing",
    },
    openRouter: {
      configured: !!keys.openRouter,
      status: keys.openRouter ? "✅ Configured" : "❌ Missing",
    },
    googleTranslate: {
      configured: !!keys.googleTranslate,
      status: keys.googleTranslate ? "✅ Configured" : "⚠️ Optional",
    },
    overall: {
      valid: validation.valid,
      missing: validation.missing,
    },
  };
};

// Environment variable names for reference
export const ENV_VAR_NAMES = {
  SARVAM_API_KEY: "VITE_SARVAM_API_KEY",
  OPENROUTER_API_KEY: "VITE_OPENROUTER_API_KEY",
  GOOGLE_TRANSLATE_API_KEY: "VITE_GOOGLE_TRANSLATE_API_KEY",
} as const;

// Instructions for setting up API keys
export const API_KEY_INSTRUCTIONS = {
  sarvam: {
    name: "Sarvam AI",
    url: "https://sarvam.ai",
    description: "Multilingual speech-to-text API",
    required: true,
  },
  openRouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai",
    description: "AI response generation",
    required: true,
  },
  googleTranslate: {
    name: "Google Translate",
    url: "https://cloud.google.com/translate",
    description: "Translation fallback (optional)",
    required: false,
  },
} as const; 