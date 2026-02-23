import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { VOICE_QUERY_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, LANGUAGE_NAMES } from '../config/voiceQuery';
import { voiceProcessor } from '../utils/enhancedVoiceProcessor';
import { useAuth } from '../contexts/AuthContext';

interface VoiceQueryProps {
  userRole: 'vendor' | 'supplier';
  mode?: 'search' | 'filter' | 'general';
  onResults?: (results: SearchResults) => void;
  onFiltersApplied?: (filters: VoiceFilters) => void;
  className?: string;
}

interface VoiceQueryResponse {
  answer: string;
  originalText?: string;
  language?: string;
  confidence?: number;
  alternatives?: string[];
  searchResults?: SearchResults;
  appliedFilters?: VoiceFilters;
}

interface SearchResults {
  items: SupplierItem[];
  suppliers: Supplier[];
  filters: AppliedFilters;
  confidence: number;
  originalQuery: string;
  translatedQuery: string;
  language: string;
}

interface VoiceFilters {
  location?: string;
  priceRange?: { min: number; max: number };
  deliveryTime?: string;
  quality?: string;
  categories?: string[];
  fssaiRequired?: boolean;
}

interface AppliedFilters {
  location?: string;
  priceRange?: { min: number; max: number };
  categories?: string[];
  deliveryTime?: string;
  quality?: string;
  fssaiRequired?: boolean;
}

interface SupplierItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  supplierId: string;
  supplierName: string;
  trustScore: number;
  distance?: number;
  availability: boolean;
}

interface Supplier {
  id: string;
  name: string;
  trustScore: number;
  location: string;
  distance?: number;
  categories: string[];
  fssaiCertified: boolean;
}

