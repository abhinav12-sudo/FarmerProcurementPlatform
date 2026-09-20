import { useState, useEffect } from 'react'
import api from '../api/client.js'
import { Ticket, Calendar, Clock, MapPin, IndianRupee, CheckCircle2, AlertCircle, Loader2, XCircle, RefreshCw } from 'lucide-react'

export default function FarmerHistory({ farmer, refreshTrigger, onHistoryChange }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  const fetchHistory = () => {
    if (!farmer?._id) return

    setLoading(true)
    setError('')

    api.get(`/farmers/${farmer._id}/history`)
      .then((res) => {
        setHistory(res.data?.data || [])
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to fetch booking history.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHistory()
  }, [farmer?._id, refreshTrigger])

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? The slot will be released back to other farmers.')) {
      return
    }

    setCancellingId(bookingId)
    try {
      await api.post(`/bookings/${bookingId}/cancel`)
      fetchHistory()
      if (onHistoryChange) onHistoryChange()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.')
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'booked':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
            <Clock className="w-3 h-3" /> Booked (आगमन प्रतीक्षित)
          </span>
        )
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> In Mandi Queue (गेट पर उपस्थित)
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Procured (तौल पूर्ण)
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-800 rounded-full">
            <XCircle className="w-3 h-3" /> Cancelled (रद्द)
          </span>
        )
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full">
            {status}
          </span>
        )
    }
  }

  const getPaymentBadge = (paymentStatus, amount) => {
    if (!paymentStatus && amount == null) {
      return (
        <span className="text-xs text-gray-400 italic">
          Awaiting weighing
        </span>
      )
    }

    switch (paymentStatus) {
      case 'paid':
        return (
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Paid via DBT (भुगतान सफल)
            </span>
            <p className="text-sm font-extrabold text-gray-900 mt-1 flex items-center justify-end">
              <IndianRupee className="w-3.5 h-3.5" />
              {Number(amount).toLocaleString('en-IN')}
            </p>
          </div>
        )
      case 'processing':
        return (
          <div className="text-right">
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              Processing (प्रक्रियाधीन)
            </span>
            <p className="text-sm font-extrabold text-gray-900 mt-1 flex items-center justify-end">
              <IndianRupee className="w-3.5 h-3.5" />
              {Number(amount).toLocaleString('en-IN')}
            </p>
          </div>
        )
      case 'pending':
      default:
        return (
          <div className="text-right">
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Payment Pending (लंबित)
            </span>
            <p className="text-sm font-extrabold text-gray-900 mt-1 flex items-center justify-end">
              <IndianRupee className="w-3.5 h-3.5" />
              {Number(amount).toLocaleString('en-IN')}
            </p>
          </div>
        )
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
      {/* Card Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600" />
            <span>My Tokens & Mandi Passbook (मेरी पर्चियां)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            View active arrival passes, counter progress, and DBT payment transfer status
          </p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
            <p className="text-xs">Loading your digital passbook...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-xs text-red-600 bg-red-50 rounded-2xl border border-red-100">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-xl text-gray-400 mb-2">
              📜
            </div>
            <p className="text-sm font-semibold text-gray-700">No booking history yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              You haven't booked any mandi slots yet. Use the booking section above to reserve your first arrival window.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const dateFormatted = item.startTime
                ? new Date(item.startTime).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'

              const timeFormatted = item.startTime
                ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''

              const canCancel = item.status === 'booked'

              return (
                <div
                  key={item._id}
                  className="p-5 rounded-2xl border border-gray-200/80 bg-gray-50/40 hover:bg-white hover:border-emerald-200 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Token & Center Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex flex-col items-center justify-center font-extrabold text-sm shrink-0 border border-emerald-200">
                      <span>{item.cropType?.slice(0, 3).toUpperCase() || 'TOK'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-gray-900 tracking-tight">
                          Token: {item.tokenNumber}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <strong>{item.centerName || 'Mandi Center'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {dateFormatted} at {timeFormatted}
                        </span>
                        <span>
                          Crop: <strong>{item.cropType}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Payment Status & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-200">
                    <div>
                      {getPaymentBadge(item.paymentStatus, item.amount)}
                    </div>

                    {canCancel && (
                      <button
                        type="button"
                        disabled={cancellingId === item._id}
                        onClick={() => handleCancelBooking(item._id)}
                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 border border-red-200 disabled:opacity-50"
                      >
                        {cancellingId === item._id ? 'Cancelling...' : 'Cancel Slot'}
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
  )
}
