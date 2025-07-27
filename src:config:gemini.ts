export const GEMINI_CONFIG = {
  API_KEY: 'AIzaSyCWbri8Ugc41bgM05rcTDR-fQTEISBQHco',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.7,
  TOP_K: 40,
  TOP_P: 0.95,
};

export const SEMANTIC_SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_SUGGESTIONS: 5,
  DEBOUNCE_DELAY: 300,
  MIN_RELEVANCE_SCORE: 0.1,
  HIGH_RELEVANCE_THRESHOLD: 0.7,
  SUGGESTION_TIMEOUT: 5000,
};

export const isGeminiAvailable = (): boolean => {
  return !!GEMINI_CONFIG.API_KEY && GEMINI_CONFIG.API_KEY !== 'your-api-key-here';
};
