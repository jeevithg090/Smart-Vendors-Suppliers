export const VOICE_QUERY_CONFIG = {
  // Basic Audio Settings
  MAX_RECORDING_TIME: 30000, // 30 seconds in milliseconds
  SAMPLE_RATE: 44100,
  SUPPORTED_LANGUAGES: ['en', 'hi', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ur'],
  API_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  AUDIO_CHUNK_SIZE: 1024,

  // Enhanced Voice Processing
  VOICE_PROCESSING: {
    confidenceThreshold: 0.7,
    silenceThreshold: 0.01,
    silenceDuration: 2000, // 2 seconds of silence to stop recording
    noiseReduction: true,
    echoCancellation: true,
    maxProcessingTime: 5000 // 5 seconds
  },

  // Computer Vision Settings
  IMAGE_ANALYSIS: {
    maxImageSize: 4 * 1024 * 1024, // 4MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    confidenceThreshold: 0.6,
    maxProcessingTime: 10000, // 10 seconds
    providers: {
      google: {
        baseUrl: 'https://vision.googleapis.com/v1',
        features: ['OBJECT_LOCALIZATION', 'LABEL_DETECTION', 'TEXT_DETECTION']
      },
      clarifai: {
        baseUrl: 'https://api.clarifai.com/v2',
        model: 'food-item-recognition'
      }
    }
  },

  // Multi-modal Settings
  MULTI_MODAL: {
    enableVoiceImageCombination: true,
    contextPreservationTime: 300000, // 5 minutes
    maxCombinedInputs: 3,
    fallbackModes: ['voice', 'text', 'image']
  },

  // AI Integration
  AI_SERVICES: {
    sarvam: {
      baseUrl: 'https://api.sarvam.ai',
      model: 'sarvam-2b',
      maxTokens: 500
    },
    openRouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.7
    }
  },

  // Privacy & Security
  PRIVACY: {
    defaultAudioRetention: false,
    maxRetentionDays: 30,
    enableDataSharing: false,
    anonymizeQueries: true,
    encryptAudioData: true
  },

  // Offline Support
  OFFLINE: {
    enableOfflineMode: true,
    cacheCommonQueries: true,
    maxCachedQueries: 100,
    offlineQueueSize: 50,
    syncInterval: 30000 // 30 seconds
  }
};

export const ERROR_MESSAGES = {
  // Voice Errors
  MICROPHONE_ACCESS_DENIED: 'Microphone access denied. Please allow microphone permissions.',
  RECORDING_FAILED: 'Recording failed. Please try again.',
  PROCESSING_FAILED: 'Failed to process voice query. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNSUPPORTED_BROWSER: 'Voice features are not supported in this browser.',
  AUDIO_TOO_SHORT: 'Audio recording is too short. Please speak for at least 1 second.',
  AUDIO_TOO_LONG: 'Audio recording is too long. Maximum recording time is 30 seconds.',
  LOW_CONFIDENCE: 'Could not understand your speech clearly. Please try speaking more clearly.',
  LANGUAGE_NOT_SUPPORTED: 'The detected language is not supported. Please try speaking in a supported language.',
  
  // Image Errors
  CAMERA_ACCESS_DENIED: 'Camera access denied. Please allow camera permissions.',
  IMAGE_UPLOAD_FAILED: 'Failed to upload image. Please try again.',
  IMAGE_TOO_LARGE: 'Image is too large. Maximum size is 4MB.',
  INVALID_IMAGE_FORMAT: 'Invalid image format. Please use JPEG, PNG, or WebP.',
  IMAGE_ANALYSIS_FAILED: 'Failed to analyze image. Please try again.',
  NO_FOOD_DETECTED: 'No food items detected in the image. Please try with a clearer image.',
  IMAGE_PROCESSING_TIMEOUT: 'Image processing timed out. Please try with a smaller image.',
  
  // Multi-modal Errors
  CONTEXT_EXPIRED: 'Previous context has expired. Please start a new query.',
  TOO_MANY_INPUTS: 'Too many combined inputs. Please simplify your query.',
  FALLBACK_FAILED: 'All input methods failed. Please try again.',
  
  // API Errors
  SARVAM_API_ERROR: 'Speech recognition service is unavailable. Please try again later.',
  OPENROUTER_API_ERROR: 'AI response service is unavailable. Please try again later.',
  VISION_API_ERROR: 'Image analysis service is unavailable. Please try again later.',
  TRANSLATION_FAILED: 'Translation service failed. Showing results in original language.',
  
  // Offline Errors
  OFFLINE_MODE: 'You are offline. Some features may not be available.',
  SYNC_FAILED: 'Failed to sync offline queries. Will retry automatically.',
  CACHE_FULL: 'Local cache is full. Some offline features may not work.'
};

