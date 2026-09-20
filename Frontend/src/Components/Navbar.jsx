import { useNavigate } from 'react-router-dom'
import { LogOut, User, MapPin, Phone, Shield } from 'lucide-react'

export default function Navbar({ farmer }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('farmer')
    localStorage.removeItem('userRole')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Ministry Badge */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-600/20">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-base sm:text-lg tracking-tight">Kisan Mandi</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  ई-उपार्जन
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden md:block">
                Dept of Consumer Affairs • Smart Procurement
              </p>
            </div>
          </div>

          {/* Farmer Profile Info & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            {farmer && (
              <div className="hidden sm:flex flex-col items-end text-right">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{farmer.name || 'Registered Farmer'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  {farmer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {farmer.phone}
                    </span>
                  )}
                  {farmer.village && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {farmer.village}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Farmer Badge */}
            {farmer && (
              <div className="sm:hidden flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span className="max-w-[100px] truncate">{farmer.name?.split(' ')[0] || 'Farmer'}</span>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-red-700 bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
