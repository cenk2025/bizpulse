import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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
} from 'lucide-react'

const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    TRY: '₺',
    SEK: 'kr',
}

const currencyLocales = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    TRY: 'tr-TR',
    SEK: 'sv-SE',
}

const statusConfig = {
    paid: { label: 'Paid', icon: CheckCircle2, color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
    pending: { label: 'Pending', icon: Clock, color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    sent: { label: 'Sent', icon: Send, color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
    overdue: { label: 'Overdue', icon: XCircle, color: 'var(--accent-rose)', bg: 'var(--accent-rose-dim)' },
    draft: { label: 'Draft', icon: FileText, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
}

function formatCurrency(num, currency = 'USD') {
    const symbol = currencySymbols[currency] || currency
    const locale = currencyLocales[currency] || 'en-US'
    if (currency === 'SEK') {
        return num.toLocaleString(locale, { minimumFractionDigits: 2 }) + ' ' + symbol
    }
    return symbol + num.toLocaleString(locale, { minimumFractionDigits: 2 })
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [viewInvoice, setViewInvoice] = useState(null)
    const [defaultCurrency, setDefaultCurrency] = useState('USD')
    const [saving, setSaving] = useState(false)
    const [realtimeConnected, setRealtimeConnected] = useState(false)
    const [newInvoice, setNewInvoice] = useState({
        client: '', email: '', dueDate: '', currency: 'USD',
        items: [{ desc: '', qty: 1, rate: 0 }],
    })

    // Load invoices from Supabase
    const loadInvoices = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                invoice_items (*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (!error && data) {
            // Map DB fields to component format
            const mapped = data.map(inv => ({
                id: inv.invoice_number,
                dbId: inv.id,
                client: inv.client_name,
                email: inv.client_email || '',
                date: inv.date,
                dueDate: inv.due_date,
                amount: parseFloat(inv.amount),
                status: inv.status,
                currency: inv.currency,
                source: inv.source || 'manual',
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

    // Load currency preference + invoices on mount
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('currency')
                    .eq('id', user.id)
                    .single()
                if (data?.currency) {
                    setDefaultCurrency(data.currency)
                    setNewInvoice(prev => ({ ...prev, currency: data.currency }))
                }
            }
            await loadInvoices()
        }
        init()
    }, [loadInvoices])

    // Realtime subscription for live updates (e.g. from n8n)
    useEffect(() => {
        const channel = supabase
            .channel('invoices-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'invoices',
            }, () => {
                // Reload all invoices on any change
                loadInvoices()
            })
            .subscribe((status) => {
                setRealtimeConnected(status === 'SUBSCRIBED')
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [loadInvoices])

    const filtered = invoices.filter((inv) => {
        const matchesSearch = inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.id.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filterStatus === 'all' || inv.status === filterStatus
        return matchesSearch && matchesFilter
    })

    const stats = {
        total: invoices.reduce((s, i) => s + i.amount, 0),
        paid: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
        pending: invoices.filter((i) => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + i.amount, 0),
        overdue: invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0),
    }

    function addItem() {
        setNewInvoice({
            ...newInvoice,
            items: [...newInvoice.items, { desc: '', qty: 1, rate: 0 }],
        })
    }

    function updateItem(index, field, value) {
        const items = [...newInvoice.items]
        items[index] = { ...items[index], [field]: value }
        setNewInvoice({ ...newInvoice, items })
    }

    function removeItem(index) {
        if (newInvoice.items.length <= 1) return
        setNewInvoice({
            ...newInvoice,
            items: newInvoice.items.filter((_, i) => i !== index),
        })
    }

    async function handleCreate(e) {
        e.preventDefault()
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const total = newInvoice.items.reduce((s, i) => s + (i.qty * i.rate), 0)

            // Generate invoice number
            const { data: numData } = await supabase.rpc('generate_invoice_number', {
                p_user_id: user.id,
            })
            const invoiceNumber = numData || `INV-${String(invoices.length + 1).padStart(3, '0')}`

            // Find or match existing client
            let clientId = null
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', user.id)
                .ilike('name', newInvoice.client)
                .limit(1)
                .single()

            if (existingClient) {
                clientId = existingClient.id
            }

            // Insert invoice
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    user_id: user.id,
                    invoice_number: invoiceNumber,
                    client_id: clientId,
                    client_name: newInvoice.client,
                    client_email: newInvoice.email,
                    due_date: newInvoice.dueDate,
                    amount: total,
                    currency: newInvoice.currency,
                    status: 'draft',
                    source: 'manual',
                })
                .select()
                .single()

            if (invoiceError) throw invoiceError

            // Insert line items
            const itemsToInsert = newInvoice.items.map((item, idx) => ({
                invoice_id: invoiceData.id,
                description: item.desc,
                qty: item.qty,
                rate: item.rate,
                sort_order: idx,
            }))

            await supabase.from('invoice_items').insert(itemsToInsert)

            // Reset form and reload
            setNewInvoice({
                client: '', email: '', dueDate: '', currency: defaultCurrency,
                items: [{ desc: '', qty: 1, rate: 0 }],
            })
            setShowModal(false)
            await loadInvoices()
        } catch (err) {
            console.error('Failed to create invoice:', err)
            alert('Failed to create invoice. Check console for details.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(inv, e) {
        e?.stopPropagation()
        if (!confirm(`Delete invoice ${inv.id}?`)) return

        await supabase.from('invoices').delete().eq('id', inv.dbId)
        setViewInvoice(null)
        await loadInvoices()
    }

    async function handleStatusChange(inv, newStatus) {
        await supabase.from('invoices').update({ status: newStatus }).eq('id', inv.dbId)
        setViewInvoice(null)
        await loadInvoices()
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '50vh', color: 'var(--text-muted)', fontSize: 15,
            }}>
                Loading invoices...
            </div>
        )
    }

    return (
        <>
            <div className="invoices-page">
                {/* Header with realtime indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Invoices</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '2px 0 0' }}>Manage your billing</p>
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
                        <span className="inv-stat-label">Total Invoiced</span>
                        <span className="inv-stat-value">{formatCurrency(stats.total, defaultCurrency)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Paid</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-green)' }}>{formatCurrency(stats.paid, defaultCurrency)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Pending</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-amber)' }}>{formatCurrency(stats.pending, defaultCurrency)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Overdue</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-rose)' }}>{formatCurrency(stats.overdue, defaultCurrency)}</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="inv-toolbar">
                    <div className="inv-search">
                        <Search className="inv-search-icon" />
                        <input
                            type="text"
                            placeholder="Search invoices..."
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
                                    {s === 'all' ? 'All' : statusConfig[s].label}
                                </button>
                            ))}
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus style={{ width: 18, height: 18 }} />
                            New Invoice
                        </button>
                    </div>
                </div>

                {/* Invoice table */}
                <div className="inv-table-wrap">
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Client</th>
                                <th>Date</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inv) => {
                                const sc = statusConfig[inv.status] || statusConfig.draft
                                const StatusIcon = sc.icon
                                return (
                                    <tr key={inv.dbId || inv.id} onClick={() => setViewInvoice(inv)}>
                                        <td className="inv-id">{inv.id}</td>
                                        <td>
                                            <div className="inv-client-cell">
                                                <span className="inv-client-name">{inv.client}</span>
                                                <span className="inv-client-email">{inv.email}</span>
                                            </div>
                                        </td>
                                        <td className="inv-date">{new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                        <td className="inv-date">{new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                        <td className="inv-amount">{formatCurrency(inv.amount, inv.currency || defaultCurrency)}</td>
                                        <td>
                                            {inv.source === 'n8n' ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    fontSize: 11, color: 'var(--accent-purple)', fontWeight: 600,
                                                    background: 'rgba(168,85,247,0.12)', padding: '3px 8px', borderRadius: 10,
                                                }}>
                                                    <Zap style={{ width: 11, height: 11 }} /> n8n
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
                                                }}>
                                                    Manual
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="inv-status-badge" style={{ color: sc.color, background: sc.bg }}>
                                                <StatusIcon style={{ width: 14, height: 14 }} />
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="inv-more-btn" onClick={(e) => { e.stopPropagation() }}>
                                                <MoreHorizontal />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="inv-empty">
                                        {invoices.length === 0
                                            ? 'No invoices yet. Create one manually or send via n8n!'
                                            : 'No invoices found'}
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
                    <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h3 className="modal-title">{viewInvoice.id}</h3>
                                {viewInvoice.source === 'n8n' && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                        fontSize: 10, color: 'var(--accent-purple)', fontWeight: 600,
                                        background: 'rgba(168,85,247,0.12)', padding: '2px 7px', borderRadius: 8,
                                    }}>
                                        <Zap style={{ width: 10, height: 10 }} /> via n8n
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
                                    <div className="inv-detail-label">Client</div>
                                    <div className="inv-detail-value">{viewInvoice.client}</div>
                                    <div className="inv-detail-sub">{viewInvoice.email}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="inv-detail-label">Status</div>
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
                            <div className="inv-detail-row" style={{ marginTop: 16 }}>
                                <div>
                                    <div className="inv-detail-label">Issue Date</div>
                                    <div className="inv-detail-value">{viewInvoice.date}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="inv-detail-label">Due Date</div>
                                    <div className="inv-detail-value">{viewInvoice.dueDate}</div>
                                </div>
                            </div>
                            <div className="inv-items-table">
                                <div className="inv-items-header">
                                    <span>Description</span>
                                    <span>Qty</span>
                                    <span>Rate</span>
                                    <span>Total</span>
                                </div>
                                {viewInvoice.items.map((item, i) => (
                                    <div key={i} className="inv-items-row">
                                        <span>{item.desc}</span>
                                        <span>{item.qty}</span>
                                        <span>{formatCurrency(item.rate, viewInvoice.currency || defaultCurrency)}</span>
                                        <span>{formatCurrency(item.qty * item.rate, viewInvoice.currency || defaultCurrency)}</span>
                                    </div>
                                ))}
                                <div className="inv-items-total">
                                    <span>Total</span>
                                    <span>{formatCurrency(viewInvoice.amount, viewInvoice.currency || defaultCurrency)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" style={{ color: 'var(--accent-rose)' }} onClick={(e) => handleDelete(viewInvoice, e)}>
                                <Trash2 style={{ width: 16, height: 16 }} />
                                Delete
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost" onClick={() => setViewInvoice(null)}>
                                    <Printer style={{ width: 16, height: 16 }} />
                                    Print
                                </button>
                                <button className="btn btn-primary" onClick={() => handleStatusChange(viewInvoice, 'sent')}>
                                    <Send style={{ width: 16, height: 16 }} />
                                    Send Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">New Invoice</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X />
                            </button>
                        </div>
                        <form className="modal-form" onSubmit={handleCreate}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Client Name</label>
                                    <input
                                        type="text"
                                        placeholder="Company name"
                                        value={newInvoice.client}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, client: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Client Email</label>
                                    <input
                                        type="email"
                                        placeholder="billing@company.com"
                                        value={newInvoice.email}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        value={newInvoice.dueDate}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Currency</label>
                                    <select
                                        value={newInvoice.currency}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="TRY">TRY (₺)</option>
                                        <option value="SEK">SEK (kr)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Line Items</label>
                                <div className="inv-line-items">
                                    {newInvoice.items.map((item, i) => (
                                        <div key={i} className="inv-line-item">
                                            <input
                                                type="text"
                                                placeholder="Description"
                                                value={item.desc}
                                                onChange={(e) => updateItem(i, 'desc', e.target.value)}
                                                required
                                                style={{ flex: 2 }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.qty}
                                                onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 0)}
                                                min="1"
                                                required
                                                style={{ width: 70 }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Rate"
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
                                        <Plus /> Add Line Item
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 0', borderTop: '1px solid var(--border-color)', marginTop: 4,
                            }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total</span>
                                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>
                                    {formatCurrency(newInvoice.items.reduce((s, i) => s + (i.qty * i.rate), 0), newInvoice.currency)}
                                </span>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Creating...' : 'Create Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
