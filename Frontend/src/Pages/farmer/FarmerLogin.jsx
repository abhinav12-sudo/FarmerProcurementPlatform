import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import {
  User,
  Phone,
  MapPin,
  FileText,
  Landmark,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react'
import { useLanguage, LANGUAGES } from '../../context/LanguageContext.jsx'

export default function FarmerLogin() {
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langDropdownRef = useRef(null)

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(event) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Tab mode: 'login' (OTP) | 'register'
  const [isRegister, setIsRegister] = useState(false)

  // Login (OTP) State
  const [loginPhone, setLoginPhone] = useState('')
  const [otpStep, setOtpStep] = useState('phone') // 'phone' | 'otp'
  const [otpValue, setOtpValue] = useState('')
  const [simulatedOtp, setSimulatedOtp] = useState(null)

  // Registration State
  const [registerData, setRegisterData] = useState({
    name: '',
    phone: '',
    village: '',
    land_record_number: '',
    bank_account: '',
  })

  // Feedback & Loading State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Handle Register Inputs
  const handleRegisterChange = (e) => {
    const { name, value } = e.target
    setRegisterData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
  }

  // ----------------------------------------------------
  // 1. STEP 1: Request OTP for Login
  // ----------------------------------------------------
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanPhone = loginPhone.trim()
    if (!cleanPhone || cleanPhone.length < 10) {
      setError(t('validPhoneError'))
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/farmers/request-otp', { phone: cleanPhone })
      const data = response.data?.data

      if (data?.previewOtp) {
        setSimulatedOtp(data.previewOtp)
        setOtpValue(data.previewOtp) // Auto-fill for fast testing
      }

      setOtpStep('otp')
      setSuccess(t('otpSentSuccess', { phone: cleanPhone }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP.'
      if (err.response?.status === 404) {
        setError(t('farmerNotFoundError'))
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------------------
  // 2. STEP 2: Verify OTP and Sign In
  // ----------------------------------------------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!otpValue.trim() || otpValue.trim().length !== 6) {
      setError(t('validOtpError'))
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/farmers/verify-otp', {
        phone: loginPhone.trim(),
        otp: otpValue.trim(),
      })

      const data = response.data?.data
      if (data?.farmer) {
        localStorage.setItem('farmer', JSON.stringify(data.farmer))
      }
      if (data?.accessToken) {
        localStorage.setItem('farmerAccessToken', data.accessToken)
      }

      setSuccess(t('signInSuccess'))

      setTimeout(() => {
        navigate('/farmer/home')
      }, 1000)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------------------
  // 3. Register New Farmer
  // ----------------------------------------------------
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!registerData.name.trim() || !registerData.phone.trim()) {
      setError(t('registerRequiredFields'))
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/farmers/register', registerData)
      const farmer = response.data?.data

      localStorage.setItem('farmer', JSON.stringify(farmer))
      setSuccess(t('registeredSuccess'))

      setTimeout(() => {
        navigate('/farmer/home')
      }, 1200)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed.'
      if (err.response?.status === 409) {
        setError(t('alreadyRegisteredPhone'))
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50 to-emerald-100 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Header & Back button */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:text-emerald-950 transition cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> {t('backToHome')}
        </button>

        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 transition cursor-pointer shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <span>{currentLangObj.flag}</span>
              <span className="font-medium text-xs hidden xs:inline">{currentLangObj.nativeLabel}</span>
              <ChevronDown className={`w-3 h-3 text-emerald-700 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-emerald-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
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

          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-full flex items-center gap-1 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" /> {t('kisanPortal')}
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-6 py-5 text-white">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isRegister ? t('farmerRegisterTitle') : t('farmerSignInTitle')}
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            {isRegister ? t('farmerRegisterSubtitle') : t('farmerSignInSubtitle')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1.5 text-xs font-medium text-gray-600">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false)
              setError('')
              setSuccess('')
              setOtpStep('phone')
            }}
            className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer font-semibold ${
              !isRegister ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            {t('tabSignIn')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true)
              setError('')
              setSuccess('')
            }}
            className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer font-semibold ${
              isRegister ? 'bg-white text-emerald-900 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            {t('tabRegister')}
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm p-3 rounded-xl animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm p-3 rounded-xl animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Simulated SMS Toast Preview for Developer & Demo Mode */}
        {simulatedOtp && !isRegister && otpStep === 'otp' && (
          <div className="mx-6 mt-3 bg-slate-900 text-white p-3 rounded-xl border border-slate-700 text-xs flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-emerald-400 font-bold block uppercase">
                  {t('simulatedSmsCode')}
                </span>
                <span className="font-mono font-bold text-white tracking-widest text-sm">
                  {simulatedOtp}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded">
              {t('autoFilled')}
            </span>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OTP LOGIN FLOW */}
        {/* ---------------------------------------------------- */}
        {!isRegister ? (
          <div className="p-6">
            {otpStep === 'phone' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    {t('mobileNumberLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => {
                        setLoginPhone(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder={t('mobileNumberPlaceholder')}
                      maxLength={10}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t('mobileNumberHelp')}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-medium py-3 px-4 rounded-xl shadow-md transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('sendingOtp')}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>{t('sendLoginOtp')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('enterOtpLabel')} <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('phone')
                        setError('')
                        setSuccess('')
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                    >
                      {t('changeNumber')}
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={otpValue}
                      onChange={(e) => {
                        setOtpValue(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="••••••"
                      maxLength={6}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-mono tracking-widest text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-medium py-3 px-4 rounded-xl shadow-md transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('verifying')}</span>
                      </>
                    ) : (
                      <span>{t('verifyAndSignIn')}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-emerald-800 py-1 font-medium transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('resendOtp')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* ---------------------------------------------------- */
          /* TAB 2: REGISTRATION FORM */
          /* ---------------------------------------------------- */
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                {t('fullNameLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  placeholder={t('fullNamePlaceholder')}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                {t('mobileNumberLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={registerData.phone}
                  onChange={handleRegisterChange}
                  placeholder={t('mobileNumberPlaceholder')}
                  maxLength={10}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                {t('villageDistrictLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="village"
                  value={registerData.village}
                  onChange={handleRegisterChange}
                  placeholder={t('villageDistrictPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                {t('landRecordLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="land_record_number"
                  value={registerData.land_record_number}
                  onChange={handleRegisterChange}
                  placeholder={t('landRecordPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                {t('bankAccountLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Landmark className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="bank_account"
                  value={registerData.bank_account}
                  onChange={handleRegisterChange}
                  placeholder={t('bankAccountPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-medium py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer disabled:opacity-70 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('registering')}</span>
                  </>
                ) : (
                  <span>{t('registerAndContinue')}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-emerald-800/80 mt-6">
        {t('loginGovFooter')}
      </p>
    </div>
  )
}
