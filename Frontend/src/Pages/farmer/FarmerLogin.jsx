import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import { User, Phone, MapPin, FileText, Landmark, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function FarmerLogin() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    land_record_number: '',
    bank_account: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Please provide both your Name and Mobile Number.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/farmers/register', formData)
      const farmer = response.data?.data


      localStorage.setItem('farmer', JSON.stringify(farmer))
      setSuccess('Farmer registered successfully! Redirecting...')

      setTimeout(() => {
        navigate('/farmer/home')
      }, 1200)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Something went wrong. Please check backend connection.'

      // If farmer is already registered with this phone number
      if (err.response?.status === 409) {
        setError('This phone number is already registered. If this is you, you can continue directly.')
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
        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-full">
          🌾 Kisan Portal
        </span>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-emerald-700 px-6 py-5 text-white">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Farmer Registration</h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            Register your details once to book slots and track mandi payments
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm p-3 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm p-3 rounded-xl">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name (पूरा नाम) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Ramesh Kumar"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Mobile Number */}
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
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                maxLength={10}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Used for slot token SMS and procurement updates</p>
          </div>

          {/* Village */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Village / Tehsil (गाँव / तहसील)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="village"
                value={formData.village}
                onChange={handleChange}
                placeholder="e.g. Rampur, Khatauli"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Land Record Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Land Record Number (खसरा / खतौनी संख्या)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="land_record_number"
                value={formData.land_record_number}
                onChange={handleChange}
                placeholder="e.g. UP/2024/KH-89412"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Bank Account */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Bank Account No. (बैंक खाता संख्या)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Landmark className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleChange}
                placeholder="e.g. 10023456789012"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Direct Benefit Transfer (DBT) will be credited to this account</p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm"
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
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        Ministry of Consumer Affairs, Food & Public Distribution • Smart Procurement
      </p>
    </div>
  )
}
