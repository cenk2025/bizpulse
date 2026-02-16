import { useLocation } from 'react-router-dom'
import { Bell, Search, Menu } from 'lucide-react'

const pageTitles = {
    '/': { title: 'Hallintapaneeli', subtitle: 'Liiketoiminnan yleiskatsaus' },
    '/calendar': { title: 'Kalenteri', subtitle: 'Ajanvaraukset ja aikataulut' },
    '/invoices': { title: 'Laskut', subtitle: 'Laskutuksen hallinta' },
    '/clients': { title: 'Asiakkaat', subtitle: 'Asiakashallinta' },
    '/settings': { title: 'Asetukset', subtitle: 'Sovelluksen asetukset' },
    '/help': { title: 'Ohjeet ja tuki', subtitle: 'Ohjedokumentaatio' },
}

export default function TopBar({ onMenuToggle }) {
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
                <button
                    className="topbar-menu-btn"
                    onClick={onMenuToggle}
                    aria-label="Toggle menu"
                >
                    <Menu />
                </button>
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
