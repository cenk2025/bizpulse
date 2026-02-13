import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    Plus,
    Search,
    Mail,
    Phone,
    MapPin,
    Building2,
    MoreHorizontal,
    X,
    FileText,
    DollarSign,
    CalendarDays,
    Star,
    Edit3,
    Trash2,
    Wifi,
    WifiOff,
} from 'lucide-react'

const currencySymbols = {
    USD: '$', EUR: '€', GBP: '£', TRY: '₺', SEK: 'kr',
}
const currencyLocales = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', TRY: 'tr-TR', SEK: 'sv-SE',
}

function formatCurrency(n, currency = 'USD') {
    const symbol = currencySymbols[currency] || currency
    const locale = currencyLocales[currency] || 'en-US'
    if (currency === 'SEK') return n.toLocaleString(locale, { minimumFractionDigits: 0 }) + ' ' + symbol
    return symbol + n.toLocaleString(locale, { minimumFractionDigits: 0 })
}

function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = [
    'var(--gradient-teal)', 'var(--gradient-purple)', 'var(--gradient-rose)',
    'linear-gradient(135deg, var(--accent-amber), #f59e0b)',
    'linear-gradient(135deg, var(--accent-blue), #6366f1)',
]

export default function ClientsPage() {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [viewClient, setViewClient] = useState(null)
    const [saving, setSaving] = useState(false)
    const [defaultCurrency, setDefaultCurrency] = useState('USD')
    const [realtimeConnected, setRealtimeConnected] = useState(false)
    const [newClient, setNewClient] = useState({
        name: '', email: '', phone: '', company: '', location: '', notes: '',
    })

    const loadClients = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Also load invoice count per client
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setClients(data.map(c => ({
                ...c,
                totalSpent: parseFloat(c.total_spent || 0),
                lastActivity: c.updated_at ? new Date(c.updated_at).toISOString().split('T')[0] : '',
            })))
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('currency')
                    .eq('id', user.id)
                    .single()
                if (data?.currency) setDefaultCurrency(data.currency)
            }
            await loadClients()
        }
        init()
    }, [loadClients])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('clients-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'clients',
            }, () => {
                loadClients()
            })
            .subscribe((status) => {
                setRealtimeConnected(status === 'SUBSCRIBED')
            })

        return () => { supabase.removeChannel(channel) }
    }, [loadClients])

    const filtered = clients.filter(c => {
        const q = searchQuery.toLowerCase()
        const matchesSearch = c.name.toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.company || '').toLowerCase().includes(q)
        const matchesFilter = filterStatus === 'all' ||
            (filterStatus === 'starred' ? c.starred : c.status === filterStatus)
        return matchesSearch && matchesFilter
    })

    const stats = {
        total: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        inactive: clients.filter(c => c.status === 'inactive').length,
        totalRevenue: clients.reduce((s, c) => s + c.totalSpent, 0),
    }

    async function toggleStar(id, e) {
        e.stopPropagation()
        const client = clients.find(c => c.id === id)
        if (!client) return
        await supabase.from('clients').update({ starred: !client.starred }).eq('id', id)
        setClients(clients.map(c => c.id === id ? { ...c, starred: !c.starred } : c))
    }

    async function handleCreate(e) {
        e.preventDefault()
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase.from('clients').insert({
                user_id: user.id,
                name: newClient.name,
                email: newClient.email,
                phone: newClient.phone,
                company: newClient.company,
                location: newClient.location,
                notes: newClient.notes,
                status: 'active',
            })

            if (error) throw error

            setNewClient({ name: '', email: '', phone: '', company: '', location: '', notes: '' })
            setShowModal(false)
            await loadClients()
        } catch (err) {
            console.error('Failed to create client:', err)
            alert('Failed to create client.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(client) {
        if (!confirm(`Delete client "${client.name}"?`)) return
        await supabase.from('clients').delete().eq('id', client.id)
        setViewClient(null)
        await loadClients()
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '50vh', color: 'var(--text-muted)', fontSize: 15,
            }}>
                Loading clients...
            </div>
        )
    }

    return (
        <>
            <div className="clients-page">
                {/* Stats */}
                <div className="cl-stats-row">
                    <div className="inv-stat">
                        <span className="inv-stat-label">Total Clients</span>
                        <span className="inv-stat-value">{stats.total}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Active</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-green)' }}>{stats.active}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Inactive</span>
                        <span className="inv-stat-value" style={{ color: 'var(--text-muted)' }}>{stats.inactive}</span>
                    </div>
                    <div className="inv-stat">
                        <span className="inv-stat-label">Total Revenue</span>
                        <span className="inv-stat-value" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(stats.totalRevenue, defaultCurrency)}</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="inv-toolbar">
                    <div className="inv-search">
                        <Search className="inv-search-icon" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="inv-filters">
                        <div className="inv-filter-group">
                            {['all', 'active', 'inactive', 'starred'].map(s => (
                                <button
                                    key={s}
                                    className={`inv-filter-btn ${filterStatus === s ? 'active' : ''}`}
                                    onClick={() => setFilterStatus(s)}
                                >
                                    {s === 'all' ? 'All' : s === 'starred' ? '★ Starred' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus style={{ width: 18, height: 18 }} />
                            Add Client
                        </button>
                    </div>
                </div>

                {/* Client cards grid */}
                <div className="cl-grid">
                    {filtered.map((client, i) => (
                        <div key={client.id} className="cl-card" onClick={() => setViewClient(client)}>
                            <div className="cl-card-top">
                                <div className="cl-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>
                                    {getInitials(client.name)}
                                </div>
                                <button
                                    className={`cl-star ${client.starred ? 'active' : ''}`}
                                    onClick={(e) => toggleStar(client.id, e)}
                                >
                                    <Star />
                                </button>
                            </div>
                            <h4 className="cl-name">{client.name}</h4>
                            <p className="cl-company">{client.company || '—'}</p>
                            <div className="cl-meta">
                                <span><Mail style={{ width: 14, height: 14 }} /> {client.email || '—'}</span>
                                <span><MapPin style={{ width: 14, height: 14 }} /> {client.location || '—'}</span>
                            </div>
                            <div className="cl-card-footer">
                                <div className="cl-card-stat">
                                    <span className="cl-card-stat-value">{formatCurrency(client.totalSpent, defaultCurrency)}</span>
                                    <span className="cl-card-stat-label">Revenue</span>
                                </div>
                                <div className="cl-card-stat">
                                    <span className="cl-card-stat-value">—</span>
                                    <span className="cl-card-stat-label">Invoices</span>
                                </div>
                                <span className={`cl-status-dot ${client.status}`}>{client.status}</span>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="cl-empty">
                            {clients.length === 0 ? 'No clients yet. Add one manually or via n8n!' : 'No clients found'}
                        </div>
                    )}
                </div>
            </div>

            {/* View Client Modal */}
            {viewClient && (
                <div className="modal-overlay" onClick={() => setViewClient(null)}>
                    <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Client Details</h3>
                            <button className="modal-close" onClick={() => setViewClient(null)}><X /></button>
                        </div>
                        <div className="cl-detail">
                            <div className="cl-detail-top">
                                <div className="cl-avatar cl-avatar-lg" style={{ background: avatarColors[viewClient.id?.charCodeAt?.(0) % avatarColors.length || 0] }}>
                                    {getInitials(viewClient.name)}
                                </div>
                                <div>
                                    <h3 className="cl-detail-name">{viewClient.name}</h3>
                                    <p className="cl-detail-company">{viewClient.company || '—'}</p>
                                    <span className={`cl-status-dot ${viewClient.status}`}>{viewClient.status}</span>
                                </div>
                            </div>

                            <div className="cl-detail-info">
                                <div className="cl-detail-info-item">
                                    <Mail style={{ width: 16, height: 16 }} />
                                    <span>{viewClient.email || '—'}</span>
                                </div>
                                <div className="cl-detail-info-item">
                                    <Phone style={{ width: 16, height: 16 }} />
                                    <span>{viewClient.phone || '—'}</span>
                                </div>
                                <div className="cl-detail-info-item">
                                    <MapPin style={{ width: 16, height: 16 }} />
                                    <span>{viewClient.location || '—'}</span>
                                </div>
                            </div>

                            <div className="cl-detail-stats">
                                <div className="cl-detail-stat-box">
                                    <DollarSign style={{ width: 18, height: 18, color: 'var(--accent-teal)' }} />
                                    <div>
                                        <div className="cl-detail-stat-value">{formatCurrency(viewClient.totalSpent, defaultCurrency)}</div>
                                        <div className="cl-detail-stat-label">Total Revenue</div>
                                    </div>
                                </div>
                                <div className="cl-detail-stat-box">
                                    <CalendarDays style={{ width: 18, height: 18, color: 'var(--accent-purple)' }} />
                                    <div>
                                        <div className="cl-detail-stat-value">{viewClient.lastActivity || '—'}</div>
                                        <div className="cl-detail-stat-label">Last Activity</div>
                                    </div>
                                </div>
                            </div>

                            {viewClient.notes && (
                                <div className="cl-detail-notes">
                                    <div className="cl-detail-notes-label">Notes</div>
                                    <p>{viewClient.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" style={{ color: 'var(--accent-rose)' }} onClick={() => handleDelete(viewClient)}>
                                <Trash2 style={{ width: 16, height: 16 }} /> Delete
                            </button>
                            <button className="btn btn-ghost" onClick={() => setViewClient(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Client Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Client</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X /></button>
                        </div>
                        <form className="modal-form" onSubmit={handleCreate}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Contact Name</label>
                                    <input type="text" placeholder="John Smith" value={newClient.name}
                                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Company</label>
                                    <input type="text" placeholder="Acme Corp" value={newClient.company}
                                        onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" placeholder="john@acme.com" value={newClient.email}
                                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="tel" placeholder="+1 555-0101" value={newClient.phone}
                                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input type="text" placeholder="New York, NY" value={newClient.location}
                                    onChange={(e) => setNewClient({ ...newClient, location: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea rows="3" placeholder="Additional notes..." value={newClient.notes}
                                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Adding...' : 'Add Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
