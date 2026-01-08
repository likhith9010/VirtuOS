import { useState, useRef, useEffect } from 'react'

function ProfilePage({ onClose, initialProfile, onSave }) {
  const [username, setUsername] = useState(initialProfile?.username || '')
  const [profilePic, setProfilePic] = useState(initialProfile?.profilePic || null)
  const [plan, setPlan] = useState(initialProfile?.plan || 'free')
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef(null)

  const isPro = plan === 'pro'

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePic(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    const profile = {
      username: username || 'User',
      profilePic,
      plan
    }
    onSave(profile)
    setIsEditing(false)
  }

  const handleUpgrade = () => {
    setPlan('pro')
  }

  const handleDowngrade = () => {
    setPlan('free')
  }

  const getInitial = () => {
    if (username) return username.charAt(0).toUpperCase()
    return 'U'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-400 to-orange-600 px-6 py-8 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Profile Picture */}
          <div className="relative inline-block">
            <div 
              className="w-24 h-24 rounded-full bg-white/20 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{getInitial()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          
          <p className="text-white/80 text-sm mt-3">Click to change photo</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Username Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Stats or Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-500 mb-3">Account Info</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Plan</span>
                <span className={`font-medium ${isPro ? 'text-orange-600' : 'text-gray-600'}`}>
                  {isPro ? '⭐ PRO' : 'Free'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Member since</span>
                <span className="font-medium text-gray-900">Jan 2026</span>
              </div>
            </div>
          </div>

          {/* Upgrade/Downgrade Banner */}
          {isPro ? (
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>You're on PRO!</span>
                  </h4>
                  <p className="text-white/80 text-sm">Unlimited AI tasks enabled</p>
                </div>
                <button 
                  onClick={handleDowngrade}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Downgrade
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">Upgrade to PRO</h4>
                  <p className="text-gray-400 text-sm">Unlimited AI tasks & more</p>
                </div>
                <button 
                  onClick={handleUpgrade}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Upgrade
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
