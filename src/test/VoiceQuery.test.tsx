import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VoiceQuery from '../components/VoiceQuery';

// Mock Convex
vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
}));

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  state: 'inactive',
  stream: {
    getTracks: () => [{ stop: vi.fn() }],
  },
  ondataavailable: null as any,
  onstop: null as any,
};

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
  writable: true,
});

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
  }),
  createAnalyser: vi.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
  }),
  close: vi.fn().mockResolvedValue(undefined),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('VoiceQuery Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock MediaRecorder constructor
    global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);
  });

  it('renders mic button', () => {
    render(<VoiceQuery userRole="vendor" />);
    expect(screen.getByTitle('Ask a Question')).toBeInTheDocument();
  });

  it('shows recording state when clicked', async () => {
    render(<VoiceQuery userRole="vendor" />);
    
    const micButton = screen.getByTitle('Ask a Question');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
    });
  });

  it('displays recording timer', async () => {
    render(<VoiceQuery userRole="vendor" />);
    
    const micButton = screen.getByTitle('Ask a Question');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByText(/Recording\.\.\./)).toBeInTheDocument();
    });
  });

  it('handles microphone permission denial', async () => {
    // Mock permission denial
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
      new Error('Permission denied')
    );

    render(<VoiceQuery userRole="vendor" />);
    
    const micButton = screen.getByTitle('Ask a Question');
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByText(/Microphone access denied/)).toBeInTheDocument();
    });
  });

  it('shows processing state after recording', async () => {
    render(<VoiceQuery userRole="vendor" />);
    
    const micButton = screen.getByTitle('Ask a Question');
    fireEvent.click(micButton);

    // Simulate recording stop
    await waitFor(() => {
      expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Stop Recording'));

    await waitFor(() => {
      expect(screen.getByText(/Processing your question/)).toBeInTheDocument();
    });
  });

  it('displays error message on processing failure', async () => {
    const mockProcessVoiceQuery = vi.fn().mockRejectedValue(
      new Error('Processing failed')
    );

    vi.mocked(require('convex/react').useMutation).mockReturnValue(mockProcessVoiceQuery);

    render(<VoiceQuery userRole="vendor" />);
    
    const micButton = screen.getByTitle('Ask a Question');
    fireEvent.click(micButton);

    // Simulate recording stop
    await waitFor(() => {
      expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Stop Recording'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to process voice query/)).toBeInTheDocument();
    });
  });

  it('clears response when clear button is clicked', async () => {
    const mockProcessVoiceQuery = vi.fn().mockResolvedValue({
      answer: 'Test response',
      originalText: 'Test query',
      language: 'en',
    });

    vi.mocked(require('convex/react').useMutation).mockReturnValue(mockProcessVoiceQuery);

    render(<VoiceQuery userRole="vendor" />);
    
    const micButton = screen.getByTitle('Ask a Question');
    fireEvent.click(micButton);

    // Simulate recording stop
    await waitFor(() => {
      expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Stop Recording'));

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Response should be cleared
    expect(screen.queryByText('Test response')).not.toBeInTheDocument();
  });

  it('shows original text for non-English queries', async () => {
    const mockProcessVoiceQuery = vi.fn().mockResolvedValue({
      answer: 'Your inventory status is good',
      originalText: 'मेरा इन्वेंटरी क्या है',
      language: 'hi',
    });

    vi.mocked(require('convex/react').useMutation).mockReturnValue(mockProcessVoiceQuery);

    render(<VoiceQuery userRole="supplier" />);
    
    const micButton = screen.getByTitle('Ask a Question');
    fireEvent.click(micButton);

    // Simulate recording stop
    await waitFor(() => {
      expect(screen.getByTitle('Stop Recording')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Stop Recording'));

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Your inventory status is good')).toBeInTheDocument();
      expect(screen.getByText('मेरा इन्वेंटरी क्या है')).toBeInTheDocument();
      expect(screen.getByText('Original (hi):')).toBeInTheDocument();
    });
  });
}); 