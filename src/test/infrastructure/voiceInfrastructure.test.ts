/**
 * Enhanced Voice Processing Infrastructure Tests
 * Tests all components of the voice processing infrastructure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedVoiceProcessor, ImageAnalysisService } from '../../utils/enhancedVoiceProcessor';
import { aiServiceIntegration } from '../../services/aiServiceIntegration';
import { computerVisionManager } from '../../utils/computerVision';
import { VOICE_QUERY_CONFIG, FOOD_CATEGORIES } from '../../config/voiceQuery';

// Mock environment variables
vi.mock('../../config/voiceQuery', () => ({
  VOICE_QUERY_CONFIG: {
    MAX_RECORDING_TIME: 30000,
    SAMPLE_RATE: 44100,
    SUPPORTED_LANGUAGES: ['en', 'hi', 'ta', 'te', 'bn'],
    API_TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    VOICE_PROCESSING: {
      confidenceThreshold: 0.7,
      maxProcessingTime: 5000
    },
    IMAGE_ANALYSIS: {
      maxImageSize: 4 * 1024 * 1024,
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      confidenceThreshold: 0.6,
      maxProcessingTime: 10000,
      providers: {
        google: { baseUrl: 'https://vision.googleapis.com/v1' },
        clarifai: { baseUrl: 'https://api.clarifai.com/v2' }
      }
    },
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
    }
  },
  FOOD_CATEGORIES: {
    VEGETABLES: ['tomato', 'onion', 'potato'],
    FRUITS: ['apple', 'banana', 'orange'],
    GRAINS: ['rice', 'wheat', 'barley'],
    SPICES: ['turmeric', 'chili', 'coriander']
  },
  ERROR_MESSAGES: {
    SARVAM_API_ERROR: 'Speech recognition service is unavailable',
    OPENROUTER_API_ERROR: 'AI response service is unavailable',
    VISION_API_ERROR: 'Image analysis service is unavailable'
  }
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Enhanced Voice Processing Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        transcript: 'test transcript',
        language: 'en',
        confidence: 0.9
      })
    });
  });

  describe('Environment Configuration', () => {
    it('should have all required configuration values', () => {
      expect(VOICE_QUERY_CONFIG.MAX_RECORDING_TIME).toBeDefined();
      expect(VOICE_QUERY_CONFIG.SUPPORTED_LANGUAGES).toContain('en');
      expect(VOICE_QUERY_CONFIG.SUPPORTED_LANGUAGES).toContain('hi');
      expect(VOICE_QUERY_CONFIG.AI_SERVICES.sarvam.baseUrl).toBeDefined();
      expect(VOICE_QUERY_CONFIG.AI_SERVICES.openRouter.baseUrl).toBeDefined();
    });

    it('should have proper image analysis configuration', () => {
      expect(VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.maxImageSize).toBeGreaterThan(0);
      expect(VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.supportedFormats).toContain('image/jpeg');
      expect(VOICE_QUERY_CONFIG.IMAGE_ANALYSIS.confidenceThreshold).toBeGreaterThan(0);
    });

    it('should have food categories defined', () => {
      expect(FOOD_CATEGORIES.VEGETABLES).toBeDefined();
      expect(FOOD_CATEGORIES.VEGETABLES.length).toBeGreaterThan(0);
      expect(FOOD_CATEGORIES.SPICES).toBeDefined();
      expect(FOOD_CATEGORIES.GRAINS).toBeDefined();
    });
  });

  describe('AI Service Integration', () => {
    it('should initialize with proper configuration', () => {
      const serviceStatus = aiServiceIntegration.getServiceStatus();
      expect(serviceStatus).toBeDefined();
      expect(typeof serviceStatus.sarvamConfigured).toBe('boolean');
      expect(typeof serviceStatus.openRouterConfigured).toBe('boolean');
      expect(typeof serviceStatus.visionConfigured).toBe('boolean');
    });

    it('should perform health check', async () => {
      const healthStatus = await aiServiceIntegration.healthCheck();
      expect(healthStatus).toBeDefined();
      expect(healthStatus).toHaveProperty('sarvam');
      expect(healthStatus).toHaveProperty('openRouter');
      expect(healthStatus).toHaveProperty('vision');
    });

    it('should handle speech-to-text processing', async () => {
      const mockAudioBlob = new Blob(['test audio'], { type: 'audio/wav' });
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          transcript: 'मुझे टमाटर चाहिए',
          language: 'hi',
          confidence: 0.9
        })
      });

      const result = await aiServiceIntegration.speechToText(mockAudioBlob, 'hi');
      
      expect(result).toBeDefined();
      expect(result.transcript).toBe('मुझे टमाटर चाहिए');
      expect(result.language).toBe('hi');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle translation', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'I need tomatoes'
            }
          }]
        })
      });

      const result = await aiServiceIntegration.translateText('मुझे टमाटर चाहिए', 'hi', 'en');
      
      expect(result).toBeDefined();
      expect(result.translatedText).toBe('I need tomatoes');
      expect(result.sourceLanguage).toBe('hi');
      expect(result.targetLanguage).toBe('en');
    });

    it('should generate AI responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'I found 5 suppliers near you with fresh tomatoes.'
            }
          }]
        })
      });

      const result = await aiServiceIntegration.generateAIResponse(
        'Find tomato suppliers',
        { userRole: 'vendor', location: 'Mumbai' }
      );
      
      expect(result).toBeDefined();
      expect(result.response).toContain('suppliers');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Voice Processor', () => {
    let voiceProcessor: EnhancedVoiceProcessor;

    beforeEach(() => {
      voiceProcessor = new EnhancedVoiceProcessor();
    });

    it('should initialize properly', () => {
      expect(voiceProcessor).toBeDefined();
    });

    it('should process voice search queries', async () => {
      const mockAudioData = new Uint8Array([1, 2, 3, 4, 5]);
      const mockUserContext = {
        userId: 'test-user',
        userRole: 'vendor' as const,
        location: {
          city: 'Mumbai',
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        preferences: {
          language: 'hi',
          categories: ['vegetables'],
          budgetRange: { min: 20, max: 100 }
        },
        orderHistory: []
      };

      // Mock the transcription response
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            transcript: 'टमाटर के सप्लायर दिखाओ',
            language: 'hi',
            confidence: 0.9
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'Show tomato suppliers'
              }
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: '{"items": ["tomato"], "filters": {}, "searchType": "item"}'
              }
            }]
          })
        });

      const result = await voiceProcessor.processVoiceSearch(mockAudioData, mockUserContext);
      
      expect(result).toBeDefined();
      expect(result.originalQuery).toBe('टमाटर के सप्लायर दिखाओ');
      expect(result.language).toBe('hi');
      expect(result.confidence).toBe(0.9);
    });

    it('should process voice filter commands', async () => {
      const mockAudioData = new Uint8Array([1, 2, 3, 4, 5]);
      const currentFilters = {
        location: 'Mumbai',
        categories: ['vegetables']
      };

      // Mock the responses
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            transcript: 'केवल FSSAI certified suppliers दिखाओ',
            language: 'hi',
            confidence: 0.85
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'Show only FSSAI certified suppliers'
              }
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: '{"fssaiRequired": true}'
              }
            }]
          })
        });

      const result = await voiceProcessor.processVoiceFilter(mockAudioData, currentFilters);
      
      expect(result).toBeDefined();
      expect(result.fssaiRequired).toBe(true);
    });

    it('should generate contextual voice responses', async () => {
      const mockContext = {
        userId: 'test-user',
        userRole: 'vendor' as const,
        location: {
          city: 'Mumbai',
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        preferences: {
          language: 'hi',
          categories: ['vegetables'],
          budgetRange: { min: 20, max: 100 }
        },
        orderHistory: []
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'I found 3 vegetable suppliers near you in Mumbai.'
              }
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'मुंबई में आपके पास 3 सब्जी सप्लायर मिले हैं।'
              }
            }]
          })
        });

      const result = await voiceProcessor.generateVoiceResponse(
        'Find vegetable suppliers',
        mockContext,
        'hi'
      );
      
      expect(result).toBeDefined();
      expect(result.answer).toContain('सप्लायर');
      expect(result.language).toBe('hi');
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Image Analysis Service', () => {
    let imageAnalysisService: ImageAnalysisService;

    beforeEach(() => {
      imageAnalysisService = new ImageAnalysisService();
    });

    it('should initialize properly', () => {
      expect(imageAnalysisService).toBeDefined();
    });

    it('should analyze food images', async () => {
      const mockImageFile = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });

      // Mock vision API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          responses: [{
            localizedObjectAnnotations: [
              { name: 'Tomato', score: 0.95 },
              { name: 'Onion', score: 0.87 }
            ],
            labelAnnotations: [
              { description: 'Vegetable', score: 0.9 },
              { description: 'Food', score: 0.95 }
            ]
          }]
        })
      });

      const result = await imageAnalysisService.analyzeImage(mockImageFile);
      
      expect(result).toBeDefined();
      expect(result.identifiedItems).toBeDefined();
      expect(result.ingredients).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle image processing errors gracefully', async () => {
      const mockImageFile = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });

      // Mock API error
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      await expect(imageAnalysisService.analyzeImage(mockImageFile))
        .rejects.toThrow('Failed to analyze image');
    });
  });

  describe('Computer Vision Manager', () => {
    it('should initialize with available providers', () => {
      expect(computerVisionManager).toBeDefined();
      expect(typeof computerVisionManager.isAvailable()).toBe('boolean');
    });

    it('should get available providers', () => {
      const providers = computerVisionManager.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should validate image files', async () => {
      const validImageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const invalidImageFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      // Mock successful analysis for valid file
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          responses: [{
            localizedObjectAnnotations: [],
            labelAnnotations: []
          }]
        })
      });

      // Valid file should work
      await expect(computerVisionManager.analyzeFoodImage(validImageFile))
        .resolves.toBeDefined();

      // Invalid file should throw error
      await expect(computerVisionManager.analyzeFoodImage(invalidImageFile))
        .rejects.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete voice-to-search workflow', async () => {
      const mockAudioData = new Uint8Array([1, 2, 3, 4, 5]);
      const mockUserContext = {
        userId: 'test-user',
        userRole: 'vendor' as const,
        location: {
          city: 'Mumbai',
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        preferences: {
          language: 'hi',
          categories: ['vegetables'],
          budgetRange: { min: 20, max: 100 }
        },
        orderHistory: []
      };

      const voiceProcessor = new EnhancedVoiceProcessor();

      // Mock all API calls in sequence
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            transcript: 'मुझे प्याज चाहिए',
            language: 'hi',
            confidence: 0.9
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'I need onions'
              }
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: '{"items": ["onion"], "filters": {"categories": ["vegetables"]}, "searchType": "item"}'
              }
            }]
          })
        });

      const result = await voiceProcessor.processVoiceSearch(mockAudioData, mockUserContext);
      
      expect(result).toBeDefined();
      expect(result.originalQuery).toBe('मुझे प्याज चाहिए');
      expect(result.translatedQuery).toBe('I need onions');
      expect(result.language).toBe('hi');
    });

    it('should handle complete image-to-suppliers workflow', async () => {
      const mockImageFile = new File(['test image'], 'food.jpg', { type: 'image/jpeg' });

      // Mock vision API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          responses: [{
            localizedObjectAnnotations: [
              { name: 'Potato', score: 0.92 },
              { name: 'Onion', score: 0.88 }
            ],
            labelAnnotations: [
              { description: 'Vegetable', score: 0.95 },
              { description: 'Root vegetable', score: 0.85 }
            ]
          }]
        })
      });

      const result = await computerVisionManager.analyzeFoodImage(mockImageFile);
      
      expect(result).toBeDefined();
      expect(result.identifiedItems.length).toBeGreaterThan(0);
      expect(result.ingredients.length).toBeGreaterThan(0);
      expect(result.categories).toContain('vegetables');
    });
  });

  describe('Error Handling', () => {
    it('should handle API timeouts gracefully', async () => {
      const mockAudioBlob = new Blob(['test'], { type: 'audio/wav' });

      // Mock timeout error
      (global.fetch as any).mockRejectedValueOnce(new Error('Timeout'));

      await expect(aiServiceIntegration.speechToText(mockAudioBlob))
        .rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      const mockImageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(computerVisionManager.analyzeFoodImage(mockImageFile))
        .rejects.toThrow();
    });

    it('should handle invalid API responses', async () => {
      const mockAudioBlob = new Blob(['test'], { type: 'audio/wav' });

      // Mock invalid response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      });

      await expect(aiServiceIntegration.speechToText(mockAudioBlob))
        .rejects.toThrow();
    });
  });
});