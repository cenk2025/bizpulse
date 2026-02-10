import { useState } from 'react'
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
} from 'lucide-react'

const sampleClients = [
    { id: 1, name: 'Acme Corp', email: 'billing@acme.com', phone: '+1 555-0101', company: 'Acme Corporation', location: 'New York, NY', status: 'active', totalSpent: 28500, invoices: 6, lastActivity: '2026-02-10', notes: 'Key enterprise client', starred: true },
    { id: 2, name: 'Beta Industries', email: 'finance@beta.io', phone: '+1 555-0202', company: 'Beta Industries Ltd', location: 'San Francisco, CA', status: 'active', totalSpent: 15200, invoices: 4, lastActivity: '2026-02-08', notes: 'Monthly consulting', starred: false },
    { id: 3, name: 'Sunrise Bakery', email: 'hello@sunrise.com', phone: '+1 555-0303', company: 'Sunrise Bakery LLC', location: 'Austin, TX', status: 'active', totalSpent: 4100, invoices: 2, lastActivity: '2026-02-06', notes: 'Small business client', starred: false },
    { id: 4, name: 'Delta Co', email: 'ap@deltaco.com', phone: '+1 555-0404', company: 'Delta Company', location: 'Chicago, IL', status: 'active', totalSpent: 19750, invoices: 5, lastActivity: '2026-02-04', notes: '', starred: true },
    { id: 5, name: 'Omega Ltd', email: 'pay@omega.co', phone: '+1 555-0505', company: 'Omega Limited', location: 'London, UK', status: 'inactive', totalSpent: 12000, invoices: 1, lastActivity: '2026-01-28', notes: 'International client, overdue invoice', starred: false },
    { id: 6, name: 'Tech Solutions Inc', email: 'accounts@techsol.com', phone: '+1 555-0606', company: 'Tech Solutions', location: 'Seattle, WA', status: 'active', totalSpent: 8400, invoices: 3, lastActivity: '2026-01-20', notes: 'Analytics project', starred: false },
    { id: 7, name: 'NovaCraft', email: 'finance@novacraft.io', phone: '+1 555-0707', company: 'NovaCraft Studios', location: 'Portland, OR', status: 'active', totalSpent: 5200, invoices: 2, lastActivity: '2026-01-15', notes: 'UI/UX client', starred: true },
    { id: 8, name: 'Greenleaf Studios', email: 'billing@greenleaf.co', phone: '+1 555-0808', company: 'Greenleaf Studios', location: 'Denver, CO', status: 'inactive', totalSpent: 1800, invoices: 1, lastActivity: '2026-01-10', notes: 'Brand project pending follow-up', starred: false },
]

function formatCurrency(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 })
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
    const [clients, setClients] = useState(sampleClients)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [viewClient, setViewClient] = useState(null)
    const [newClient, setNewClient] = useState({
        name: '', email: '', phone: '', company: '', location: '', notes: '',
    })

    const filtered = clients.filter(c => {
        const q = searchQuery.toLowerCase()
        const matchesSearch = c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q)
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

    function toggleStar(id, e) {
        e.stopPropagation()
        setClients(clients.map(c => c.id === id ? { ...c, starred: !c.starred } : c))
    }

    function handleCreate(e) {
        e.preventDefault()
        const client = {
            id: clients.length + 1,
            ...newClient,
            status: 'active',
            totalSpent: 0,
            invoices: 0,
            lastActivity: new Date().toISOString().split('T')[0],
            starred: false,
        }
        setClients([client, ...clients])
        setNewClient({ name: '', email: '', phone: '', company: '', location: '', notes: '' })
        setShowModal(false)
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
                        <span className="inv-stat-value" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(stats.totalRevenue)}</span>
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
                            <p className="cl-company">{client.company}</p>
                            <div className="cl-meta">
                                <span><Mail style={{ width: 14, height: 14 }} /> {client.email}</span>
                                <span><MapPin style={{ width: 14, height: 14 }} /> {client.location}</span>
                            </div>
                            <div className="cl-card-footer">
                                <div className="cl-card-stat">
                                    <span className="cl-card-stat-value">{formatCurrency(client.totalSpent)}</span>
                                    <span className="cl-card-stat-label">Revenue</span>
                                </div>
                                <div className="cl-card-stat">
                                    <span className="cl-card-stat-value">{client.invoices}</span>
                                    <span className="cl-card-stat-label">Invoices</span>
                                </div>
                                <span className={`cl-status-dot ${client.status}`}>{client.status}</span>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="cl-empty">No clients found</div>
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
                                <div className="cl-avatar cl-avatar-lg" style={{ background: avatarColors[viewClient.id % avatarColors.length] }}>
                                    {getInitials(viewClient.name)}
                                </div>
                                <div>
                                    <h3 className="cl-detail-name">{viewClient.name}</h3>
                                    <p className="cl-detail-company">{viewClient.company}</p>
                                    <span className={`cl-status-dot ${viewClient.status}`}>{viewClient.status}</span>
                                </div>
                            </div>

                            <div className="cl-detail-info">
                                <div className="cl-detail-info-item">
                                    <Mail style={{ width: 16, height: 16 }} />
                                    <span>{viewClient.email}</span>
                                </div>
                                <div className="cl-detail-info-item">
                                    <Phone style={{ width: 16, height: 16 }} />
                                    <span>{viewClient.phone}</span>
                                </div>
                                <div className="cl-detail-info-item">
                                    <MapPin style={{ width: 16, height: 16 }} />
                                    <span>{viewClient.location}</span>
                                </div>
                            </div>

                            <div className="cl-detail-stats">
                                <div className="cl-detail-stat-box">
                                    <DollarSign style={{ width: 18, height: 18, color: 'var(--accent-teal)' }} />
                                    <div>
                                        <div className="cl-detail-stat-value">{formatCurrency(viewClient.totalSpent)}</div>
                                        <div className="cl-detail-stat-label">Total Revenue</div>
                                    </div>
                                </div>
                                <div className="cl-detail-stat-box">
                                    <FileText style={{ width: 18, height: 18, color: 'var(--accent-blue)' }} />
                                    <div>
                                        <div className="cl-detail-stat-value">{viewClient.invoices}</div>
                                        <div className="cl-detail-stat-label">Invoices</div>
                                    </div>
                                </div>
                                <div className="cl-detail-stat-box">
                                    <CalendarDays style={{ width: 18, height: 18, color: 'var(--accent-purple)' }} />
                                    <div>
                                        <div className="cl-detail-stat-value">{viewClient.lastActivity}</div>
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
                            <button className="btn btn-ghost" onClick={() => setViewClient(null)}>Close</button>
                            <button className="btn btn-primary"><Edit3 style={{ width: 16, height: 16 }} /> Edit Client</button>
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
                                <button type="submit" className="btn btn-primary">Add Client</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
