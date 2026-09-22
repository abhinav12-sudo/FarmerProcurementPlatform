import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { useLanguage } from '../context/LanguageContext.jsx'

export default function LiveQueueTracker({ activeBookings = [], activeBooking, farmer, onRefresh }) {
  const { t, getCropName } = useLanguage()

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

  // Date & Scheduling Context
  const bookingDate = currentBooking?.startTime ? new Date(currentBooking.startTime) : null
  const isBookingToday = bookingDate
    ? bookingDate.toDateString() === todayDate.toDateString()
    : true
  const isBookingTomorrow = bookingDate
    ? new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate()).getTime() ===
      new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1).getTime()
    : false
  const isBookingFuture = bookingDate
    ? bookingDate.getTime() > new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59, 999).getTime()
    : false

  const formattedSlotTime = bookingDate
    ? bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '9:00 AM'
  const formattedSlotDate = bookingDate
    ? bookingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  // Calculate staggered arrival and turn time for a future booking token (12 min per tractor)
  const futureSchedule = useMemo(() => {
    if (!currentBooking?.startTime) {
      return {
        tokenSequence: 1,
        formattedTurnTime: '9:00 AM',
        formattedGateTime: '9:00 AM',
      }
    }

    const token = currentBooking.tokenNumber || ''
    const parts = token.split('-')
    const tokenSequence = Math.max(1, parseInt(parts[1], 10) || 1)

    const slotStart = new Date(currentBooking.startTime)
    const slotStartMs = slotStart.getTime()
    const avgMin = queueData.avgProcessingMinutes || 12

    // Each tractor turn is offset by (tokenSequence - 1) * 12 mins
    let turnMs = slotStartMs + (tokenSequence - 1) * avgMin * 60 * 1000

    // Lunch pause (1:00 PM to 2:00 PM on that scheduled date)
    const onePm = new Date(slotStart)
    onePm.setHours(13, 0, 0, 0)
    const twoPm = new Date(slotStart)
    twoPm.setHours(14, 0, 0, 0)

    if (slotStartMs < onePm.getTime() && turnMs >= onePm.getTime()) {
      turnMs += 60 * 60 * 1000 // 60 min lunch pause
    } else if (slotStartMs >= onePm.getTime() && slotStartMs < twoPm.getTime()) {
      turnMs = twoPm.getTime() + (tokenSequence - 1) * avgMin * 60 * 1000
    }

    // Suggested gate arrival: 30 minutes before turn, but not earlier than slot start time (gate opening)
    let gateArrivalMs = turnMs - 30 * 60 * 1000
    if (gateArrivalMs < slotStartMs) {
      gateArrivalMs = slotStartMs
    }
    if (gateArrivalMs >= onePm.getTime() && gateArrivalMs < twoPm.getTime()) {
      gateArrivalMs = onePm.getTime() + 45 * 60 * 1000
    }

    const formattedTurnTime = new Date(turnMs).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const formattedGateTime = new Date(gateArrivalMs).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return {
      tokenSequence,
      turnMs,
      gateArrivalMs,
      formattedTurnTime,
      formattedGateTime,
    }
  }, [currentBooking?.startTime, currentBooking?.tokenNumber, queueData.avgProcessingMinutes])

  let tokensAheadPreArrival = 0
  if (isBooked && !isBookingFuture) {
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
      title: t('step1Title'),
      subtitle: t('step1Subtitle'),
      done: true,
    },
    {
      title: t('step2Title'),
        subtitle: isCompleted
          ? t('step2EntryDone')
          : isCheckedIn
          ? t('step2CheckedIn')
          : isBookingFuture
          ? t('step2ArriveTomorrow', {
              date: isBookingTomorrow ? t('tomorrowLabel') : formattedSlotDate,
              time: futureSchedule.formattedGateTime,
            })
          : isImmediateGateCall
          ? t('step2ReachGateNow')
          : t('step2ArriveBy', { time: formattedGateTime }),
      done: isCheckedIn || isCompleted,
    },
    {
      title: t('step3Title'),
      subtitle: isCompleted
        ? t('step3WeighingDone')
        : isAtScale
        ? t('step3NowAtScale1')
        : isInYardQueue
        ? t('step3QueueNum', { pos: yardPositionIndex + 1 })
        : t('step3InLine'),
      done: isCompleted || isAtScale,
    },
    {
      title: t('step4Title'),
      subtitle: isCompleted ? t('step4JFormIssued') : t('step4AwaitingScale'),
      done: isCompleted,
    },
    {
      title: t('step5Title'),
      subtitle: isPaid ? t('step5Credited') : isCompleted ? t('step5InTransit') : t('step5DirectDeposit'),
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
                  {t('radarCompleted')}
                </>
              ) : isCheckedIn ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  {t('radarInYard')}
                </>
              ) : isBookingFuture ? (
                <>
                  <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                  {isBookingTomorrow ? t('scheduledForTomorrow') : t('scheduledForDate', { date: formattedSlotDate })}
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {t('radarPreArrival')}
                </>
              )}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold mt-1.5 flex items-center gap-2">
            <span>{currentBooking.centerName || t('mandiCenterDefault')}</span>
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100 mt-1 flex items-center gap-2">
            <span>
              {isCompleted ? t('completedTokenPrefix') : isCheckedIn ? t('inYardTokenPrefix') : t('advanceTokenPrefix')}
              <strong className="text-white underline font-mono">{myToken}</strong> ({getCropName(currentBooking.cropType)})
            </span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span className="text-emerald-200 text-xs">{t('updated')}: {lastUpdated}</span>
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
          <span>{t('refreshQueue')}</span>
        </button>
      </div>

      {/* Multi-Token Switcher Bar (Visible when farmer has 2 or more active bookings) */}
      {bookingsList.length > 1 && (
        <div className="bg-emerald-900/40 px-6 sm:px-8 py-3 border-b border-emerald-700/60 flex items-center gap-3 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 shrink-0 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-emerald-300" /> {t('activeTokensNotice', { count: bookingsList.length })}
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
                  <span className="text-[10px] font-medium opacity-80">({getCropName(b.cropType)})</span>
                  {isBCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded border border-emerald-400/40">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> {t('weighedStatus')}
                    </span>
                  ) : isBCheckedIn ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> {t('inYardStatus')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-emerald-400/15 text-emerald-200 rounded">
                      <Clock className="w-2.5 h-2.5" /> {t('bookedStatus')}
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
                    <Scale className="w-4 h-4 text-emerald-700" /> {t('weighbridgeScale1')}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" /> {t('weighedDone')}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-2">
                  {totalQtyKg > 0 ? (
                    <>
                      <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-wider font-mono">
                        {totalQtyKg.toLocaleString('en-IN')} <span className="text-xl font-bold">{t('kg')}</span>
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                        {(totalQtyKg / 100).toFixed(2)} {t('quintals')}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono">
                      {t('produceWeighedVerified')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {getCropName(currentBooking.cropType)} • {t('qualityGrade')}: <strong>{displayGrade}</strong>
                  {displayRate ? ` • ${t('officialMsp')}: ₹${displayRate}/${t('kg')}` : ''}
                </p>
              </div>

              {/* Box 2: Total MSP Amount */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-emerald-700" /> {t('totalMspPayout')}
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
                        <CheckCheck className="w-3 h-3 text-emerald-700" /> {t('dbtDisbursed')}
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-700" /> {t('dbtQueued')}
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
                    {t('tokenLabel')}: <strong className="font-mono">{myToken}</strong>
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {isPaid ? t('dbtPaidDesc') : t('dbtQueuedDesc')}
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
                    <Scale className="w-4 h-4 text-amber-600" /> {t('nowServingScale1')}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-200/70 text-amber-900 rounded-full">
                    {t('scaleServingBadge')}
                  </span>
                </div>

                <div className="my-3">
                  <span className="text-3xl sm:text-4xl font-black text-amber-800 tracking-wider font-mono">
                    {currentServingToken || t('scaleOpen')}
                  </span>
                </div>

                <p className="text-xs text-amber-800 font-medium">
                  {currentServingToken ? t('scaleTractorPositioned') : t('scaleOpenReady')}
                </p>
              </div>

              {/* Box 2: Your Selected Token In Yard */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" /> {t('inYardPosition')}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full">
                    {getCropName(currentBooking.cropType) || 'Produce'}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-wider font-mono">
                    {myToken}
                  </span>

                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {isAtScale
                      ? `✨ ${t('yourTurnNow')}`
                      : isInYardQueue
                      ? t('queuePos', { pos: yardPositionIndex + 1 })
                      : t('checkedInAtGate')}
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {isAtScale
                    ? t('driveScaleNow')
                    : isInYardQueue
                    ? t('tractorsAheadYard', { count: yardTractorsAhead, plural: yardTractorsAhead === 1 ? '' : 's' })
                    : t('gateVerifiedSync')}
                </p>
              </div>
            </>
          ) : isBookingFuture ? (
            /* ============================================================ */
            /* SCENARIO 3A: SCHEDULED FOR TOMORROW / FUTURE DATE           */
            /* ============================================================ */
            <>
              {/* Box 1: Staggered Gate Arrival Time */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" /> {t('scheduledGateArrival')}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full">
                    {t('turnNumberLabel', { num: futureSchedule.tokenSequence })}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-wider font-mono">
                    ~{futureSchedule.formattedGateTime}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {isBookingTomorrow ? t('scheduledForTomorrow') : t('scheduledForDate', { date: formattedSlotDate })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-medium">
                  {t('estimatedScaleTurnTime')}: <strong className="font-mono text-emerald-900">~{futureSchedule.formattedTurnTime}</strong>
                </p>
              </div>

              {/* Box 2: Your Advance Token & Gate Readiness */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-emerald-600" /> {t('yourAdvanceBooking')}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-full">
                    {t('gateCheckInPending')}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-wider font-mono">
                    {myToken}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {getCropName(currentBooking.cropType)}
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {t('gateOpensTomorrowDesc')}
                </p>
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* SCENARIO 3B: TODAY PRE-ARRIVAL (FARMER AT HOME TODAY)        */
            /* ============================================================ */
            <>
              {/* Box 1: Scale Status at Mandi */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" /> {t('mandiScaleServing')}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-full">
                    {t('scaleServingBadge')}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-wider font-mono">
                    {currentServingToken || t('scaleOpenHome')}
                  </span>
                  {currentServingToken && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {t('processingNow')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 font-medium">
                  {t('tractorsLinedUpYard', { count: checkedInList.length, plural: checkedInList.length === 1 ? '' : 's' })}
                </p>
              </div>

              {/* Box 2: Your Advance Token & Estimated Scale Turn */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-emerald-600" /> {t('yourAdvanceBooking')}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full">
                    {getCropName(currentBooking.cropType)}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-wider font-mono">
                    {myToken}
                  </span>

                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {tokensAheadPreArrival === 0 ? t('nextInTurn') : t('tokensAheadPreArrival', { count: tokensAheadPreArrival })}
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium">
                  {t('estimatedScaleTurn', {
                    time: formattedTurnTime,
                    hours: Math.floor(estimatedWaitMinutesPreArrival / 60),
                    mins: estimatedWaitMinutesPreArrival % 60,
                  })}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Live Lunch Break Notice (1:00 PM - 2:00 PM) */}
        {isCurrentlyLunchBreak && isBookingToday && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-950">
                  🥪 {t('lunchBreakTitle')}
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  {t('lunchBreakDesc')}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono bg-white px-3 py-1 rounded-xl border border-amber-300 text-amber-900 shrink-0 self-start sm:self-auto">
              {t('resumesAtTwoPm')}
            </span>
          </div>
        )}

        {/* 5:00 PM Gate Closure Notice */}
        {isCurrentlyPast5pm && isBookingToday && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">{t('gateClosedTitle')}</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isCheckedIn ? t('gateClosedInYardDesc') : t('gateClosedHomeDesc')}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl shrink-0 self-start sm:self-auto">
              {t('gateClosedBadge')}
            </span>
          </div>
        )}

        {/* Contextual Advisory Banner */}
        {isCompleted ? (
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs sm:text-sm font-medium flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span>
                <strong>{t('congratsWeighedTitle', { token: myToken })}</strong>{' '}
                {t('congratsWeighedBody', {
                  crop: getCropName(currentBooking.cropType),
                  amount: totalAmountFormatted || '0',
                  bankSuffix: farmer?.bankAccount ? t('bankAccountEnding', { last4: farmer.bankAccount.slice(-4) }) : '',
                })}
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
                  <strong>{t('yardTurnNowTitle', { token: myToken })}</strong> {t('yardTurnNowBody')}
                </span>
              ) : yardPositionIndex <= 2 ? (
                <span>
                  <strong>{t('yardGetReadyTitle', { token: myToken })}</strong>{' '}
                  {t('yardGetReadyBody', { count: yardTractorsAhead, plural: yardTractorsAhead === 1 ? '' : 's' })}
                </span>
              ) : (
                <span>
                  <strong>{t('yardRestShedTitle')}</strong>{' '}
                  {t('yardRestShedBody', { count: yardTractorsAhead })}
                </span>
              )}
            </div>
          </div>
        ) : isBookingFuture ? (
          /* Scheduled Future Date Notice Banner with Staggered Arrival */
          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200/80 text-emerald-900 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-emerald-950">
                  {t('futureBookingNoticeTitle', {
                    date: isBookingTomorrow ? t('tomorrowLabel') : formattedSlotDate,
                    time: futureSchedule.formattedGateTime,
                  })}
                </h4>
                <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                  {t('futureStaggeredNotice', {
                    arrivalTime: futureSchedule.formattedGateTime,
                    turnTime: futureSchedule.formattedTurnTime,
                    turn: futureSchedule.tokenSequence,
                  })}
                </p>
              </div>
            </div>

            <div className="self-end sm:self-auto shrink-0 text-right bg-white/80 px-4 py-2.5 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                {t('suggestedGateArrival')}
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                ~{futureSchedule.formattedGateTime}
              </span>
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
                    ? t('preArrivalUrgentTitle', { token: myToken })
                    : t('preArrivalRelaxTitle', { time: formattedTurnTime })}
                </h4>
                <p className="mt-1 text-xs opacity-90 leading-relaxed">
                  {isImmediateGateCall
                    ? t('preArrivalUrgentBody', {
                        count: tokensAheadPreArrival,
                        plural: tokensAheadPreArrival === 1 ? '' : 's',
                        center: currentBooking.centerName || t('mandiCenterDefault'),
                      })
                    : t('preArrivalRelaxBody', {
                        servingToken: currentServingToken || t('earlierSlots'),
                        ahead: tokensAheadPreArrival,
                        gateTime: formattedGateTime,
                      })}
                </p>
              </div>
            </div>

            <div className="self-end sm:self-auto shrink-0 text-right bg-white/70 px-4 py-2.5 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                {t('suggestedGateArrival')}
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                {isImmediateGateCall ? t('immediately') : `~${formattedGateTime}`}
              </span>
            </div>
          </div>
        )}

        {/* Live Traffic & Velocity Status (Only shown on the actual day of the visit; hidden for future bookings) */}
        {!isBookingFuture && (
          <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
                <Building2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <span>{t('yardTrafficTitle', { center: currentBooking.centerName || t('mandiCenterDefault') })}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full">
                    {t('fastFlow')}
                  </span>
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  {t('yardTrafficDesc', {
                    yardCount: checkedInList.length,
                    yardPlural: checkedInList.length === 1 ? '' : 's',
                    bookedCount: bookedList.length,
                    avgMin,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end md:self-auto text-right">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">
                  {isCheckedIn ? t('yardWaitTimeLabel') : t('estimatedTimeToTurnLabel')}
                </span>
                <span className="text-lg font-black text-emerald-800">
                  {isCompleted
                    ? t('zeroMinsProcured')
                    : isCheckedIn
                    ? isAtScale
                      ? t('zeroMinsAtScale')
                      : t('approxMinutes', { mins: estimatedYardWaitMinutes })
                    : t('approxMinsWithTime', { mins: estimatedWaitMinutesPreArrival, time: formattedTurnTime })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5-Step Mandi Journey Stepper */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('procurementLifecycle', { token: myToken })}
            </h5>
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              {getCropName(currentBooking.cropType)}
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
                  <span className="text-[10px] font-mono font-bold text-gray-500">{t('stepNum', { num: idx + 1 })}</span>
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
