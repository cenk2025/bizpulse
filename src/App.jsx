import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Login from './pages/Login'
import SettingsPage from './pages/Settings'
import InvoicesPage from './pages/Invoices'
import ClientsPage from './pages/Clients'
import HelpPage from './pages/Help'

export default function App() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--bg-primary)',
                color: 'var(--text-muted)',
                fontSize: 16,
            }}>
                Loading...
            </div>
        )
    }

    // Not logged in → show Login page
    if (!session) {
        return <Login />
    }

    // Logged in → show app
    return (
        <div className="app-layout">
            <Sidebar session={session} />
            <div className="main-wrapper">
                <TopBar />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/invoices" element={<InvoicesPage />} />
                        <Route path="/clients" element={<ClientsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/help" element={<HelpPage />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

function PlaceholderPage({ title, desc }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            textAlign: 'center',
            opacity: 0.6,
        }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>
                {title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{desc}</p>
        </div>
    )
}
