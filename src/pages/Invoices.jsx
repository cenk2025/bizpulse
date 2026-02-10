import { useState } from 'react'
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
} from 'lucide-react'

const sampleInvoices = [
    { id: 'INV-001', client: 'Acme Corp', email: 'billing@acme.com', date: '2026-02-10', dueDate: '2026-03-10', amount: 8500, status: 'paid', items: [{ desc: 'Website Redesign', qty: 1, rate: 8500 }] },
    { id: 'INV-002', client: 'Beta Industries', email: 'finance@beta.io', date: '2026-02-08', dueDate: '2026-03-08', amount: 4200, status: 'paid', items: [{ desc: 'Consulting — 14h', qty: 14, rate: 300 }] },
    { id: 'INV-003', client: 'Sunrise Bakery', email: 'hello@sunrise.com', date: '2026-02-06', dueDate: '2026-03-06', amount: 2100, status: 'pending', items: [{ desc: 'Logo Design', qty: 1, rate: 2100 }] },
    { id: 'INV-004', client: 'Delta Co', email: 'ap@deltaco.com', date: '2026-02-04', dueDate: '2026-03-04', amount: 6750, status: 'sent', items: [{ desc: 'Marketing Campaign', qty: 1, rate: 6750 }] },
    { id: 'INV-005', client: 'Omega Ltd', email: 'pay@omega.co', date: '2026-01-28', dueDate: '2026-02-28', amount: 12000, status: 'overdue', items: [{ desc: 'Enterprise Package', qty: 1, rate: 12000 }] },
    { id: 'INV-006', client: 'Tech Solutions Inc', email: 'accounts@techsol.com', date: '2026-01-20', dueDate: '2026-02-20', amount: 3400, status: 'paid', items: [{ desc: 'Analytics Dashboard', qty: 1, rate: 3400 }] },
    { id: 'INV-007', client: 'NovaCraft', email: 'finance@novacraft.io', date: '2026-01-15', dueDate: '2026-02-15', amount: 5200, status: 'paid', items: [{ desc: 'UI/UX Audit', qty: 1, rate: 2200 }, { desc: 'Prototype Build', qty: 1, rate: 3000 }] },
    { id: 'INV-008', client: 'Greenleaf Studios', email: 'billing@greenleaf.co', date: '2026-01-10', dueDate: '2026-02-10', amount: 1800, status: 'overdue', items: [{ desc: 'Brand Guidelines', qty: 1, rate: 1800 }] },
]

const statusConfig = {
    paid: { label: 'Paid', icon: CheckCircle2, color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
    pending: { label: 'Pending', icon: Clock, color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    sent: { label: 'Sent', icon: Send, color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
    overdue: { label: 'Overdue', icon: XCircle, color: 'var(--accent-rose)', bg: 'var(--accent-rose-dim)' },
    draft: { label: 'Draft', icon: FileText, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
}

function formatCurrency(num) {
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState(sampleInvoices)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [viewInvoice, setViewInvoice] = useState(null)
    const [newInvoice, setNewInvoice] = useState({
        client: '', email: '', dueDate: '',
        items: [{ desc: '', qty: 1, rate: 0 }],
    })

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

    function handleCreate(e) {
        e.preventDefault()
        const total = newInvoice.items.reduce((s, i) => s + (i.qty * i.rate), 0)
        const inv = {
            id: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
            client: newInvoice.client,
            email: newInvoice.email,
            date: new Date().toISOString().split('T')[0],
            dueDate: newInvoice.dueDate,
            amount: total,
            status: 'draft',
            items: newInvoice.items,
        }
        setInvoices([inv, ...invoices])
        setNewInvoice({ client: '', email: '', dueDate: '', items: [{ desc: '', qty: 1, rate: 0 }] })
        setShowModal(false)
    }

    return (
        <>
            <div className="invoices-page">
                {/* Stats row */}
                <div className="inv-stats-row">
                    <div className="inv-stat">
                        <span className="inv-stat-label">Total Invoiced</span>
                        <span className="inv-stat-value">{formatCurrency(stats.total)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Paid</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-green)' }}>{formatCurrency(stats.paid)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Pending</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-amber)' }}>{formatCurrency(stats.pending)}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Overdue</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-rose)' }}>{formatCurrency(stats.overdue)}</span>
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
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inv) => {
                                const sc = statusConfig[inv.status]
                                const StatusIcon = sc.icon
                                return (
                                    <tr key={inv.id} onClick={() => setViewInvoice(inv)}>
                                        <td className="inv-id">{inv.id}</td>
                                        <td>
                                            <div className="inv-client-cell">
                                                <span className="inv-client-name">{inv.client}</span>
                                                <span className="inv-client-email">{inv.email}</span>
                                            </div>
                                        </td>
                                        <td className="inv-date">{new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                        <td className="inv-date">{new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                        <td className="inv-amount">{formatCurrency(inv.amount)}</td>
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
                                    <td colSpan={7} className="inv-empty">No invoices found</td>
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
                            <h3 className="modal-title">{viewInvoice.id}</h3>
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
                                    <span className="inv-status-badge" style={{
                                        color: statusConfig[viewInvoice.status].color,
                                        background: statusConfig[viewInvoice.status].bg,
                                    }}>
                                        {statusConfig[viewInvoice.status].label}
                                    </span>
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
                                        <span>{formatCurrency(item.rate)}</span>
                                        <span>{formatCurrency(item.qty * item.rate)}</span>
                                    </div>
                                ))}
                                <div className="inv-items-total">
                                    <span>Total</span>
                                    <span>{formatCurrency(viewInvoice.amount)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setViewInvoice(null)}>
                                <Printer style={{ width: 16, height: 16 }} />
                                Print
                            </button>
                            <button className="btn btn-primary">
                                <Send style={{ width: 16, height: 16 }} />
                                Send Invoice
                            </button>
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
                                    {formatCurrency(newInvoice.items.reduce((s, i) => s + (i.qty * i.rate), 0))}
                                </span>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
