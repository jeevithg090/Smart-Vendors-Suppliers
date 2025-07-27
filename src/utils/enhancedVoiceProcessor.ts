import { VOICE_QUERY_CONFIG, LANGUAGE_NAMES, INGREDIENT_ALTERNATIVES } from '../config/voiceQuery';

export interface VoiceProcessingResult {
  transcription: string;
  language: string;
  confidence: number;
  alternatives: string[];
  processingTime: number;
}

export interface SearchQuery {
  originalText: string;
  translatedText: string;
  language: string;
  confidence: number;
  searchTerms: string[];
  filters: VoiceFilters;
}

export interface VoiceFilters {
  location?: string;
  priceRange?: { min: number; max: number };
  deliveryTime?: string;
  quality?: string;
  categories?: string[];
  fssaiRequired?: boolean;
}

export class EnhancedVoiceProcessor {
  private sarvamApiKey: string;
  private openRouterApiKey: string;
  private googleTranslateApiKey: string;

  constructor() {
    // In a real implementation, these would come from environment variables
    this.sarvamApiKey = process.env.VITE_SARVAM_API_KEY || '';
    this.openRouterApiKey = process.env.VITE_OPENROUTER_API_KEY || '';
    this.googleTranslateApiKey = process.env.VITE_GOOGLE_TRANSLATE_API_KEY || '';
  }

  /**
   * Process audio data using Sarvam AI for speech-to-text
   */
  async processAudioToText(audioData: Uint8Array, targetLanguage?: string): Promise<VoiceProcessingResult> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would call Sarvam AI API
      // For now, we'll simulate the processing
      const mockResult = await this.simulateSarvamSTT(audioData, targetLanguage);
      
