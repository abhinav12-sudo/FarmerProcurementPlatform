import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { ShieldCheck, LogOut, Building, User, History, ChevronDown } from 'lucide-react'

export default function StaffNavbar({ staff, selectedCenter, centers = [], onCenterChange, onOpenHistory, historyCount = 0 }) {
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileDropdownRef = useRef(null)

  const handleLogout = async () => {
    try {
      await api.post('/staff/logout')
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('staff')
      localStorage.removeItem('accessToken')
      navigate('/staff/login')
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Left Brand / Mandi Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-slate-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Mandi Operations Portal
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full">
                  Officer Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Ministry of Consumer Affairs, Food & Public Distribution • Smart Procurement System
              </p>
            </div>
          </div>

          {/* Center / Mandi Selector */}
          <div className="flex-1 max-w-xs hidden md:block">
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCenter?._id || ''}
                onChange={(e) => {
                  const center = centers.find((c) => c._id === e.target.value)
                  if (center && onCenterChange) onCenterChange(center)
                }}
                className="w-full bg-slate-800 hover:bg-slate-750 text-xs text-slate-200 pl-9 pr-8 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium transition cursor-pointer appearance-none truncate"
              >
                {centers.length === 0 ? (
                  <option value="">Loading Mandi Centers...</option>
                ) : (
                  centers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.district})
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Right: Officer Profile Dropdown & Logout */}
          <div className="flex items-center gap-3">
            {/* Interactive Staff Profile */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-700 transition cursor-pointer text-left shadow-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[130px] sm:max-w-[160px]">
                      {staff?.fullName || staff?.username || 'Mandi Officer'}
                    </p>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-400 font-medium tracking-wide">
                      On Duty
                    </span>
                  </div>
                </div>
              </button>

              {/* Profile Menu Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2.5 border-b border-slate-700">
                    <p className="text-xs font-bold text-white">
                      {staff?.fullName || staff?.username || 'Mandi Officer'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedCenter?.name || 'Assigned Center'} • Officer Desk
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Verified Staff Session</span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-1">
                    {/* Option: History */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false)
                        if (onOpenHistory) onOpenHistory()
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/80 rounded-xl transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-400 group-hover:rotate-[-20deg] transition-transform" />
                        <span className="font-bold">History & Archive</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
                        {historyCount}
                      </span>
                    </button>

                    {/* Option: Logout */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700 hover:border-red-500/40 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}
