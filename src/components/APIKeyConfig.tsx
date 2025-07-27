import { useState } from 'react';
import { getAPIKeyStatus, API_KEY_INSTRUCTIONS, ENV_VAR_NAMES } from '../utils/apiKeys';

export default function APIKeyConfig() {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getAPIKeyStatus();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Voice Query API Configuration</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Status Overview */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">Sarvam AI:</span>
          <span className={`text-sm ${status.sarvam.configured ? 'text-green-600' : 'text-red-600'}`}>
            {status.sarvam.status}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">OpenRouter:</span>
          <span className={`text-sm ${status.openRouter.configured ? 'text-green-600' : 'text-red-600'}`}>
            {status.openRouter.status}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">Google Translate:</span>
          <span className="text-sm text-yellow-600">
            {status.googleTranslate.status}
          </span>
        </div>
      </div>

      {/* Overall Status */}
      <div className="mt-4 p-3 rounded-md bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Overall Status:</span>
          <span className={`text-sm font-medium ${status.overall.valid ? 'text-green-600' : 'text-red-600'}`}>
            {status.overall.valid ? '✅ Ready to Use' : '❌ Configuration Required'}
          </span>
        </div>
        {!status.overall.valid && (
          <p className="text-sm text-red-600 mt-1">
            Missing: {status.overall.missing.join(', ')}
          </p>
        )}
      </div>

      {/* Detailed Instructions */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Setup Instructions</h4>
            
            {/* Sarvam AI */}
            <div className="mb-4 p-3 border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-800">{API_KEY_INSTRUCTIONS.sarvam.name}</h5>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{API_KEY_INSTRUCTIONS.sarvam.description}</p>
              <div className="text-xs text-gray-500">
                <strong>Environment Variable:</strong> {ENV_VAR_NAMES.SARVAM_API_KEY}
              </div>
              <div className="text-xs text-gray-500">
                <strong>Current Value:</strong> {status.sarvam.configured ? '✅ Configured' : '❌ Not set'}
              </div>
              <a
                href={API_KEY_INSTRUCTIONS.sarvam.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
              >
                Get API Key →
              </a>
            </div>

            {/* OpenRouter */}
            <div className="mb-4 p-3 border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-800">{API_KEY_INSTRUCTIONS.openRouter.name}</h5>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{API_KEY_INSTRUCTIONS.openRouter.description}</p>
              <div className="text-xs text-gray-500">
                <strong>Environment Variable:</strong> {ENV_VAR_NAMES.OPENROUTER_API_KEY}
              </div>
              <div className="text-xs text-gray-500">
                <strong>Current Value:</strong> {status.openRouter.configured ? '✅ Configured' : '❌ Not set'}
              </div>
              <a
                href={API_KEY_INSTRUCTIONS.openRouter.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
              >
                Get API Key →
              </a>
            </div>

            {/* Google Translate */}
            <div className="mb-4 p-3 border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-800">{API_KEY_INSTRUCTIONS.googleTranslate.name}</h5>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Optional</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{API_KEY_INSTRUCTIONS.googleTranslate.description}</p>
              <div className="text-xs text-gray-500">
                <strong>Environment Variable:</strong> {ENV_VAR_NAMES.GOOGLE_TRANSLATE_API_KEY}
              </div>
              <div className="text-xs text-gray-500">
                <strong>Current Value:</strong> {status.googleTranslate.configured ? '✅ Configured' : '⚠️ Not set'}
              </div>
              <a
                href={API_KEY_INSTRUCTIONS.googleTranslate.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
              >
                Get API Key →
              </a>
            </div>

            {/* Environment File Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h5 className="font-medium text-blue-800 mb-2">Environment File Setup</h5>
              <p className="text-sm text-blue-700 mb-3">
                Add your API keys to the <code className="bg-blue-100 px-1 rounded">.env.local</code> file:
              </p>
              <pre className="text-xs bg-blue-100 p-3 rounded overflow-x-auto">
{`# Voice Query Feature API Keys
VITE_SARVAM_API_KEY=sk_30vh1t24_YxCQZZKGkCTWa9zSszUBEyeg
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here`}
              </pre>
              <p className="text-xs text-blue-600 mt-2">
                Note: Restart your development server after updating environment variables.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 