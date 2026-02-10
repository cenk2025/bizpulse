import { useState, useMemo } from 'react'
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Clock,
    User,
    StickyNote,
} from 'lucide-react'
import { sampleAppointments } from '../data/sampleData'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay()
}

function formatDateKey(year, month, day) {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
}

export default function Calendar() {
    const today = new Date()
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(today.getMonth())
    const [selectedDate, setSelectedDate] = useState(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()))
    const [appointments, setAppointments] = useState(sampleAppointments)
    const [showModal, setShowModal] = useState(false)
    const [newAppt, setNewAppt] = useState({ title: '', time: '', client: '', notes: '' })

    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

    // Build appointment index
    const apptIndex = useMemo(() => {
        const idx = {}
        appointments.forEach((a) => {
            if (!idx[a.date]) idx[a.date] = []
            idx[a.date].push(a)
        })
        return idx
    }, [appointments])

    // Calendar grid
    const calendarDays = useMemo(() => {
        const days = []
        const daysInMonth = getDaysInMonth(currentYear, currentMonth)
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

        // Previous month fill
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
        const prevDays = getDaysInMonth(prevYear, prevMonth)
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = prevDays - i
            days.push({
                day,
                key: formatDateKey(prevYear, prevMonth, day),
                otherMonth: true,
            })
        }

        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({
                day: d,
                key: formatDateKey(currentYear, currentMonth, d),
                otherMonth: false,
            })
        }

        // Next month fill
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
        const remaining = 42 - days.length
        for (let d = 1; d <= remaining; d++) {
            days.push({
                day: d,
                key: formatDateKey(nextYear, nextMonth, d),
                otherMonth: true,
            })
        }

        return days
    }, [currentYear, currentMonth])

    function prevMonthNav() {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear(currentYear - 1)
        } else {
            setCurrentMonth(currentMonth - 1)
        }
    }

    function nextMonthNav() {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear(currentYear + 1)
        } else {
            setCurrentMonth(currentMonth + 1)
        }
    }

    function goToday() {
        setCurrentYear(today.getFullYear())
        setCurrentMonth(today.getMonth())
        setSelectedDate(todayKey)
    }

    function handleAddAppointment(e) {
        e.preventDefault()
        if (!newAppt.title || !newAppt.time) return
        const appt = {
            id: Date.now(),
            date: selectedDate,
            ...newAppt,
        }
        setAppointments([...appointments, appt])
        setNewAppt({ title: '', time: '', client: '', notes: '' })
        setShowModal(false)
    }

    const selectedAppts = apptIndex[selectedDate] || []
    const selectedDateObj = new Date(selectedDate + 'T00:00:00')
    const selectedDateStr = selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })

    return (
        <>
            <div className="calendar-page">
                {/* Main calendar grid */}
                <div className="cal-main">
                    <div className="cal-header">
                        <h2>{MONTH_NAMES[currentMonth]} {currentYear}</h2>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button className="cal-today-btn" onClick={goToday}>Today</button>
                            <div className="cal-nav">
                                <button className="cal-nav-btn" onClick={prevMonthNav} aria-label="Previous month">
                                    <ChevronLeft />
                                </button>
                                <button className="cal-nav-btn" onClick={nextMonthNav} aria-label="Next month">
                                    <ChevronRight />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="cal-weekdays">
                        {WEEKDAYS.map((wd) => (
                            <div key={wd} className="cal-weekday">{wd}</div>
                        ))}
                    </div>

                    <div className="cal-grid">
                        {calendarDays.map((d) => {
                            const isToday = d.key === todayKey
                            const isSelected = d.key === selectedDate
                            const dayAppts = apptIndex[d.key] || []
                            let className = 'cal-day'
                            if (d.otherMonth) className += ' other-month'
                            if (isToday) className += ' today'
                            if (isSelected) className += ' selected'

                            return (
                                <div
                                    key={d.key}
                                    className={className}
                                    onClick={() => setSelectedDate(d.key)}
                                >
                                    <span className="cal-day-num">{d.day}</span>
                                    {dayAppts.length > 0 && (
                                        <div className="cal-day-dots">
                                            {dayAppts.slice(0, 3).map((_, i) => (
                                                <div key={i} className="cal-dot"></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="cal-sidebar">
                    <div className="cal-sidebar-card">
                        <div className="cal-sidebar-title">
                            <Clock />
                            {selectedDateStr}
                        </div>
                        {selectedAppts.length > 0 ? (
                            <div className="appointment-list">
                                {selectedAppts.map((appt) => (
                                    <div key={appt.id} className="appointment-item">
                                        <div className="appointment-time">{appt.time}</div>
                                        <div className="appointment-title">{appt.title}</div>
                                        <div className="appointment-client">
                                            <User style={{ width: 12, height: 12, display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                                            {appt.client}
                                        </div>
                                        {appt.notes && (
                                            <div className="appointment-client" style={{ marginTop: 4 }}>
                                                <StickyNote style={{ width: 12, height: 12, display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                                                {appt.notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="appointment-empty">
                                No appointments for this day
                            </div>
                        )}
                        <button
                            className="add-btn"
                            style={{ marginTop: 16 }}
                            onClick={() => setShowModal(true)}
                        >
                            <Plus />
                            Add Appointment
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Appointment Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">New Appointment</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X />
                            </button>
                        </div>
                        <form className="modal-form" onSubmit={handleAddAppointment}>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    placeholder="Meeting with client..."
                                    value={newAppt.title}
                                    onChange={(e) => setNewAppt({ ...newAppt, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Time</label>
                                    <input
                                        type="time"
                                        value={newAppt.time}
                                        onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Client</label>
                                    <input
                                        type="text"
                                        placeholder="Client name"
                                        value={newAppt.client}
                                        onChange={(e) => setNewAppt({ ...newAppt, client: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    placeholder="Additional notes..."
                                    value={newAppt.notes}
                                    onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Appointment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
