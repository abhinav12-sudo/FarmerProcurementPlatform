import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import { ShieldCheck, User, Lock, Mail, Building, ArrowLeft, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function StaffLogin() {
    const navigate = useNavigate()

    const [isRegister, setIsRegister] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [centers, setCenters] = useState([])

    const [loginData, setLoginData] = useState({
        username: '',
        password: '',
    })

    const [registerData, setRegisterData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        centerId: '',
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (isRegister) {
            api.get('/centers')
                .then((res) => {
                    setCenters(res.data?.data || [])
                })
                .catch(() => {
                    // Non-blocking if centers are empty
                })
        }
    }, [isRegister])

    const handleLoginChange = (e) => {
        const { name, value } = e.target
        setLoginData((prev) => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleRegisterChange = (e) => {
        const { name, value } = e.target
        setRegisterData((prev) => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleLoginSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!loginData.username.trim() || !loginData.password) {
            setError('Please provide both username and password.')
            return
        }

        setLoading(true)

        try {
            const response = await api.post('/staff/login', loginData)
            const data = response.data?.data

            if (data?.staff) {
                localStorage.setItem('staff', JSON.stringify(data.staff))
            }
            if (data?.accessToken) {
                localStorage.setItem('accessToken', data.accessToken)
            }

            setSuccess('Signed in successfully! Redirecting...')

            setTimeout(() => {
                navigate('/staff/home')
            }, 1000)
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Login failed. Please check credentials.'
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    const handleRegisterSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!registerData.fullName || !registerData.username || !registerData.email || !registerData.password) {
            setError('Please fill in all required fields.')
            return
        }

        setLoading(true)

        try {
            const payload = {
                fullName: registerData.fullName,
                username: registerData.username,
                email: registerData.email,
                password: registerData.password,
                role: 'staff',
                ...(registerData.centerId ? { centerId: registerData.centerId } : {}),
            }

            await api.post('/staff/register', payload)
            setSuccess('Officer account created successfully! You can now sign in.')

            setTimeout(() => {
                setIsRegister(false)
                setSuccess('')
                setLoginData({ username: registerData.username, password: '' })
            }, 1500)
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Registration failed. Username or email may already be taken.'
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 flex flex-col justify-center items-center p-4 sm:p-6">
            <div className="w-full max-w-md mb-4 flex items-center justify-between">
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </button>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-800 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-700" /> Staff Portal
                </span>
            </div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-5 text-white">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <span>{isRegister ? 'Staff Registration' : 'Mandi Officer Login'}</span>
                    </h2>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1">
                        {isRegister
                            ? 'Create an officer account to manage queue and procurements'
                            : 'Authorized personnel portal for token check-in and produce weighing'}
                    </p>
                </div>

                <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1.5 text-xs font-medium text-gray-600">
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegister(false)
                            setError('')
                            setSuccess('')
                        }}
                        className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer font-semibold ${!isRegister ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-gray-900'
                            }`}
                    >
                        Officer Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegister(true)
                            setError('')
                            setSuccess('')
                        }}
                        className={`flex-1 py-2 text-center rounded-xl transition cursor-pointer font-semibold ${isRegister ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-gray-900'
                            }`}
                    >
                        Register New Staff
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm p-3 rounded-xl">
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{success}</span>
                    </div>
                )}

                {!isRegister ? (
                    <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                                Username (उपयोगकर्ता नाम) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    value={loginData.username}
                                    onChange={handleLoginChange}
                                    placeholder="e.g. officer_ramesh"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                                Password (पासवर्ड) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={loginData.password}
                                    onChange={handleLoginChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-3 px-4 rounded-xl shadow-md transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <span>Sign In as Staff (लॉगिन करें)</span>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={registerData.fullName}
                                    onChange={handleRegisterChange}
                                    placeholder="Officer Suresh Verma"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    value={registerData.username}
                                    onChange={handleRegisterChange}
                                    placeholder="suresh_mandi"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={registerData.email}
                                    onChange={handleRegisterChange}
                                    placeholder="suresh@mandi.gov.in"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={registerData.password}
                                    onChange={handleRegisterChange}
                                    placeholder="At least 6 characters"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                Assigned Center (Optional)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Building className="w-4 h-4" />
                                </div>
                                <select
                                    name="centerId"
                                    value={registerData.centerId}
                                    onChange={handleRegisterChange}
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 transition"
                                >
                                    <option value="">Select Mandi Center (or leave blank)</option>
                                    {centers.map((center) => (
                                        <option key={center._id} value={center._id}>
                                            {center.name} ({center.district})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer disabled:opacity-70 text-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    <span>Create Officer Account</span>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <p className="text-center text-xs text-gray-500 mt-6">
                Ministry of Consumer Affairs, Food & Public Distribution • Smart Automation System
            </p>
        </div>
    )
}

