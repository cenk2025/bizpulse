// Monthly financial data for charts
export const monthlyData = [
    { month: 'Tammi', revenue: 42000, expenses: 28000, profit: 14000 },
    { month: 'Helmi', revenue: 38500, expenses: 26500, profit: 12000 },
    { month: 'Maalis', revenue: 51000, expenses: 31000, profit: 20000 },
    { month: 'Huhti', revenue: 47500, expenses: 29500, profit: 18000 },
    { month: 'Touko', revenue: 55000, expenses: 33000, profit: 22000 },
    { month: 'Kesä', revenue: 49000, expenses: 30000, profit: 19000 },
    { month: 'Heinä', revenue: 44000, expenses: 27500, profit: 16500 },
    { month: 'Elo', revenue: 53000, expenses: 32000, profit: 21000 },
    { month: 'Syys', revenue: 58000, expenses: 34000, profit: 24000 },
    { month: 'Loka', revenue: 61000, expenses: 35500, profit: 25500 },
    { month: 'Marras', revenue: 56500, expenses: 33500, profit: 23000 },
    { month: 'Joulu', revenue: 64000, expenses: 37000, profit: 27000 },
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
    { id: 1, date: '2026-02-10', description: 'Verkkosivujen uudistus — Acme Oy', type: 'income', amount: 8500, status: 'valmis' },
    { id: 2, date: '2026-02-09', description: 'Toimistotarvikkeet — Staples', type: 'expense', amount: 345, status: 'valmis' },
    { id: 3, date: '2026-02-08', description: 'Konsultointi — Beta Industries', type: 'income', amount: 4200, status: 'valmis' },
    { id: 4, date: '2026-02-07', description: 'Pilvipalvelu — AWS', type: 'expense', amount: 1280, status: 'valmis' },
    { id: 5, date: '2026-02-06', description: 'Logon suunnittelu — Sunrise Bakery', type: 'income', amount: 2100, status: 'odottaa' },
    { id: 6, date: '2026-02-05', description: 'Ohjelmistolisenssi — Figma', type: 'expense', amount: 450, status: 'valmis' },
    { id: 7, date: '2026-02-04', description: 'Markkinointikampanja — Delta Oy', type: 'income', amount: 6750, status: 'valmis' },
    { id: 8, date: '2026-02-03', description: 'Tiimilounas', type: 'expense', amount: 185, status: 'valmis' },
]

// Sample appointments
export const sampleAppointments = [
    { id: 1, date: '2026-02-10', time: '09:00', title: 'Asiakkaan perehdytys — Acme Oy', client: 'Matti Virtanen', notes: 'Ota projektiehdotus ja aikataulu mukaan' },
    { id: 2, date: '2026-02-10', time: '14:00', title: 'Tiimipalaveri', client: 'Sisäinen', notes: 'Viikottainen sprinttikatsaus' },
    { id: 3, date: '2026-02-12', time: '10:30', title: 'Suunnittelukatsaus — Sunrise Bakery', client: 'Lisa Park', notes: 'Esittele 3 logovaihtoehtoa' },
    { id: 4, date: '2026-02-14', time: '11:00', title: 'Q2 budjettisuunnittelu', client: 'Sisäinen', notes: 'Valmistele tuloennusteet' },
    { id: 5, date: '2026-02-15', time: '15:00', title: 'Myyntipuhelu — Omega Oy', client: 'Markku Chen', notes: 'Keskustele enterprise-paketin hinnoittelusta' },
    { id: 6, date: '2026-02-18', time: '09:30', title: 'Sijoittajatapaaminen', client: 'Sara Wells', notes: 'Neljännesvuosikatsaus' },
    { id: 7, date: '2026-02-20', time: '13:00', title: 'Tuotedemo', client: 'Tech Solutions Oy', notes: 'Esittele uudet analytiikkaominaisuudet' },
    { id: 8, date: '2026-02-25', time: '16:00', title: 'Sopimuskatsaus', client: 'Lakitiimi', notes: 'Tarkista Delta Oy:n uusimisehdot' },
]
