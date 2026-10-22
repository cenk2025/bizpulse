import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import BarcodeScanner, { formatIBAN } from '../components/BarcodeScanner'
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    FileText,
    Send,
    CheckCircle2,
    Clock,
    XCircle,
    X,
    Printer,
    Trash2,
    Wifi,
    WifiOff,
    Zap,
    Camera,
    ScanLine,
    Eye,
    Copy,
    CheckSquare,
    Ban,
} from 'lucide-react'

const VAT_OPTIONS = [
    { value: 25.5, label: '25,5 %' },
    { value: 14, label: '14 %' },
    { value: 10, label: '10 %' },
    { value: 0, label: '0 %' },
]

const statusConfig = {
    paid: { label: 'Maksettu', icon: CheckCircle2, color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
    pending: { label: 'Odottaa', icon: Clock, color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    sent: { label: 'Lähetetty', icon: Send, color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
    overdue: { label: 'Erääntynyt', icon: XCircle, color: 'var(--accent-rose)', bg: 'var(--accent-rose-dim)' },
    draft: { label: 'Luonnos', icon: FileText, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
    cancelled: { label: 'Peruutettu', icon: XCircle, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
}

const sourceConfig = {
    manual: { label: 'Manual', color: 'var(--text-muted)' },
    n8n: { label: 'n8n', color: 'var(--accent-purple)', icon: Zap },
    scan: { label: 'Scan', color: 'var(--accent-blue)', icon: ScanLine },
    api: { label: 'API', color: 'var(--accent-green)', icon: Zap },
}

/** Format number to Finnish EUR: 1 234,56 € */
function formatEUR(num) {
    if (num == null || isNaN(num)) return '0,00 €'
    return num.toLocaleString('fi-FI', {
        style: 'currency',
        currency: 'EUR',
    })
}

function round2(num) {
    return Math.round(num * 100) / 100
}

/** Net (VAT-excluded) amount from a VAT-included gross amount */
function netFromGross(gross, vatPercent) {
    return round2(gross / (1 + vatPercent / 100))
}

/** Format date to Finnish: pp.kk.vvvv */
function formatDateFI(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('fi-FI', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [viewInvoice, setViewInvoice] = useState(null)
    const [saving, setSaving] = useState(false)
    const [realtimeConnected, setRealtimeConnected] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [activeMenu, setActiveMenu] = useState(null) // invoice dbId of open menu
    const menuRef = useRef(null)

    // Close menu on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setActiveMenu(null)
            }
        }
        if (activeMenu) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('touchstart', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [activeMenu])

    const emptyInvoice = {
        type: 'sales', // 'sales' or 'purchase'
        client: '', email: '', dueDate: '', currency: 'EUR',
        iban: '', bic: '', referenceNumber: '', vatPercent: 25.5,
        payeeName: '', payeeBusinessId: '',
        items: [{ desc: '', qty: 1, rate: 0 }],
        source: 'manual',
        grossTotal: null, // scanned barcode amount (VAT included); null = compute from items
    }
    const [newInvoice, setNewInvoice] = useState(emptyInvoice)

    // Load invoices from Supabase
    const loadInvoices = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('invoices')
            .select(`*, invoice_items (*)`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (!error && data) {
            const mapped = data.map(inv => ({
                id: inv.invoice_number,
                dbId: inv.id,
                client: inv.client_name,
                email: inv.client_email || '',
                date: inv.date,
                dueDate: inv.due_date,
                amount: parseFloat(inv.amount),
                subtotal: parseFloat(inv.subtotal || inv.amount),
                vatPercent: parseFloat(inv.vat_percent || 25.5),
                vatAmount: parseFloat(inv.vat_amount || 0),
                status: inv.status,
                type: inv.invoice_type || 'sales', // default to sales if null
                clientId: inv.client_id,
                currency: inv.currency || 'EUR',
                source: inv.source || 'manual',
                iban: inv.iban || '',
                bic: inv.bic || '',
                referenceNumber: inv.reference_number || '',
                payeeName: inv.payee_name || '',
                payeeBusinessId: inv.payee_business_id || '',
                items: (inv.invoice_items || []).map(it => ({
                    desc: it.description,
                    qty: it.qty,
                    rate: parseFloat(it.rate),
                })),
            }))
            setInvoices(mapped)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        loadInvoices()
    }, [loadInvoices])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('invoices-realtime')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'invoices',
            }, () => loadInvoices())
            .subscribe((status) => setRealtimeConnected(status === 'SUBSCRIBED'))

        return () => supabase.removeChannel(channel)
    }, [loadInvoices])

    // Calculations — a scanned barcode carries the gross amount (VAT included),
    // so in that case the net is derived backwards and the total stays exact.
    let subtotal, vatAmount, total
    if (newInvoice.grossTotal != null) {
        total = newInvoice.grossTotal
        subtotal = netFromGross(total, newInvoice.vatPercent)
        vatAmount = round2(total - subtotal)
    } else {
        subtotal = newInvoice.items.reduce((s, i) => s + (i.qty * i.rate), 0)
        vatAmount = subtotal * (newInvoice.vatPercent / 100)
        total = subtotal + vatAmount
    }

    const filtered = invoices.filter((inv) => {
        const q = searchQuery.toLowerCase()
        const matchesSearch = inv.client.toLowerCase().includes(q) ||
            inv.id.toLowerCase().includes(q) ||
            (inv.referenceNumber || '').includes(q)
        const matchesFilter = filterStatus === 'all' || inv.status === filterStatus
        return matchesSearch && matchesFilter
    })

    const stats = {
        total: invoices.reduce((s, i) => s + i.amount, 0),
        paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
        pending: invoices.filter(i => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + i.amount, 0),
        overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0),
    }

    // Editing amounts by hand switches from scanned gross total back to item-based totals
    function addItem() {
        setNewInvoice({ ...newInvoice, grossTotal: null, items: [...newInvoice.items, { desc: '', qty: 1, rate: 0 }] })
    }

    function updateItem(index, field, value) {
        const items = [...newInvoice.items]
        items[index] = { ...items[index], [field]: value }
        const grossTotal = field === 'desc' ? newInvoice.grossTotal : null
        setNewInvoice({ ...newInvoice, items, grossTotal })
    }

    function removeItem(index) {
        if (newInvoice.items.length <= 1) return
        setNewInvoice({ ...newInvoice, grossTotal: null, items: newInvoice.items.filter((_, i) => i !== index) })
    }

    function changeVat(vatPercent) {
        if (newInvoice.grossTotal != null) {
            // Keep the scanned gross total; re-derive the net line price
            const net = netFromGross(newInvoice.grossTotal, vatPercent)
            setNewInvoice({ ...newInvoice, vatPercent, items: [{ ...newInvoice.items[0], qty: 1, rate: net }] })
        } else {
            setNewInvoice({ ...newInvoice, vatPercent })
        }
    }

    /** Next invoice number from the DB; falls back to local max + 1 if the RPC is unavailable */
    async function nextInvoiceNumber() {
        const { data, error } = await supabase.rpc('next_invoice_number')
        if (!error && data) return data
        const maxNum = invoices.reduce((m, i) => {
            const n = parseInt((i.id || '').replace(/\D/g, ''), 10)
            return Number.isFinite(n) && n > m ? n : m
        }, 0)
        return `INV-${String(maxNum + 1).padStart(3, '0')}`
    }

    /** Insert an invoice, retrying with a fresh number if another one took it (unique violation) */
    async function insertInvoiceWithNumber(row) {
        for (let attempt = 0; attempt < 3; attempt++) {
            const invoiceNumber = await nextInvoiceNumber()
            const { data, error } = await supabase
                .from('invoices')
                .insert({ ...row, invoice_number: invoiceNumber })
                .select()
                .single()
            if (!error) return data
            if (error.code !== '23505') throw error
        }
        throw new Error('Laskunumeron varaus epäonnistui')
    }

    // Barcode scan result handler
    function handleScanResult(result) {
        setShowScanner(false)
        if (result.error) {
            alert(result.error)
            return
        }
        // Auto-fill form with scanned data. The barcode amount is the payable
        // total (VAT included), so the line item gets the derived net price.
        setNewInvoice(prev => ({
            ...prev,
            iban: formatIBAN(result.iban) || prev.iban,
            referenceNumber: result.referenceNumber || prev.referenceNumber,
            dueDate: result.dueDate || prev.dueDate,
            source: 'scan',
            grossTotal: result.amount > 0 ? result.amount : prev.grossTotal,
            items: result.amount > 0
                ? [{ desc: 'Skannattu lasku', qty: 1, rate: netFromGross(result.amount, prev.vatPercent) }]
                : prev.items,
            type: 'purchase', // Scanned invoices default to purchase (expense)
        }))
        setShowModal(true)
    }

    async function handleCreate(e) {
        e.preventDefault()
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Find or create client
            let clientId = null
            if (newInvoice.client) {
                const { data: existingClient } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('name', newInvoice.client)
                    .limit(1)
                    .single()

                if (existingClient) {
                    clientId = existingClient.id
                } else {
                    // Auto-create new client from invoice data
                    const { data: newClientData } = await supabase
                        .from('clients')
                        .insert({
                            user_id: user.id,
                            name: newInvoice.client,
                            email: newInvoice.email || null,
                            status: 'active',
                        })
                        .select('id')
                        .single()
                    if (newClientData) clientId = newClientData.id
                }
            }

            const invoiceData = await insertInvoiceWithNumber({
                    user_id: user.id,
                    client_id: clientId,
                    client_name: newInvoice.client,
                    client_email: newInvoice.email,
                    due_date: newInvoice.dueDate,
                    amount: total,
                    subtotal: subtotal,
                    vat_percent: newInvoice.vatPercent,
                    vat_amount: vatAmount,
                    currency: 'EUR',
                    status: 'draft',
                    source: newInvoice.source,
                    iban: newInvoice.iban.replace(/\s/g, ''),
                    bic: newInvoice.bic,
                    reference_number: newInvoice.referenceNumber.replace(/\s/g, ''),
                    payee_name: newInvoice.payeeName,
                    payee_business_id: newInvoice.payeeBusinessId,
                    invoice_type: newInvoice.type,
            })

            const itemsToInsert = newInvoice.items.map((item, idx) => ({
                invoice_id: invoiceData.id,
                description: item.desc,
                qty: item.qty,
                rate: item.rate,
                vat_percent: newInvoice.vatPercent,
                sort_order: idx,
            }))

            const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert)
            if (itemsError) {
                // Don't leave an invoice without its line items
                await supabase.from('invoices').delete().eq('id', invoiceData.id)
                throw itemsError
            }

            setNewInvoice(emptyInvoice)
            setShowModal(false)
            await loadInvoices()
        } catch (err) {
            console.error('Failed to create invoice:', err)
            alert('Laskun luonti epäonnistui. Tarkista konsoli.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(inv, e) {
        e?.stopPropagation()
        if (!confirm(`Poista lasku ${inv.id}?`)) return
        await supabase.from('invoices').delete().eq('id', inv.dbId)
        setViewInvoice(null)
        await loadInvoices()
    }

    async function handleStatusChange(inv, newStatus) {
        await supabase.from('invoices').update({ status: newStatus }).eq('id', inv.dbId)
        setViewInvoice(null)
        setActiveMenu(null)
        await loadInvoices()
    }

    async function handleDuplicate(inv) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        try {
            const now = new Date()
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

            const newInv = await insertInvoiceWithNumber({
                user_id: user.id,
                client_id: inv.clientId || null,
                client_name: inv.client,
                client_email: inv.email,
                date: today,
                due_date: inv.dueDate,
                status: 'draft',
                currency: 'EUR',
                amount: inv.amount,
                subtotal: inv.subtotal,
                vat_amount: inv.vatAmount,
                vat_percent: inv.vatPercent,
                source: 'manual',
                iban: inv.iban,
                bic: inv.bic,
                reference_number: inv.referenceNumber,
                payee_name: inv.payeeName,
                payee_business_id: inv.payeeBusinessId,
                invoice_type: inv.type,
            })

            if (inv.items?.length) {
                const itemsToInsert = inv.items.map((item, idx) => ({
                    invoice_id: newInv.id,
                    description: item.desc + ' (kopio)',
                    qty: item.qty,
                    rate: item.rate,
                    vat_percent: inv.vatPercent,
                    sort_order: idx,
                }))
                const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert)
                if (itemsError) {
                    await supabase.from('invoices').delete().eq('id', newInv.id)
                    throw itemsError
                }
            }
        } catch (err) {
            console.error('Failed to duplicate invoice:', err)
            alert('Laskun kopiointi epäonnistui.')
        }

        setActiveMenu(null)
        await loadInvoices()
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '50vh', color: 'var(--text-muted)', fontSize: 15,
            }}>
                Ladataan laskuja...
            </div>
        )
    }

    return (
        <>
            <div className="invoices-page">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Laskut</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '2px 0 0' }}>Hallinnoi laskutusta</p>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 11, color: realtimeConnected ? 'var(--accent-green)' : 'var(--text-muted)',
                        padding: '4px 10px', borderRadius: 20,
                        background: realtimeConnected ? 'var(--accent-green-dim)' : 'rgba(100,116,139,0.1)',
                    }}>
                        {realtimeConnected ? <Wifi style={{ width: 12, height: 12 }} /> : <WifiOff style={{ width: 12, height: 12 }} />}
                        {realtimeConnected ? 'Live' : 'Offline'}
                    </div>
                </div>

                {/* Stats row */}
                <div className="inv-stats-row">
                    <div className="inv-stat">
                        <span className="inv-stat-label">Yhteensä</span>
                        <span className="inv-stat-value">{formatEUR(stats.total)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Maksettu</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-green)' }}>{formatEUR(stats.paid)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Odottaa</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-amber)' }}>{formatEUR(stats.pending)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Erääntynyt</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-rose)' }}>{formatEUR(stats.overdue)}</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="inv-toolbar">
                    <div className="inv-search">
                        <Search className="inv-search-icon" />
                        <input
                            type="text"
                            placeholder="Hae laskuja..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="inv-filters">
                        <div className="inv-filter-group">
                            <Filter style={{ width: 16, height: 16 }} />
                            {['all', 'paid', 'pending', 'sent', 'overdue', 'draft'].map((s) => (
                                <button
                                    key={s}
                                    className={`inv-filter-btn ${filterStatus === s ? 'active' : ''}`}
                                    onClick={() => setFilterStatus(s)}
                                >
                                    {s === 'all' ? 'Kaikki' : statusConfig[s].label}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowScanner(true)}
                                style={{ gap: 6 }}
                            >
                                <Camera style={{ width: 18, height: 18 }} />
                                <span className="hide-mobile-text">Skannaa</span>
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                <Plus style={{ width: 18, height: 18 }} />
                                <span className="hide-mobile-text">Uusi lasku</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Invoice table */}
                <div className="inv-table-wrap">
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th>Lasku</th>
                                <th>Asiakas</th>
                                <th>Eräpäivä</th>
                                <th>Viitenro</th>
                                <th>Summa</th>
                                <th>Lähde</th>
                                <th>Tila</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inv) => {
                                const sc = statusConfig[inv.status] || statusConfig.draft
                                const StatusIcon = sc.icon
                                const src = sourceConfig[inv.source] || sourceConfig.manual
                                const SrcIcon = src.icon
                                return (
                                    <tr key={inv.dbId || inv.id} onClick={() => setViewInvoice(inv)}>
                                        <td className="inv-id">
                                            {inv.id}
                                            <div className={`invoice-type-dot ${inv.type}`} title={inv.type === 'sales' ? 'Myynti' : 'Osto'} />
                                        </td>
                                        <td>
                                            <div className="inv-client-cell">
                                                <span className="inv-client-name">{inv.client}</span>
                                                <span className="inv-client-email">{inv.email}</span>
                                            </div>
                                        </td>
                                        <td className="inv-date">{formatDateFI(inv.dueDate)}</td>
                                        <td className="inv-ref">{inv.referenceNumber || '—'}</td>
                                        <td className="inv-amount">{formatEUR(inv.amount)}</td>
                                        <td>
                                            {SrcIcon ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    fontSize: 11, color: src.color, fontWeight: 600,
                                                    background: `${src.color}18`, padding: '3px 8px', borderRadius: 10,
                                                }}>
                                                    <SrcIcon style={{ width: 11, height: 11 }} /> {src.label}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                                                    {src.label}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="inv-status-badge" style={{ color: sc.color, background: sc.bg }}>
                                                <StatusIcon style={{ width: 14, height: 14 }} />
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td style={{ position: 'relative' }}>
                                            <button className="inv-more-btn" onClick={(e) => {
                                                e.stopPropagation()
                                                setActiveMenu(activeMenu === inv.dbId ? null : inv.dbId)
                                            }}>
                                                <MoreHorizontal />
                                            </button>
                                            {activeMenu === inv.dbId && (
                                                <div className="inv-action-menu" ref={menuRef}>
                                                    <button className="inv-action-item" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setViewInvoice(inv) }}>
                                                        <Eye style={{ width: 15, height: 15 }} />
                                                        Näytä tiedot
                                                    </button>
                                                    <div className="inv-action-divider" />
                                                    <button className="inv-action-item" onClick={(e) => { e.stopPropagation(); handleStatusChange(inv, 'paid') }}>
                                                        <CheckCircle2 style={{ width: 15, height: 15, color: 'var(--accent-green)' }} />
                                                        Merkitse maksetuksi
                                                    </button>
                                                    <button className="inv-action-item" onClick={(e) => { e.stopPropagation(); handleStatusChange(inv, 'sent') }}>
                                                        <Send style={{ width: 15, height: 15, color: 'var(--accent-blue)' }} />
                                                        Merkitse lähetetyksi
                                                    </button>
                                                    <button className="inv-action-item" onClick={(e) => { e.stopPropagation(); handleStatusChange(inv, 'draft') }}>
                                                        <FileText style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
                                                        Palauta luonnokseksi
                                                    </button>
                                                    <button className="inv-action-item" onClick={(e) => { e.stopPropagation(); handleStatusChange(inv, 'cancelled') }}>
                                                        <Ban style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
                                                        Peruuta lasku
                                                    </button>
                                                    <div className="inv-action-divider" />
                                                    <button className="inv-action-item" onClick={(e) => { e.stopPropagation(); handleDuplicate(inv) }}>
                                                        <Copy style={{ width: 15, height: 15 }} />
                                                        Kopioi lasku
                                                    </button>
                                                    <div className="inv-action-divider" />
                                                    <button className="inv-action-item danger" onClick={(e) => handleDelete(inv, e)}>
                                                        <Trash2 style={{ width: 15, height: 15 }} />
                                                        Poista lasku
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="inv-empty">
                                        {invoices.length === 0
                                            ? 'Ei laskuja. Luo uusi tai skannaa viivakoodi!'
                                            : 'Laskuja ei löytynyt'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Invoice Modal */}
            {viewInvoice && (
                <div className="modal-overlay" onClick={() => setViewInvoice(null)}>
                    <div className="modal" style={{ width: 580 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 className="modal-title">{viewInvoice.id}</h3>
                                <span className={`invoice-type-badge ${viewInvoice.type}`}>
                                    {viewInvoice.type === 'sales' ? 'Myynti' : 'Osto'}
                                </span>
                                {viewInvoice.source !== 'manual' && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                        fontSize: 10, color: sourceConfig[viewInvoice.source]?.color || 'var(--text-muted)',
                                        fontWeight: 600,
                                        background: `${sourceConfig[viewInvoice.source]?.color || 'gray'}18`,
                                        padding: '2px 7px', borderRadius: 8,
                                    }}>
                                        {viewInvoice.source === 'scan' ? <ScanLine style={{ width: 10, height: 10 }} /> : <Zap style={{ width: 10, height: 10 }} />}
                                        {viewInvoice.source}
                                    </span>
                                )}
                            </div>
                            <button className="modal-close" onClick={() => setViewInvoice(null)}>
                                <X />
                            </button>
                        </div>
                        <div className="inv-detail">
                            <div className="inv-detail-row">
                                <div>
                                    <div className="inv-detail-label">Asiakas</div>
                                    <div className="inv-detail-value">{viewInvoice.client}</div>
                                    <div className="inv-detail-sub">{viewInvoice.email}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="inv-detail-label">Tila</div>
                                    <select
                                        value={viewInvoice.status}
                                        onChange={(e) => handleStatusChange(viewInvoice, e.target.value)}
                                        style={{
                                            background: 'var(--bg-card)', color: 'var(--text-heading)',
                                            border: '1px solid var(--border-color)', borderRadius: 8,
                                            padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                                        }}
                                    >
                                        {Object.entries(statusConfig).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Finnish payment details */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                                marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--border-color)',
                            }}>
                                <div>
                                    <div className="inv-detail-label">Eräpäivä</div>
                                    <div className="inv-detail-value">{formatDateFI(viewInvoice.dueDate)}</div>
                                </div>
                                <div>
                                    <div className="inv-detail-label">Laskun päivä</div>
                                    <div className="inv-detail-value">{formatDateFI(viewInvoice.date)}</div>
                                </div>
                                {viewInvoice.iban && (
                                    <div>
                                        <div className="inv-detail-label">IBAN</div>
                                        <div className="inv-detail-value" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                            {formatIBAN(viewInvoice.iban)}
                                        </div>
                                    </div>
                                )}
                                {viewInvoice.bic && (
                                    <div>
                                        <div className="inv-detail-label">BIC</div>
                                        <div className="inv-detail-value" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                            {viewInvoice.bic}
                                        </div>
                                    </div>
                                )}
                                {viewInvoice.referenceNumber && (
                                    <div>
                                        <div className="inv-detail-label">Viitenumero</div>
                                        <div className="inv-detail-value" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                            {viewInvoice.referenceNumber}
                                        </div>
                                    </div>
                                )}
                                {viewInvoice.payeeBusinessId && (
                                    <div>
                                        <div className="inv-detail-label">Y-tunnus</div>
                                        <div className="inv-detail-value">{viewInvoice.payeeBusinessId}</div>
                                    </div>
                                )}
                            </div>

                            {/* Line items */}
                            <div className="inv-items-table">
                                <div className="inv-items-header">
                                    <span>Kuvaus</span>
                                    <span>Kpl</span>
                                    <span>Hinta</span>
                                    <span>Yhteensä</span>
                                </div>
                                {viewInvoice.items.map((item, i) => (
                                    <div key={i} className="inv-items-row">
                                        <span>{item.desc}</span>
                                        <span>{item.qty}</span>
                                        <span>{formatEUR(item.rate)}</span>
                                        <span>{formatEUR(item.qty * item.rate)}</span>
                                    </div>
                                ))}
                                <div className="inv-items-total" style={{ flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <span>Veroton</span>
                                        <span>{formatEUR(viewInvoice.subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 13, opacity: 0.8 }}>
                                        <span>ALV {viewInvoice.vatPercent}%</span>
                                        <span>{formatEUR(viewInvoice.vatAmount)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingTop: 4, borderTop: '1px solid var(--border-color)' }}>
                                        <span style={{ fontWeight: 700 }}>Yhteensä</span>
                                        <span style={{ fontWeight: 700 }}>{formatEUR(viewInvoice.amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" style={{ color: 'var(--accent-rose)' }} onClick={(e) => handleDelete(viewInvoice, e)}>
                                <Trash2 style={{ width: 16, height: 16 }} />
                                Poista
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost" onClick={() => setViewInvoice(null)}>
                                    <Printer style={{ width: 16, height: 16 }} />
                                    Tulosta
                                </button>
                                <button className="btn btn-primary" onClick={() => handleStatusChange(viewInvoice, 'sent')}>
                                    <Send style={{ width: 16, height: 16 }} />
                                    Lähetä
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Uusi lasku</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X />
                            </button>
                        </div>
                        <form className="modal-form" onSubmit={handleCreate}>
                            {/* Scan button */}
                            <button
                                type="button"
                                className="scan-invoice-btn"
                                onClick={() => { setShowModal(false); setShowScanner(true) }}
                            >
                                <Camera style={{ width: 20, height: 20 }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Skannaa viivakoodi</div>
                                    <div style={{ fontSize: 12, opacity: 0.7 }}>Täyttää IBAN, summa, viite ja eräpäivä automaattisesti</div>
                                </div>
                            </button>

                            {/* Type Selection */}
                            <div className="form-row" style={{ marginBottom: 20 }}>
                                <div className="type-toggle">
                                    <button
                                        type="button"
                                        className={`type-toggle-btn ${newInvoice.type === 'sales' ? 'active sales' : ''}`}
                                        onClick={() => setNewInvoice({ ...newInvoice, type: 'sales' })}
                                    >
                                        Myyntilasku (Tulot)
                                    </button>
                                    <button
                                        type="button"
                                        className={`type-toggle-btn ${newInvoice.type === 'purchase' ? 'active purchase' : ''}`}
                                        onClick={() => setNewInvoice({ ...newInvoice, type: 'purchase' })}
                                    >
                                        Ostolasku (Kulut)
                                    </button>
                                </div>
                            </div>

                            {/* Client info */}
                            <div className="form-section-label">Asiakas</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nimi</label>
                                    <input
                                        type="text"
                                        placeholder="Yrityksen nimi"
                                        value={newInvoice.client}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, client: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Sähköposti</label>
                                    <input
                                        type="email"
                                        placeholder="laskutus@yritys.fi"
                                        value={newInvoice.email}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Payment info */}
                            <div className="form-section-label">Maksutiedot</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Saaja / Payee</label>
                                    <input
                                        type="text"
                                        placeholder="Saajan nimi"
                                        value={newInvoice.payeeName}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, payeeName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Y-tunnus</label>
                                    <input
                                        type="text"
                                        placeholder="1234567-8"
                                        value={newInvoice.payeeBusinessId}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, payeeBusinessId: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>IBAN</label>
                                    <input
                                        type="text"
                                        placeholder="FI38 5000 0120 2136 80"
                                        value={newInvoice.iban}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, iban: e.target.value })}
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>BIC</label>
                                    <input
                                        type="text"
                                        placeholder="OKOYFIHH"
                                        value={newInvoice.bic}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, bic: e.target.value.toUpperCase() })}
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Viitenumero</label>
                                    <input
                                        type="text"
                                        placeholder="3184 51723"
                                        value={newInvoice.referenceNumber}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, referenceNumber: e.target.value })}
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Eräpäivä</label>
                                    <input
                                        type="date"
                                        value={newInvoice.dueDate}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Line items */}
                            <div className="form-section-label">Rivit</div>
                            <div className="form-group">
                                <div className="inv-line-items">
                                    {newInvoice.items.map((item, i) => (
                                        <div key={i} className="inv-line-item">
                                            <input
                                                type="text"
                                                placeholder="Kuvaus"
                                                value={item.desc}
                                                onChange={(e) => updateItem(i, 'desc', e.target.value)}
                                                required
                                                style={{ flex: 2 }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Kpl"
                                                value={item.qty}
                                                onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 0)}
                                                min="1"
                                                required
                                                style={{ width: 70 }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="€ / kpl"
                                                value={item.rate || ''}
                                                onChange={(e) => updateItem(i, 'rate', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                                required
                                                style={{ width: 100 }}
                                            />
                                            <button
                                                type="button"
                                                className="inv-remove-item"
                                                onClick={() => removeItem(i)}
                                                disabled={newInvoice.items.length <= 1}
                                            >
                                                <Trash2 />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="add-btn" onClick={addItem} style={{ marginTop: 4 }}>
                                        <Plus /> Lisää rivi
                                    </button>
                                </div>
                            </div>

                            {/* VAT selection */}
                            <div className="form-row" style={{ alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ flex: '0 0 auto', width: 140 }}>
                                    <label>ALV %</label>
                                    <select
                                        value={newInvoice.vatPercent}
                                        onChange={(e) => changeVat(parseFloat(e.target.value))}
                                    >
                                        {VAT_OPTIONS.map((v) => (
                                            <option key={v.value} value={v.value}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="inv-create-summary">
                                <div className="inv-summary-row">
                                    <span>Veroton</span>
                                    <span>{formatEUR(subtotal)}</span>
                                </div>
                                <div className="inv-summary-row" style={{ opacity: 0.7, fontSize: 13 }}>
                                    <span>ALV {newInvoice.vatPercent} %</span>
                                    <span>{formatEUR(vatAmount)}</span>
                                </div>
                                <div className="inv-summary-row inv-summary-total">
                                    <span>Yhteensä</span>
                                    <span>{formatEUR(total)}</span>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Peruuta</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Luodaan...' : 'Luo lasku'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Barcode Scanner */}
            {showScanner && (
                <BarcodeScanner
                    onScanResult={handleScanResult}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </>
    )
}
