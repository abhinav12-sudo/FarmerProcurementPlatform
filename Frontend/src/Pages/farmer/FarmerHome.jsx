import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import Navbar from '../../Components/Navbar.jsx'
import SlotBooking from '../../Components/SlotBooking.jsx'
import FarmerHistory from '../../Components/FarmerHistory.jsx'
import LiveQueueTracker from '../../Components/LiveQueueTracker.jsx'
import { Calendar, Ticket, Landmark, FileText, CheckCircle2, MessageSquare, X } from 'lucide-react'

export default function FarmerHome() {
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)
  const [activeBookings, setActiveBookings] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [smsNotification, setSmsNotification] = useState(null)

  useEffect(() => {
    const storedFarmerData = localStorage.getItem('farmer')
    if (!storedFarmerData) {
      navigate('/farmer/login')
      return
    }

    try {
      setFarmer(JSON.parse(storedFarmerData))
    } catch {
      localStorage.removeItem('farmer')
      navigate('/farmer/login')
    }
  }, [navigate])

  // Fetch all active bookings for Live Queue Tracker
  useEffect(() => {
    if (!farmer?._id) return

    api.get(`/farmers/${farmer._id}/history`)
      .then((res) => {
        const historyList = res.data?.data || []
        // Include booked, checked_in, and recent completed bookings (within 48h) for live tracking & payout monitoring
        const activeList = historyList.filter((b) => {
          if (b.status === 'booked' || b.status === 'checked_in') return true
          if (b.status === 'completed') {
            const timestamp = b.procuredAt || b.createdAt
            if (!timestamp) return true
            const diffHours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60)
            return diffHours <= 48
          }
          return false
        })
        setActiveBookings(activeList)
      })
      .catch(() => {
        // Non-blocking
      })
  }, [farmer?._id, refreshTrigger])


  const handleBookingSuccess = (booking) => {
    // Trigger history refresh
    setRefreshTrigger((prev) => prev + 1)

    // Simulate SMS notification
    setSmsNotification({
      token: booking.tokenNumber,
      message: `DoCA-MANDI: Slot booked successfully. Your electronic token is ${booking.tokenNumber}. Please reach the counter on time.`,
    })

    // Auto-dismiss SMS simulation toast after 8 seconds
    setTimeout(() => {
      setSmsNotification(null)
    }, 8000)
  }


  if (!farmer) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/40 to-emerald-100/50 flex flex-col justify-between">
      <div>
        {/* Navigation Bar */}
        <Navbar farmer={farmer} />

        {/* Floating Simulated SMS Notification Toast */}
        {smsNotification && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <span>Simulated SMS Alert (DoCA-GOV)</span>
              </div>
              <button
                onClick={() => setSmsNotification(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300 mt-2 font-mono bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              {smsNotification.message}
            </p>
            <span className="text-[10px] text-gray-500 block mt-2">
              Delivered to {farmer.phone} • Instant Queue Token
            </span>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4">
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-900/60 border border-emerald-500/40 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-200 mb-2">
                🌾 Kisan Dashboard • किसान डैशबोर्ड
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Namaste, {farmer.name || 'Farmer'}!
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                Manage your scheduled mandi visits, avoid rush-hour waiting lines, and receive direct MSP payments in your bank account.
              </p>
            </div>

            {/* Quick Profile Verification Badges */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto text-xs">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 text-emerald-200 text-[11px] font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Land Record / Khasra</span>
                </div>
                <p className="font-bold text-white mt-1 truncate max-w-[140px]">
                  {farmer.landRecordNumber || 'Verified Land'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 text-emerald-200 text-[11px] font-medium">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>DBT Bank Linked</span>
                </div>
                <p className="font-bold text-white mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[120px]">{farmer.bankAccount ? `••••${farmer.bankAccount.slice(-4)}` : 'Active'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-8">
          {/* Live Queue Radar (Appears when farmer has active bookings) */}
          {activeBookings.length > 0 && (
            <section className="animate-in fade-in slide-in-from-top-3">
              <LiveQueueTracker
                activeBookings={activeBookings}
                farmer={farmer}
                onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
              />
            </section>
          )}


          {/* Section 1: Book Mandi Slot */}
          <section>
            <SlotBooking farmer={farmer} onBookingSuccess={handleBookingSuccess} />
          </section>


          {/* Section 2: My Tokens & Mandi Passbook */}
          <section>
            <FarmerHistory
              farmer={farmer}
              refreshTrigger={refreshTrigger}
              onHistoryChange={() => setRefreshTrigger((prev) => prev + 1)}
            />
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-emerald-100 bg-white/70 text-center text-xs text-gray-500">
        <p>Smart India Hackathon 2024 • Ministry of Consumer Affairs, Food & Public Distribution</p>
        <p className="text-[11px] text-gray-400 mt-1">Smart Automation & Real-Time Procurement Platform</p>
      </footer>
    </div>
  )
}
