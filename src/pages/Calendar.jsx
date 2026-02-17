import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Clock,
    User,
    StickyNote,
    FileText,
    Euro,
} from 'lucide-react'
// import { sampleAppointments } from '../data/sampleData'

const WEEKDAYS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']
const MONTH_NAMES = [
    'Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu',
    'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu',
]

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
    // Adjust for Monday start (0=Mon, 6=Sun)
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
}

function formatDateKey(year, month, day) {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
}

function formatEUR(num) {
    if (num == null || isNaN(num)) return '0,00 €'
    return num.toLocaleString('fi-FI', { style: 'currency', currency: 'EUR' })
}

export default function Calendar() {
    const today = new Date()
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(today.getMonth())
    const [selectedDate, setSelectedDate] = useState(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()))
    const [appointments, setAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [invoiceEvents, setInvoiceEvents] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [newAppt, setNewAppt] = useState({ title: '', time: '', client: '', notes: '' })

    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

    // Load invoices from Supabase
    const loadInvoices = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)

        if (!error && data) {
            const events = data
                .filter(inv => inv.due_date)
                .map(inv => ({
                    id: `inv-${inv.id}`,
                    date: inv.due_date,
                    time: '',
                    title: `📄 ${inv.invoice_number} — ${inv.client_name || 'Tuntematon'}`,
                    client: inv.client_name || '',
                    notes: `Summa: ${formatEUR(inv.total)} | Tila: ${inv.status || 'luonnos'}`,
                    type: 'invoice',
                    status: inv.status,
                    total: inv.total,
                    invoiceNumber: inv.invoice_number,
                }))
            setInvoiceEvents(events)
        }
    }, [])

    // Load appointments from Supabase
    const loadAppointments = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', user.id)

        if (!error && data) {
            setAppointments(data.map(appt => ({
                id: appt.id,
                date: appt.date,
                time: appt.time.slice(0, 5), // HH:MM:SS -> HH:MM
                title: appt.title,
                client: appt.client_name || '',
                notes: appt.notes || '',
                type: 'appointment'
            })))
        }
    }, [])

    useEffect(() => {
        loadInvoices()
        loadAppointments()
    }, [loadInvoices, loadAppointments])

    // Combine sample appointments + invoice events
    const allEvents = useMemo(() => {
        return [...appointments, ...invoiceEvents]
    }, [appointments, invoiceEvents])

    // Build event index
    const apptIndex = useMemo(() => {
        const idx = {}
        allEvents.forEach((a) => {
            if (!idx[a.date]) idx[a.date] = []
            idx[a.date].push(a)
        })
        return idx
    }, [allEvents])

    // Calendar grid (Monday start)
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

    async function handleAddAppointment(e) {
        e.preventDefault()
        if (!newAppt.title || !newAppt.time) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('appointments')
            .insert({
                user_id: user.id,
                title: newAppt.title,
                date: selectedDate,
                time: newAppt.time,
                client_name: newAppt.client,
                notes: newAppt.notes,
            })
            .select()
            .single()

        if (!error && data) {
            const appt = {
                id: data.id,
                date: data.date,
                time: data.time.slice(0, 5),
                title: data.title,
                client: data.client_name || '',
                notes: data.notes || '',
                type: 'appointment'
            }
            setAppointments(prev => [...prev, appt])
            setNewAppt({ title: '', time: '', client: '', notes: '' })
            setShowModal(false)
        } else {
            alert('Tapaamisen tallennus epäonnistui.')
            console.error(error)
        }
    }

    const selectedAppts = apptIndex[selectedDate] || []
    const selectedDateObj = new Date(selectedDate + 'T00:00:00')
    const selectedDateStr = selectedDateObj.toLocaleDateString('fi-FI', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
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
                            <button className="cal-today-btn" onClick={goToday}>Tänään</button>
                            <div className="cal-nav">
                                <button className="cal-nav-btn" onClick={prevMonthNav} aria-label="Edellinen kuukausi">
                                    <ChevronLeft />
                                </button>
                                <button className="cal-nav-btn" onClick={nextMonthNav} aria-label="Seuraava kuukausi">
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
                            const hasInvoice = dayAppts.some(a => a.type === 'invoice')
                            const hasAppt = dayAppts.some(a => a.type !== 'invoice')
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
                                            {hasAppt && <div className="cal-dot"></div>}
                                            {hasInvoice && <div className="cal-dot invoice"></div>}
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
                                    <div
                                        key={appt.id}
                                        className={`appointment-item${appt.type === 'invoice' ? ' invoice-event' : ''}`}
                                    >
                                        {appt.type === 'invoice' ? (
                                            <>
                                                <div className="appointment-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <FileText style={{ width: 14, height: 14, color: 'var(--accent-blue)' }} />
                                                    {appt.invoiceNumber} — {appt.client}
                                                </div>
                                                <div className="appointment-client" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Euro style={{ width: 12, height: 12 }} />
                                                    {formatEUR(appt.total)}
                                                    <span style={{
                                                        marginLeft: 8,
                                                        padding: '2px 8px',
                                                        borderRadius: 6,
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        background: appt.status === 'paid' ? 'rgba(0,212,170,0.15)' : appt.status === 'overdue' ? 'rgba(244,63,94,0.15)' : 'rgba(100,116,139,0.15)',
                                                        color: appt.status === 'paid' ? 'var(--accent-green)' : appt.status === 'overdue' ? '#f43f5e' : 'var(--text-muted)',
                                                    }}>
                                                        {appt.status === 'paid' ? 'Maksettu' :
                                                            appt.status === 'sent' ? 'Lähetetty' :
                                                                appt.status === 'overdue' ? 'Erääntynyt' :
                                                                    appt.status === 'cancelled' ? 'Peruutettu' : 'Luonnos'}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
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
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="appointment-empty">
                                Ei tapahtumia tälle päivälle
                            </div>
                        )}
                        <button
                            className="add-btn"
                            style={{ marginTop: 16 }}
                            onClick={() => setShowModal(true)}
                        >
                            <Plus />
                            Lisää tapaaminen
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Appointment Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Uusi tapaaminen</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X />
                            </button>
                        </div>
                        <form className="modal-form" onSubmit={handleAddAppointment}>
                            <div className="form-group">
                                <label>Otsikko</label>
                                <input
                                    type="text"
                                    placeholder="Tapaaminen asiakkaan kanssa..."
                                    value={newAppt.title}
                                    onChange={(e) => setNewAppt({ ...newAppt, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Aika</label>
                                    <input
                                        type="time"
                                        value={newAppt.time}
                                        onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Asiakas</label>
                                    <input
                                        type="text"
                                        placeholder="Asiakkaan nimi"
                                        value={newAppt.client}
                                        onChange={(e) => setNewAppt({ ...newAppt, client: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Muistiinpanot</label>
                                <textarea
                                    placeholder="Lisätietoja..."
                                    value={newAppt.notes}
                                    onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    Peruuta
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Tallenna tapaaminen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