export default function VoiceQuery({ 
  userRole, 
  mode = 'general', 
  onResults, 
  onFiltersApplied, 
  className = '' 
}: VoiceQueryProps) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [transcriptionText, setTranscriptionText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchIngredients, setSearchIngredients] = useState<string[]>([]);
  const [pendingSearchMeta, setPendingSearchMeta] = useState<{
    originalQuery: string;
    translatedQuery: string;
    language: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const processEnhancedVoiceQuery = useMutation(api.voiceQuery.processEnhancedVoiceQuery);
  const currentUserId = user?.id || `anonymous_${userRole}`;
  const supplierMatches = useQuery(
    api.voiceQuery.searchSuppliersForIngredients,
    searchIngredients.length > 0
      ? {
          ingredients: searchIngredients,
        }
      : "skip"
  );

  useEffect(() => {
    if (!supplierMatches || !pendingSearchMeta) return;

    const items: SupplierItem[] = [];
    const suppliers: Supplier[] = [];

    supplierMatches.forEach((match: any) => {
      const supplier = match.supplier;
      suppliers.push({
        id: String(supplier._id),
        name: supplier.businessName,
        trustScore: supplier.trustScore ?? 0,
        location: supplier.location?.city || '',
        categories: supplier.categories || [],
        fssaiCertified: supplier.fssaiCertified || false,
      });

      (match.matchingItems || []).forEach((item: any) => {
        items.push({
          id: String(item._id),
          name: item.itemName,
          category: item.category,
          price: item.pricePerUnit,
          unit: item.unit,
          supplierId: String(supplier._id),
          supplierName: supplier.businessName,
          trustScore: supplier.trustScore ?? 0,
          availability: item.isAvailable,
        });
      });
    });

    const result: SearchResults = {
      items,
      suppliers,
      filters: {},
      confidence: 0.8,
      originalQuery: pendingSearchMeta.originalQuery,
      translatedQuery: pendingSearchMeta.translatedQuery,
      language: pendingSearchMeta.language,
    };

    setSearchResults(result);
    onResults?.(result);
    const matchSummary = suppliers.length > 0
      ? `Found ${suppliers.length} suppliers matching your request.`
      : 'No supplier matched your current query. Try adding ingredient names or removing filters.';
    setResponse({
      answer: matchSummary,
      originalText: pendingSearchMeta.originalQuery,
      language: pendingSearchMeta.language,
      confidence: 0.8,
      searchResults: result,
    });
    setIsProcessing(false);

    processEnhancedVoiceQuery({
      userId: currentUserId,
      userRole,
      queryType: 'search',
      queryText: pendingSearchMeta.originalQuery,
      language: pendingSearchMeta.language,
      englishText: pendingSearchMeta.translatedQuery,
      confidence: 0.8,
      searchResults: {
        items: items.map((item) => item.name),
        suppliers: suppliers.map((supplier) => supplier.name),
        filters: {},
      },
      response: matchSummary,
      responseLanguage: pendingSearchMeta.language,
      processingTime: 1,
      audioDuration: recordingTime,
    }).catch((error) => {
      console.error('Failed to store voice query:', error);
    });

    setPendingSearchMeta(null);
  }, [supplierMatches, pendingSearchMeta, onResults, processEnhancedVoiceQuery, recordingTime, userRole, currentUserId]);

  const voiceHistory = useQuery(api.voiceQuery.getVoiceQueryHistory, {
    userId: currentUserId,
    userRole,
    limit: 10,
  });
  const voiceStats = useQuery(api.voiceQuery.getVoiceQueryStats, {
    userId: currentUserId,
    userRole,
  });

  // Auto-stop recording after 30 seconds
  const MAX_RECORDING_TIME = VOICE_QUERY_CONFIG.MAX_RECORDING_TIME;

  const startRecording = async () => {
    try {
      setError(null);
      setResponse(null);
      setSearchResults(null);
      setIsRecording(true);
      setIsListening(true);
      setRecordingTime(0);
      setTranscriptionText('');
      setConfidenceLevel(0);
      setAlternatives([]);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: VOICE_QUERY_CONFIG.SAMPLE_RATE
        } 
      });

      // Set up enhanced audio visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      // Enhanced visualization with frequency analysis
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate RMS for better audio level representation
          const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length);
          setAudioLevel(Math.min(rms / 128 * 100, 100));
          
          // Detect speech activity
          const speechThreshold = 20;
          const isSpeaking = rms > speechThreshold;
          setIsListening(isSpeaking);
        }
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      // Set up MediaRecorder with better settings
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
        await processRecording();
      };

      mediaRecorderRef.current.start(500); // Collect data every 500ms for better responsiveness

      // Enhanced timer with silence detection
      const startTime = Date.now();
      let lastSpeechTime = startTime;
      
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingTime(elapsed);
        
        // Auto-stop on max time
        if (elapsed >= MAX_RECORDING_TIME) {
          stopRecording();
          return;
        }
        
        // Auto-stop on silence (if enabled and in search mode)
        if (mode === 'search' && VOICE_QUERY_CONFIG.VOICE_PROCESSING.silenceDuration) {
          if (isListening) {
            lastSpeechTime = Date.now();
          } else if (elapsed > 2000 && // Minimum 2 seconds of recording
                     Date.now() - lastSpeechTime > VOICE_QUERY_CONFIG.VOICE_PROCESSING.silenceDuration) {
            stopRecording();
            return;
          }
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
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    setIsRecording(false);
    setIsListening(false);
    setIsProcessing(true);

    // Clear timers and animation frames
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop recording
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  };

  const processRecording = async () => {
    try {
      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      // Validate audio duration
      const audioDuration = recordingTime;
      if (audioDuration < 500) {
        throw new Error(ERROR_MESSAGES.AUDIO_TOO_SHORT);
      }

      // Convert blob to array for processing
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Show processing status
      setTranscriptionText('Processing your voice...');
      const voiceResult = await voiceProcessor.processAudioToText(
        uint8Array,
        selectedLanguage === 'auto' ? undefined : selectedLanguage
      );
      const parsed = await voiceProcessor.parseSearchQuery(
        voiceResult.transcription,
        voiceResult.language
      );

      setTranscriptionText(voiceResult.transcription);
      setConfidenceLevel(voiceResult.confidence);
      setAlternatives(voiceResult.alternatives || []);

      if (mode === 'search' && parsed.searchTerms.length > 0) {
        setPendingSearchMeta({
          originalQuery: parsed.originalText,
          translatedQuery: parsed.translatedText,
          language: parsed.language,
        });
        setSearchIngredients(parsed.searchTerms);
        return;
      }

      const assistantResponse = buildDeterministicVoiceResponse(
        parsed.translatedText || parsed.originalText,
        mode,
        userRole
      );

      const resolvedResponse: VoiceQueryResponse = {
        answer: assistantResponse,
        originalText: parsed.originalText,
        language: parsed.language,
        confidence: voiceResult.confidence,
        alternatives: voiceResult.alternatives || [],
      };

      if (mode === 'filter') {
        resolvedResponse.appliedFilters = parsed.filters;
        onFiltersApplied?.(parsed.filters);
      }

      setResponse(resolvedResponse);

      await processEnhancedVoiceQuery({
        userId: currentUserId,
        userRole,
        queryType: mode,
        queryText: parsed.originalText,
        language: parsed.language,
        englishText: parsed.translatedText,
        confidence: voiceResult.confidence,
        appliedFilters: mode === 'filter' ? parsed.filters : undefined,
        response: assistantResponse,
        responseLanguage: parsed.language,
        processingTime: voiceResult.processingTime,
        audioDuration
      });

    } catch (err) {
      console.error('Error processing voice query:', err);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.PROCESSING_FAILED;
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const buildDeterministicVoiceResponse = (
    query: string,
    queryMode: 'search' | 'filter' | 'general',
    role: 'vendor' | 'supplier'
  ): string => {
    const normalizedQuery = query.toLowerCase();

    if (queryMode === 'filter') {
      if (normalizedQuery.includes('fssai') || normalizedQuery.includes('certified')) {
        return 'Applied filter for FSSAI-certified suppliers. You can add location or price range for narrower results.';
      }
      if (normalizedQuery.includes('price') || normalizedQuery.includes('rupees') || normalizedQuery.includes('rs')) {
        return 'Applied price filters from your request. Review the filtered supplier list to refine the range.';
      }
      return 'Applied the requested filters. You can refine by category, distance, and delivery speed.';
    }

    if (queryMode === 'search') {
      return 'Searching live supplier inventory for your requested ingredients.';
    }

    if (role === 'supplier') {
      if (normalizedQuery.includes('order')) {
        return 'You can manage incoming orders from the Orders tab and update fulfillment status there.';
      }
      if (normalizedQuery.includes('stock') || normalizedQuery.includes('inventory')) {
        return 'Use the Products tab to update inventory and keep stock availability accurate for vendor searches.';
      }
      return 'You can manage products, track orders, and monitor analytics from your supplier dashboard tabs.';
    }

    if (normalizedQuery.includes('group order')) {
      return 'Use Group Orders to create or join pooled purchases and reduce per-unit costs.';
    }
    if (normalizedQuery.includes('price')) {
      return 'You can compare supplier prices, configure alerts, and monitor trends from your dashboard.';
    }
    return 'You can search suppliers by ingredient, apply voice filters, and place tracked orders from your dashboard.';
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}s`;
  };

  const clearResponse = () => {
    setResponse(null);
    setSearchResults(null);
    setError(null);
    setTranscriptionText('');
    setConfidenceLevel(0);
    setAlternatives([]);
  };

  const selectAlternative = (alternative: string) => {
    setTranscriptionText(alternative);
    // Re-process with selected alternative
    // In a real implementation, you would re-run the search with the corrected text
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
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
    <div className={`voice-query ${className}`}>
      {/* Header with mode indicator and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            mode === 'search' ? 'bg-green-100 text-green-800' :
            mode === 'filter' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {mode === 'search' ? '🔍 Search Mode' : 
             mode === 'filter' ? '🔧 Filter Mode' : 
             '💬 General Mode'}
          </div>
          {confidenceLevel > 0 && (
            <div className={`px-2 py-1 rounded text-xs ${
              confidenceLevel >= 0.8 ? 'bg-green-100 text-green-700' :
              confidenceLevel >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {Math.round(confidenceLevel * 100)}% confident
            </div>
          )}
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
            {Object.entries(LANGUAGE_NAMES).map(([code, lang]) => (
              <option key={code} value={code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          
          {/* History toggle */}
          <button
            onClick={toggleHistory}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            title="Voice History"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Enhanced Mic Button with Audio Visualization */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {/* Audio visualization rings */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="absolute rounded-full border-2 border-red-300 animate-pulse"
                style={{
                  width: `${80 + audioLevel * 0.8}px`,
                  height: `${80 + audioLevel * 0.8}px`,
                  opacity: 0.6
                }}
              />
              <div 
                className="absolute rounded-full border border-red-200"
                style={{
                  width: `${100 + audioLevel * 1.2}px`,
                  height: `${100 + audioLevel * 1.2}px`,
                  opacity: 0.4
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
            title={isRecording ? 'Stop Recording' : `Start ${mode} query`}
          >
            {/* Speech activity indicator */}
            {isRecording && isListening && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-white" />
            )}
            
            {/* Mic icon */}
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

        {/* Real-time transcription */}
        {(isRecording || transcriptionText) && (
          <div className="w-full max-w-md">
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">
                {isRecording ? 'Listening...' : 'Transcription:'}
              </div>
              <div className="text-sm text-gray-800 min-h-[20px]">
                {transcriptionText || (isRecording ? '...' : '')}
              </div>
            </div>
          </div>
        )}

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
              {mode === 'search' && VOICE_QUERY_CONFIG.VOICE_PROCESSING.silenceDuration 
                ? 'Will auto-stop after 2 seconds of silence'
                : `Auto-stop in ${formatTime(MAX_RECORDING_TIME - recordingTime)}`
              }
            </div>
          </div>
        )}

        {/* Processing status */}
        {isProcessing && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div className="text-sm text-gray-600">
                Processing your {mode} query...
              </div>
            </div>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-1">
              <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        )}
      </div>

      {/* Alternative suggestions */}
      {alternatives.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-xs text-yellow-700 mb-2">
            Did you mean:
          </div>
          <div className="space-y-1">
            {alternatives.map((alt, index) => (
              <button
                key={index}
                onClick={() => selectAlternative(alt)}
                className="block w-full text-left text-sm text-yellow-800 hover:text-yellow-900 hover:bg-yellow-100 px-2 py-1 rounded"
              >
                "{alt}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
          <button
            onClick={clearResponse}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Search Results Display */}
      {searchResults && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Search Results</h3>
            <div className="text-sm text-gray-500">
              {searchResults.items.length} items found
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {searchResults.items.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {item.category}
                      </span>
                      {!item.availability && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      by {item.supplierName}
                    </div>
                    <div className="mt-2 flex items-center space-x-4">
                      <div className="text-lg font-semibold text-green-600">
                        ₹{item.price}/{item.unit}
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(item.trustScore) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          {item.trustScore}
                        </span>
                      </div>
                      {item.distance && (
                        <div className="text-sm text-gray-500">
                          {item.distance}km away
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="ml-4 px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Suppliers Summary */}
          {searchResults.suppliers.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Recommended Suppliers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.suppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-600">{supplier.location}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(supplier.trustScore) ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          {supplier.fssaiCertified && (
                            <span className="px-1 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                              FSSAI
                            </span>
                          )}
                        </div>
                      </div>
                      {supplier.distance && (
                        <div className="text-sm text-gray-500">
                          {supplier.distance}km
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Response */}
      {response && (
        <div className="mt-4 space-y-3">
          {/* Original transcription (if not English) */}
          {response.originalText && response.language && response.language !== 'en' && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-500">
                  Original ({LANGUAGE_NAMES[response.language as keyof typeof LANGUAGE_NAMES]?.name || response.language}):
                </div>
                {response.confidence && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    response.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                    response.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round(response.confidence * 100)}%
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-700 italic">
                "{response.originalText}"
              </div>
            </div>
          )}

          {/* AI Response */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 mb-1">
                  Smart Assistant
                </div>
                <div className="text-sm text-blue-800">
                  {response.answer}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            <button
              onClick={startRecording}
              className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
            >
              Ask Another Question
            </button>
            <button
              onClick={clearResponse}
              className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Voice History */}
      {showHistory && (
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Voice History</h3>
            <button
              onClick={toggleHistory}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {voiceHistory ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {voiceHistory.map((query, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">
                        {query.queryText}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(query.createdAt).toLocaleString()} •
                        {LANGUAGE_NAMES[query.language as keyof typeof LANGUAGE_NAMES]?.flag} {query.language} •
                        {Math.round(query.confidence * 100)}% confidence
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded ${
                      query.queryType === 'search' ? 'bg-green-100 text-green-700' :
                      query.queryType === 'filter' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {query.queryType}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">Voice history temporarily unavailable</div>
              <div className="text-xs mt-1">Backend authentication is being updated</div>
            </div>
          )}
          
          {voiceStats && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-blue-600">
                  {voiceStats?.totalQueries || 0}
                </div>
                <div className="text-xs text-blue-500">Total Queries</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-green-600">
                  {voiceStats?.avgConfidence || 0}%
                </div>
                <div className="text-xs text-green-500">Avg Confidence</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-lg font-semibold text-purple-600">
                  {voiceStats?.avgProcessingTime || 0}ms
                </div>
                <div className="text-xs text-purple-500">Avg Speed</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
