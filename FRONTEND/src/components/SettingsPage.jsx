import { useState } from 'react'

const AI_PROVIDERS = [
  {
    id: 'google',
    name: 'Google AI',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & efficient' },
      { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', description: 'Latest & fastest' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Best for complex tasks' },
    ],
    color: 'blue'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.4 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
      </svg>
    ),
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance' },
      { id: 'o1-preview', name: 'o1 Preview', description: 'Advanced reasoning' },
    ],
    color: 'green'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0l-6.696 16.918h3.78l1.344-3.516h6.456l1.344 3.516h3.78l-6.696-16.918h-3.312zm-.252 10.338l2.16-5.652 2.16 5.652h-4.32z"/>
      </svg>
    ),
    models: [
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Best balanced' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Most powerful' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fastest' },
    ],
    color: 'orange'
  },
  {
    id: 'xai',
    name: 'xAI',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 2l9.5 10L2 22h3l7.5-8 7.5 8h3l-9.5-10L22 2h-3l-7.5 8L4 2H2z"/>
      </svg>
    ),
    models: [
      { id: 'grok-2', name: 'Grok 2', description: 'Latest version' },
      { id: 'grok-2-mini', name: 'Grok 2 Mini', description: 'Faster responses' },
    ],
    color: 'gray'
  }
]

function SettingsPage({ onClose, initialSettings, onSave }) {
  const [selectedProvider, setSelectedProvider] = useState(initialSettings?.provider || 'google')
  const [selectedModel, setSelectedModel] = useState(initialSettings?.model || 'gemini-2.5-flash')
  const [apiKeys, setApiKeys] = useState(initialSettings?.apiKeys || {})
  const [showApiKey, setShowApiKey] = useState({})

  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider)

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId)
    const provider = AI_PROVIDERS.find(p => p.id === providerId)
    if (provider && provider.models.length > 0) {
      setSelectedModel(provider.models[0].id)
    }
  }

  const handleApiKeyChange = (providerId, value) => {
    setApiKeys(prev => ({ ...prev, [providerId]: value }))
  }

  const handleSave = () => {
    onSave({
      provider: selectedProvider,
      model: selectedModel,
      apiKeys
    })
  }

  const toggleShowApiKey = (providerId) => {
    setShowApiKey(prev => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <p className="text-gray-400 text-sm">Configure your AI provider and API keys</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Provider Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Provider</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AI_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center space-y-2 ${
                    selectedProvider === provider.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`${selectedProvider === provider.id ? 'text-orange-600' : 'text-gray-600'}`}>
                    {provider.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    selectedProvider === provider.id ? 'text-orange-600' : 'text-gray-700'
                  }`}>
                    {provider.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Model</h3>
            <div className="space-y-2">
              {currentProvider?.models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    selectedModel === model.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedModel === model.id ? 'border-orange-500' : 'border-gray-300'
                    }`}>
                      {selectedModel === model.id && (
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${selectedModel === model.id ? 'text-orange-600' : 'text-gray-700'}`}>
                        {model.name}
                      </p>
                      <p className="text-xs text-gray-500">{model.description}</p>
                    </div>
                  </div>
                  {selectedModel === model.id && (
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">API Key for {currentProvider?.name}</h3>
            <div className="relative">
              <input
                type={showApiKey[selectedProvider] ? 'text' : 'password'}
                value={apiKeys[selectedProvider] || ''}
                onChange={(e) => handleApiKeyChange(selectedProvider, e.target.value)}
                placeholder={`Enter your ${currentProvider?.name} API key`}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              />
              <button
                onClick={() => toggleShowApiKey(selectedProvider)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey[selectedProvider] ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-blue-800 font-medium">How to get an API key?</p>
                <p className="text-xs text-blue-600 mt-1">
                  Visit the provider's website to create an account and generate an API key. 
                  Most providers offer free tiers for testing.
                </p>
              </div>
            </div>
          </div>
          
          {/* Current Settings Status */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-green-800 font-medium">Current Configuration</p>
                <p className="text-xs text-green-600 mt-1">
                  Provider: <span className="font-semibold">{currentProvider?.name}</span> • 
                  Model: <span className="font-semibold">{currentProvider?.models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  {apiKeys[selectedProvider] ? '✓ API key configured' : '⚠️ No API key set (will use .env fallback)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
