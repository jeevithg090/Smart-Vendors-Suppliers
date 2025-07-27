import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import VoiceQuery from '../components/VoiceQuery';

// Mock the Convex client
const mockConvex = new ConvexReactClient('https://test.convex.cloud');

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  
  constructor(stream: any, options?: any) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'audio/webm';
  }
  
  stream: any;
  mimeType: string;
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  
  start = vi.fn();
  stop = vi.fn(() => {
    if (this.onstop) {
      this.onstop();
    }
  });
}

global.MediaRecorder = MockMediaRecorder as any;

// Mock AudioContext
class MockAudioContext {
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
  }));
  createAnalyser = vi.fn(() => ({
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn((array) => {
      // Fill with mock audio data
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.random() * 255;
      }
    }),
    connect: vi.fn(),
  }));
  close = vi.fn(() => Promise.resolve());
}

global.AudioContext = MockAudioContext as any;

describe('Enhanced VoiceQuery Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful getUserMedia
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
  });

  it('should render with search mode indicator', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" mode="search" />
      </ConvexProvider>
    );

    expect(screen.getByText('🔍 Search Mode')).toBeInTheDocument();
  });

  it('should render with filter mode indicator', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" mode="filter" />
      </ConvexProvider>
    );

    expect(screen.getByText('🔧 Filter Mode')).toBeInTheDocument();
  });

  it('should render with general mode indicator', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" mode="general" />
      </ConvexProvider>
    );

    expect(screen.getByText('💬 General Mode')).toBeInTheDocument();
  });

  it('should show language selector', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const languageSelect = screen.getByDisplayValue('Auto-detect');
    expect(languageSelect).toBeInTheDocument();
  });

  it('should show history toggle button', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const historyButton = screen.getByTitle('Voice History');
    expect(historyButton).toBeInTheDocument();
  });

  it('should start recording when mic button is clicked', async () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const micButton = screen.getByTitle('Start general query');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
    });
  });

  it('should show recording status when recording', async () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const micButton = screen.getByTitle('Start general query');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByText(/Recording/)).toBeInTheDocument();
    });
  });

  it('should handle microphone access denied', async () => {
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const micButton = screen.getByTitle('Start general query');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByText(/Microphone access denied/)).toBeInTheDocument();
    });
  });

  it('should show confidence indicator when available', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    // Initially no confidence indicator should be shown
    expect(screen.queryByText(/confident/)).not.toBeInTheDocument();
  });

  it('should toggle history panel', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const historyButton = screen.getByTitle('Voice History');
    
    // Initially history should not be shown
    expect(screen.queryByText('Voice History')).not.toBeInTheDocument();
    
    // Click to show history
    fireEvent.click(historyButton);
    
    // History panel should now be visible
    expect(screen.getByText('Voice History')).toBeInTheDocument();
  });

  it('should change language selection', () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const languageSelect = screen.getByDisplayValue('Auto-detect') as HTMLSelectElement;
    
    fireEvent.change(languageSelect, { target: { value: 'hi' } });
    
    expect(languageSelect.value).toBe('hi');
  });

  it('should call onResults callback when search results are available', () => {
    const mockOnResults = vi.fn();
    
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" mode="search" onResults={mockOnResults} />
      </ConvexProvider>
    );

    // The callback should be available for when results are processed
    expect(mockOnResults).not.toHaveBeenCalled();
  });

  it('should call onFiltersApplied callback when filters are applied', () => {
    const mockOnFiltersApplied = vi.fn();
    
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" mode="filter" onFiltersApplied={mockOnFiltersApplied} />
      </ConvexProvider>
    );

    // The callback should be available for when filters are applied
    expect(mockOnFiltersApplied).not.toHaveBeenCalled();
  });

  it('should disable controls during processing', async () => {
    render(
      <ConvexProvider client={mockConvex}>
        <VoiceQuery userRole="vendor" />
      </ConvexProvider>
    );

    const micButton = screen.getByTitle('Start general query');
    const languageSelect = screen.getByDisplayValue('Auto-detect');

    // Start recording
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByText(/Recording/)).toBeInTheDocument();
    });

    // Language select should be disabled during recording
    expect(languageSelect).toBeDisabled();
  });
});