// Monthly financial data for charts
export const monthlyData = [
    { month: 'Jan', revenue: 42000, expenses: 28000, profit: 14000 },
    { month: 'Feb', revenue: 38500, expenses: 26500, profit: 12000 },
    { month: 'Mar', revenue: 51000, expenses: 31000, profit: 20000 },
    { month: 'Apr', revenue: 47500, expenses: 29500, profit: 18000 },
    { month: 'May', revenue: 55000, expenses: 33000, profit: 22000 },
    { month: 'Jun', revenue: 49000, expenses: 30000, profit: 19000 },
    { month: 'Jul', revenue: 44000, expenses: 27500, profit: 16500 },
    { month: 'Aug', revenue: 53000, expenses: 32000, profit: 21000 },
    { month: 'Sep', revenue: 58000, expenses: 34000, profit: 24000 },
    { month: 'Oct', revenue: 61000, expenses: 35500, profit: 25500 },
    { month: 'Nov', revenue: 56500, expenses: 33500, profit: 23000 },
    { month: 'Dec', revenue: 64000, expenses: 37000, profit: 27000 },
]

// KPI summary data
export const kpiData = {
    totalRevenue: 619500,
    totalExpenses: 377500,
    totalProfit: 242000,
    revenueTrend: 12.4,
    expenseTrend: 5.2,
    profitTrend: 18.6,
    invoicesPaid: 147,
    invoicesOutstanding: 12,
    upcomingAppointments: 8,
}

// Recent transactions
export const recentTransactions = [
    { id: 1, date: '2026-02-10', description: 'Website Redesign — Acme Corp', type: 'income', amount: 8500, status: 'completed' },
    { id: 2, date: '2026-02-09', description: 'Office Supplies — Staples', type: 'expense', amount: 345, status: 'completed' },
    { id: 3, date: '2026-02-08', description: 'Consulting — Beta Industries', type: 'income', amount: 4200, status: 'completed' },
    { id: 4, date: '2026-02-07', description: 'Cloud Hosting — AWS', type: 'expense', amount: 1280, status: 'completed' },
    { id: 5, date: '2026-02-06', description: 'Logo Design — Sunrise Bakery', type: 'income', amount: 2100, status: 'pending' },
    { id: 6, date: '2026-02-05', description: 'Software License — Figma', type: 'expense', amount: 450, status: 'completed' },
    { id: 7, date: '2026-02-04', description: 'Marketing Campaign — Delta Co', type: 'income', amount: 6750, status: 'completed' },
    { id: 8, date: '2026-02-03', description: 'Team Lunch', type: 'expense', amount: 185, status: 'completed' },
]

// Sample appointments
export const sampleAppointments = [
    { id: 1, date: '2026-02-10', time: '09:00', title: 'Client Onboarding — Acme Corp', client: 'John Smith', notes: 'Bring project proposal and timeline' },
    { id: 2, date: '2026-02-10', time: '14:00', title: 'Team Standup', client: 'Internal', notes: 'Weekly sprint review' },
    { id: 3, date: '2026-02-12', time: '10:30', title: 'Design Review — Sunrise Bakery', client: 'Lisa Park', notes: 'Present 3 logo options' },
    { id: 4, date: '2026-02-14', time: '11:00', title: 'Budget Planning Q2', client: 'Internal', notes: 'Prepare revenue forecasts' },
    { id: 5, date: '2026-02-15', time: '15:00', title: 'Sales Call — Omega Ltd', client: 'Mark Chen', notes: 'Discuss enterprise package pricing' },
    { id: 6, date: '2026-02-18', time: '09:30', title: 'Investor Meeting', client: 'Sarah Wells', notes: 'Quarterly performance review' },
    { id: 7, date: '2026-02-20', time: '13:00', title: 'Product Demo', client: 'Tech Solutions Inc', notes: 'Demo new analytics features' },
    { id: 8, date: '2026-02-25', time: '16:00', title: 'Contract Review', client: 'Legal Team', notes: 'Review Delta Co renewal terms' },
]
