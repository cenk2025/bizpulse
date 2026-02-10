import {
    DollarSign,
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
import { monthlyData, kpiData, recentTransactions } from '../data/sampleData'

function formatCurrency(num) {
    return '$' + num.toLocaleString('en-US')
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
    return (
        <div className="dashboard-grid">
            {/* KPI Cards */}
            <div className="kpi-row">
                <div className="kpi-card revenue fade-in-up">
                    <div className="kpi-header">
                        <div className="kpi-icon-wrap teal">
                            <DollarSign />
                        </div>
                        <div className="kpi-trend up">
                            <ArrowUpRight />
                            {kpiData.revenueTrend}%
                        </div>
                    </div>
                    <div className="kpi-value">{formatCurrency(kpiData.totalRevenue)}</div>
                    <div className="kpi-label">Total Revenue</div>
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
                    <div className="kpi-label">Total Expenses</div>
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
                    <div className="kpi-label">Net Profit</div>
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
                    <div className="kpi-label">Invoices Paid</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                <div className="chart-card fade-in-up">
                    <div className="chart-card-header">
                        <h3 className="chart-card-title">Revenue vs Expenses</h3>
                        <div className="chart-legend">
                            <div className="chart-legend-item">
                                <div className="chart-legend-dot" style={{ background: '#00d4aa' }}></div>
                                Revenue
                            </div>
                            <div className="chart-legend-item">
                                <div className="chart-legend-dot" style={{ background: '#f43f5e' }}></div>
                                Expenses
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
                                tickFormatter={(v) => `$${v / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                name="Revenue"
                                stroke="#00d4aa"
                                strokeWidth={2.5}
                                fill="url(#colorRevenue)"
                            />
                            <Area
                                type="monotone"
                                dataKey="expenses"
                                name="Expenses"
                                stroke="#f43f5e"
                                strokeWidth={2.5}
                                fill="url(#colorExpenses)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card fade-in-up">
                    <div className="chart-card-header">
                        <h3 className="chart-card-title">Quick Stats</h3>
                    </div>
                    <div className="quick-stats">
                        <div className="quick-stat-item">
                            <div className="quick-stat-icon" style={{ background: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}>
                                <FileCheck />
                            </div>
                            <div className="quick-stat-info">
                                <div className="quick-stat-value">{kpiData.invoicesPaid}</div>
                                <div className="quick-stat-label">Invoices Paid</div>
                            </div>
                        </div>
                        <div className="quick-stat-item">
                            <div className="quick-stat-icon" style={{ background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)' }}>
                                <TrendingDown />
                            </div>
                            <div className="quick-stat-info">
                                <div className="quick-stat-value">{kpiData.invoicesOutstanding}</div>
                                <div className="quick-stat-label">Outstanding Invoices</div>
                            </div>
                        </div>
                        <div className="quick-stat-item">
                            <div className="quick-stat-icon" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>
                                <CalendarClock />
                            </div>
                            <div className="quick-stat-info">
                                <div className="quick-stat-value">{kpiData.upcomingAppointments}</div>
                                <div className="quick-stat-label">Upcoming Appointments</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profit Chart + Transactions */}
            <div className="charts-row">
                <div className="transactions-card fade-in-up">
                    <div className="transactions-header">
                        <h3 className="transactions-title">Recent Transactions</h3>
                        <span className="transactions-badge">{recentTransactions.length} entries</span>
                    </div>
                    <div className="transaction-list">
                        {recentTransactions.map((tx) => (
                            <div key={tx.id} className="transaction-row">
                                <span className="transaction-date">
                                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                        <h3 className="chart-card-title">Monthly Profit</h3>
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
                                tickFormatter={(v) => `$${v / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="profit"
                                name="Profit"
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
