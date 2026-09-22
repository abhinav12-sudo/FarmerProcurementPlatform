import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, MapPin, Phone, Globe, ChevronDown, Check, History, FileText } from 'lucide-react'
import { useLanguage, LANGUAGES } from '../context/LanguageContext.jsx'

export default function Navbar({ farmer, onOpenHistory, weighedCount = 0 }) {
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const langDropdownRef = useRef(null)
  const profileDropdownRef = useRef(null)

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  const handleLogout = () => {
    localStorage.removeItem('farmer')
    localStorage.removeItem('userRole')
    navigate('/')
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangOpen(false)
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Ministry Badge */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <span className="text-xl">🌾</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-base sm:text-lg tracking-tight">
                  {t('kisanMandi')}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  {t('eProcurement')}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden md:block">
                {t('deptSubtitle')}
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* Language Dropdown Selector */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200/90 hover:border-emerald-400 bg-white hover:bg-emerald-50/50 text-xs font-semibold text-emerald-950 shadow-2xs transition cursor-pointer"
                title={t('selectLanguage')}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-sm leading-none">{currentLangObj.flag}</span>
                <span className="font-medium text-xs hidden sm:inline">{currentLangObj.nativeLabel}</span>
                <ChevronDown className={`w-3 h-3 text-emerald-700 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-emerald-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 border-b border-gray-100 mb-1">
                    {t('selectLanguage')}
                  </div>
                  {LANGUAGES.map((langItem) => {
                    const isSelected = langItem.code === language
                    return (
                      <button
                        key={langItem.code}
                        type="button"
                        onClick={() => {
                          setLanguage(langItem.code)
                          setIsLangOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{langItem.flag}</span>
                          <span>{langItem.nativeLabel}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Farmer Profile Button with Interactive Dropdown */}
            {farmer && (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100/60 transition cursor-pointer shadow-2xs text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-800">
                      <span className="truncate max-w-[120px]">{farmer.name || t('registeredFarmer')}</span>
                      <ChevronDown className={`w-3 h-3 text-emerald-700 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                      {farmer.village || farmer.phone || t('farmer')}
                    </p>
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-emerald-100 py-2 z-50 animate-in fade-in zoom-in-95">
                    {/* Farmer Details Header */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900">{farmer.name || t('farmer')}</p>
                      {farmer.phone && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1">
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{farmer.phone}</span>
                        </p>
                      )}
                      {farmer.village && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{farmer.village}</span>
                        </p>
                      )}
                      {farmer.landRecordNumber && (
                        <div className="mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-medium inline-flex items-center gap-1 border border-emerald-200/60">
                          <FileText className="w-3 h-3 text-emerald-600" />
                          <span>{t('landRecordKhasra')}: {farmer.landRecordNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Menu Actions */}
                    <div className="p-1.5 space-y-1">
                      {/* Option: History */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false)
                          if (onOpenHistory) onOpenHistory()
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-50 rounded-xl transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-emerald-600 group-hover:rotate-[-20deg] transition-transform" />
                          <span className="font-bold">{t('history')}</span>
                        </div>
                        {weighedCount > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                            {weighedCount} {t('weighedStatus')}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                            {t('viewWeighedTokens')}
                          </span>
                        )}
                      </button>

                      {/* Option: Sign Out */}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>{t('signOut')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direct Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-red-700 bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition cursor-pointer"
              title={t('signOut')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t('signOut')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
