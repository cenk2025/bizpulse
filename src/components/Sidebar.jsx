import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
    LayoutDashboard,
    CalendarDays,
    FileText,
    Users,
    Settings,
    HelpCircle,
    LogOut,
} from 'lucide-react'

export default function Sidebar({ session }) {
    const user = session?.user
    const email = user?.email || ''
    const fullName = user?.user_metadata?.full_name || email.split('@')[0]
    const initials = fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    async function handleLogout() {
        await supabase.auth.signOut()
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-logo">
                    <div className="sidebar-brand-icon">B</div>
                    <div className="sidebar-brand-text">
                        <h1>BizPulse</h1>
                        <span>Small Business ERP</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Main</div>
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink
                    to="/calendar"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <CalendarDays />
                    <span>Calendar</span>
                </NavLink>

                <div className="sidebar-section-label" style={{ marginTop: 16 }}>Management</div>
                <NavLink
                    to="/invoices"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <FileText />
                    <span>Invoices</span>
                </NavLink>
                <NavLink
                    to="/clients"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <Users />
                    <span>Clients</span>
                </NavLink>

                <div className="sidebar-section-label" style={{ marginTop: 16 }}>System</div>
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <Settings />
                    <span>Settings</span>
                </NavLink>
                <NavLink
                    to="/help"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <HelpCircle />
                    <span>Help & Support</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{fullName}</div>
                        <div className="sidebar-user-role">{email}</div>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={handleLogout}>
                    <LogOut />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
