import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VoiceFilterController from '../../components/VoiceFilterController';

const convexMocks = vi.hoisted(() => {
  const query = vi.fn();
  const mutation = vi.fn(() => Promise.resolve('mock-id'));

  return {
    query,
    mutation,
    client: {
      query: (...args: any[]) => query(...args),
    },
  };
});

vi.mock('convex/react', () => ({
  useMutation: vi.fn(() => convexMocks.mutation),
  useConvex: vi.fn(() => convexMocks.client),
}));

vi.mock('../../utils/enhancedVoiceProcessor', () => ({
  voiceProcessor: {
    processAudioToText: vi.fn(),
    parseSearchQuery: vi.fn(),
  },
}));

describe('VoiceFilterController', () => {
  const mockProps = {
    currentFilters: {},
    onFiltersChanged: vi.fn(),
    supportedLanguages: ['en', 'hi', 'ta'],
    userRole: 'vendor' as const,
    className: 'test-class',
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
        fssaiRequired: true,
      },
    },
    privacySettings: {
      storeAudio: false,
      shareForImprovement: false,
      retentionDays: 30,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    convexMocks.query.mockResolvedValue(mockVoicePreferences);
    convexMocks.mutation.mockResolvedValue('mock-id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(<VoiceFilterController {...mockProps} {...props} />);
  };

  it('renders voice filter header and controls', () => {
    renderComponent();

    expect(screen.getByText('Voice Filters')).toBeInTheDocument();
    expect(screen.getByText('🔧 Filter Mode')).toBeInTheDocument();
    expect(screen.getByTitle('Start filter voice command')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Auto-detect')).toBeInTheDocument();
  });

  it('shows current filters and clears them', () => {
    const onFiltersChanged = vi.fn();
    renderComponent({
      onFiltersChanged,
      currentFilters: {
        location: 'within 5km',
        fssaiRequired: true,
        priceRange: { min: 20, max: 50 },
      },
    });

    expect(screen.getByText('Current Filters:')).toBeInTheDocument();
    expect(screen.getByText(/Location: within 5km/)).toBeInTheDocument();
    expect(screen.getByText(/Price: ₹20-50/)).toBeInTheDocument();
    expect(screen.getByText(/FSSAI Required/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear All'));
    expect(onFiltersChanged).toHaveBeenCalledWith({});
  });

  it('shows filter presets and applies selected preset', async () => {
    const onFiltersChanged = vi.fn();
    renderComponent({ onFiltersChanged });

    fireEvent.click(screen.getByTitle('Filter Presets'));

    await waitFor(() => {
      expect(screen.getByText('Filter Presets')).toBeInTheDocument();
      expect(screen.getByText('nearby-certified')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Apply'));
    expect(onFiltersChanged).toHaveBeenCalledWith({
      location: 'within 5km',
      fssaiRequired: true,
    });
  });

  it('saves current filters as preset', async () => {
    global.prompt = vi.fn()
      .mockReturnValueOnce('Premium Same Day')
      .mockReturnValueOnce('Apply premium same day filters');

    renderComponent({
      currentFilters: {
        quality: 'premium',
        deliveryTime: 'same_day',
      },
    });

    fireEvent.click(screen.getByTitle('Filter Presets'));

    await waitFor(() => {
      expect(screen.getByText('Save Current')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Current'));

    await waitFor(() => {
      expect(screen.getByText(/Saved "Premium Same Day" as filter preset/)).toBeInTheDocument();
    });

    expect(convexMocks.mutation).toHaveBeenCalled();
  });

  it('renders example voice command guidance', () => {
    renderComponent();

    expect(screen.getByText('Example voice commands:')).toBeInTheDocument();
    expect(screen.getByText('• "Show only FSSAI certified suppliers"')).toBeInTheDocument();
    expect(screen.getByText('• "Filter by price range 20 to 50 rupees"')).toBeInTheDocument();
    expect(screen.getByText('• "Show suppliers within 5 kilometers"')).toBeInTheDocument();
  });
});
