import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import StaffNavbar from '../../Components/StaffNavbar.jsx'
import {
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Scale,
  CreditCard,
  PlusCircle,
  RefreshCw,
  Users,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  Ticket,
  History,
  X,
} from 'lucide-react'

// Standard MSP Reference Rates (Rs per kg)
const MSP_RATES = {
  wheat: 22.75,
  paddy: 21.83,
  maize: 20.90,
  mustard: 56.50,
  barley: 18.50,
  cotton: 66.20,
}

export default function StaffHome() {
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [centers, setCenters] = useState([])
  const [selectedCenter, setSelectedCenter] = useState(null)

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('gate') // 'gate' | 'queue' | 'weigh' | 'payments' | 'slots'

  // Data states
  const [bookings, setBookings] = useState([])
  const [queueData, setQueueData] = useState({ queue: [], currentlyWaiting: 0 })
  const [procurements, setProcurements] = useState([])
  const [slots, setSlots] = useState([])

  // UI & Loading states
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')
  const [isStaffHistoryModalOpen, setIsStaffHistoryModalOpen] = useState(false)
  const [staffHistoryTab, setStaffHistoryTab] = useState('weighed') // 'weighed' | 'past'
  const [staffHistorySearch, setStaffHistorySearch] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(null)

  // Weighing Modal State
  const [selectedBookingForWeigh, setSelectedBookingForWeigh] = useState(null)
  const [weighFormData, setWeighFormData] = useState({
    crop_type: 'Wheat',
    quantity_kg: '',
    grade: 'Grade A (FAQ)',
    rate_per_kg: 22.75,
  })
  const [completedReceipt, setCompletedReceipt] = useState(null)

  // Slot Creation Form State
  const [newSlotData, setNewSlotData] = useState({
    crop_type: 'Wheat',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    capacity: 25,
  })

  // 1. Initial Authentication & Centers load
  useEffect(() => {
    const storedStaff = localStorage.getItem('staff')
    if (!storedStaff) {
      navigate('/staff/login')
      return
    }

    try {
      const parsed = JSON.parse(storedStaff)
      setStaff(parsed)
    } catch {
      localStorage.removeItem('staff')
      navigate('/staff/login')
      return
    }

    // Load Mandi Centers
    api.get('/centers')
      .then((res) => {
        const centerList = res.data?.data || []
        setCenters(centerList)
        if (centerList.length > 0) {
          const defaultCenter = centerList.find((c) => c._id === staff?.centerId) || centerList[0]
          setSelectedCenter(defaultCenter)
        }
      })
      .catch((err) => {
        console.error('Failed to load centers', err)
      })
  }, [navigate])

  // Helper function to trigger temporary feedback toast
  const showFeedback = (text, type = 'success') => {
    setFeedbackMessage({ text, type })
    setTimeout(() => {
      setFeedbackMessage(null)
    }, 4500)
  }

  // 2. Fetch data for current selected center
  const fetchCenterData = useCallback(async () => {
    if (!selectedCenter?._id) return
    setLoading(true)

    try {
      const [bookingsRes, queueRes, procRes, slotsRes] = await Promise.allSettled([
        api.get(`/bookings/center/${selectedCenter._id}?status=${statusFilter}`),
        api.get(`/bookings/queue/${selectedCenter._id}`),
        api.get(`/procurements/center/${selectedCenter._id}`),
        api.get(`/slots/center/${selectedCenter._id}`),
      ])

      if (bookingsRes.status === 'fulfilled') {
        setBookings(bookingsRes.value.data?.data || [])
      }
      if (queueRes.status === 'fulfilled') {
        setQueueData(queueRes.value.data?.data || { queue: [], currentlyWaiting: 0 })
      }
      if (procRes.status === 'fulfilled') {
        setProcurements(procRes.value.data?.data || [])
      }
      if (slotsRes.status === 'fulfilled') {
        setSlots(slotsRes.value.data?.data || [])
      }
    } catch (err) {
      console.error('Error fetching center data', err)
    } finally {
      setLoading(false)
    }
  }, [selectedCenter, statusFilter])

  useEffect(() => {
    fetchCenterData()
  }, [fetchCenterData])

  // Real-time Queue Poller (every 12 seconds when viewing Queue or Gate)
  useEffect(() => {
    if (!selectedCenter?._id) return
    if (activeTab !== 'queue' && activeTab !== 'gate') return

    const interval = setInterval(() => {
      api.get(`/bookings/queue/${selectedCenter._id}`)
        .then((res) => {
          setQueueData(res.data?.data || { queue: [], currentlyWaiting: 0 })
        })
        .catch(() => {})
    }, 12000)

    return () => clearInterval(interval)
  }, [selectedCenter, activeTab])

  // 3. Gate Action: Check-in farmer
  const handleCheckIn = async (bookingId, tokenNumber) => {
    setActionLoading(true)
    try {
      await api.post(`/bookings/${bookingId}/checkin`)
      showFeedback(`Farmer token ${tokenNumber} successfully checked in to mandi queue!`, 'success')
      fetchCenterData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed.'
      showFeedback(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // 4. Gate Action: Cancel booking
  const handleCancelBooking = async (bookingId, tokenNumber) => {
    if (!window.confirm(`Are you sure you want to cancel booking token ${tokenNumber}? The reserved slot seat will be released back.`)) {
      return
    }
    setActionLoading(true)
    try {
      await api.post(`/bookings/${bookingId}/cancel`)
      showFeedback(`Booking ${tokenNumber} cancelled and seat released.`, 'info')
      fetchCenterData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Cancellation failed.'
      showFeedback(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // 5. Open Weigh Modal
  const openWeighModal = (booking) => {
    setSelectedBookingForWeigh(booking)
    const cropKey = (booking.slotId?.cropType || 'wheat').toLowerCase()
    const defaultRate = MSP_RATES[cropKey] || 22.75

    setWeighFormData({
      crop_type: booking.slotId?.cropType || 'Wheat',
      quantity_kg: '',
      grade: 'Grade A (FAQ)',
      rate_per_kg: defaultRate,
    })
  }

  // 6. Submit Weighing & Record Procurement
  const handleRecordProcurement = async (e) => {
    e.preventDefault()
    if (!selectedBookingForWeigh) return

    const qty = parseFloat(weighFormData.quantity_kg)
    const rate = parseFloat(weighFormData.rate_per_kg)

    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid produce quantity in kg.')
      return
    }
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid rate per kg.')
      return
    }

    setActionLoading(true)
    try {
      const payload = {
        booking_id: selectedBookingForWeigh._id,
        items: [
          {
            crop_type: weighFormData.crop_type,
            quantity_kg: qty,
            grade: weighFormData.grade,
            rate_per_kg: rate,
          },
        ],
      }

      const res = await api.post('/procurements', payload)
      const resultData = res.data?.data

      setCompletedReceipt({
        farmerName: selectedBookingForWeigh.farmerId?.name,
        tokenNumber: selectedBookingForWeigh.tokenNumber,
        bankAccount: selectedBookingForWeigh.farmerId?.bankAccount,
        crop: weighFormData.crop_type,
        quantityKg: qty,
        quintals: (qty / 100).toFixed(2),
        ratePerKg: rate,
        totalAmount: (qty * rate).toFixed(2),
        paymentId: resultData?.payment?._id,
      })

      setSelectedBookingForWeigh(null)
      showFeedback(`Procurement recorded! Total MSP amount: Rs ${(qty * rate).toFixed(2)}`, 'success')
      fetchCenterData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record procurement.'
      showFeedback(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // 7. DBT Payment: Disburse / Mark as Paid
  const handleDisbursePayment = async (paymentId, amount, farmerName) => {
    if (!paymentId) return
    if (!window.confirm(`Confirm Direct Benefit Transfer (DBT) release of Rs ${amount} to ${farmerName}?`)) {
      return
    }

    setActionLoading(true)
    try {
      await api.patch(`/payments/${paymentId}/status`, { status: 'paid' })
      showFeedback(`Payment of Rs ${amount} disbursed successfully via DBT! Farmer notified.`, 'success')
      fetchCenterData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment disbursement failed.'
      showFeedback(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // 8. Create Custom Slot
  const handleCreateSlot = async (e) => {
    e.preventDefault()
    if (!selectedCenter?._id) return

    const { crop_type, date, time, capacity } = newSlotData
    if (!date || !time || !capacity) {
      alert('Please fill all slot fields.')
      return
    }

    const startDateTime = new Date(`${date}T${time}:00`)

    setActionLoading(true)
    try {
      await api.post('/slots', {
        center_id: selectedCenter._id,
        crop_type: crop_type,
        start_time: startDateTime.toISOString(),
        capacity: parseInt(capacity, 10),
      })

      showFeedback(`New slot created for ${crop_type} on ${date} at ${time}!`, 'success')
      setNewSlotData({
        crop_type: 'Wheat',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        capacity: 25,
      })
      fetchCenterData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create slot.'
      showFeedback(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // 9. Quick 1-Click Generate Slots for Today & Tomorrow
  const handleQuickSeedSlots = async () => {
    if (!selectedCenter?._id) return

    setActionLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const tomorrowDate = new Date()
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrow = tomorrowDate.toISOString().split('T')[0]

    const slotsToCreate = [
      { crop_type: 'Wheat', start_time: `${today}T10:00:00`, capacity: 25 },
      { crop_type: 'Wheat', start_time: `${today}T14:00:00`, capacity: 25 },
      { crop_type: 'Paddy', start_time: `${today}T11:00:00`, capacity: 20 },
      { crop_type: 'Maize', start_time: `${today}T15:00:00`, capacity: 20 },
      { crop_type: 'Wheat', start_time: `${tomorrow}T10:00:00`, capacity: 30 },
      { crop_type: 'Wheat', start_time: `${tomorrow}T14:00:00`, capacity: 30 },
      { crop_type: 'Paddy', start_time: `${tomorrow}T11:00:00`, capacity: 25 },
      { crop_type: 'Mustard', start_time: `${tomorrow}T15:00:00`, capacity: 20 },
    ]

    try {
      for (const s of slotsToCreate) {
        await api.post('/slots', {
          center_id: selectedCenter._id,
          crop_type: s.crop_type,
          start_time: new Date(s.start_time).toISOString(),
          capacity: s.capacity,
        })
      }
      showFeedback(`Created 8 operational slots for Today & Tomorrow! Farmers can now book slots immediately.`, 'success')
      fetchCenterData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Quick seed failed.'
      showFeedback(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Local date helper (YYYY-MM-DD)
  const getLocalDateString = (d) => {
    const date = d ? new Date(d) : new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const todayStr = getLocalDateString(new Date())
  const tomorrowObj = new Date()
  tomorrowObj.setDate(tomorrowObj.getDate() + 1)
  const tomorrowStr = getLocalDateString(tomorrowObj)

  // Calculate booking counts per date
  const dateCounts = useMemo(() => {
    const counts = { all: bookings.length }
    bookings.forEach((b) => {
      if (b.slotId?.startTime) {
        const dStr = getLocalDateString(b.slotId.startTime)
        counts[dStr] = (counts[dStr] || 0) + 1
      }
    })
    return counts
  }, [bookings])

  // Extract upcoming dates beyond tomorrow (strictly dateStr > tomorrowStr)
  const upcomingDateOptions = useMemo(() => {
    const datesSet = new Set()
    bookings.forEach((b) => {
      if (b.slotId?.startTime) {
        const dStr = getLocalDateString(b.slotId.startTime)
        if (dStr > tomorrowStr) {
          datesSet.add(dStr)
        }
      }
    })
    return Array.from(datesSet).sort().map((dStr) => {
      const dObj = new Date(`${dStr}T00:00:00`)
      return {
        dateStr: dStr,
        label: dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count: dateCounts[dStr] || 0,
      }
    })
  }, [bookings, tomorrowStr, dateCounts])

  // Past dates bookings archive (strictly dateStr < todayStr)
  const pastBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!b.slotId?.startTime) return false
      const dStr = getLocalDateString(b.slotId.startTime)
      return dStr < todayStr
    })
  }, [bookings, todayStr])

  // Total count of active today + upcoming bookings
  const upcomingTotalCount = useMemo(() => {
    return bookings.filter((b) => {
      if (!b.slotId?.startTime) return true
      const dStr = getLocalDateString(b.slotId.startTime)
      return dStr >= todayStr
    }).length
  }, [bookings, todayStr])

  // Active slots (strictly today and upcoming dates)
  const activeSlots = useMemo(() => {
    return slots.filter((s) => {
      if (!s.startTime) return false
      const dStr = getLocalDateString(s.startTime)
      return dStr >= todayStr
    })
  }, [slots, todayStr])

  // Filtered procurements for staff history modal
  const filteredStaffProcurements = useMemo(() => {
    if (!staffHistorySearch.trim()) return procurements
    const term = staffHistorySearch.trim().toLowerCase()
    return procurements.filter((p) => {
      const certMatch = p.certificateNumber?.toLowerCase().includes(term)
      const nameMatch = p.farmerId?.name?.toLowerCase().includes(term)
      const phoneMatch = p.farmerId?.phone?.includes(term)
      const cropMatch = (p.items && p.items[0]?.cropType?.toLowerCase().includes(term)) || p.cropType?.toLowerCase().includes(term)
      return certMatch || nameMatch || phoneMatch || cropMatch
    })
  }, [procurements, staffHistorySearch])

  // Filtered past bookings for staff history modal
  const filteredStaffPastBookings = useMemo(() => {
    if (!staffHistorySearch.trim()) return pastBookings
    const term = staffHistorySearch.trim().toLowerCase()
    return pastBookings.filter((b) => {
      const tokenMatch = b.tokenNumber?.toLowerCase().includes(term)
      const nameMatch = b.farmerId?.name?.toLowerCase().includes(term)
      const phoneMatch = b.farmerId?.phone?.includes(term)
      const cropMatch = b.slotId?.cropType?.toLowerCase().includes(term)
      return tokenMatch || nameMatch || phoneMatch || cropMatch
    })
  }, [pastBookings, staffHistorySearch])

  // Filter Bookings by search term, status, date, and sort chronologically (strictly Today & Upcoming)
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        // Exclude past date appointments from Gate Check-In (they belong to History!)
        const bookingDateStr = b.slotId?.startTime ? getLocalDateString(b.slotId.startTime) : null
        if (bookingDateStr && bookingDateStr < todayStr) {
          return false
        }

        // Status filter
        if (statusFilter !== 'all' && b.status !== statusFilter) {
          return false
        }

        // Date filter
        if (dateFilter === 'today') {
          if (bookingDateStr !== todayStr) return false
        } else if (dateFilter === 'tomorrow') {
          if (bookingDateStr !== tomorrowStr) return false
        } else if (dateFilter !== 'all_upcoming') {
          if (bookingDateStr !== dateFilter) return false
        }

        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase()
          const tokenMatch = b.tokenNumber?.toLowerCase().includes(term)
          const nameMatch = b.farmerId?.name?.toLowerCase().includes(term)
          const phoneMatch = b.farmerId?.phone?.includes(term)
          return tokenMatch || nameMatch || phoneMatch
        }

        return true
      })
      .sort((a, b) => {
        // Earlier scheduled appointments first (Sep 22 before Sep 23, 9 AM before 10 AM)
        const timeA = a.slotId?.startTime ? new Date(a.slotId.startTime).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        const timeB = b.slotId?.startTime ? new Date(b.slotId.startTime).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        if (timeA !== timeB) return timeA - timeB

        // Suffix sequence number (WHE-1 before WHE-2 before WHE-10)
        const seqA = parseInt(a.tokenNumber?.split('-')[1], 10) || 0
        const seqB = parseInt(b.tokenNumber?.split('-')[1], 10) || 0
        return seqA - seqB
      })
  }, [bookings, statusFilter, dateFilter, searchTerm, todayStr, tomorrowStr])

  // Checked-in farmers ready for weighing (ordered strictly by gate arrival time)
  const checkedInBookings = bookings
    .filter((b) => b.status === 'checked_in')
    .sort((a, b) => {
      const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : new Date(a.createdAt).getTime()
      const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : new Date(b.createdAt).getTime()
      return timeA - timeB
    })

  // Metric Computations
  const totalBookedToday = bookings.filter((b) => b.status === 'booked').length
  const totalInQueue = queueData.currentlyWaiting || checkedInBookings.length
  const totalCompleted = bookings.filter((b) => b.status === 'completed').length
  const totalMspDisbursed = procurements.reduce((sum, p) => {
    return p.payment?.status === 'paid' ? sum + (p.payment?.amount || 0) : sum
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <StaffNavbar
        staff={staff}
        selectedCenter={selectedCenter}
        centers={centers}
        onCenterChange={(c) => setSelectedCenter(c)}
        onOpenHistory={() => setIsStaffHistoryModalOpen(true)}
        historyCount={procurements.length + pastBookings.length}
      />

      {/* Floating Feedback Notification */}
      {feedbackMessage && (
        <div className={`fixed top-20 right-6 z-50 max-w-md p-4 rounded-2xl shadow-xl border flex items-start gap-3 animate-in slide-in-from-top-4 ${
          feedbackMessage.type === 'error'
            ? 'bg-red-50 text-red-800 border-red-200'
            : feedbackMessage.type === 'info'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {feedbackMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <span className="text-xs sm:text-sm font-medium leading-relaxed">
            {feedbackMessage.text}
          </span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Center Banner matching StaffLogin slate aesthetic */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-300" /> Mandi Operations Desk
                </span>
                <span className="text-xs text-slate-400">
                  Center ID: {selectedCenter?._id ? selectedCenter._id.slice(-6) : '---'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {selectedCenter?.name || 'Mandi Procurement Center'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2">
                <span>District: <strong className="text-white">{selectedCenter?.district || 'General'}</strong></span>
                <span>•</span>
                <span>Max Daily Intake: <strong className="text-white">{selectedCenter?.dailyCapacity || 100} Farmers</strong></span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchCenterData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
                <span>Refresh Live Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Metric Stats Cards - Clean White Cards matching StaffLogin */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Waiting at Gate
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {totalBookedToday}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Booked tokens ready</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" /> In Mandi Queue
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {totalInQueue}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Checked in at scales</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-600" /> Weighed & Procured
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {totalCompleted}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Procurements completed</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-700" /> Disbursed via DBT
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 truncate">
              ₹{totalMspDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Direct MSP payments</span>
          </div>
        </div>

        {/* Tab Navigation Menu - Matching StaffLogin Tab Bar */}
        <div className="flex items-center overflow-x-auto gap-1.5 p-1.5 bg-slate-200/70 border border-slate-300/80 rounded-2xl scrollbar-none text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('gate')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'gate'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>Gate Check-In</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'queue'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-slate-700" />
            <span>Live Queue Board ({totalInQueue})</span>
          </button>

          <button
            onClick={() => setActiveTab('weigh')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'weigh'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4 text-slate-700" />
            <span>Weighing & QC Desk ({checkedInBookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-slate-700" />
            <span>DBT Payments ({procurements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('slots')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'slots'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-slate-700" />
            <span>Slot Management ({activeSlots.length})</span>
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: GATE CHECK-IN DESK */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'gate' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Token (e.g. WHE-1), Farmer Name, or Phone..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Date Dropdown (Strictly Today & Upcoming Dates) */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 cursor-pointer shadow-2xs"
                >
                  <option value="today">📅 Today ({dateCounts[todayStr] || 0})</option>
                  <option value="tomorrow">📅 Tomorrow ({dateCounts[tomorrowStr] || 0})</option>
                  {upcomingDateOptions.map((d) => (
                    <option key={d.dateStr} value={d.dateStr}>
                      📅 {d.label} ({d.count})
                    </option>
                  ))}
                  <option value="all_upcoming">📅 All Upcoming ({upcomingTotalCount})</option>
                </select>

                {/* Status Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-700 cursor-pointer font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="booked">Waiting at Gate (Booked)</option>
                  <option value="checked_in">Checked In (In Queue)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Bookings List Table / Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-slate-700" />
                  <span>
                    Appointments for {selectedCenter?.name} •{' '}
                    <span className="text-slate-500 font-normal">
                      {dateFilter === 'today'
                        ? 'Today'
                        : dateFilter === 'tomorrow'
                        ? 'Tomorrow'
                        : dateFilter === 'all_upcoming'
                        ? 'All Upcoming Dates'
                        : dateFilter}
                    </span>
                  </span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Showing {filteredBookings.length} records
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                  <p className="text-xs">Loading appointments from MongoDB...</p>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">
                    {dateFilter === 'today' ? 'No Appointments Scheduled for Today' : 'No Appointments Found'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {dateFilter === 'today' && (dateCounts[tomorrowStr] || 0) > 0 ? (
                      <span>
                        There are no bookings for today. However, there are{' '}
                        <strong className="text-slate-800 font-bold">{dateCounts[tomorrowStr]} appointments</strong> scheduled for tomorrow.
                      </span>
                    ) : searchTerm ? (
                      `No bookings match your search "${searchTerm}".`
                    ) : (
                      'No farmer appointments found for this filter.'
                    )}
                  </p>
                  {dateFilter === 'today' && (dateCounts[tomorrowStr] || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setDateFilter('tomorrow')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition mt-2"
                    >
                      <span>View Tomorrow's Appointments ({dateCounts[tomorrowStr]})</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => {
                    const isBooked = b.status === 'booked'
                    const isCheckedIn = b.status === 'checked_in'
                    const isCompleted = b.status === 'completed'

                    return (
                      <div
                        key={b._id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                      >
                        {/* Left: Token & Farmer Identity */}
                        <div className="flex items-start sm:items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center shadow-xs">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                              Token
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              {b.tokenNumber}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                                {b.farmerId?.name || 'Kisan User'}
                              </h4>
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                isBooked
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : isCheckedIn
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                  : isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {b.status?.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                              <span>Mobile: <strong className="text-slate-900">{b.farmerId?.phone || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>Land Record: <strong className="text-slate-900">{b.farmerId?.landRecordNumber || 'Verified'}</strong></span>
                              <span>•</span>
                              <span>Crop: <strong className="text-slate-900 font-semibold">{b.slotId?.cropType || 'Crop'}</strong></span>
                            </div>

                            {b.slotId?.startTime && (
                              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(b.slotId.startTime).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })} • {new Date(b.slotId.startTime).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isBooked && (
                            b.slotId?.startTime && getLocalDateString(b.slotId.startTime) !== todayStr ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                  📅 Scheduled for {new Date(b.slotId.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Notice: Token ${b.tokenNumber} is booked for ${new Date(b.slotId.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Confirm early gate check-in?`)) {
                                      handleCheckIn(b._id, b.tokenNumber)
                                    }
                                  }}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer border border-slate-200"
                                  title="Check in ahead of appointment date"
                                >
                                  <span>Early Check-In</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleCheckIn(b._id, b.tokenNumber)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Check In (Gate Entry)</span>
                              </button>
                            )
                          )}

                          {isCheckedIn && (
                            <button
                              onClick={() => openWeighModal(b)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs rounded-xl shadow-sm transition cursor-pointer"
                            >
                              <Scale className="w-3.5 h-3.5 text-amber-400" />
                              <span>Weigh Produce</span>
                            </button>
                          )}

                          {isCompleted && (
                            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Weighed & Procured
                            </span>
                          )}

                          {(isBooked || isCheckedIn) && (
                            <button
                              onClick={() => handleCancelBooking(b._id, b.tokenNumber)}
                              disabled={actionLoading}
                              title="Cancel appointment"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: LIVE QUEUE BOARD */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center text-white shadow-xl">
              <span className="inline-block px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
                📢 Live Mandi Queue Board
              </span>
              
              <h2 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-widest">
                Now Serving at Scale #1
              </h2>

              {queueData.queue.length > 0 ? (
                <div className="my-4">
                  <div className="inline-block px-8 py-4 bg-slate-800 border border-slate-700 rounded-3xl shadow-xl">
                    <span className="text-4xl sm:text-6xl font-black text-white tracking-wider">
                      {queueData.queue[0].tokenNumber}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-300 mt-2">
                    Crop: {queueData.queue[0].cropType} • Proceed to Dharamkanta (Scale 1)
                  </p>
                </div>
              ) : (
                <div className="my-6">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-400">
                    No farmers in queue currently
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Farmers will appear here as soon as gate check-in is performed.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-6 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-800">
                <span>Total Checked-in Waiting: <strong className="text-white">{queueData.currentlyWaiting}</strong></span>
                <span>•</span>
                <span>Auto-refreshing every 12s</span>
              </div>
            </div>

            {/* Upcoming Tokens in Line */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                <span>Next in Line (Upcoming Tokens)</span>
              </h3>

              {queueData.queue.length <= 1 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No additional farmers waiting in line.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {queueData.queue.slice(1).map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                          #{idx + 2}
                        </span>
                        <div>
                          <p className="font-black text-slate-900 text-base">
                            {item.tokenNumber}
                          </p>
                          <span className="text-xs text-slate-500">{item.cropType}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Wait: ~{(idx + 1) * 15}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: WEIGHING & QC SCALE DESK */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'weigh' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-slate-700" />
                    <span>Checked-in Farmers Awaiting Produce Weighing</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a farmer from the queue below to record digital weight, grade produce, and issue MSP receipt.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                  {checkedInBookings.length} Ready at Scales
                </span>
              </div>

              {checkedInBookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <Scale className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No farmers waiting at the scales</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Check in farmers at the Gate Entry tab to bring them into the weighing queue.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 mt-6">
                  {checkedInBookings.map((b, idx) => {
                    const isFirst = idx === 0
                    const checkInTimeFormatted = b.checkedInAt
                      ? new Date(b.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : (b.createdAt ? new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now')

                    if (isFirst) {
                      return (
                        <div
                          key={b._id}
                          className="bg-gradient-to-r from-emerald-50 via-white to-teal-50/70 border-2 border-emerald-500 rounded-3xl p-6 sm:p-7 shadow-md ring-4 ring-emerald-500/10 transition flex flex-col justify-between gap-5 relative overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                Scale #1 Active Turn • First in Line
                              </span>
                              <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                                Turn #1
                              </span>
                            </div>
                            <span className="text-xs font-mono font-medium text-emerald-800 bg-white/90 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                              Gate Arrival: <strong>{checkInTimeFormatted}</strong>
                            </span>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div className="flex items-start gap-4">
                              <div className="px-4 py-3 bg-slate-950 text-white rounded-2xl text-xl sm:text-2xl font-black font-mono shadow-sm flex items-center justify-center shrink-0 border border-slate-700">
                                {b.tokenNumber}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-slate-900 text-xl sm:text-2xl">
                                    {b.farmerId?.name || 'Farmer'}
                                  </h4>
                                  <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-200">
                                    {b.slotId?.cropType || 'Produce'}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>Mobile: <strong>{b.farmerId?.phone || 'N/A'}</strong></span>
                                  <span>•</span>
                                  <span>Land Record: <strong>{b.farmerId?.landRecordNumber || 'Verified Land'}</strong></span>
                                  {b.farmerId?.bankAccount && (
                                    <>
                                      <span>•</span>
                                      <span>Bank: <strong>••••{b.farmerId.bankAccount.slice(-4)}</strong></span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => openWeighModal(b)}
                              className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold py-3.5 px-7 rounded-2xl text-sm sm:text-base shadow-md transition transform hover:-translate-y-0.5 cursor-pointer"
                            >
                              <Scale className="w-5 h-5 text-amber-300" />
                              <span>Process Scale #1 (Weigh Produce)</span>
                            </button>
                          </div>
                        </div>
                      )
                    }

                    // Subsequent queue tokens (idx > 0)
                    return (
                      <div
                        key={b._id}
                        className="bg-slate-50 hover:bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <span className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 font-mono">
                            #{idx + 1}
                          </span>
                          <span className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-black font-mono shrink-0">
                            {b.tokenNumber}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                                {b.farmerId?.name || 'Farmer'}
                              </h5>
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md">
                                {b.slotId?.cropType || 'Produce'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>Mobile: {b.farmerId?.phone}</span>
                              <span>•</span>
                              <span>Checked in: {checkInTimeFormatted}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => openWeighModal(b)}
                          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-2.5 px-5 rounded-xl text-xs sm:text-sm shadow-xs transition cursor-pointer"
                        >
                          <Scale className="w-4 h-4 text-amber-400" />
                          <span>Weigh Produce</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: DBT PAYMENTS & DISBURSEMENTS LEDGER */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-slate-700" />
                    <span>Direct Benefit Transfer (DBT) Financial Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official record of produce weighed and pending/completed government bank disbursements.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                  Total Ledger: {procurements.length} Receipts
                </span>
              </div>

              {procurements.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No procurements recorded yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Weigh farmer produce in the Weighing Desk tab to generate payment records.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-4">
                  {procurements.map((p) => {
                    const farmer = p.booking?.farmerId
                    const firstItem = p.items?.[0] || {}
                    const isPaid = p.payment?.status === 'paid'

                    return (
                      <div
                        key={p._id}
                        className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-700">
                              REC-{p._id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-slate-300">•</span>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {farmer?.name || 'Farmer'}
                            </h4>
                            <span className="text-xs text-slate-500">({farmer?.phone})</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                            <span>
                              Produce: <strong className="text-slate-900">{firstItem.cropType}</strong> ({firstItem.grade})
                            </span>
                            <span>•</span>
                            <span>
                              Net Weight: <strong className="text-slate-900">{firstItem.quantityKg} kg</strong> ({(firstItem.quantityKg / 100).toFixed(2)} Qtl)
                            </span>
                            <span>•</span>
                            <span>
                              Rate: <strong className="text-slate-900">₹{firstItem.ratePerKg}/kg</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Bank: <strong className="text-slate-800">{farmer?.bankAccount ? `••••${farmer.bankAccount.slice(-4)}` : 'Aadhaar DBT'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Amount & Status Action */}
                        <div className="flex items-center gap-4 self-end md:self-center">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                              MSP Total
                            </span>
                            <span className="text-base sm:text-lg font-black text-slate-900">
                              ₹{p.payment?.amount ? p.payment.amount.toLocaleString('en-IN') : '0.00'}
                            </span>
                          </div>

                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Paid via DBT</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDisbursePayment(p.payment?._id, p.payment?.amount, farmer?.name)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Disburse DBT</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: SLOT MANAGEMENT */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'slots' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Create Slot Form */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-base text-slate-900">Create Mandi Slot</h3>
              </div>
              <p className="text-xs text-slate-500">
                Open procurement intake capacity for farmers on a specific date and crop.
              </p>

              <form onSubmit={handleCreateSlot} className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Crop Type
                  </label>
                  <select
                    value={newSlotData.crop_type}
                    onChange={(e) => setNewSlotData((prev) => ({ ...prev, crop_type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none"
                  >
                    <option value="Wheat">Wheat - MSP ₹22.75/kg</option>
                    <option value="Paddy">Paddy - MSP ₹21.83/kg</option>
                    <option value="Maize">Maize - MSP ₹20.90/kg</option>
                    <option value="Mustard">Mustard - MSP ₹56.50/kg</option>
                    <option value="Barley">Barley - MSP ₹18.50/kg</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newSlotData.date}
                    onChange={(e) => setNewSlotData((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newSlotData.time}
                      onChange={(e) => setNewSlotData((prev) => ({ ...prev, time: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newSlotData.capacity}
                      onChange={(e) => setNewSlotData((prev) => ({ ...prev, capacity: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-2.5 px-4 rounded-xl text-xs sm:text-sm transition cursor-pointer disabled:opacity-50 shadow-sm mt-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Open Slot</span>
                </button>
              </form>

              {/* 1-Click Fast Seeder for Today & Tomorrow */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleQuickSeedSlots}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-medium py-2.5 px-4 rounded-xl text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>⚡ 1-Click Generate Slots for Today & Tomorrow</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Instantly creates operational slots so farmers see available slots right now.
                </p>
              </div>
            </div>

            {/* Right: Active Slots List */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-700" />
                  <span>Current Mandi Slots ({activeSlots.length})</span>
                </h3>
              </div>

              {activeSlots.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No active slots scheduled</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Use the form on the left or click the 1-Click Generate button to populate slots.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[550px] overflow-y-auto pr-1">
                  {activeSlots.map((s) => {
                    const isFull = s.seatsLeft === 0
                    return (
                      <div
                        key={s._id}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                              {s.cropType}
                            </span>
                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                              {new Date(s.startTime).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {new Date(s.startTime).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isFull ? 'FULL' : `${s.seatsLeft} SEATS LEFT`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                          <span>Booked: <strong className="text-slate-800">{s.bookedCount}</strong></span>
                          <span>Capacity: <strong className="text-slate-800">{s.capacity}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL: WEIGH PRODUCE & QC */}
      {/* ---------------------------------------------------- */}
      {selectedBookingForWeigh && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Dharamkanta Scale & QC Desk
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Weigh Produce: {selectedBookingForWeigh.tokenNumber}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Farmer: <strong className="text-slate-900">{selectedBookingForWeigh.farmerId?.name}</strong> • Mobile: {selectedBookingForWeigh.farmerId?.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedBookingForWeigh(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordProcurement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Produce Crop Type
                </label>
                <select
                  value={weighFormData.crop_type}
                  onChange={(e) => {
                    const val = e.target.value
                    const cropKey = val.toLowerCase()
                    const defaultRate = MSP_RATES[cropKey] || 22.75
                    setWeighFormData((prev) => ({
                      ...prev,
                      crop_type: val,
                      rate_per_kg: defaultRate,
                    }))
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none"
                >
                  <option value="Wheat">Wheat</option>
                  <option value="Paddy">Paddy</option>
                  <option value="Maize">Maize</option>
                  <option value="Mustard">Mustard</option>
                  <option value="Barley">Barley</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Net Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="e.g. 2500"
                    value={weighFormData.quantity_kg}
                    onChange={(e) => setWeighFormData((prev) => ({ ...prev, quantity_kg: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none"
                    required
                  />
                  {weighFormData.quantity_kg && (
                    <span className="text-[11px] text-slate-600 font-medium mt-1 block">
                      = {(parseFloat(weighFormData.quantity_kg) / 100).toFixed(2)} Quintals
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quality Grade
                  </label>
                  <select
                    value={weighFormData.grade}
                    onChange={(e) => setWeighFormData((prev) => ({ ...prev, grade: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none"
                  >
                    <option value="Grade A (FAQ)">Grade A (FAQ Premium MSP)</option>
                    <option value="Grade B">Grade B (Fair Average)</option>
                    <option value="Grade C">Grade C (Standard)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Rate (₹ per kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={weighFormData.rate_per_kg}
                  onChange={(e) => setWeighFormData((prev) => ({ ...prev, rate_per_kg: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-700 focus:outline-none font-mono"
                  required
                />
              </div>

              {/* Total Calculation Preview */}
              {weighFormData.quantity_kg && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Total MSP Payout:</span>
                    <span className="text-xl font-black text-slate-900">
                      ₹{(parseFloat(weighFormData.quantity_kg) * parseFloat(weighFormData.rate_per_kg || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 text-right">
                    DBT Direct Bank Credit
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForWeigh(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium rounded-xl text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Recording...' : 'Confirm & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: COMPLETED PROCUREMENT RECEIPT */}
      {/* ---------------------------------------------------- */}
      {completedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border border-slate-200">
            <div className="text-center pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full">
                Official J-Form Receipt
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                Procurement Weighed
              </h3>
              <p className="text-xs text-slate-500">
                Govt. of India • Food & Public Distribution
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Token Number</span>
                <span className="font-bold text-slate-900 font-mono">{completedReceipt.tokenNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Farmer Name</span>
                <span className="font-bold text-slate-900">{completedReceipt.farmerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Crop Type</span>
                <span className="font-bold text-slate-900">{completedReceipt.crop}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Net Weight</span>
                <span className="font-bold text-slate-900">{completedReceipt.quantityKg} kg ({completedReceipt.quintals} Qtl)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">MSP Rate</span>
                <span className="font-bold text-slate-900">₹{completedReceipt.ratePerKg}/kg</span>
              </div>
              <div className="flex justify-between py-2 bg-emerald-50 px-3 rounded-xl">
                <span className="font-bold text-emerald-900">Total MSP Amount Due</span>
                <span className="font-black text-emerald-700 text-sm">₹{completedReceipt.totalAmount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              SMS notification with payment reference dispatched to farmer's mobile number.
            </p>

            <button
              onClick={() => setCompletedReceipt(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs transition cursor-pointer"
            >
              Done & Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Staff Procurement & Appointments History Modal */}
      {isStaffHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Mandi Operations History & Archive</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedCenter?.name} • Historical weighments, past appointments, and completed ledgers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStaffHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="px-6 pt-4 pb-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStaffHistoryTab('weighed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    staffHistoryTab === 'weighed'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Weighed & Procured</span>
                  <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                    {procurements.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStaffHistoryTab('past')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    staffHistoryTab === 'past'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Past Appointments</span>
                  <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                    {pastBookings.length}
                  </span>
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={staffHistorySearch}
                  onChange={(e) => setStaffHistorySearch(e.target.value)}
                  placeholder="Search token, farmer..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-3">
              {staffHistoryTab === 'weighed' ? (
                // Weighed Procurements List
                filteredStaffProcurements.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl text-slate-400 mb-2">
                      ⚖️
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Weighed Records Found</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {staffHistorySearch
                        ? `No procurements match "${staffHistorySearch}".`
                        : 'Weighed tokens from Scale #1 will be permanently archived here with their weighment certificate and DBT disbursement status.'}
                    </p>
                  </div>
                ) : (
                  filteredStaffProcurements.map((p) => {
                    const totalKg = (p.items || []).reduce((sum, it) => sum + (Number(it.quantityKg) || 0), 0)
                    const cropType = (p.items && p.items[0]?.cropType) || p.cropType || 'Produce'
                    const pDate = p.createdAt ? new Date(p.createdAt) : null
                    const isPaid = p.payment?.status === 'paid'
                    const isProcessing = p.payment?.status === 'processing'

                    return (
                      <div
                        key={p._id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-800 shrink-0 font-mono">
                            <Scale className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-bold leading-none mt-0.5">{cropType.slice(0, 3).toUpperCase()}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {p.certificateNumber || 'Procurement Receipt'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Weighed
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                              <span>Farmer: <strong className="text-slate-800">{p.farmerId?.name || 'Kisan'}</strong></span>
                              <span>•</span>
                              <span>Mobile: <strong className="text-slate-800">{p.farmerId?.phone || 'N/A'}</strong></span>
                              {pDate && (
                                <>
                                  <span>•</span>
                                  <span>{pDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {pDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                              {totalKg > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-emerald-800">
                                    ⚖️ {totalKg.toLocaleString('en-IN')} kg ({(totalKg / 100).toFixed(2)} Qtl)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Payment Status & Amount */}
                        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex sm:flex-col items-center sm:items-end justify-between">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Paid via DBT
                            </span>
                          ) : isProcessing ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              <Clock className="w-3 h-3 text-blue-600" />
                              Processing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending
                            </span>
                          )}

                          {p.payment?.amount != null && p.payment.amount > 0 && (
                            <p className="text-sm font-extrabold text-slate-900 font-mono mt-1">
                              ₹{Number(p.payment.amount).toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )
              ) : (
                // Past Appointments List
                filteredStaffPastBookings.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl text-slate-400 mb-2">
                      📅
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Past Appointments in Archive</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {staffHistorySearch
                        ? `No archived bookings match "${staffHistorySearch}".`
                        : 'Appointments from prior calendar dates are automatically archived here to keep the active Gate Check-In desk focused on today and upcoming schedules.'}
                    </p>
                  </div>
                ) : (
                  filteredStaffPastBookings.map((b) => {
                    const bDate = b.slotId?.startTime ? new Date(b.slotId.startTime) : null
                    return (
                      <div
                        key={b._id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-800 shrink-0 font-mono">
                            <Ticket className="w-4 h-4 text-slate-600" />
                            <span className="text-[10px] font-bold leading-none mt-0.5">{b.tokenNumber}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {b.farmerId?.name || 'Kisan User'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                b.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {b.status?.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                              <span>Mobile: <strong className="text-slate-800">{b.farmerId?.phone || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>Crop: <strong className="text-slate-800">{b.slotId?.cropType || 'Crop'}</strong></span>
                              {bDate && (
                                <>
                                  <span>•</span>
                                  <span>Scheduled: {bDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {bDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right text-xs text-slate-500">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono">
                            Archived Slot
                          </span>
                        </div>
                      </div>
                    )
                  })
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>{selectedCenter?.name} • Historical Records Archive</span>
              <button
                type="button"
                onClick={() => setIsStaffHistoryModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition cursor-pointer"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer matching StaffLogin */}
      <footer className="mt-auto py-6 border-t border-slate-200 bg-white/70 text-center text-xs text-slate-500">
        <p>Ministry of Consumer Affairs, Food & Public Distribution • Mandi Management Portal</p>
        <p className="text-[11px] text-slate-400 mt-1">Direct MSP Procurement & Smart Gate Automation System</p>
      </footer>
    </div>
  )
}
