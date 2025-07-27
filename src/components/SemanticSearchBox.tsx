import { useState, useEffect, useRef } from 'react';
import { geminiSearchService } from '../services/geminiSearchService';

interface SemanticSearchBoxProps {
  onSearch: (query: string, analysis?: any) => void;
  userRole: 'vendor' | 'supplier';
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  text: string;
  type: 'suggestion' | 'recent' | 'ai';
  confidence?: number;
}

export default function SemanticSearchBox({
  onSearch,
  userRole,
  placeholder = "Search with AI-powered semantic understanding...",
  className = ""
}: SemanticSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Generate suggestions when query changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const aiSuggestions = await geminiSearchService.generateSearchSuggestions(query, userRole);
        
        const formattedSuggestions: SearchSuggestion[] = [
          // Current query as first option
          { text: query, type: 'suggestion' },
          // AI suggestions
          ...aiSuggestions.map(text => ({ text, type: 'ai' as const, confidence: 0.8 }))
        ];

        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error getting suggestions:', error);
        setSuggestions([{ text: query, type: 'suggestion' }]);
        setShowSuggestions(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, userRole]);

  const handleSearch = async (searchQuery: string) => {
    setIsAnalyzing(true);
    setShowSuggestions(false);

    try {
      // Get semantic analysis from Gemini
      const analysis = await geminiSearchService.enhanceSearchQuery({
        query: searchQuery,
        userRole,
        searchType: 'suppliers'
      });

      setLastAnalysis(analysis);
      onSearch(searchQuery, analysis);
    } catch (error) {
      console.error('Error analyzing search:', error);
      onSearch(searchQuery);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleSearch(query.trim());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedSuggestion = suggestions[selectedIndex];
          setQuery(selectedSuggestion.text);
          handleSearch(selectedSuggestion.text);
        } else if (query.trim()) {
          handleSearch(query.trim());
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'ai':
        return '✨';
      case 'recent':
        return '🕒';
      default:
        return '🔍';
    }
  };

  const getSuggestionTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'ai':
        return 'AI Suggestion';
      case 'recent':
        return 'Recent Search';
      default:
        return 'Search';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isAnalyzing ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay hiding suggestions to allow clicking
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"
        />

        {/* AI Badge */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <div className="flex items-center space-x-2">
            {isLoading && (
              <div className="animate-pulse text-xs text-gray-500">
                Loading...
              </div>
            )}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
              <span>✨</span>
              <span className="font-medium">AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Analysis Display */}
      {lastAnalysis && !isAnalyzing && (
        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-purple-500 mt-0.5">🧠</span>
            <div className="flex-1">
              <p className="text-sm text-purple-800 font-medium">
                AI Understanding: {lastAnalysis.intent}
              </p>
              {lastAnalysis.categories.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {lastAnalysis.categories.map((category: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
              {lastAnalysis.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {lastAnalysis.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1 text-xs text-purple-600">
                Confidence: {Math.round(lastAnalysis.confidence * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                selectedIndex === index ? 'bg-purple-50 border-purple-200' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {getSuggestionIcon(suggestion.type)}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {suggestion.text}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSuggestionTypeLabel(suggestion.type)}
                    {suggestion.confidence && (
                      <span className="ml-2">
                        • {Math.round(suggestion.confidence * 100)}% relevance
                      </span>
                    )}
                  </div>
                </div>
                {suggestion.type === 'ai' && (
                  <div className="text-purple-500">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
