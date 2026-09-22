import { useNavigate } from 'react-router-dom'
import { Tractor, Building2, CheckCircle2, Shield, Clock, ArrowRight } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  function chooseRole(role) {
    localStorage.setItem('userRole', role)
    if (role === 'farmer') {
      if (localStorage.getItem('farmer')) {
        navigate('/farmer/home')
      }
      else {
        navigate('/farmer/login')
      }
    } else {
      if (localStorage.getItem('staff')) {
        navigate('/staff/home')
      } else {
        navigate('/staff/login')
      }
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50 to-emerald-100 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8">
      {/* Top Bar / Government Header */}
      <div className="w-full max-w-4xl text-center pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/80 border border-emerald-200 text-emerald-900 rounded-full text-xs font-semibold tracking-wide uppercase shadow-sm">
          <span>Ministry of Consumer Affairs, Food & Public Distribution</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mt-3 tracking-tight">
          National Smart Mandi Procurement Portal
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-2xl mx-auto">
          Smart automation, real-time queue tokens, and transparent payment tracking for farmers and procurement centers
        </p>
      </div>

      {/* Main Choice Cards */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        {/* Farmer Card */}
        <div
          onClick={() => chooseRole('farmer')}
          className="group relative bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-emerald-200 hover:border-emerald-500 hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Tractor className="w-8 h-8" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                For Cultivators
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              Farmer Portal
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-5">
              Book scheduled arrival slots, receive electronic queue tokens, and track DBT payment credits.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Slot booking with guaranteed mandi arrival window</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Digital token number & live queue tracker</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant procurement bill & bank DBT status</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 group-hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition text-sm cursor-pointer"
          >
            <span>Continue as Farmer</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Staff / Officer Card */}
        <div
          onClick={() => chooseRole('staff')}
          className="group relative bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-slate-200 hover:border-slate-800 hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Building2 className="w-8 h-8" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                For Mandi Officials
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              Staff & Officer Desk
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-5">
              Manage gate check-ins, record produce weights and quality grades, and disburse MSP payments.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
                <span>Physical gate check-in & token verification</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
                <span>Crop weighing desk with automated MSP calculator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
                <span>Live waiting shed display & queue management</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-slate-900 group-hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition text-sm cursor-pointer"
          >
            <span>Officer Sign In</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Feature Pills & Footer */}
      <div className="w-full max-w-4xl text-center pb-4">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-gray-600 mb-4">
          <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200">
            <Clock className="w-3.5 h-3.5 text-emerald-700" /> Zero Wait Congestion
          </span>
          <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200">
            <Shield className="w-3.5 h-3.5 text-emerald-700" /> Direct Benefit Transfer (DBT)
          </span>
          <span className="inline-flex items-center gap-1 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200">
            <span>⚡</span> Real-Time SMS Updates
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Smart India Hackathon • Smart Automation Category • Department of Consumer Affairs (DoCA)
        </p>
      </div>
    </div>
  )
}