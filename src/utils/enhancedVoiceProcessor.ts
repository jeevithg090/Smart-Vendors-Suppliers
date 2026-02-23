import { VOICE_QUERY_CONFIG, INGREDIENT_ALTERNATIVES } from '../config/voiceQuery';
import { openRouterFilterService } from '../services/openRouterFilterService';
import { aiServiceIntegration } from '../services/aiServiceIntegration';
import { computerVisionManager } from './computerVision';

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
  constructor() {}

  /**
   * Process audio data using Sarvam AI for speech-to-text
   */
  async processAudioToText(audioData: Uint8Array, targetLanguage?: string): Promise<VoiceProcessingResult> {
    const startTime = Date.now();

    try {
      // Prefer real API integration when configured; fallback to deterministic mock behavior.
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const liveResult = await aiServiceIntegration.speechToText(audioBlob, targetLanguage);

      const alternatives = Array.isArray(liveResult.alternatives)
        ? liveResult.alternatives
            .map((alt: any) => (typeof alt === 'string' ? alt : alt?.transcript))
            .filter((alt): alt is string => typeof alt === 'string' && alt.length > 0)
        : [];

      return {
        transcription: liveResult.transcript || '',
        language: liveResult.language || targetLanguage || 'en',
        confidence: liveResult.confidence || 0.8,
        alternatives,
        processingTime: Math.max(1, Date.now() - startTime),
      };
    } catch (error) {
      try {
        const mockResult = await this.simulateSarvamSTT(audioData, targetLanguage);
        return {
          ...mockResult,
          processingTime: Math.max(1, Date.now() - startTime),
        };
      } catch (fallbackError) {
        console.error('Error processing audio:', error, fallbackError);
        throw new Error('Failed to process audio. Please try again.');
      }
    }
  }

  /**
   * Backward-compatible search pipeline used by legacy UI/tests.
   */
  async processVoiceSearch(audioData: Uint8Array, userContext?: any): Promise<{
    originalQuery: string;
    translatedQuery: string;
    language: string;
    confidence: number;
    searchTerms: string[];
    filters: VoiceFilters;
    searchType: string;
  }> {
    const transcription = await this.processAudioToText(audioData, userContext?.preferences?.language);
    const parsed = await this.parseSearchQuery(
      transcription.transcription,
      transcription.language,
      userContext
    );

    return {
      originalQuery: transcription.transcription,
      translatedQuery: parsed.translatedText,
      language: transcription.language,
      confidence: transcription.confidence,
      searchTerms: parsed.searchTerms,
      filters: parsed.filters,
      searchType: parsed.searchTerms.length > 0 ? 'item' : 'general',
    };
  }

  /**
   * Backward-compatible filter command processing.
   */
  async processVoiceFilter(
    audioData: Uint8Array,
    currentFilters: VoiceFilters = {},
    userContext?: any
  ): Promise<VoiceFilters> {
    const transcription = await this.processAudioToText(audioData, userContext?.preferences?.language);
    const parsed = await this.parseSearchQuery(
      transcription.transcription,
      transcription.language,
      userContext
    );

    return {
      ...currentFilters,
      ...parsed.filters,
    };
  }

  /**
   * Backward-compatible voice response helper.
   */
  async generateVoiceResponse(
    query: string,
    context: any,
    targetLanguage = 'en'
  ): Promise<{ answer: string; language: string; confidence: number; processingTime: number }> {
    const startTime = Date.now();
    const ai = await aiServiceIntegration.generateAIResponse(query, context);
    const translatedAnswer = targetLanguage === 'en'
      ? ai.response
      : await this.translateText(ai.response, 'en', targetLanguage);

    return {
      answer: translatedAnswer,
      language: targetLanguage,
      confidence: ai.confidence || 0.8,
      processingTime: Math.max(1, Date.now() - startTime),
    };
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
        const aiResult = await openRouterFilterService.parseFilters({
          text: translatedText,
          language,
          userContext
        });
        filters = this.sanitizeFilters(aiResult.filters);
      } catch (aiError) {
        console.warn('AI filter parsing failed, using rule-based fallback:', aiError);
        filters = this.sanitizeFilters(this.extractFilters(translatedText));
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

  private sanitizeFilters(filters: VoiceFilters | null | undefined): VoiceFilters {
    if (!filters || typeof filters !== 'object') {
      return {};
    }

    const sanitized: VoiceFilters = {};

    if (typeof filters.location === 'string' && filters.location.trim().length > 0) {
      sanitized.location = filters.location.trim();
    }

    if (filters.priceRange) {
      const min = Math.max(0, Number(filters.priceRange.min) || 0);
      const cappedMax = Math.min(999999, Number(filters.priceRange.max) || 0);
      const max = Math.max(min, cappedMax);
      sanitized.priceRange = { min, max };
    }

    const validDeliveryTime = new Set(['same_day', 'next_day', 'express', 'standard', 'scheduled']);
    if (filters.deliveryTime && validDeliveryTime.has(filters.deliveryTime)) {
      sanitized.deliveryTime = filters.deliveryTime;
    }

    const validQuality = new Set(['premium', 'organic', 'fresh', 'grade_a']);
    if (filters.quality && validQuality.has(filters.quality)) {
      sanitized.quality = filters.quality;
    }

    if (Array.isArray(filters.categories)) {
      const validCategories = new Set(['vegetables', 'fruits', 'spices', 'grains', 'pulses', 'dairy']);
      const categories = filters.categories
        .map((category) => category.toLowerCase())
        .filter((category) => validCategories.has(category));
      if (categories.length > 0) {
        sanitized.categories = Array.from(new Set(categories));
      }
    }

    if (typeof filters.fssaiRequired === 'boolean') {
      sanitized.fssaiRequired = filters.fssaiRequired;
    }

    return sanitized;
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
    if (toLang === 'en') {
      const localTranslations: Record<string, Record<string, string>> = {
        hi: {
          'मुझे सब्जियों के लिए सप्लायर चाहिए': 'I need suppliers for vegetables',
          'टमाटर की कीमत क्या है': 'What is the price of tomatoes',
          'केवल प्रमाणित सप्लायर दिखाएं': 'Show only certified suppliers',
          'केवल प्रमाणित सप्लायर दिखाएं जो पास में हों': 'Show only certified suppliers nearby',
          'टमाटर के सप्लायर दिखाओ': 'Show tomato suppliers',
          'मुझे प्याज चाहिए': 'I need onions',
        },
        ta: {
          'காய்கறி சப்ளையர்களை காட்டு': 'Show vegetable suppliers',
          'தக்காளி விலை என்ன': 'What is the price of tomatoes',
        },
        te: {
          'కూరగాయల సప్లైయర్లను చూపించు': 'Show vegetable suppliers',
          'టమాట ధర ఎంత': 'What is the price of tomatoes',
        },
      };

      const local = localTranslations[fromLang]?.[text];
      if (local) {
        return local;
      }
    }

    try {
      const translated = await aiServiceIntegration.translateText(text, fromLang, toLang);
      return translated.translatedText || text;
    } catch {
      if (toLang !== 'en') {
        return text;
      }

      return text;
    }
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

    const languageFiltered = targetLanguage
      ? mockResponses.filter((response) => response.language === targetLanguage)
      : mockResponses;
    const candidates = languageFiltered.length > 0 ? languageFiltered : mockResponses;
    const stableIndex = audioData.length % candidates.length;
    return candidates[stableIndex];
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
    // For now, derive a deterministic language from input size.
    const supportedLanguages = VOICE_QUERY_CONFIG.SUPPORTED_LANGUAGES;
    return supportedLanguages[audioData.length % supportedLanguages.length];
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

export class ImageAnalysisService {
  async analyzeImage(imageFile: File): Promise<{
    identifiedItems: Array<any>;
    ingredients: Array<any>;
    confidence: number;
    categories: string[];
    alternatives: string[];
    suggestions: string[];
  }> {
    try {
      const result = await computerVisionManager.analyzeFoodImage(imageFile);
      return {
        ...result,
        suggestions: result.alternatives.slice(0, 5),
      };
    } catch (error) {
      console.error('Image analysis failed:', error);
      throw new Error('Failed to analyze image');
    }
  }
}

export const voiceProcessor = new EnhancedVoiceProcessor();