      return {
        ...mockResult,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      throw new Error('Failed to process audio. Please try again.');
    }
  }

  /**
   * Parse voice query for search terms and filters using enhanced AI
   */
  async parseSearchQuery(text: string, language: string, userContext?: any): Promise<SearchQuery> {
    try {
      // Translate to English if needed
      const translatedText = language === 'en' ? text : await this.translateText(text, language, 'en');
      
      // Extract search terms using NLP
      const searchTerms = this.extractSearchTerms(translatedText);
      
      // Try AI-powered filter extraction first, fallback to rule-based
      let filters: VoiceFilters;
      try {
        const { openRouterFilterService } = await import('../services/openRouterFilterService');
        const aiResult = await openRouterFilterService.parseFilters({
          text: translatedText,
          language,
          userContext
        });
        filters = aiResult.filters;
      } catch (aiError) {
        console.warn('AI filter parsing failed, using rule-based fallback:', aiError);
        filters = this.extractFilters(translatedText);
      }
      
      return {
        originalText: text,
        translatedText,
        language,
        confidence: 0.85, // Mock confidence
        searchTerms,
        filters
      };
    } catch (error) {
      console.error('Error parsing search query:', error);
      throw new Error('Failed to parse search query.');
    }
  }

  /**
   * Generate contextual AI response using OpenRouter
   */
  async generateResponse(
    query: string, 
    context: any, 
    userRole: string, 
    queryType: string
  ): Promise<string> {
    try {
      // In a real implementation, this would call OpenRouter API
      return this.simulateOpenRouterResponse(query, context, userRole, queryType);
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate response.');
    }
  }

  /**
   * Translate text using Google Translate API
   */
  private async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    // Mock translation - in real implementation, call Google Translate API
    const translations: Record<string, Record<string, string>> = {
      'hi': {
        'मुझे सब्जियों के लिए सप्लायर चाहिए': 'I need suppliers for vegetables',
        'टमाटर की कीमत क्या है': 'What is the price of tomatoes',
        'केवल प्रमाणित सप्लायर दिखाएं': 'Show only certified suppliers'
      },
      'ta': {
        'காய்கறி சப்ளையர்களை காட்டு': 'Show vegetable suppliers',
        'தக்காளி விலை என்ன': 'What is the price of tomatoes'
      },
      'te': {
        'కూరగాయల సప్లైయర్లను చూపించు': 'Show vegetable suppliers',
        'టమాట ధర ఎంత': 'What is the price of tomatoes'
      }
    };

    return translations[fromLang]?.[text] || text;
  }

  /**
   * Extract search terms from translated text
   */
  private extractSearchTerms(text: string): string[] {
    const commonWords = ['i', 'need', 'want', 'find', 'show', 'get', 'buy', 'for', 'the', 'a', 'an', 'and', 'or'];
    const words = text.toLowerCase().split(/\s+/).filter(word => 
      word.length > 2 && !commonWords.includes(word)
    );

    // Map alternative names to standard terms
    const mappedTerms = words.map(word => {
      for (const [standard, alternatives] of Object.entries(INGREDIENT_ALTERNATIVES)) {
        if (alternatives.some(alt => alt.toLowerCase().includes(word) || word.includes(alt.toLowerCase()))) {
          return standard;
        }
      }
      return word;
    });

    return [...new Set(mappedTerms)]; // Remove duplicates
  }

  /**
   * Extract filters from natural language with enhanced parsing
   */
  private extractFilters(text: string): VoiceFilters {
    const filters: VoiceFilters = {};
    const lowerText = text.toLowerCase();

    // Location filters - enhanced patterns
    if (lowerText.includes('near') || lowerText.includes('nearby') || lowerText.includes('close')) {
      filters.location = 'nearby';
    }
    if (lowerText.includes('within') && (lowerText.includes('km') || lowerText.includes('kilometer'))) {
      const match = lowerText.match(/within (\d+)\s*(km|kilometer)/);
      if (match) {
        filters.location = `within ${match[1]}km`;
      }
    }
    // Distance-specific patterns
    const distanceMatch = lowerText.match(/(\d+)\s*(km|kilometer|mile)\s*(radius|away|distance)/);
    if (distanceMatch) {
      filters.location = `within ${distanceMatch[1]}km`;
    }

    // Price filters - enhanced patterns
    const pricePatterns = [
      /price.*?range.*?(\d+).*?(\d+)/,
      /between.*?(\d+).*?(\d+).*?(rupees?|rs)/,
      /(\d+)\s*to\s*(\d+)\s*(rupees?|rs)/,
      /(\d+)\s*-\s*(\d+)\s*(rupees?|rs)/,
      /under.*?(\d+)\s*(rupees?|rs)/,
      /below.*?(\d+)\s*(rupees?|rs)/,
      /above.*?(\d+)\s*(rupees?|rs)/,
      /over.*?(\d+)\s*(rupees?|rs)/
    ];

    for (const pattern of pricePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        if (pattern.source.includes('under') || pattern.source.includes('below')) {
          filters.priceRange = { min: 0, max: parseInt(match[1]) };
        } else if (pattern.source.includes('above') || pattern.source.includes('over')) {
          filters.priceRange = { min: parseInt(match[1]), max: 10000 };
        } else {
          const min = parseInt(match[1]);
          const max = parseInt(match[2]);
          if (min && max) {
            filters.priceRange = { min: Math.min(min, max), max: Math.max(min, max) };
          }
        }
        break;
      }
    }

    // Quality filters - enhanced patterns
    const qualityPatterns = {
      premium: ['premium', 'high quality', 'best quality', 'top quality', 'excellent'],
      organic: ['organic', 'natural', 'chemical free'],
      fresh: ['fresh', 'new', 'recently harvested'],
      grade_a: ['grade a', 'a grade', 'first grade', 'top grade']
    };

    for (const [quality, keywords] of Object.entries(qualityPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        filters.quality = quality;
        break;
      }
    }

    // FSSAI filters - enhanced patterns
    const fssaiKeywords = [
      'fssai', 'certified', 'licensed', 'verified', 'approved', 
      'food safety', 'food license', 'government approved'
    ];
    if (fssaiKeywords.some(keyword => lowerText.includes(keyword))) {
      filters.fssaiRequired = true;
    }

    // Delivery time filters - enhanced patterns
    const deliveryPatterns = {
      same_day: ['same day', 'today', 'immediate', 'instant', 'within hours'],
      next_day: ['next day', 'tomorrow', '24 hours', 'one day'],
      express: ['express', 'fast', 'quick', 'urgent'],
      standard: ['standard', 'normal', 'regular'],
      scheduled: ['scheduled', 'planned', 'specific time']
    };

    for (const [deliveryType, keywords] of Object.entries(deliveryPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        filters.deliveryTime = deliveryType;
        break;
      }
    }

    // Category filters - enhanced patterns with multilingual support
    const categoryPatterns = {
      vegetables: [
        'vegetable', 'sabzi', 'sabji', 'காய்கறி', 'కూరగాయలు', 'সবজি',
        'tomato', 'onion', 'potato', 'carrot', 'cabbage'
      ],
      fruits: [
        'fruit', 'phal', 'फल', 'பழம்', 'పండు', 'ফল',
        'apple', 'banana', 'orange', 'mango', 'grapes'
      ],
      spices: [
        'spice', 'masala', 'मसाला', 'மசாலா', 'మసాలా', 'মসলা',
        'turmeric', 'chili', 'coriander', 'cumin', 'cardamom'
      ],
      grains: [
        'grain', 'anaj', 'अनाज', 'தானியம்', 'ధాన్యాలు', 'শস্য',
        'rice', 'wheat', 'barley', 'millet', 'quinoa'
      ],
      pulses: [
        'pulse', 'dal', 'दाल', 'பருப்பு', 'పప్పు', 'ডাল',
        'lentils', 'chickpeas', 'kidney beans'
      ],
      dairy: [
        'dairy', 'milk', 'दूध', 'பால்', 'పాలు', 'দুধ',
        'yogurt', 'cheese', 'butter', 'ghee'
      ]
    };

    const detectedCategories = [];
    for (const [category, keywords] of Object.entries(categoryPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        detectedCategories.push(category);
      }
    }
    if (detectedCategories.length > 0) {
      filters.categories = detectedCategories;
    }

    // Additional filter patterns
    // Minimum order filters
    if (lowerText.includes('minimum order') || lowerText.includes('min order')) {
      const minOrderMatch = lowerText.match(/minimum.*?order.*?(\d+)/);
      if (minOrderMatch) {
        // This could be added as a new filter type if needed
      }
    }

    // Trust score filters
    if (lowerText.includes('trust score') || lowerText.includes('rating')) {
      const trustMatch = lowerText.match(/trust.*?score.*?(\d+)|rating.*?(\d+)/);
      if (trustMatch) {
        // This could be added as a new filter type if needed
      }
    }

    // Availability filters
    if (lowerText.includes('available') || lowerText.includes('in stock')) {
      // This could be added as a new filter type if needed
    }

    return filters;
  }

  /**
   * Simulate Sarvam AI STT response
   */
  private async simulateSarvamSTT(audioData: Uint8Array, targetLanguage?: string): Promise<Omit<VoiceProcessingResult, 'processingTime'>> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockResponses = [
      {
        transcription: 'मुझे सब्जियों के लिए सप्लायर चाहिए',
        language: 'hi',
        confidence: 0.87,
        alternatives: ['मुझे सब्जी सप्लायर चाहिए', 'सब्जियों के लिए दुकान चाहिए']
      },
      {
        transcription: 'Show me vegetable suppliers near me',
        language: 'en',
        confidence: 0.92,
        alternatives: ['Show vegetable suppliers nearby', 'Find vegetable suppliers near me']
      },
      {
        transcription: 'காய்கறி சப்ளையர்களை காட்டு',
        language: 'ta',
        confidence: 0.84,
        alternatives: ['காய்கறி விற்பனையாளர்களை காட்டு']
      },
      {
        transcription: 'What is the price of tomatoes today?',
        language: 'en',
        confidence: 0.95,
        alternatives: ['What are tomato prices today?', 'How much do tomatoes cost?']
      },
      {
        transcription: 'केवल प्रमाणित सप्लायर दिखाएं',
        language: 'hi',
        confidence: 0.89,
        alternatives: ['सिर्फ सर्टिफाइड सप्लायर दिखाएं']
      }
    ];

    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  /**
   * Simulate OpenRouter AI response
   */
  private simulateOpenRouterResponse(query: string, context: any, userRole: string, queryType: string): string {
    const responses = {
      search: {
        vendor: [
          "I found 3 suppliers near you with fresh vegetables. Fresh Vegetables Hub is closest at 2.3km with tomatoes at ₹35/kg and onions at ₹25/kg. All suppliers are FSSAI certified.",
          "Found 2 spice suppliers with competitive prices. Spice Palace has turmeric at ₹180/kg and red chili at ₹220/kg. Quality Spices offers bulk discounts.",
          "Located 4 grain suppliers in your area. Best prices: Rice ₹45/kg, Wheat flour ₹35/kg. Premium Grains offers same-day delivery."
        ],
        supplier: [
          "Based on demand patterns, vendors in your area are looking for tomatoes, onions, and green chilies. Consider stocking these items for better sales.",
          "High demand for spices this week. Turmeric and red chili powder are most requested. Consider competitive pricing to attract more orders."
        ]
      },
      filter: {
        vendor: [
          "Applied filters: FSSAI certified suppliers only, within 5km radius, price range ₹20-50/kg. Found 4 matching suppliers.",
          "Filtered results: Premium quality suppliers, same-day delivery available. 6 suppliers match your criteria."
        ]
      },
      general: {
        vendor: [
          "You can search for suppliers by speaking item names, set price alerts, join group orders, or ask about market trends. Try saying 'Find tomato suppliers' or 'Set price alert for onions'.",
          "I can help you find suppliers, compare prices, join group orders, and track your expenses. What would you like to do?"
        ],
        supplier: [
          "You can check inventory status, view new orders, update stock levels, or get demand forecasts. Try saying 'Show new orders' or 'What needs restocking?'.",
          "I can help you manage inventory, process orders, analyze demand, and improve your business performance. How can I assist you today?"
        ]
      }
    };

    const modeResponses = responses[queryType as keyof typeof responses] || responses.general;
    const roleResponses = modeResponses[userRole as keyof typeof modeResponses] || modeResponses.vendor;
    return roleResponses[Math.floor(Math.random() * roleResponses.length)];
  }

  /**
   * Validate audio quality and duration
   */
  validateAudio(audioData: Uint8Array, duration: number): { isValid: boolean; error?: string } {
    if (duration < 500) {
      return { isValid: false, error: 'Audio too short. Please speak for at least 1 second.' };
    }
    
    if (duration > VOICE_QUERY_CONFIG.MAX_RECORDING_TIME) {
      return { isValid: false, error: 'Audio too long. Maximum recording time is 30 seconds.' };
    }
    
    if (audioData.length === 0) {
      return { isValid: false, error: 'No audio data received.' };
    }
    
    return { isValid: true };
  }

  /**
   * Detect language from audio characteristics (mock implementation)
   */
  detectLanguage(audioData: Uint8Array): string {
    // In a real implementation, this would analyze audio characteristics
    // For now, return a random supported language
    const supportedLanguages = VOICE_QUERY_CONFIG.SUPPORTED_LANGUAGES;
    return supportedLanguages[Math.floor(Math.random() * supportedLanguages.length)];
  }

  /**
   * Calculate confidence score based on various factors
   */
  calculateConfidence(
    transcription: string, 
    audioQuality: number, 
    languageDetectionConfidence: number
  ): number {
    // Combine different confidence factors
    const transcriptionLength = Math.min(transcription.length / 50, 1); // Longer text = higher confidence
    const wordCount = transcription.split(' ').length;
    const wordCountFactor = Math.min(wordCount / 5, 1); // 5+ words = full confidence
    
    return Math.round(
      (audioQuality * 0.4 + 
       languageDetectionConfidence * 0.3 + 
       transcriptionLength * 0.2 + 
       wordCountFactor * 0.1) * 100
    ) / 100;
  }
}

export const voiceProcessor = new EnhancedVoiceProcessor();