// Voice Query Configuration
export const VOICE_QUERY_CONFIG = {
  // Sarvam AI API Key (for multilingual speech-to-text)
  SARVAM_API_KEY: "sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg",
  
  // Sarvam API endpoints
  SARVAM_STT_URL: "https://api.sarvam.ai/speech-to-text",
  
  // OpenRouter API configuration
  OPENROUTER_URL: "https://openrouter.ai/api/v1/chat/completions",
  OPENROUTER_MODEL: "openai/gpt-4o-mini",
  
  // Recording settings
  MAX_RECORDING_TIME: 30000, // 30 seconds
  AUDIO_CHUNK_INTERVAL: 1000, // 1 second
  
  // Supported languages
  SUPPORTED_LANGUAGES: [
    'hi', // Hindi
    'ta', // Tamil
    'te', // Telugu
    'bn', // Bengali
    'gu', // Gujarati
    'kn', // Kannada
    'ml', // Malayalam
    'mr', // Marathi
    'pa', // Punjabi
    'ur', // Urdu
    'en'  // English
  ],
  
  // Language names for display
  LANGUAGE_NAMES: {
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'bn': 'Bengali',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'mr': 'Marathi',
    'pa': 'Punjabi',
    'ur': 'Urdu',
    'en': 'English'
  }
};

// Example queries for testing
export const EXAMPLE_QUERIES = {
  vendor: [
    {
      hindi: "मेरे पास कितने ऑर्डर हैं?",
      english: "How many orders do I have?",
      language: "hi"
    },
    {
      hindi: "मेरा कुल खर्च क्या है?",
      english: "What is my total spending?",
      language: "hi"
    },
    {
      hindi: "कौन से सप्लायर सबसे अच्छे हैं?",
      english: "Which suppliers are the best?",
      language: "hi"
    },
    {
      tamil: "எனக்கு எத்தனை ஆர்டர்கள் உள்ளன?",
      english: "How many orders do I have?",
      language: "ta"
    }
  ],
  supplier: [
    {
      hindi: "मेरा इन्वेंटरी स्टेटस क्या है?",
      english: "What is my inventory status?",
      language: "hi"
    },
    {
      hindi: "कितने प्रोडक्ट्स लो स्टॉक में हैं?",
      english: "How many products are low in stock?",
      language: "hi"
    },
    {
      hindi: "आज कितने ऑर्डर आए हैं?",
      english: "How many orders came today?",
      language: "hi"
    },
    {
      tamil: "எனது சரக்கு நிலை என்ன?",
      english: "What is my inventory status?",
      language: "ta"
    }
  ]
};

// Error messages
export const ERROR_MESSAGES = {
  MICROPHONE_DENIED: "Microphone access denied. Please allow microphone permissions.",
  NO_SPEECH_DETECTED: "No speech detected. Please try speaking clearly.",
  PROCESSING_FAILED: "Failed to process voice query. Please try again.",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  API_ERROR: "Service temporarily unavailable. Please try again later.",
  PERMISSION_REQUIRED: "Microphone permission is required for voice queries."
};

// Success messages
export const SUCCESS_MESSAGES = {
  RECORDING_STARTED: "Recording started. Speak now.",
  RECORDING_STOPPED: "Processing your question...",
  RESPONSE_RECEIVED: "Response received successfully."
}; 