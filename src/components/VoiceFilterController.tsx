import { useState, useRef, useEffect } from 'react';
import { useConvex, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { voiceProcessor } from '../utils/enhancedVoiceProcessor';
import { VOICE_QUERY_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/voiceQuery';
import { useAuth } from '../contexts/AuthContext';

interface VoiceFilterControllerProps {
  currentFilters: SearchFilters;
  onFiltersChanged: (filters: SearchFilters) => void;
  supportedLanguages: string[];
  userRole: 'vendor' | 'supplier';
  className?: string;
}

interface SearchFilters {
  location?: string;
  priceRange?: { min: number; max: number };
  deliveryTime?: string;
  quality?: string;
  categories?: string[];
  fssaiRequired?: boolean;
}

interface VoiceFilters {
  location?: string;
  priceRange?: { min: number; max: number };
  deliveryTime?: string;
  quality?: string;
  categories?: string[];
  fssaiRequired?: boolean;
}

interface FilterPreset {
  name: string;
  filters: VoiceFilters;
  voiceShortcut: string;
}

const LOCAL_PRESET_STORAGE_KEY = 'voice_filter_presets_v1';

const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'nearby-certified',
    filters: {
      location: 'within 5km',
      fssaiRequired: true,
    },
    voiceShortcut: 'Apply nearby-certified filters',
  },
];

function mapPresetRecordToList(filterPresets: Record<string, VoiceFilters>): FilterPreset[] {
  return Object.entries(filterPresets).map(([name, filters]) => ({
    name,
    filters,
    voiceShortcut: `Apply ${name} filters`,
  }));
}

