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

  return (✨AI Semantic Search Active!Try searching with natural language like "organic vegetables near me" or "premium spices for restaurant"setShowDemo(false)}
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
            >
              Got it!setShowDemo(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >);
}