export const SUCCESS_MESSAGES = {
  // Voice Success Messages
  RECORDING_STARTED: 'Recording started. Speak your question.',
  RECORDING_STOPPED: 'Recording stopped. Processing your query...',
  PROCESSING_COMPLETE: 'Query processed successfully.',
  QUERY_SAVED: 'Your query has been saved.',
  VOICE_RECOGNIZED: 'Speech recognized successfully.',
  TRANSLATION_COMPLETE: 'Translation completed.',
  
  // Image Success Messages
  IMAGE_UPLOADED: 'Image uploaded successfully.',
  IMAGE_ANALYZED: 'Image analyzed successfully.',
  FOOD_ITEMS_IDENTIFIED: 'Food items identified in the image.',
  SUPPLIERS_FOUND: 'Found suppliers for the identified ingredients.',
  
  // Multi-modal Success Messages
  CONTEXT_PRESERVED: 'Previous context maintained for combined search.',
  INPUTS_COMBINED: 'Voice and image inputs combined successfully.',
  FALLBACK_SUCCESS: 'Alternative input method worked successfully.',
  
  // Offline Success Messages
  OFFLINE_QUERY_SAVED: 'Query saved for processing when online.',
  SYNC_COMPLETE: 'Offline queries synced successfully.',
  CACHE_UPDATED: 'Local cache updated with new data.'
};

export const VOICE_COMMANDS = {
  VENDOR: {
    SEARCH: [
      'Find suppliers near me',
      'Show me vegetable suppliers',
      'What are the prices for onions?',
      'मुझे सब्जियों के लिए सप्लायर चाहिए', // Hindi: I need suppliers for vegetables
      'টমেটোর দাম কত?', // Bengali: What's the price of tomatoes?
      'காய்கறி சப்ளையர்களை காட்டு' // Tamil: Show vegetable suppliers
    ],
    FILTERS: [
      'Show only FSSAI certified suppliers',
      'Filter by price range 20 to 50 rupees',
      'Show suppliers within 5 kilometers',
      'Only premium quality suppliers',
      'Same day delivery suppliers only'
    ],
    ORDERS: [
      'Are there any group orders I can join?',
      'Set price alerts for tomatoes',
      'Show my order history',
      'Track my current orders',
      'Cancel my last order'
    ],
    IMAGE_QUERIES: [
      'What ingredients do I need for this dish?',
      'Find suppliers for these items',
      'Identify the food in this image',
      'Get price estimates for these ingredients'
    ]
  },
  SUPPLIER: {
    INVENTORY: [
      'Show my inventory status',
      'What items need restocking?',
      'Update stock for tomatoes',
      'Mark onions as out of stock',
      'Show low stock alerts'
    ],
    ORDERS: [
      'Are there any new orders?',
      'Show pending orders',
      'Mark order as delivered',
      'Show today\'s deliveries',
      'Update order status'
    ],
    ANALYTICS: [
      'Show demand forecast',
      'What is my trust score?',
      'Show recent reviews',
      'Show my delivery performance',
      'Display sales analytics'
    ],
    BUSINESS: [
      'Update my business hours',
      'Add new inventory items',
      'Update my location',
      'Set delivery radius',
      'Update pricing'
    ]
  },
  GENERAL: [
    'Help me get started',
    'What can I do with voice commands?',
    'Switch to English',
    'Change language to Hindi',
    'Show voice command examples',
    'Turn on offline mode'
  ]
};

export const LANGUAGE_NAMES = {
  'en': { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  'ta': { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  'te': { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  'bn': { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  'kn': { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  'ml': { name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  'mr': { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  'pa': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  'ur': { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' }
};

// Food categories for image recognition
export const FOOD_CATEGORIES = {
  VEGETABLES: ['tomato', 'onion', 'potato', 'carrot', 'cabbage', 'cauliflower', 'spinach', 'brinjal'],
  FRUITS: ['apple', 'banana', 'orange', 'mango', 'grapes', 'pomegranate', 'papaya', 'guava'],
  GRAINS: ['rice', 'wheat', 'barley', 'millet', 'quinoa', 'oats'],
  SPICES: ['turmeric', 'chili', 'coriander', 'cumin', 'cardamom', 'cinnamon', 'cloves', 'garam masala'],
  PULSES: ['lentils', 'chickpeas', 'black gram', 'kidney beans', 'green gram', 'pigeon peas'],
  DAIRY: ['milk', 'yogurt', 'cheese', 'butter', 'ghee', 'paneer'],
  OILS: ['mustard oil', 'coconut oil', 'sunflower oil', 'olive oil', 'sesame oil']
};

// Common ingredient alternatives for better matching
export const INGREDIENT_ALTERNATIVES = {
  'tomato': ['tamatar', 'टमाटर', 'தக்காளி', 'టమాట'],
  'onion': ['pyaz', 'प्याज', 'வெங்காயம்', 'ఉల్లిపాయ'],
  'potato': ['aloo', 'आलू', 'உருளைக்கிழங்கு', 'బంగాళాదుంప'],
  'rice': ['chawal', 'चावल', 'அரிசி', 'బియ్యం'],
  'wheat': ['gehun', 'गेहूं', 'கோதுமை', 'గోధుమ'],
  'turmeric': ['haldi', 'हल्दी', 'மஞ்சள்', 'పసుపు'],
  'chili': ['mirch', 'मिर्च', 'மிளகாய்', 'మిర్చి']
};