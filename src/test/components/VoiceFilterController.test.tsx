import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import VoiceFilterController from '../../components/VoiceFilterController';

// Mock the Convex client
const mockConvex = new ConvexReactClient('mock-url');

// Mock the voice processor
vi.mock('../../utils/enhancedVoiceProcessor', () => ({
  voiceProcessor: {
    processAudioToText: vi.fn(),
    parseSearchQuery: vi.fn()
  }
}));

// Mock Web Audio API
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  stream: {
    getTracks: vi.fn(() => [{ stop: vi.fn() }])
  },
  state: 'inactive',
  mimeType: 'audio/webm'
};

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn()
  })),
  createAnalyser: vi.fn(() => ({
    fftSize: 512,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 256,
    getByteFrequencyData: vi.fn()
  })),
  close: vi.fn()
};

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [{ stop: vi.fn() }]
    }))
  }
});

// Mock MediaRecorder
global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
global.MediaRecorder.isTypeSupported = vi.fn(() => true);

// Mock AudioContext
global.AudioContext = vi.fn(() => mockAudioContext) as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

describe('VoiceFilterController', () => {
  const mockProps = {
    currentFilters: {},
    onFiltersChanged: vi.fn(),
    supportedLanguages: ['en', 'hi', 'ta'],
    userRole: 'vendor' as const,
    className: 'test-class'
  };

  const mockVoicePreferences = {
    userId: 'test-user',
    preferredLanguage: 'en',
    voiceSpeed: 1.0,
    autoTranslate: true,
    voiceShortcuts: {},
    filterPresets: {
      'nearby-certified': {
        location: 'within 5km',
        fssaiRequired: true
      }
    },
    privacySettings: {
      storeAudio: false,
      shareForImprovement: false,
      retentionDays: 30
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Convex queries and mutations
    vi.spyOn(mockConvex, 'query').mockImplementation((query) => {
      if (query.toString().includes('getVoicePreferences')) {
        return mockVoicePreferences;
      }
      return null;
    });

    vi.spyOn(mockConvex, 'mutation').mockImplementation(() => 
      Promise.resolve('mock-id')
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <ConvexProvider client={mockConvex}>
        <VoiceFilterController {...mockProps} {...props} />
      </ConvexProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render the voice filter controller', () => {
      renderComponent();
      
      expect(screen.getByText('Voice Filters')).toBeInTheDocument();
      expect(screen.getByText('🔧 Filter Mode')).toBeInTheDocument();
      expect(screen.getByTitle('Start filter voice command')).toBeInTheDocument();
    });

    it('should show current filters when they exist', () => {
      const currentFilters = {
        location: 'within 5km',
        fssaiRequired: true,
        priceRange: { min: 20, max: 50 }
      };

      renderComponent({ currentFilters });
      
      expect(screen.getByText('Current Filters:')).toBeInTheDocument();
      expect(screen.getByText(/Location: within 5km/)).toBeInTheDocument();
      expect(screen.getByText(/Price: ₹20-50/)).toBeInTheDocument();
      expect(screen.getByText(/FSSAI Required/)).toBeInTheDocument();
    });

    it('should render language selector with supported languages', () => {
      renderComponent();
      
      const languageSelect = screen.getByDisplayValue('Auto-detect');
      expect(languageSelect).toBeInTheDocument();
      
      fireEvent.click(languageSelect);
      expect(screen.getByText('EN')).toBeInTheDocument();
      expect(screen.getByText('HI')).toBeInTheDocument();
      expect(screen.getByText('TA')).toBeInTheDocument();
    });
  });

  describe('Voice Recording', () => {
    it('should start recording when mic button is clicked', async () => {
      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      
      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });
      });
      
      expect(screen.getByText(/Recording/)).toBeInTheDocument();
      expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
    });

    it('should stop recording when stop button is clicked', async () => {
      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      
      await waitFor(() => {
        expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
      });
      
      const stopButton = screen.getByTitle('Stop Recording');
      fireEvent.click(stopButton);
      
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should handle microphone access denied error', async () => {
      const mockGetUserMedia = vi.fn(() => 
        Promise.reject(new Error('NotAllowedError'))
      );
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: mockGetUserMedia
      });

      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Microphone access denied/)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Processing', () => {
    it('should process voice input and show confirmation dialog', async () => {
      const { voiceProcessor } = await import('../../utils/enhancedVoiceProcessor');
      
      vi.mocked(voiceProcessor.processAudioToText).mockResolvedValue({
        transcription: 'Show only FSSAI certified suppliers within 5km',
        language: 'en',
        confidence: 0.9,
        alternatives: [],
        processingTime: 1500
      });

      vi.mocked(voiceProcessor.parseSearchQuery).mockResolvedValue({
        originalText: 'Show only FSSAI certified suppliers within 5km',
        translatedText: 'Show only FSSAI certified suppliers within 5km',
        language: 'en',
        confidence: 0.9,
        searchTerms: ['suppliers'],
        filters: {
          fssaiRequired: true,
          location: 'within 5km'
        }
      });

      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      
      // Simulate recording completion
      await waitFor(() => {
        expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle('Stop Recording'));
      
      await waitFor(() => {
        expect(screen.getByText('Detected Filter Criteria:')).toBeInTheDocument();
        expect(screen.getByText(/Location: within 5km/)).toBeInTheDocument();
        expect(screen.getByText(/FSSAI Required/)).toBeInTheDocument();
      });
      
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
      expect(screen.getByText('Modify')).toBeInTheDocument();
    });

    it('should apply parsed filters when confirmed', async () => {
      const onFiltersChanged = vi.fn();
      const { voiceProcessor } = await import('../../utils/enhancedVoiceProcessor');
      
      vi.mocked(voiceProcessor.processAudioToText).mockResolvedValue({
        transcription: 'Show premium quality suppliers',
        language: 'en',
        confidence: 0.85,
        alternatives: [],
        processingTime: 1200
      });

      vi.mocked(voiceProcessor.parseSearchQuery).mockResolvedValue({
        originalText: 'Show premium quality suppliers',
        translatedText: 'Show premium quality suppliers',
        language: 'en',
        confidence: 0.85,
        searchTerms: ['suppliers'],
        filters: {
          quality: 'premium'
        }
      });

      renderComponent({ onFiltersChanged });
      
      // Simulate voice processing completion
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      fireEvent.click(screen.getByTitle('Stop Recording'));
      
      await waitFor(() => {
        expect(screen.getByText('Apply Filters')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Apply Filters'));
      
      expect(onFiltersChanged).toHaveBeenCalledWith({
        quality: 'premium'
      });
      
      await waitFor(() => {
        expect(screen.getByText('Filters applied successfully!')).toBeInTheDocument();
      });
    });

    it('should allow modification of parsed filters', async () => {
      const { voiceProcessor } = await import('../../utils/enhancedVoiceProcessor');
      
      vi.mocked(voiceProcessor.processAudioToText).mockResolvedValue({
        transcription: 'Show suppliers within 10km',
        language: 'en',
        confidence: 0.8,
        alternatives: [],
        processingTime: 1800
      });

      vi.mocked(voiceProcessor.parseSearchQuery).mockResolvedValue({
        originalText: 'Show suppliers within 10km',
        translatedText: 'Show suppliers within 10km',
        language: 'en',
        confidence: 0.8,
        searchTerms: ['suppliers'],
        filters: {
          location: 'within 10km'
        }
      });

      renderComponent();
      
      // Simulate voice processing
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      fireEvent.click(screen.getByTitle('Stop Recording'));
      
      await waitFor(() => {
        expect(screen.getByText('Modify')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Modify'));
      
      // Should hide confirmation dialog
      expect(screen.queryByText('Detected Filter Criteria:')).not.toBeInTheDocument();
    });
  });

  describe('Filter Presets', () => {
    it('should show filter presets when presets button is clicked', async () => {
      renderComponent();
      
      const presetsButton = screen.getByTitle('Filter Presets');
      fireEvent.click(presetsButton);
      
      await waitFor(() => {
        expect(screen.getByText('Filter Presets')).toBeInTheDocument();
        expect(screen.getByText('nearby-certified')).toBeInTheDocument();
      });
    });

    it('should apply preset filters when preset is selected', async () => {
      const onFiltersChanged = vi.fn();
      renderComponent({ onFiltersChanged });
      
      const presetsButton = screen.getByTitle('Filter Presets');
      fireEvent.click(presetsButton);
      
      await waitFor(() => {
        expect(screen.getByText('nearby-certified')).toBeInTheDocument();
      });
      
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      
      expect(onFiltersChanged).toHaveBeenCalledWith({
        location: 'within 5km',
        fssaiRequired: true
      });
    });

    it('should save current filters as preset', async () => {
      const currentFilters = {
        quality: 'premium',
        deliveryTime: 'same_day'
      };

      // Mock prompt
      global.prompt = vi.fn()
        .mockReturnValueOnce('Premium Same Day')
        .mockReturnValueOnce('Apply premium same day filters');

      renderComponent({ currentFilters });
      
      const presetsButton = screen.getByTitle('Filter Presets');
      fireEvent.click(presetsButton);
      
      await waitFor(() => {
        expect(screen.getByText('Save Current')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Save Current'));
      
      expect(global.prompt).toHaveBeenCalledTimes(2);
      
      await waitFor(() => {
        expect(screen.getByText(/Saved "Premium Same Day" as filter preset/)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Management', () => {
    it('should clear all filters when clear button is clicked', () => {
      const onFiltersChanged = vi.fn();
      const currentFilters = {
        location: 'within 5km',
        quality: 'premium'
      };

      renderComponent({ currentFilters, onFiltersChanged });
      
      const clearButton = screen.getByText('Clear All');
      fireEvent.click(clearButton);
      
      expect(onFiltersChanged).toHaveBeenCalledWith({});
    });

    it('should format filters correctly for display', () => {
      const currentFilters = {
        location: 'within 5km',
        priceRange: { min: 20, max: 50 },
        categories: ['vegetables', 'fruits'],
        quality: 'premium',
        deliveryTime: 'same_day',
        fssaiRequired: true
      };

      renderComponent({ currentFilters });
      
      expect(screen.getByText(/Location: within 5km/)).toBeInTheDocument();
      expect(screen.getByText(/Price: ₹20-50/)).toBeInTheDocument();
      expect(screen.getByText(/Categories: vegetables, fruits/)).toBeInTheDocument();
      expect(screen.getByText(/Quality: premium/)).toBeInTheDocument();
      expect(screen.getByText(/Delivery: same_day/)).toBeInTheDocument();
      expect(screen.getByText(/FSSAI Required/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error when audio is too short', async () => {
      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      
      // Simulate very short recording
      setTimeout(() => {
        fireEvent.click(screen.getByTitle('Stop Recording'));
      }, 100);
      
      await waitFor(() => {
        expect(screen.getByText(/Audio recording is too short/)).toBeInTheDocument();
      });
    });

    it('should show error when voice processing fails', async () => {
      const { voiceProcessor } = await import('../../utils/enhancedVoiceProcessor');
      
      vi.mocked(voiceProcessor.processAudioToText).mockRejectedValue(
        new Error('Processing failed')
      );

      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      
      // Simulate recording for sufficient time
      setTimeout(() => {
        fireEvent.click(screen.getByTitle('Stop Recording'));
      }, 1000);
      
      await waitFor(() => {
        expect(screen.getByText(/Processing failed/)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error messages', async () => {
      renderComponent();
      
      // Trigger an error
      const mockGetUserMedia = vi.fn(() => 
        Promise.reject(new Error('NotAllowedError'))
      );
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: mockGetUserMedia
      });

      const micButton = screen.getByTitle('Start filter voice command');
      fireEvent.click(micButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Microphone access denied/)).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText(/Microphone access denied/)).not.toBeInTheDocument();
    });
  });

  describe('Voice Command Examples', () => {
    it('should show voice command examples', () => {
      renderComponent();
      
      expect(screen.getByText('Example voice commands:')).toBeInTheDocument();
      expect(screen.getByText('• "Show only FSSAI certified suppliers"')).toBeInTheDocument();
      expect(screen.getByText('• "Filter by price range 20 to 50 rupees"')).toBeInTheDocument();
      expect(screen.getByText('• "Show suppliers within 5 kilometers"')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      expect(micButton).toHaveAttribute('type', 'button');
      
      const languageSelect = screen.getByDisplayValue('Auto-detect');
      expect(languageSelect).toHaveAttribute('role', 'combobox');
    });

    it('should support keyboard navigation', () => {
      renderComponent();
      
      const micButton = screen.getByTitle('Start filter voice command');
      micButton.focus();
      expect(document.activeElement).toBe(micButton);
      
      fireEvent.keyDown(micButton, { key: 'Enter' });
      // Should start recording (tested in other tests)
    });
  });
});