function loadLocalPresets(): FilterPreset[] {
  if (typeof window === 'undefined') return DEFAULT_FILTER_PRESETS;
  try {
    const raw = window.localStorage.getItem(LOCAL_PRESET_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTER_PRESETS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_FILTER_PRESETS;
    return parsed.filter((item) => item && typeof item.name === 'string' && item.filters);
  } catch {
    return DEFAULT_FILTER_PRESETS;
  }
}

function persistLocalPresets(presets: FilterPreset[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Ignore local persistence failures and keep in-memory behavior.
  }
}

export default function VoiceFilterController({
  currentFilters,
  onFiltersChanged,
  supportedLanguages,
  userRole,
  className = ''
}: VoiceFilterControllerProps) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [parsedFilters, setParsedFilters] = useState<VoiceFilters | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [isListening, setIsListening] = useState(false);

  const convex = useConvex();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const processVoiceFilter = useMutation(api.voiceQuery.processEnhancedVoiceQuery);
  const updateVoicePreferences = useMutation(api.voiceQuery.updateVoicePreferences);
  const currentUserId = user?.id || `anonymous_${userRole}`;

  // Load local presets first, then attempt cloud sync with fallback.
  useEffect(() => {
    let isCancelled = false;

    const localPresets = loadLocalPresets();
    setFilterPresets(localPresets);

    const syncCloudPreferences = async () => {
      try {
        const voicePreferences = await convex.query(api.voiceQuery.getVoicePreferences, {
          userId: currentUserId,
        });

        if (isCancelled) return;

        const cloudPresets = voicePreferences?.filterPresets
          ? mapPresetRecordToList(voicePreferences.filterPresets as Record<string, VoiceFilters>)
          : [];

        if (cloudPresets.length > 0) {
          setFilterPresets(cloudPresets);
          persistLocalPresets(cloudPresets);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Voice preferences sync unavailable, using local presets:', error);
        }
      }
    };

    void syncCloudPreferences();

    return () => {
      isCancelled = true;
    };
  }, [convex, currentUserId]);

  useEffect(() => {
    if (filterPresets.length > 0) {
      persistLocalPresets(filterPresets);
    }
  }, [filterPresets]);

  const startRecording = async () => {
    try {
      setError(null);
      setSuccess(null);
      setParsedFilters(null);
      setShowConfirmation(false);
      setIsRecording(true);
      setIsListening(false);
      setRecordingTime(0);
      setTranscriptionText('');
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: VOICE_QUERY_CONFIG.SAMPLE_RATE
        } 
      });

      // Set up audio visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length);
          setAudioLevel(Math.min(rms / 128 * 100, 100));
          
          const speechThreshold = 20;
          const isSpeaking = rms > speechThreshold;
          setIsListening(isSpeaking);
        }
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        await processFilterRecording();
      };

      mediaRecorderRef.current.start(500);

      // Timer with auto-stop
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingTime(elapsed);
        
        if (elapsed >= VOICE_QUERY_CONFIG.MAX_RECORDING_TIME) {
          stopRecording();
        }
      }, 100);

    } catch (err) {
      console.error('Error starting recording:', err);
      const errorName = typeof err === 'object' && err && 'name' in err
        ? String((err as any).name)
        : '';
      const rawMessage = err instanceof Error ? err.message : String(err ?? '');
      const isPermissionError =
        errorName === 'NotAllowedError' ||
        /notallowed|permission|denied/i.test(rawMessage);
      const errorMessage = isPermissionError
        ? ERROR_MESSAGES.MICROPHONE_ACCESS_DENIED
        : ERROR_MESSAGES.RECORDING_FAILED;
      setError(errorMessage);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    setIsRecording(false);
    setIsListening(false);
    setIsProcessing(true);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  };

  const processFilterRecording = async () => {
    try {
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      if (recordingTime < 500) {
        throw new Error(ERROR_MESSAGES.AUDIO_TOO_SHORT);
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      setTranscriptionText('Processing your filter request...');

      // Process voice for filter parsing
      const voiceResult = await voiceProcessor.processAudioToText(
        uint8Array, 
        selectedLanguage === 'auto' ? undefined : selectedLanguage
      );

      setTranscriptionText(voiceResult.transcription);

      // Parse the transcription for filter criteria
      const searchQuery = await voiceProcessor.parseSearchQuery(
        voiceResult.transcription,
        voiceResult.language
      );

      // Extract filters from the parsed query
      const extractedFilters = searchQuery.filters;
      setParsedFilters(extractedFilters);

      // Show confirmation dialog
      setShowConfirmation(true);
      setSuccess(SUCCESS_MESSAGES.VOICE_RECOGNIZED);

      // Store the voice query
      try {
        await processVoiceFilter({
          userId: currentUserId,
          userRole,
          queryType: 'filter',
          queryText: voiceResult.transcription,
          language: voiceResult.language,
          englishText: searchQuery.translatedText,
          confidence: voiceResult.confidence,
          appliedFilters: extractedFilters,
          response: `Parsed filters: ${JSON.stringify(extractedFilters)}`,
          responseLanguage: 'en',
          processingTime: voiceResult.processingTime,
          audioDuration: recordingTime
        });
      } catch (voiceLogError) {
        // Do not block the UX when telemetry persistence fails.
        console.warn('Failed to store voice filter query:', voiceLogError);
      }

    } catch (err) {
      console.error('Error processing filter recording:', err);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.PROCESSING_FAILED;
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyParsedFilters = () => {
    if (!parsedFilters) return;

    // Merge with current filters
    const newFilters: SearchFilters = {
      ...currentFilters,
      ...parsedFilters
    };

    onFiltersChanged(newFilters);
    setShowConfirmation(false);
    setSuccess('Filters applied successfully!');
    
    // Clear after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  const modifyFilters = () => {
    setShowConfirmation(false);
    setTranscriptionText('');
    setParsedFilters(null);
    // User can record again to modify
  };

  const applyPreset = async (preset: FilterPreset) => {
    onFiltersChanged(preset.filters);
    setSuccess(`Applied "${preset.name}" filters`);
    setShowPresets(false);
    
    setTimeout(() => setSuccess(null), 3000);
  };

  const saveCurrentAsPreset = async () => {
    const presetName = prompt('Enter a name for this filter preset:');
    if (!presetName) return;

    const voiceShortcut = prompt('Enter a voice shortcut (optional):') || `Apply ${presetName} filters`;

    const newPreset: FilterPreset = {
      name: presetName,
      filters: currentFilters,
      voiceShortcut
    };

    const updatedPresets = [...filterPresets, newPreset];
    setFilterPresets(updatedPresets);

    // Update voice preferences
    const presetMap = updatedPresets.reduce((acc, preset) => {
      acc[preset.name] = preset.filters;
      return acc;
    }, {} as Record<string, VoiceFilters>);

    try {
      await updateVoicePreferences({
        userId: currentUserId,
        filterPresets: presetMap
      });
    } catch (saveError) {
      // Keep local success and continue in offline/degraded mode.
      console.warn('Failed to sync preset to cloud preferences:', saveError);
    }

    setSuccess(`Saved "${presetName}" as filter preset`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const clearAllFilters = () => {
    onFiltersChanged({});
    setSuccess('All filters cleared');
    setTimeout(() => setSuccess(null), 3000);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}s`;
  };

  const formatFilters = (filters: VoiceFilters) => {
    const parts = [];
    
    if (filters.location) parts.push(`Location: ${filters.location}`);
    if (filters.priceRange) parts.push(`Price: ₹${filters.priceRange.min}-${filters.priceRange.max}`);
    if (filters.categories?.length) parts.push(`Categories: ${filters.categories.join(', ')}`);
    if (filters.quality) parts.push(`Quality: ${filters.quality}`);
    if (filters.deliveryTime) parts.push(`Delivery: ${filters.deliveryTime}`);
    if (filters.fssaiRequired) parts.push('FSSAI Required');
    
    return parts.join(' • ');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={`voice-filter-controller ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Voice Filters</h3>
          <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            🔧 Filter Mode
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Language selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="text-xs border rounded px-2 py-1"
            disabled={isRecording || isProcessing}
          >
            <option value="auto">Auto-detect</option>
            {supportedLanguages.map(lang => (
              <option key={lang} value={lang}>{lang.toUpperCase()}</option>
            ))}
          </select>
          
          {/* Presets button */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            title="Filter Presets"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Current Filters Display */}
      {Object.keys(currentFilters).length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Current Filters:</div>
              <div className="text-sm text-gray-600">{formatFilters(currentFilters)}</div>
            </div>
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Voice Recording Interface */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {/* Audio visualization */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="absolute rounded-full border-2 border-blue-300 animate-pulse"
                style={{
                  width: `${80 + audioLevel * 0.8}px`,
                  height: `${80 + audioLevel * 0.8}px`,
                  opacity: 0.6
                }}
              />
            </div>
          )}
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`
              relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' 
                : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              transform ${isRecording ? 'scale-110' : 'scale-100'}
            `}
            title={isRecording ? 'Stop Recording' : 'Start filter voice command'}
          >
            {/* Speech activity indicator */}
            {isRecording && isListening && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-white" />
            )}
            
            <svg 
              className="w-8 h-8 text-white"
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              {isRecording ? (
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              ) : (
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
              )}
            </svg>
          </button>
        </div>

        {/* Recording status */}
        {isRecording && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <div className="text-sm font-medium text-red-600">
                Recording {formatTime(recordingTime)}
              </div>
              <div className="text-xs text-gray-500">
                ({isListening ? 'Speaking' : 'Silence'})
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Say your filter criteria (e.g., "Show only FSSAI certified suppliers within 5km")
            </div>
          </div>
        )}

        {/* Processing status */}
        {isProcessing && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div className="text-sm text-gray-600">
                Processing filter criteria...
              </div>
            </div>
          </div>
        )}

        {/* Transcription */}
        {transcriptionText && (
          <div className="w-full max-w-md">
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Transcription:</div>
              <div className="text-sm text-gray-800">{transcriptionText}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Confirmation Dialog */}
      {showConfirmation && parsedFilters && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-900 mb-2">
            Detected Filter Criteria:
          </div>
          <div className="text-sm text-blue-800 mb-3">
            {formatFilters(parsedFilters)}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={applyParsedFilters}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={modifyFilters}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 transition-colors"
            >
              Modify
            </button>
          </div>
        </div>
      )}

      {/* Filter Presets */}
      {showPresets && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-900">Filter Presets</div>
            <button
              onClick={saveCurrentAsPreset}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              disabled={Object.keys(currentFilters).length === 0}
            >
              Save Current
            </button>
          </div>
          
          {filterPresets.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No filter presets saved yet
            </div>
          ) : (
            <div className="space-y-2">
              {filterPresets.map((preset, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{preset.name}</div>
                    <div className="text-xs text-gray-600">{formatFilters(preset.filters)}</div>
                    <div className="text-xs text-gray-500 italic">"{preset.voiceShortcut}"</div>
                  </div>
                  <button
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Voice Command Examples */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-xs text-yellow-700 mb-2">Example voice commands:</div>
        <div className="text-xs text-yellow-800 space-y-1">
          <div>• "Show only FSSAI certified suppliers"</div>
          <div>• "Filter by price range 20 to 50 rupees"</div>
          <div>• "Show suppliers within 5 kilometers"</div>
          <div>• "Only premium quality suppliers"</div>
          <div>• "Same day delivery suppliers only"</div>
        </div>
      </div>
    </div>
  );
}
