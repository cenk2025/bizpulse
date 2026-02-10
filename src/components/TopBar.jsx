import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'

const pageTitles = {
    '/': { title: 'Dashboard', subtitle: 'Business overview & financial summary' },
    '/calendar': { title: 'Calendar', subtitle: 'Appointments & schedule management' },
    '/invoices': { title: 'Invoices', subtitle: 'Manage your billing' },
    '/clients': { title: 'Clients', subtitle: 'Client relationship management' },
    '/settings': { title: 'Settings', subtitle: 'Application preferences' },
    '/help': { title: 'Help & Support', subtitle: 'Documentation & assistance' },
}

export default function TopBar() {
    const location = useLocation()
    const page = pageTitles[location.pathname] || pageTitles['/']

    const today = new Date()
    const dateStr = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h2 className="topbar-title">{page.title}</h2>
                <span className="topbar-subtitle">{page.subtitle}</span>
            </div>
            <div className="topbar-right">
                <span className="topbar-date">{dateStr}</span>
                <button className="topbar-icon-btn" aria-label="Search">
                    <Search />
                </button>
                <button className="topbar-icon-btn" aria-label="Notifications">
                    <Bell />
                </button>
            </div>
        </header>
    )
}
