import {
    Euro,
    TrendingUp,
    TrendingDown,
    CreditCard,
    FileCheck,
    CalendarClock,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function formatCurrency(num) {
    return num.toLocaleString('fi-FI', { style: 'currency', currency: 'EUR' })
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload) return null
    return (
        <div style={{
            background: '#1a2332',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>{label}</p>
            {payload.map((item, i) => (
                <p key={i} style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>
                    {item.name}: {formatCurrency(item.value)}
                </p>
            ))}
        </div>
    )
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [kpiData, setKpiData] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        revenueTrend: 0,
        expenseTrend: 0,
        profitTrend: 0,
        invoicesPaid: 0,
        invoicesOutstanding: 0,
        upcomingAppointments: 0
    })
    const [monthlyData, setMonthlyData] = useState([])
    const [recentTransactions, setRecentTransactions] = useState([])

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch Invoices
        const { data: invoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (invoices) {
            // Process KPIs
            const paidInvoices = invoices.filter(i => i.status === 'paid')
            const revenue = paidInvoices
                .filter(i => (i.invoice_type || 'sales') === 'sales')
                .reduce((s, i) => s + parseFloat(i.amount), 0)

            const expenses = paidInvoices
                .filter(i => i.invoice_type === 'purchase')
                .reduce((s, i) => s + parseFloat(i.amount), 0)

            const profit = revenue - expenses

            // Process Monthly Data
            const currentYear = new Date().getFullYear()
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const monthlyStats = months.map((m, i) => {
                const monthInvoices = paidInvoices.filter(inv => {
                    const d = new Date(inv.date || inv.created_at)
                    return d.getMonth() === i && d.getFullYear() === currentYear
                })

                const monRev = monthInvoices
                    .filter(inv => (inv.invoice_type || 'sales') === 'sales')
                    .reduce((s, inv) => s + parseFloat(inv.amount), 0)

                const monExp = monthInvoices
                    .filter(inv => inv.invoice_type === 'purchase')
                    .reduce((s, inv) => s + parseFloat(inv.amount), 0)

                return {
                    month: m,
                    revenue: monRev,
                    expenses: monExp,
                    profit: monRev - monExp
                }
            })

            // Process Recent Transactions
            const recent = invoices.slice(0, 5).map(inv => ({
                id: inv.id,
                date: inv.date || inv.created_at,
                description: inv.invoice_type === 'purchase'
                    ? `Ostolasku: ${inv.payee_name || 'Tuntematon'}`
                    : `Myyntilasku: ${inv.client_name}`,
                status: inv.status,
                amount: parseFloat(inv.amount),
                type: (inv.invoice_type || 'sales') === 'sales' ? 'income' : 'expense'
            }))

            setKpiData(prev => ({
                ...prev,
                totalRevenue: revenue,
                totalExpenses: expenses,
                totalProfit: profit,
                invoicesPaid: paidInvoices.length,
                invoicesOutstanding: invoices.filter(i => i.status === 'pending' || i.status === 'sent').length
            }))

            setMonthlyData(monthlyStats)
            setRecentTransactions(recent)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchData()

        // Realtime
        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchData)
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [fetchData])

    if (loading) {
        return <div style={{ p: 20, color: 'var(--text-muted)' }}>Ladataan...</div>
    }
    return (
        <div className="dashboard-grid">
            {/* KPI Cards */}
            <div className="kpi-row">
                <div className="kpi-card revenue fade-in-up">
                    <div className="kpi-header">
                        <div className="kpi-icon-wrap teal">
                            <Euro />
                        </div>
                        <div className="kpi-trend up">
                            <ArrowUpRight />
                            {kpiData.revenueTrend}%
                        </div>
                    </div>
                    <div className="kpi-value">{formatCurrency(kpiData.totalRevenue)}</div>
                    <div className="kpi-label">Kokonaistulot</div>
                </div>

                <div className="kpi-card expenses fade-in-up">
                    <div className="kpi-header">
                        <div className="kpi-icon-wrap rose">
                            <CreditCard />
                        </div>
                        <div className="kpi-trend down">
                            <ArrowDownRight />
                            {kpiData.expenseTrend}%
                        </div>
                    </div>
                    <div className="kpi-value">{formatCurrency(kpiData.totalExpenses)}</div>
                    <div className="kpi-label">Kokonaiskulut</div>
                </div>

                <div className="kpi-card profit fade-in-up">
                    <div className="kpi-header">
                        <div className="kpi-icon-wrap purple">
                            <TrendingUp />
                        </div>
                        <div className="kpi-trend up">
                            <ArrowUpRight />
                            {kpiData.profitTrend}%
                        </div>
                    </div>
                    <div className="kpi-value">{formatCurrency(kpiData.totalProfit)}</div>
                    <div className="kpi-label">Nettotulos</div>
                </div>

                <div className="kpi-card invoices fade-in-up">
                    <div className="kpi-header">
                        <div className="kpi-icon-wrap amber">
                            <FileCheck />
                        </div>
                        <div className="kpi-trend up">
                            <ArrowUpRight />
                            92%
                        </div>
                    </div>
                    <div className="kpi-value">{kpiData.invoicesPaid}</div>
                    <div className="kpi-label">Maksetut laskut</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                <div className="chart-card fade-in-up">
                    <div className="chart-card-header">
                        <h3 className="chart-card-title">Tulot vs. kulut</h3>
                        <div className="chart-legend">
                            <div className="chart-legend-item">
                                <div className="chart-legend-dot" style={{ background: '#00d4aa' }}></div>
                                Tulot
                            </div>
                            <div className="chart-legend-item">
                                <div className="chart-legend-dot" style={{ background: '#f43f5e' }}></div>
                                Kulut
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(v) => `${v / 1000}k €`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                name="Tulot"
                                stroke="#00d4aa"
                                strokeWidth={2.5}
                                fill="url(#colorRevenue)"
                            />
                            <Area
                                type="monotone"
                                dataKey="expenses"
                                name="Kulut"
                                stroke="#f43f5e"
                                strokeWidth={2.5}
                                fill="url(#colorExpenses)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card fade-in-up">
                    <div className="chart-card-header">
                        <h3 className="chart-card-title">Pikatilastot</h3>
                    </div>
                    <div className="quick-stats">
                        <div className="quick-stat-item">
                            <div className="quick-stat-icon" style={{ background: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}>
                                <FileCheck />
                            </div>
                            <div className="quick-stat-info">
                                <div className="quick-stat-value">{kpiData.invoicesPaid}</div>
                                <div className="quick-stat-label">Maksetut laskut</div>
                            </div>
                        </div>
                        <div className="quick-stat-item">
                            <div className="quick-stat-icon" style={{ background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)' }}>
                                <TrendingDown />
                            </div>
                            <div className="quick-stat-info">
                                <div className="quick-stat-value">{kpiData.invoicesOutstanding}</div>
                                <div className="quick-stat-label">Avoimet laskut</div>
                            </div>
                        </div>
                        <div className="quick-stat-item">
                            <div className="quick-stat-icon" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>
                                <CalendarClock />
                            </div>
                            <div className="quick-stat-info">
                                <div className="quick-stat-value">{kpiData.upcomingAppointments}</div>
                                <div className="quick-stat-label">Tulevat tapaamiset</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profit Chart + Transactions */}
            <div className="charts-row">
                <div className="transactions-card fade-in-up">
                    <div className="transactions-header">
                        <h3 className="transactions-title">Viimeisimmät tapahtumat</h3>
                        <span className="transactions-badge">{recentTransactions.length} merkintää</span>
                    </div>
                    <div className="transaction-list">
                        {recentTransactions.map((tx) => (
                            <div key={tx.id} className="transaction-row">
                                <span className="transaction-date">
                                    {new Date(tx.date).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="transaction-desc">{tx.description}</span>
                                <span className={`transaction-status ${tx.status}`}>{tx.status}</span>
                                <span className={`transaction-amount ${tx.type}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chart-card fade-in-up">
                    <div className="chart-card-header">
                        <h3 className="chart-card-title">Kuukausittainen tulos</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(v) => `${v / 1000}k €`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="profit"
                                name="Tulos"
                                fill="url(#profitGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={28}
                            />
                            <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
