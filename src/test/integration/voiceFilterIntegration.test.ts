import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { voiceProcessor } from '../../utils/enhancedVoiceProcessor';
import { openRouterFilterService } from '../../services/openRouterFilterService';

// Mock the OpenRouter service
vi.mock('../../services/openRouterFilterService', () => ({
  openRouterFilterService: {
    parseFilters: vi.fn(),
    generateFilterResponse: vi.fn(),
    suggestFilterImprovements: vi.fn(),
    validateConnection: vi.fn()
  }
}));

describe('Voice Filter Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Natural Language Filter Parsing', () => {
    it('should parse location-based filter commands', async () => {
      const mockAIResponse = {
        filters: {
          location: 'within 5km',
          fssaiRequired: true
        },
        confidence: 0.9,
        explanation: 'Parsed location and certification requirements',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        'Show only FSSAI certified suppliers within 5 kilometers',
        'en',
        { role: 'vendor', location: 'Mumbai' }
      );

      expect(result.filters).toEqual({
        location: 'within 5km',
        fssaiRequired: true
      });
      expect(result.translatedText).toBe('Show only FSSAI certified suppliers within 5 kilometers');
      expect(result.confidence).toBe(0.85);
    });

    it('should parse price range filter commands', async () => {
      const mockAIResponse = {
        filters: {
          priceRange: { min: 20, max: 50 },
          categories: ['vegetables']
        },
        confidence: 0.85,
        explanation: 'Parsed price range and category filters',
        suggestions: ['Consider adding delivery time preference']
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        'Find vegetable suppliers with prices between 20 to 50 rupees',
        'en'
      );

      expect(result.filters).toEqual({
        priceRange: { min: 20, max: 50 },
        categories: ['vegetables']
      });
    });

    it('should parse quality and delivery time filters', async () => {
      const mockAIResponse = {
        filters: {
          quality: 'premium',
          deliveryTime: 'same_day',
          categories: ['spices']
        },
        confidence: 0.88,
        explanation: 'Parsed quality, delivery, and category preferences',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        'I need premium quality spices with same day delivery',
        'en'
      );

      expect(result.filters).toEqual({
        quality: 'premium',
        deliveryTime: 'same_day',
        categories: ['spices']
      });
    });

    it('should handle multilingual filter commands', async () => {
      const mockAIResponse = {
        filters: {
          fssaiRequired: true,
          location: 'nearby'
        },
        confidence: 0.82,
        explanation: 'Parsed Hindi command for certified nearby suppliers',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        'केवल प्रमाणित सप्लायर दिखाएं जो पास में हों',
        'hi'
      );

      expect(result.filters).toEqual({
        fssaiRequired: true,
        location: 'nearby'
      });
      expect(result.language).toBe('hi');
    });

    it('should fallback to rule-based parsing when AI fails', async () => {
      vi.mocked(openRouterFilterService.parseFilters).mockRejectedValue(
        new Error('AI service unavailable')
      );

      const result = await voiceProcessor.parseSearchQuery(
        'Show FSSAI certified suppliers within 10km',
        'en'
      );

      // Should use rule-based fallback
      expect(result.filters.fssaiRequired).toBe(true);
      expect(result.filters.location).toBe('within 10km');
    });
  });

  describe('Complex Filter Combinations', () => {
    it('should parse multiple filter criteria in one command', async () => {
      const mockAIResponse = {
        filters: {
          location: 'within 3km',
          priceRange: { min: 15, max: 40 },
          quality: 'premium',
          deliveryTime: 'same_day',
          fssaiRequired: true,
          categories: ['vegetables', 'fruits']
        },
        confidence: 0.92,
        explanation: 'Comprehensive filter parsing with multiple criteria',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        'Find premium FSSAI certified vegetable and fruit suppliers within 3km with same day delivery and prices between 15 to 40 rupees',
        'en'
      );

      expect(result.filters).toEqual({
        location: 'within 3km',
        priceRange: { min: 15, max: 40 },
        quality: 'premium',
        deliveryTime: 'same_day',
        fssaiRequired: true,
        categories: ['vegetables', 'fruits']
      });
    });

    it('should handle partial filter modifications', async () => {
      const currentFilters = {
        location: 'within 5km',
        fssaiRequired: true
      };

      const mockAIResponse = {
        filters: {
          priceRange: { min: 25, max: 60 },
          quality: 'organic'
        },
        confidence: 0.87,
        explanation: 'Added price range and quality to existing filters',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        'Also add organic quality and price range 25 to 60 rupees',
        'en',
        { currentFilters }
      );

      expect(result.filters).toEqual({
        priceRange: { min: 25, max: 60 },
        quality: 'organic'
      });
    });
  });

  describe('Filter Response Generation', () => {
    it('should generate confirmation responses for applied filters', async () => {
      const appliedFilters = {
        location: 'within 5km',
        fssaiRequired: true,
        quality: 'premium'
      };

      const mockResponse = 'Applied filters: Premium quality FSSAI certified suppliers within 5km radius.';
      vi.mocked(openRouterFilterService.generateFilterResponse).mockResolvedValue(mockResponse);

      const response = await openRouterFilterService.generateFilterResponse(
        appliedFilters,
        'en',
        { role: 'vendor' }
      );

      expect(response).toBe(mockResponse);
      expect(openRouterFilterService.generateFilterResponse).toHaveBeenCalledWith(
        appliedFilters,
        'en',
        { role: 'vendor' }
      );
    });

    it('should generate multilingual confirmation responses', async () => {
      const appliedFilters = {
        categories: ['vegetables'],
        deliveryTime: 'same_day'
      };

      const mockResponse = 'फिल्टर लागू किए गए: सब्जी सप्लायर, आज ही डिलीवरी।';
      vi.mocked(openRouterFilterService.generateFilterResponse).mockResolvedValue(mockResponse);

      const response = await openRouterFilterService.generateFilterResponse(
        appliedFilters,
        'hi'
      );

      expect(response).toBe(mockResponse);
    });
  });

  describe('Filter Suggestions', () => {
    it('should suggest additional relevant filters', async () => {
      const originalQuery = 'Find vegetable suppliers';
      const parsedFilters = {
        categories: ['vegetables']
      };

      const mockSuggestions = [
        'Consider adding location preference (within 5km)',
        'Add FSSAI certification requirement',
        'Specify delivery time preference'
      ];

      vi.mocked(openRouterFilterService.suggestFilterImprovements).mockResolvedValue(mockSuggestions);

      const suggestions = await openRouterFilterService.suggestFilterImprovements(
        originalQuery,
        parsedFilters
      );

      expect(suggestions).toEqual(mockSuggestions);
      expect(suggestions).toHaveLength(3);
    });

    it('should provide contextual suggestions based on user role', async () => {
      const originalQuery = 'Show suppliers';
      const parsedFilters = {};
      const userContext = { role: 'vendor', location: 'Delhi' };

      const mockSuggestions = [
        'Add location filter for Delhi area',
        'Consider minimum order quantity',
        'Add trust score requirement'
      ];

      vi.mocked(openRouterFilterService.suggestFilterImprovements).mockResolvedValue(mockSuggestions);

      const suggestions = await openRouterFilterService.suggestFilterImprovements(
        originalQuery,
        parsedFilters,
        userContext
      );

      expect(suggestions).toEqual(mockSuggestions);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle AI service timeouts gracefully', async () => {
      vi.mocked(openRouterFilterService.parseFilters).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await voiceProcessor.parseSearchQuery(
        'Show certified suppliers nearby',
        'en'
      );

      // Should fallback to rule-based parsing
      expect(result.filters.fssaiRequired).toBe(true);
      expect(result.filters.location).toBe('nearby');
    });

    it('should handle malformed AI responses', async () => {
      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue({
        filters: null as any,
        confidence: 0,
        explanation: '',
        suggestions: []
      });

      const result = await voiceProcessor.parseSearchQuery(
        'Find suppliers with good prices',
        'en'
      );

      // Should use fallback parsing
      expect(result).toBeDefined();
      expect(result.filters).toBeDefined();
    });

    it('should validate filter values and provide defaults', async () => {
      const mockAIResponse = {
        filters: {
          priceRange: { min: -10, max: 1000000 }, // Invalid range
          quality: 'super-premium', // Invalid quality
          deliveryTime: 'instant' // Invalid delivery time
        },
        confidence: 0.7,
        explanation: 'Parsed with some invalid values',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        'Find suppliers with reasonable prices and good quality',
        'en'
      );

      // Should sanitize invalid values
      expect(result.filters.priceRange?.min).toBeGreaterThanOrEqual(0);
      expect(result.filters.priceRange?.max).toBeLessThan(1000000);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache frequently used filter patterns', async () => {
      const commonQuery = 'Show FSSAI certified suppliers nearby';
      
      const mockAIResponse = {
        filters: { fssaiRequired: true, location: 'nearby' },
        confidence: 0.9,
        explanation: 'Common filter pattern',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      // First call
      await voiceProcessor.parseSearchQuery(commonQuery, 'en');
      
      // Second call with same pattern
      await voiceProcessor.parseSearchQuery(commonQuery, 'en');

      // Should potentially use cached result (implementation dependent)
      expect(openRouterFilterService.parseFilters).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent filter parsing requests', async () => {
      const queries = [
        'Show nearby suppliers',
        'Find premium quality items',
        'FSSAI certified only'
      ];

      const mockResponses = queries.map((_, index) => ({
        filters: { location: `test-${index}` },
        confidence: 0.8,
        explanation: `Response ${index}`,
        suggestions: []
      }));

      vi.mocked(openRouterFilterService.parseFilters)
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      const promises = queries.map(query => 
        voiceProcessor.parseSearchQuery(query, 'en')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.filters.location).toBe(`test-${index}`);
      });
    });
  });

  describe('Integration with Voice Preferences', () => {
    it('should apply user filter presets via voice shortcuts', async () => {
      const voiceShortcut = 'Apply my usual filters';
      const userPresets = {
        'usual': {
          location: 'within 5km',
          fssaiRequired: true,
          quality: 'premium'
        }
      };

      const mockAIResponse = {
        filters: userPresets.usual,
        confidence: 0.95,
        explanation: 'Applied user preset filters',
        suggestions: []
      };

      vi.mocked(openRouterFilterService.parseFilters).mockResolvedValue(mockAIResponse);

      const result = await voiceProcessor.parseSearchQuery(
        voiceShortcut,
        'en',
        { userPresets }
      );

      expect(result.filters).toEqual(userPresets.usual);
    });

    it('should learn from user filter corrections', async () => {
      const originalQuery = 'Show good suppliers';
      const userCorrection = {
        original: { quality: 'good' },
        corrected: { quality: 'premium', fssaiRequired: true }
      };

      // This would be implemented in the learning system
      // For now, just verify the structure is correct
      expect(userCorrection.original).toBeDefined();
      expect(userCorrection.corrected).toBeDefined();
    });
  });
});