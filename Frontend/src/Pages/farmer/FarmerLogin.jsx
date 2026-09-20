import { useState } from 'react'
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
} from 'lucide-react'

export default function FarmerLogin() {
  const navigate = useNavigate()

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
      setError('Please enter a valid 10-digit mobile number.')
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
      setSuccess(`OTP sent to +91 ${cleanPhone}. Please enter the 6-digit code.`)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP.'
      if (err.response?.status === 404) {
        setError('No farmer found with this phone number. Please click "Register New Farmer" below.')
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
      setError('Please enter the 6-digit OTP code.')
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

      setSuccess('Signed in successfully! Redirecting to Kisan Dashboard...')

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
      setError('Please provide both your Name and Mobile Number.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/farmers/register', registerData)
      const farmer = response.data?.data

      localStorage.setItem('farmer', JSON.stringify(farmer))
      setSuccess('Farmer registered successfully! Redirecting to your dashboard...')

      setTimeout(() => {
        navigate('/farmer/home')
      }, 1200)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed.'
      if (err.response?.status === 409) {
        setError('This phone number is already registered. Please switch to "Farmer Sign In" above.')
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
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" /> Kisan Portal
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-6 py-5 text-white">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isRegister ? 'Farmer Registration' : 'Kisan Sign In (लॉगिन)'}
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            {isRegister
              ? 'Register once to book mandi slots and receive MSP payments'
              : 'Sign in with your registered phone number via secure OTP'}
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
            Farmer Sign In (OTP)
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
            Register New Farmer
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
                  Simulated SMS Code
                </span>
                <span className="font-mono font-bold text-white tracking-widest text-sm">
                  {simulatedOtp}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded">
              Auto-filled
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
                    Mobile Number (मोबाइल नंबर) <span className="text-red-500">*</span>
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
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Enter the 10-digit mobile number linked with your PM-Kisan / Mandi account.
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
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send Login OTP (ओटीपी भेजें)</span>
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
                      Enter 6-Digit OTP (ओटीपी दर्ज करें) <span className="text-red-500">*</span>
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
                      Change Number
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
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify & Sign In (लॉगिन करें)</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-emerald-800 py-1 font-medium transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Didn't receive OTP? Resend OTP</span>
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
                Full Name (पूरा नाम) <span className="text-red-500">*</span>
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
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Mobile Number (मोबाइल नंबर) <span className="text-red-500">*</span>
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
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Village / District (गाँव / ज़िला)
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
                  placeholder="e.g. Rampur, Anantnag"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Land Record / Khasra (खसरा / भूमि रिकॉर्ड)
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
                  placeholder="e.g. KH-45892/2024"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Bank Account for DBT (बैंक खाता संख्या)
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
                  placeholder="e.g. 123456789012"
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
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register & Continue (पंजीकरण करें)</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-emerald-800/80 mt-6">
        Ministry of Consumer Affairs, Food & Public Distribution • Direct Farmer MSP Portal
      </p>
    </div>
  )
}
