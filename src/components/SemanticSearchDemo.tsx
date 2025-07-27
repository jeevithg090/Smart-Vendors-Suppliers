import { useState, useEffect } from 'react';

export default function SemanticSearchDemo() {
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    // Show demo notification after a brief delay
    const timer = setTimeout(() => {
      setShowDemo(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!showDemo) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-lg animate-slide-up">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">✨</div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">AI Semantic Search Active!</h4>
            <p className="text-sm opacity-90 mb-3">
              Try searching with natural language like "organic vegetables near me" or "premium spices for restaurant"
            </p>
            <button
              onClick={() => setShowDemo(false)}
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
            >
              Got it!
            </button>
          </div>
          <button
            onClick={() => setShowDemo(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
