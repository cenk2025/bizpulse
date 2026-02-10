import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
    User,
    Building2,
    Palette,
    Bell,
    Shield,
    Save,
    CheckCircle,
    Loader2,
} from 'lucide-react'

export default function SettingsPage() {
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        role: 'Admin',
    })
    const [company, setCompany] = useState({
        name: '',
        industry: '',
        currency: 'USD',
        timezone: 'UTC',
    })
    const [prefs, setPrefs] = useState({
        emailNotifications: true,
        weeklyReport: true,
        darkMode: true,
    })

    useEffect(() => {
        loadProfile()
    }, [])

    async function loadProfile() {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setProfile({
                fullName: user.user_metadata?.full_name || user.email.split('@')[0],
                email: user.email,
                role: 'Admin',
            })
            // Try loading profile from DB
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            if (data) {
                setProfile((p) => ({
                    ...p,
                    fullName: data.full_name || p.fullName,
                    role: data.role || p.role,
                }))
                if (data.company_name) {
                    setCompany((c) => ({ ...c, name: data.company_name }))
                }
            }
        }
    }

    async function handleSave() {
        setLoading(true)
        setSaved(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase
                    .from('profiles')
                    .update({
                        full_name: profile.fullName,
                        company_name: company.name,
                        role: profile.role,
                    })
                    .eq('id', user.id)

                await supabase.auth.updateUser({
                    data: { full_name: profile.fullName },
                })
            }
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            console.error('Save error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="settings-page">
            {/* Profile Section */}
            <div className="settings-section fade-in-up">
                <div className="settings-section-header">
                    <div className="settings-section-icon" style={{ background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)' }}>
                        <User />
                    </div>
                    <div>
                        <h3 className="settings-section-title">Profile</h3>
                        <p className="settings-section-desc">Your personal information</p>
                    </div>
                </div>
                <div className="settings-grid">
                    <div className="settings-field">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={profile.fullName}
                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                            placeholder="Your name"
                        />
                    </div>
                    <div className="settings-field">
                        <label>Email</label>
                        <input type="email" value={profile.email} disabled />
                    </div>
                    <div className="settings-field">
                        <label>Role</label>
                        <select
                            value={profile.role}
                            onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                        >
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Viewer">Viewer</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Company Section */}
            <div className="settings-section fade-in-up">
                <div className="settings-section-header">
                    <div className="settings-section-icon" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>
                        <Building2 />
                    </div>
                    <div>
                        <h3 className="settings-section-title">Company</h3>
                        <p className="settings-section-desc">Business details</p>
                    </div>
                </div>
                <div className="settings-grid">
                    <div className="settings-field">
                        <label>Company Name</label>
                        <input
                            type="text"
                            value={company.name}
                            onChange={(e) => setCompany({ ...company, name: e.target.value })}
                            placeholder="Acme Inc."
                        />
                    </div>
                    <div className="settings-field">
                        <label>Industry</label>
                        <select
                            value={company.industry}
                            onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                        >
                            <option value="">Select industry</option>
                            <option value="technology">Technology</option>
                            <option value="consulting">Consulting</option>
                            <option value="retail">Retail</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="finance">Finance</option>
                            <option value="marketing">Marketing</option>
                            <option value="construction">Construction</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="settings-field">
                        <label>Currency</label>
                        <select
                            value={company.currency}
                            onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="TRY">TRY (₺)</option>
                            <option value="SEK">SEK (kr)</option>
                        </select>
                    </div>
                    <div className="settings-field">
                        <label>Timezone</label>
                        <select
                            value={company.timezone}
                            onChange={(e) => setCompany({ ...company, timezone: e.target.value })}
                        >
                            <option value="UTC">UTC</option>
                            <option value="Europe/Helsinki">Europe / Helsinki</option>
                            <option value="Europe/Istanbul">Europe / Istanbul</option>
                            <option value="Europe/London">Europe / London</option>
                            <option value="America/New_York">US Eastern</option>
                            <option value="America/Los_Angeles">US Pacific</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="settings-section fade-in-up">
                <div className="settings-section-header">
                    <div className="settings-section-icon" style={{ background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}>
                        <Bell />
                    </div>
                    <div>
                        <h3 className="settings-section-title">Preferences</h3>
                        <p className="settings-section-desc">Notifications & display</p>
                    </div>
                </div>
                <div className="settings-toggles">
                    <label className="settings-toggle">
                        <div className="settings-toggle-info">
                            <span className="settings-toggle-label">Email Notifications</span>
                            <span className="settings-toggle-desc">Receive updates about invoices and appointments</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs.emailNotifications}
                            onChange={(e) => setPrefs({ ...prefs, emailNotifications: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                    <label className="settings-toggle">
                        <div className="settings-toggle-info">
                            <span className="settings-toggle-label">Weekly Report</span>
                            <span className="settings-toggle-desc">Get a summary of your business each Monday</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs.weeklyReport}
                            onChange={(e) => setPrefs({ ...prefs, weeklyReport: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                    <label className="settings-toggle">
                        <div className="settings-toggle-info">
                            <span className="settings-toggle-label">Dark Mode</span>
                            <span className="settings-toggle-desc">Use dark theme throughout the application</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs.darkMode}
                            onChange={(e) => setPrefs({ ...prefs, darkMode: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Security Section */}
            <div className="settings-section fade-in-up">
                <div className="settings-section-header">
                    <div className="settings-section-icon" style={{ background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)' }}>
                        <Shield />
                    </div>
                    <div>
                        <h3 className="settings-section-title">Security</h3>
                        <p className="settings-section-desc">Account security settings</p>
                    </div>
                </div>
                <div className="settings-grid">
                    <div className="settings-field">
                        <label>New Password</label>
                        <input type="password" placeholder="Enter new password" />
                    </div>
                    <div className="settings-field">
                        <label>Confirm Password</label>
                        <input type="password" placeholder="Confirm new password" />
                    </div>
                </div>
            </div>

            {/* Save bar */}
            <div className="settings-save-bar">
                <button className="btn btn-primary settings-save-btn" onClick={handleSave} disabled={loading}>
                    {loading ? (
                        <Loader2 className="spin" />
                    ) : saved ? (
                        <>
                            <CheckCircle />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
