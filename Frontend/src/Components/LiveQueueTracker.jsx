import { useState, useEffect, useCallback } from 'react'
import api from '../api/client.js'
import {
  Activity,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Scale,
  Building2,
  Ticket,
  Sparkles,
  Truck,
  ChevronRight,
  IndianRupee,
  Landmark,
  CheckCheck,
  Calendar,
  PhoneCall,
} from 'lucide-react'

export default function LiveQueueTracker({ activeBookings = [], activeBooking, farmer, onRefresh }) {
  // Normalize incoming bookings to an array
  const bookingsList = activeBookings.length > 0
    ? activeBookings
    : (activeBooking ? [activeBooking] : [])

  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0)
  const [queueData, setQueueData] = useState({
    queue: [],
    checkedInQueue: [],
    bookedQueue: [],
    servingToken: null,
    lastCompletedToken: null,
    currentlyWaiting: 0,
    totalBookedWaiting: 0,
    totalActiveToday: 0,
    avgProcessingMinutes: 12,
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Ensure index is valid
  const validIndex = selectedTokenIndex < bookingsList.length ? selectedTokenIndex : 0
  const currentBooking = bookingsList[validIndex] || null

  const centerId = currentBooking?.centerId
  const myToken = currentBooking?.tokenNumber
  const status = currentBooking?.status // 'booked' | 'checked_in' | 'completed' | 'cancelled'

  const fetchQueue = useCallback(async () => {
    if (!centerId) return
    setLoading(true)
    try {
      const res = await api.get(`/bookings/queue/${centerId}`)
      const data = res.data?.data || {}
      setQueueData({
        queue: data.queue || data.checkedInQueue || [],
        checkedInQueue: data.checkedInQueue || data.queue || [],
        bookedQueue: data.bookedQueue || [],
        servingToken: data.servingToken || null,
        lastCompletedToken: data.lastCompletedToken || null,
        currentlyWaiting: data.currentlyWaiting || 0,
        totalBookedWaiting: data.totalBookedWaiting || 0,
        totalActiveToday: data.totalActiveToday || 0,
        avgProcessingMinutes: data.avgProcessingMinutes || 12,
      })
      setLastUpdated(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    } catch (err) {
      console.error('Failed to load live queue for farmer', err)
    } finally {
      setLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // Polling every 10 seconds for real-time live queue & status updates
  useEffect(() => {
    if (!centerId || status === 'cancelled') return
    // Stop polling if completed and already paid
    if (status === 'completed' && currentBooking?.paymentStatus === 'paid') return

    const interval = setInterval(() => {
      fetchQueue()
      if (onRefresh) onRefresh()
    }, 10000)
    return () => clearInterval(interval)
  }, [centerId, status, currentBooking?.paymentStatus, fetchQueue, onRefresh])

  if (!currentBooking || status === 'cancelled') {
    return null
  }

  // Lifecycle States
  const isBooked = status === 'booked'
  const isCheckedIn = status === 'checked_in'
  const isCompleted = status === 'completed'
  const isPaid = currentBooking?.paymentStatus === 'paid'

  const checkedInList = queueData.checkedInQueue || queueData.queue || []
  const bookedList = queueData.bookedQueue || []
  const avgMin = queueData.avgProcessingMinutes || 12

  // Serving token at scale
  const currentServingToken = queueData.servingToken || (checkedInList.length > 0 ? checkedInList[0].tokenNumber : null)

  // -------------------------------------------------------------
  // PHASE 1 CALCULATION (Farmer at Home • status === 'booked')
  // -------------------------------------------------------------
  const nowMs = Date.now()
  const todayDate = new Date(nowMs)
  const onePmMs = new Date(nowMs).setHours(13, 0, 0, 0)
  const twoPmMs = new Date(nowMs).setHours(14, 0, 0, 0)
  const isCurrentlyLunchBreak = queueData.isLunchBreak || (nowMs >= onePmMs && nowMs < twoPmMs)
  const isCurrentlyPast5pm = queueData.isGateClosed || (todayDate.getHours() >= 17)

  let tokensAheadPreArrival = 0
  if (isBooked) {
    const myBookedIndex = bookedList.findIndex((b) => b.tokenNumber === myToken)
    const bookedAhead = myBookedIndex >= 0 ? myBookedIndex : 0
    tokensAheadPreArrival = checkedInList.length + bookedAhead
  }

  const rawWaitMinutesPreArrival = tokensAheadPreArrival * avgMin
  let estimatedTurnTimeMs = nowMs + rawWaitMinutesPreArrival * 60 * 1000

  // 1:00 PM - 2:00 PM Lunch Break Shift
  if (nowMs >= onePmMs && nowMs < twoPmMs) {
    // Current time is during lunch -> scale operations resume at 2:00 PM
    estimatedTurnTimeMs = twoPmMs + rawWaitMinutesPreArrival * 60 * 1000
  } else if (nowMs < onePmMs && estimatedTurnTimeMs >= onePmMs) {
    // Starting before 1 PM and ending at or after 1 PM -> add 60 mins lunch shift
    estimatedTurnTimeMs += 60 * 60 * 1000
  }

  const estimatedWaitMinutesPreArrival = Math.max(0, Math.round((estimatedTurnTimeMs - nowMs) / 60000))
  const estimatedTurnTimeDate = new Date(estimatedTurnTimeMs)
  const formattedTurnTime = estimatedTurnTimeDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // 30 mins prior gate arrival advisory
  let gateCallMs = estimatedTurnTimeMs - 30 * 60 * 1000
  if (gateCallMs >= onePmMs && gateCallMs < twoPmMs) {
    gateCallMs = onePmMs + 45 * 60 * 1000 // Shift to 1:45 PM
  }

  const isImmediateGateCall = gateCallMs <= nowMs || tokensAheadPreArrival <= 2
  const formattedGateTime = new Date(gateCallMs).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // -------------------------------------------------------------
  // PHASE 2 CALCULATION (Farmer in Yard • status === 'checked_in')
  // -------------------------------------------------------------
  const yardPositionIndex = checkedInList.findIndex((item) => item.tokenNumber === myToken)
  const isAtScale = isCheckedIn && yardPositionIndex === 0
  const isInYardQueue = isCheckedIn && yardPositionIndex > 0
  const yardTractorsAhead = yardPositionIndex > 0 ? yardPositionIndex : 0
  const estimatedYardWaitMinutes = yardPositionIndex >= 0 ? yardPositionIndex * avgMin : 0

  // -------------------------------------------------------------
  // PHASE 3 CALCULATION (Weighed & Completed • status === 'completed')
  // -------------------------------------------------------------
  const items = currentBooking?.items || []
  const totalQtyKg = items.reduce((sum, item) => sum + (Number(item.quantityKg) || 0), 0)
  const displayGrade = items.length > 0 && items[0].grade ? items[0].grade : 'FAQ (Standard)'
  const displayRate = items.length > 0 && items[0].ratePerKg ? items[0].ratePerKg : null
  const totalAmountFormatted = currentBooking?.amount
    ? Number(currentBooking.amount).toLocaleString('en-IN')
    : null

  // -------------------------------------------------------------
  // 5-STEP JOURNEY STEPPER
  // -------------------------------------------------------------
  const steps = [
    {
      title: 'Slot Booked',
      subtitle: 'Confirmed',
      done: true,
    },
    {
      title: 'Gate Check-In',
      subtitle: isCompleted
        ? 'Entry Done'
        : isCheckedIn
        ? 'Checked In at Mandi'
        : isImmediateGateCall
        ? 'Reach Gate Now!'
        : `Arrive by ~${formattedGateTime}`,
      done: isCheckedIn || isCompleted,
    },
    {
      title: 'Weighbridge Scale',
      subtitle: isCompleted
        ? 'Weighing Done'
        : isAtScale
        ? 'Now at Scale #1'
        : isInYardQueue
        ? `Queue #${yardPositionIndex + 1}`
        : 'In Line',
      done: isCompleted || isAtScale,
    },
    {
      title: 'Produce Weighed',
      subtitle: isCompleted ? 'J-Form Slip Issued' : 'Awaiting Scale',
      done: isCompleted,
    },
    {
      title: 'DBT Bank Payout',
      subtitle: isPaid ? 'Credited to Bank' : isCompleted ? 'DBT in Transit' : 'Direct Deposit',
      done: isPaid,
    },
  ]

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
      {/* Signature Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-6 sm:px-8 py-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-900/60 border border-emerald-500/40 rounded-full">
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Weighing Completed & Accepted • तौल पूर्ण
                </>
              ) : isCheckedIn ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Live Mandi Yard Radar • लाइव यार्ड रडार
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Pre-Arrival Turn Radar • अग्रिम टोकन रडार
                </>
              )}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold mt-1.5 flex items-center gap-2">
            <span>{currentBooking.centerName || 'Mandi Procurement Center'}</span>
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100 mt-1 flex items-center gap-2">
            <span>
              {isCompleted ? 'Completed Token: ' : isCheckedIn ? 'In-Yard Token: ' : 'Advance Token: '}
              <strong className="text-white underline font-mono">{myToken}</strong> ({currentBooking.cropType})
            </span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span className="text-emerald-200 text-xs">Updated: {lastUpdated}</span>
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => {
            fetchQueue()
            if (onRefresh) onRefresh()
          }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/15 hover:bg-white/25 active:bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white transition cursor-pointer self-start sm:self-auto disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-300' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Multi-Token Switcher Bar (Visible when farmer has 2 or more active bookings) */}
      {bookingsList.length > 1 && (
        <div className="bg-emerald-900/40 px-6 sm:px-8 py-3 border-b border-emerald-700/60 flex items-center gap-3 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 shrink-0 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-emerald-300" /> You have {bookingsList.length} Active Tokens:
          </span>
          <div className="flex items-center gap-2">
            {bookingsList.map((b, idx) => {
              const isSelected = validIndex === idx
              const isBCompleted = b.status === 'completed'
              const isBCheckedIn = b.status === 'checked_in'
              return (
                <button
                  key={b._id || idx}
                  type="button"
                  onClick={() => setSelectedTokenIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-emerald-950 shadow-sm ring-2 ring-emerald-400 font-extrabold'
                      : 'bg-emerald-950/60 text-emerald-100 hover:bg-emerald-950/90 border border-emerald-500/30'
                  }`}
                >
                  <span className="font-mono">{b.tokenNumber}</span>
                  <span className="text-[10px] font-medium opacity-80">({b.cropType})</span>
                  {isBCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded border border-emerald-400/40">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Weighed
                    </span>
                  ) : isBCheckedIn ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> In Yard
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-emerald-400/15 text-emerald-200 rounded">
                      <Clock className="w-2.5 h-2.5" /> Booked
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Body Content */}
      <div className="p-6 sm:p-8 space-y-6 bg-white text-gray-800">

        {/* 2 Big Live Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* ============================================================ */}
          {/* SCENARIO 1: PROCURING COMPLETED                              */}
          {/* ============================================================ */}
          {isCompleted ? (
            <>
              {/* Box 1: Weighed Produce */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-700" /> Electronic Weighbridge #1
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" /> तौल संपन्न
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-2">
                  {totalQtyKg > 0 ? (
                    <>
                      <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-wider font-mono">
                        {totalQtyKg.toLocaleString('en-IN')} <span className="text-xl font-bold">kg</span>
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                        {(totalQtyKg / 100).toFixed(2)} Quintals
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono">
                      Produce Weighed & Verified
                    </span>
                  )}
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {currentBooking.cropType} • Quality Grade: <strong>{displayGrade}</strong>
                  {displayRate ? ` • Official MSP: ₹${displayRate}/kg` : ''}
                </p>
              </div>

              {/* Box 2: Total MSP Amount */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-emerald-700" /> Total MSP Payout (देय राशि)
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isPaid
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-emerald-700" /> DBT Disbursed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-700" /> DBT Queued
                      </>
                    )}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight font-mono flex items-center">
                    <IndianRupee className="w-7 h-7 text-emerald-700 inline" />
                    {totalAmountFormatted || '0'}
                  </span>
                  <span className="text-xs font-medium text-emerald-700">
                    Token: <strong className="font-mono">{myToken}</strong>
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {isPaid
                    ? 'Payment disbursed directly into your linked bank account via Aadhaar DBT.'
                    : 'Disbursement initiated. Government Treasury release expected within 24-48 hours.'}
                </p>
              </div>
            </>
          ) : isCheckedIn ? (
            /* ============================================================ */
            /* SCENARIO 2: FARMER IS CHECKED IN (IN MANDI YARD)             */
            /* ============================================================ */
            <>
              {/* Box 1: Scale Serving */}
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" /> Now Serving at Scale #1
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-200/70 text-amber-900 rounded-full">
                    धर्मकांटा
                  </span>
                </div>

                <div className="my-3">
                  <span className="text-3xl sm:text-4xl font-black text-amber-800 tracking-wider font-mono">
                    {currentServingToken || 'Scale Open'}
                  </span>
                </div>

                <p className="text-xs text-amber-800 font-medium">
                  {currentServingToken
                    ? 'Tractor currently positioned on electronic weighbridge scale'
                    : 'Scale is open and ready for the next arrival'}
                </p>
              </div>

              {/* Box 2: Your Selected Token In Yard */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" /> In-Yard Position
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full">
                    {currentBooking.cropType || 'Produce'}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-wider font-mono">
                    {myToken}
                  </span>

                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {isAtScale
                      ? '✨ Your Turn Now!'
                      : isInYardQueue
                      ? `Queue #${yardPositionIndex + 1}`
                      : 'Checked-In at Gate'}
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {isAtScale
                    ? 'Please drive your tractor onto Scale #1 now!'
                    : isInYardQueue
                    ? `${yardTractorsAhead} tractor${yardTractorsAhead === 1 ? '' : 's'} ahead of you in yard line`
                    : 'Gate entry verified • Syncing with weighbridge dispatch...'}
                </p>
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* SCENARIO 3: FARMER AT HOME (ADVANCE BOOKED - PRE-ARRIVAL)     */
            /* ============================================================ */
            <>
              {/* Box 1: Scale Status at Mandi */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" /> Mandi Scale #1 Currently Serving
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-full">
                    धर्मकांटा
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-wider font-mono">
                    {currentServingToken || 'Scale Open'}
                  </span>
                  {currentServingToken && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Processing Now
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 font-medium">
                  {checkedInList.length} tractor{checkedInList.length === 1 ? '' : 's'} currently lined up inside the mandi yard.
                </p>
              </div>

              {/* Box 2: Your Advance Token & Estimated Scale Turn */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-emerald-600" /> Your Advance Booking
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full">
                    {currentBooking.cropType}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-wider font-mono">
                    {myToken}
                  </span>

                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {tokensAheadPreArrival === 0 ? 'Next in Turn' : `${tokensAheadPreArrival} Tokens Ahead`}
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  Estimated scale turn at <strong>~{formattedTurnTime}</strong> ({Math.round(estimatedWaitMinutesPreArrival / 60)}h {estimatedWaitMinutesPreArrival % 60}m)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Live Lunch Break Notice (1:00 PM - 2:00 PM) */}
        {isCurrentlyLunchBreak && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-950">
                  🥪 Mandi Lunch Break in Progress (1:00 PM – 2:00 PM)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Weighbridge scales are paused for official staff lunch. Scales and turn progression resume promptly at 2:00 PM.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono bg-white px-3 py-1 rounded-xl border border-amber-300 text-amber-900 shrink-0 self-start sm:self-auto">
              Resumes at 2:00 PM
            </span>
          </div>
        )}

        {/* 5:00 PM Gate Closure Notice */}
        {isCurrentlyPast5pm && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Mandi Gate Entry Closed for Today (5:00 PM)</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isCheckedIn
                    ? 'Your tractor is inside the yard. Scale #1 is on duty to complete weighing for all checked-in vehicles.'
                    : 'Gate entry has closed for the day. Un-checked-in bookings are expired. Please book a slot for tomorrow.'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl shrink-0 self-start sm:self-auto">
              Gate Closed (5:00 PM)
            </span>
          </div>
        )}

        {/* Contextual Advisory Banner */}
        {isCompleted ? (
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs sm:text-sm font-medium flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span>
                <strong>Weighing Complete for Token {myToken}!</strong> Your {currentBooking.cropType} consignment has been weighed and accepted. Total MSP amount of <strong>₹{totalAmountFormatted || '0'}</strong> is registered for Direct Benefit Transfer (DBT){farmer?.bankAccount ? ` to your bank account ending in ••••${farmer.bankAccount.slice(-4)}` : ''}.
              </span>
            </div>
          </div>
        ) : isCheckedIn ? (
          /* Check-In In-Yard Banner */
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-3 ${
              isAtScale || yardPositionIndex <= 2
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            {isAtScale || yardPositionIndex <= 2 ? (
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div>
              {isAtScale ? (
                <span>
                  <strong>It is your turn for {myToken}!</strong> Drive your tractor onto Dharamkanta Scale #1 now. The weighbridge officer is ready for tare/gross weighing.
                </span>
              ) : yardPositionIndex <= 2 ? (
                <span>
                  <strong>Get ready for {myToken}!</strong> Only {yardTractorsAhead} tractor{yardTractorsAhead === 1 ? '' : 's'} ahead. Please start your tractor and stay near the weighbridge ramp.
                </span>
              ) : (
                <span>
                  <strong>Relax comfortably in the farmer rest shed!</strong> There are {yardTractorsAhead} tractors ahead in the yard. We will notify you when 5 tractors remain.
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Pre-Arrival Gate Call Banner (Farmer at home) */
          <div
            className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isImmediateGateCall
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isImmediateGateCall ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-200/80 text-emerald-900'
                }`}
              >
                {isImmediateGateCall ? <Truck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base">
                  {isImmediateGateCall
                    ? `🚨 Turn Approaching for ${myToken}! Please Proceed to Gate`
                    : `🌾 Relax at Home: Your Turn is Estimated at ~${formattedTurnTime}`}
                </h4>
                <p className="mt-1 text-xs opacity-90 leading-relaxed">
                  {isImmediateGateCall ? (
                    <span>
                      There are only <strong>{tokensAheadPreArrival}</strong> token{tokensAheadPreArrival === 1 ? '' : 's'} ahead. Drive to {currentBooking.centerName} Gate #1 now to check in and join the scale queue.
                    </span>
                  ) : (
                    <span>
                      The scale is currently processing token <strong>{currentServingToken || 'earlier slots'}</strong> with <strong>{tokensAheadPreArrival}</strong> tokens ahead of you today. Please arrive at the Mandi Gate <strong>30 minutes before your turn</strong> (by <strong>~{formattedGateTime}</strong>) to check in.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="self-end sm:self-auto shrink-0 text-right bg-white/70 px-4 py-2.5 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                Suggested Gate Arrival
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                {isImmediateGateCall ? 'Immediately' : `~${formattedGateTime}`}
              </span>
            </div>
          </div>
        )}

        {/* Live Traffic & Velocity Status */}
        <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <span>Mandi Yard Traffic ({currentBooking.centerName})</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full">
                  Fast Flow (सामान्य प्रवाह)
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                {checkedInList.length} tractor{checkedInList.length === 1 ? '' : 's'} currently in yard queue • {bookedList.length} advance tokens scheduled today • Average scale time: ~{avgMin} mins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto text-right">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                {isCheckedIn ? 'Yard Scale Wait Time' : 'Estimated Time to Turn'}
              </span>
              <span className="text-lg font-black text-emerald-800">
                {isCompleted
                  ? '0 mins (Procured)'
                  : isCheckedIn
                  ? isAtScale
                    ? '0 mins (At Scale)'
                    : `~${estimatedYardWaitMinutes} minutes`
                  : `~${estimatedWaitMinutesPreArrival} mins (~${formattedTurnTime})`}
              </span>
            </div>
          </div>
        </div>

        {/* 5-Step Mandi Journey Stepper */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Procurement Lifecycle for Token {myToken} (तौल व भुगतान प्रगति)
            </h5>
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              {currentBooking.cropType}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-1 transition ${
                  step.done
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-gray-500">Step {idx + 1}</span>
                  {step.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  )}
                </div>
                <p className={`font-bold mt-0.5 ${step.done ? 'text-emerald-900' : 'text-gray-600'}`}>
                  {step.title}
                </p>
                <span className="text-[10px] text-gray-500">{step.subtitle}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
