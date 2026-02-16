import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
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
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

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
        <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <Sidebar session={session} onClose={() => setSidebarOpen(false)} />
            <div className="main-wrapper">
                <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
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
