import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import Navbar from '../../Components/Navbar.jsx'
import SlotBooking from '../../Components/SlotBooking.jsx'
import LiveQueueTracker from '../../Components/LiveQueueTracker.jsx'
import { Calendar, Ticket, Landmark, FileText, CheckCircle2, MessageSquare, X, History, Scale, IndianRupee, Building2, Clock, CheckCheck } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function FarmerHome() {
  const navigate = useNavigate()
  const { t, getCropName } = useLanguage()
  const [farmer, setFarmer] = useState(null)
  const [activeBookings, setActiveBookings] = useState([])
  const [allHistoryList, setAllHistoryList] = useState([])
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyTab, setHistoryTab] = useState('weighed') // 'weighed' | 'all'
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
        setAllHistoryList(historyList)

        // STRICT REQUIREMENT: Only 'booked' and 'checked_in' tokens enter the Live Queue!
        // Weighed (completed) tokens are strictly excluded from the live queue and displayed in History.
        const activeList = historyList.filter((b) => {
          return b.status === 'booked' || b.status === 'checked_in'
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

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(t('confirmCancelBooking') || 'Are you sure you want to cancel this booking?')) {
      return
    }
    try {
      await api.post(`/bookings/${bookingId}/cancel`)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.')
    }
  }


  if (!farmer) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/40 to-emerald-100/50 flex flex-col justify-between">
      <div>
        {/* Navigation Bar with onOpenHistory callback */}
        <Navbar
          farmer={farmer}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          weighedCount={allHistoryList.filter((b) => b.status === 'completed').length}
        />

        {/* Floating Simulated SMS Notification Toast */}
        {smsNotification && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <span>{t('smsSimulationTitle')}</span>
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
              {t('smsDeliveredTo', { phone: farmer.phone })}
            </span>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4">
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-900/60 border border-emerald-500/40 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-200 mb-2">
                🌾 {t('kisanDashboard')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {t('welcomeGreeting')}, {farmer.name || t('farmer')}!
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                {t('homeSubtitle')}
              </p>
            </div>

            {/* Quick Profile Verification Badges */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto text-xs">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 text-emerald-200 text-[11px] font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('landRecordKhasra')}</span>
                </div>
                <p className="font-bold text-white mt-1 truncate max-w-[140px]">
                  {farmer.landRecordNumber || t('verifiedLand')}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 text-emerald-200 text-[11px] font-medium">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>{t('dbtBankLinked')}</span>
                </div>
                <p className="font-bold text-white mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[120px]">{farmer.bankAccount ? `••••${farmer.bankAccount.slice(-4)}` : t('active')}</span>
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
        </main>
      </div>

      {/* Dedicated Weighed Tokens & Procurement History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700/70 border border-emerald-500/40 flex items-center justify-center text-white">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {t('weighedTokensModalTitle')}
                  </h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    {t('weighedTokensModalSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 pt-4 pb-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setHistoryTab('weighed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  historyTab === 'weighed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t('viewWeighedTokens')}</span>
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {allHistoryList.filter((b) => b.status === 'completed').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  historyTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>{t('myTokensPassbook')}</span>
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {allHistoryList.length}
                </span>
              </button>
            </div>

            {/* Modal Body: List of Tokens */}
            <div className="p-6 overflow-y-auto space-y-3.5">
              {(() => {
                const displayList = historyTab === 'weighed'
                  ? allHistoryList.filter((b) => b.status === 'completed')
                  : allHistoryList

                if (displayList.length === 0) {
                  return (
                    <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-xl text-emerald-600 mb-2">
                        ⚖️
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">
                        {t('noWeighedTokensYet')}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        {t('noWeighedTokensDesc')}
                      </p>
                    </div>
                  )
                }

                return displayList.map((item) => {
                  const isItemCompleted = item.status === 'completed'
                  const itemDate = item.procuredAt || item.startTime || item.createdAt
                  const formattedDate = itemDate
                    ? new Date(itemDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : ''
                  const formattedTime = itemDate
                    ? new Date(itemDate).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''

                  const items = item.items || []
                  const totalKg = items.reduce((sum, it) => sum + (Number(it.quantityKg) || 0), 0)
                  const rate = items.length > 0 && items[0].ratePerKg ? items[0].ratePerKg : null

                  return (
                    <div
                      key={item._id}
                      className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-emerald-900 shrink-0 font-mono">
                          <Ticket className="w-4 h-4 text-emerald-600" />
                          <span className="text-[10px] font-bold leading-none mt-0.5">{item.tokenNumber}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">
                              {getCropName(item.cropType)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isItemCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isItemCompleted ? t('statusCompleted') : t('statusBooked')}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {formattedDate} {formattedTime}
                            </span>
                            {item.centerName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {item.centerName}
                              </span>
                            )}
                            {totalKg > 0 && (
                              <span className="font-semibold text-emerald-800">
                                ⚖️ {totalKg.toLocaleString('en-IN')} kg ({(totalKg / 100).toFixed(2)} Qtl)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment Status & Amount Badge */}
                      <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 flex sm:flex-col items-center sm:items-end justify-between">
                        {item.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            <CheckCheck className="w-3 h-3 text-emerald-600" />
                            {t('paymentPaidViaDbt')}
                          </span>
                        ) : item.paymentStatus === 'processing' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            <Clock className="w-3 h-3 text-blue-600" />
                            {t('paymentProcessing')}
                          </span>
                        ) : isItemCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {t('paymentPending')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">
                            {t('paymentAwaitingWeighing')}
                          </span>
                        )}

                        {item.amount != null && item.amount > 0 && (
                          <p className="text-sm font-extrabold text-emerald-950 font-mono flex items-center mt-1">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {Number(item.amount).toLocaleString('en-IN')}
                          </p>
                        )}

                        {item.status === 'booked' && (
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(item._id)}
                            className="mt-2 text-[11px] text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer border border-red-200"
                          >
                            {t('cancelSlot')}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span>{farmer.name} • {farmer.phone}</span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition cursor-pointer"
              >
                {t('closeModal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-emerald-100 bg-white/70 text-center text-xs text-gray-500">
        <p>{t('footerHackathon')}</p>
        <p className="text-[11px] text-gray-400 mt-1">{t('footerPlatform')}</p>
      </footer>
    </div>
  )
}
