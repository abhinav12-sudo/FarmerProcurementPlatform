import { useState, useEffect } from 'react'
import api from '../api/client.js'
import { Building2, Calendar, Clock, CheckCircle, AlertCircle, Loader2, Users, Sparkles, Tag } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function SlotBooking({ farmer, onBookingSuccess }) {
  const { t, getCropName, crops } = useLanguage()
  const [centers, setCenters] = useState([])
  const [loadingCenters, setLoadingCenters] = useState(true)

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [selectedCenter, setSelectedCenter] = useState('')
  const [selectedCrop, setSelectedCrop] = useState('Wheat')
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    if (now.getHours() >= 17) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return getLocalDateString(tomorrow)
    }
    return getLocalDateString(now)
  })

  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState('')

  const [bookingSlotId, setBookingSlotId] = useState(null)
  const [bookingSuccessData, setBookingSuccessData] = useState(null)
  const [bookingError, setBookingError] = useState('')

  // Fetch all procurement centers on mount
  useEffect(() => {
    setLoadingCenters(true)
    api.get('/centers')
      .then((res) => {
        const list = res.data?.data || []
        setCenters(list)
        if (list.length > 0) {
          setSelectedCenter(list[0]._id)
        }
      })
      .catch((err) => {
        console.error('Failed to load centers:', err)
      })
      .finally(() => setLoadingCenters(false))
  }, [])

  // Fetch slots whenever center, crop, or date changes
  useEffect(() => {
    if (!selectedCenter || !selectedCrop || !selectedDate) return

    setLoadingSlots(true)
    setSlotError('')
    setBookingError('')

    api.get(`/slots?center_id=${selectedCenter}&crop_type=${selectedCrop}&date=${selectedDate}`)
      .then((res) => {
        setSlots(res.data?.data || [])
      })
      .catch((err) => {
        setSlotError(err.response?.data?.message || 'Could not fetch slots for this selection.')
        setSlots([])
      })
      .finally(() => setLoadingSlots(false))
  }, [selectedCenter, selectedCrop, selectedDate])

  const handleBookSlot = async (slot) => {
    if (!farmer?._id) {
      setBookingError('Farmer profile not found. Please log in again.')
      return
    }

    setBookingSlotId(slot._id)
    setBookingError('')

    try {
      const res = await api.post('/bookings', {
        farmer_id: farmer._id,
        slot_id: slot._id,
      })

      const booking = res.data?.data
      setBookingSuccessData({
        tokenNumber: booking.tokenNumber,
        cropType: slot.cropType,
        startTime: slot.startTime,
        centerName: centers.find((c) => c._id === selectedCenter)?.name || t('mandiCenterDefault'),
      })

      // Refresh slot list to update remaining seats
      setSlots((prev) =>
        prev.map((s) => (s._id === slot._id ? { ...s, seatsLeft: s.seatsLeft - 1, bookedCount: s.bookedCount + 1 } : s))
      )

      if (onBookingSuccess) {
        onBookingSuccess(booking)
      }
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book slot. It might be full.')
    } finally {
      setBookingSlotId(null)
    }
  }

  const formatSlotTime = (dateStr) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-6 py-5 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
          <Sparkles className="w-4 h-4" /> {t('smartSlotAllocation')}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mt-1">{t('bookMandiArrivalSlot')}</h2>
        <p className="text-xs sm:text-sm text-emerald-100 mt-1">
          {t('slotBookingSubtitle')}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Booking Confirmation Dialog */}
        {bookingSuccessData && (
          <div className="bg-emerald-50 border-2 border-emerald-500/50 rounded-2xl p-5 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0 mt-1" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {t('slotConfirmed')}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {t('yourToken')} <span className="text-emerald-700 text-xl font-extrabold">{bookingSuccessData.tokenNumber}</span>
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {getCropName(bookingSuccessData.cropType)} • {formatSlotTime(bookingSuccessData.startTime)} at {bookingSuccessData.centerName}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  📲 {t('smsSimulatedHint')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setBookingSuccessData(null)}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition cursor-pointer shrink-0 shadow-sm"
            >
              {t('bookAnotherSlot')}
            </button>
          </div>
        )}

        {/* Booking Error Banner */}
        {bookingError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm p-3.5 rounded-xl">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span>{bookingError}</span>
          </div>
        )}

        {/* Step 1 & 2: Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Procurement Center Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('mandiCenterLabel')}</span>
            </label>
            {loadingCenters ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> {t('loadingCenters')}
              </div>
            ) : centers.length === 0 ? (
              <div className="text-xs text-red-600 py-2">{t('noCentersConfigured')}</div>
            ) : (
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
              >
                {centers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.district})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Crop Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('produceCropLabel')}</span>
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
            >
              {crops.map((crop) => (
                <option key={crop.key} value={crop.key}>
                  {crop.icon} {getCropName(crop.key)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('arrivalDateLabel')}</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              min={getLocalDateString(new Date())}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
            />
          </div>
        </div>

        {/* Step 3: Available Time Slots */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{t('availableSlotsForCrop', { crop: getCropName(selectedCrop) })}</span>
            </h3>
            <span className="text-xs text-gray-500">
              {t('slotsAvailableCount', { count: slots.length, label: slots.length === 1 ? t('slotSingular') : t('slotPlural') })}
            </span>
          </div>

          {/* Today Capacity Exceeded Warning */}
          {slots.length > 0 && slots.some((s) => s.isTodayCapacityFull) && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">⛔ {t('intakeCapacityFullTitle')}</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {t('intakeCapacityFullDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  setSelectedDate(getLocalDateString(tomorrow))
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition cursor-pointer shadow-xs"
              >
                {t('switchToTomorrow')}
              </button>
            </div>
          )}

          {loadingSlots ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs">{t('checkingSlotAvailability')}</p>
            </div>
          ) : slotError ? (
            <div className="text-center py-8 text-xs text-red-600 bg-red-50 rounded-2xl border border-red-100">
              {slotError}
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-xl text-gray-400 mb-2">
                ⏳
              </div>
              <p className="text-sm font-semibold text-gray-700">{t('noOpenSlotsFound')}</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {t('noOpenSlotsDesc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slots.map((slot) => {
                const isCapacityExceeded = slot.isTodayCapacityFull
                const isFull = slot.seatsLeft <= 0 || isCapacityExceeded
                const isBookingThis = bookingSlotId === slot._id

                return (
                  <div
                    key={slot._id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isFull
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-white border-emerald-100 hover:border-emerald-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          {formatSlotTime(slot.startTime)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCapacityExceeded
                              ? 'bg-amber-100 text-amber-800'
                              : isFull
                              ? 'bg-gray-200 text-gray-600'
                              : slot.seatsLeft <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isCapacityExceeded
                            ? t('intakeClosedCutoff')
                            : isFull
                            ? t('slotFullBadge')
                            : t('seatsLeftBadge', { count: slot.seatsLeft })}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{t('capacityBookedText', { booked: slot.bookedCount, capacity: slot.capacity })}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isFull || isBookingThis}
                      onClick={() => handleBookSlot(slot)}
                      className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isFull
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20'
                      }`}
                    >
                      {isBookingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('reservingSeat')}</span>
                        </>
                      ) : isCapacityExceeded ? (
                        <span>{t('intakeFullBtn')}</span>
                      ) : isFull ? (
                        <span>{t('slotFullBtn')}</span>
                      ) : (
                        <span>{t('bookThisSlotBtn')}</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
