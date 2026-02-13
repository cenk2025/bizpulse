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
    Zap,
    Key,
    Copy,
    Trash2,
    Plus,
    ExternalLink,
    Eye,
    EyeOff,
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

    // API Keys state
    const [apiKeys, setApiKeys] = useState([])
    const [newKeyLabel, setNewKeyLabel] = useState('')
    const [generatingKey, setGeneratingKey] = useState(false)
    const [newlyCreatedKey, setNewlyCreatedKey] = useState(null)
    const [showKey, setShowKey] = useState(false)
    const [copied, setCopied] = useState('')

    useEffect(() => {
        loadProfile()
        loadApiKeys()
    }, [])

    async function loadProfile() {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setProfile({
                fullName: user.user_metadata?.full_name || user.email.split('@')[0],
                email: user.email,
                role: 'Admin',
            })
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
                setCompany({
                    name: data.company_name || '',
                    industry: data.industry || '',
                    currency: data.currency || 'USD',
                    timezone: data.timezone || 'UTC',
                })
                setPrefs({
                    emailNotifications: data.email_notifications ?? true,
                    weeklyReport: data.weekly_report ?? true,
                    darkMode: data.dark_mode ?? true,
                })
            }
        }
    }

    async function loadApiKeys() {
        const { data, error } = await supabase
            .from('api_keys')
            .select('id, key_prefix, label, permissions, is_active, last_used_at, created_at')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setApiKeys(data)
        }
    }

    async function handleGenerateKey() {
        if (!newKeyLabel.trim()) return
        setGeneratingKey(true)
        try {
            const { data, error } = await supabase.rpc('generate_api_key', {
                p_label: newKeyLabel.trim(),
            })
            if (error) throw error
            if (data?.success) {
                setNewlyCreatedKey(data.api_key)
                setShowKey(true)
                setNewKeyLabel('')
                await loadApiKeys()
            }
        } catch (err) {
            console.error('Failed to generate API key:', err)
            alert('Failed to generate API key. Make sure the database migration has been run.')
        } finally {
            setGeneratingKey(false)
        }
    }

    async function handleRevokeKey(keyId) {
        if (!confirm('Revoke this API key? Any n8n workflows using it will stop working.')) return
        try {
            const { error } = await supabase.rpc('revoke_api_key', { p_key_id: keyId })
            if (error) throw error
            await loadApiKeys()
        } catch (err) {
            console.error('Failed to revoke key:', err)
        }
    }

    function copyToClipboard(text, label) {
        navigator.clipboard.writeText(text)
        setCopied(label)
        setTimeout(() => setCopied(''), 2000)
    }

    const supabaseUrl = 'https://psjmhocozywyhyypurok.supabase.co'
    const webhookUrl = `${supabaseUrl}/rest/v1/rpc/api_create_invoice`

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
                        industry: company.industry,
                        currency: company.currency,
                        timezone: company.timezone,
                        email_notifications: prefs.emailNotifications,
                        weekly_report: prefs.weeklyReport,
                        dark_mode: prefs.darkMode,
                        updated_at: new Date().toISOString(),
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

            {/* API & Integrations Section */}
            <div className="settings-section fade-in-up">
                <div className="settings-section-header">
                    <div className="settings-section-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                        <Zap />
                    </div>
                    <div>
                        <h3 className="settings-section-title">API & Integrations</h3>
                        <p className="settings-section-desc">Connect n8n and external services</p>
                    </div>
                </div>

                {/* Webhook URLs */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        n8n Endpoint URLs
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                            { label: 'Create Invoice', url: `${supabaseUrl}/rest/v1/rpc/api_create_invoice` },
                            { label: 'List Invoices', url: `${supabaseUrl}/rest/v1/rpc/api_list_invoices` },
                            { label: 'Update Status', url: `${supabaseUrl}/rest/v1/rpc/api_update_invoice_status` },
                            { label: 'Create Client', url: `${supabaseUrl}/rest/v1/rpc/api_create_client` },
                            { label: 'List Clients', url: `${supabaseUrl}/rest/v1/rpc/api_list_clients` },
                            { label: 'Webhook', url: `${supabaseUrl}/rest/v1/rpc/api_webhook` },
                        ].map(ep => (
                            <div key={ep.label} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'var(--bg-primary)', borderRadius: 8, padding: '8px 12px',
                                border: '1px solid var(--border-color)',
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-purple)', minWidth: 100 }}>
                                    {ep.label}
                                </span>
                                <code style={{
                                    flex: 1, fontSize: 11, color: 'var(--text-muted)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {ep.url}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(ep.url, ep.label)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: copied === ep.label ? 'var(--accent-green)' : 'var(--text-muted)',
                                        padding: 4, display: 'flex',
                                    }}
                                >
                                    {copied === ep.label ? <CheckCircle style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                                </button>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                        Use POST method with <code style={{ color: 'var(--accent-teal)' }}>Content-Type: application/json</code> and
                        {' '}<code style={{ color: 'var(--accent-teal)' }}>apikey: {'<your-supabase-anon-key>'}</code> header.
                        Pass your API key as <code style={{ color: 'var(--accent-teal)' }}>p_api_key</code> in the request body.
                    </p>
                </div>

                {/* Generate New Key */}
                <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        API Keys
                    </h4>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                            type="text"
                            placeholder="Key label (e.g. n8n-production)"
                            value={newKeyLabel}
                            onChange={(e) => setNewKeyLabel(e.target.value)}
                            style={{
                                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                color: 'var(--text-heading)',
                            }}
                        />
                        <button
                            onClick={handleGenerateKey}
                            disabled={generatingKey || !newKeyLabel.trim()}
                            className="btn btn-primary"
                            style={{ fontSize: 13, padding: '8px 16px' }}
                        >
                            {generatingKey ? <Loader2 className="spin" style={{ width: 14, height: 14 }} /> : <Key style={{ width: 14, height: 14 }} />}
                            Generate Key
                        </button>
                    </div>

                    {/* Newly created key banner */}
                    {newlyCreatedKey && (
                        <div style={{
                            background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.3)',
                            borderRadius: 10, padding: '14px 16px', marginBottom: 16,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <CheckCircle style={{ width: 14, height: 14, color: 'var(--accent-green)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)' }}>
                                    API Key Generated — Save it now!
                                </span>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'var(--bg-primary)', borderRadius: 6, padding: '8px 12px',
                            }}>
                                <code style={{
                                    flex: 1, fontSize: 12, color: 'var(--text-heading)',
                                    fontFamily: 'monospace',
                                    letterSpacing: showKey ? 0 : 2,
                                }}>
                                    {showKey ? newlyCreatedKey : '••••••••••••••••••••••••••••••••'}
                                </code>
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
                                >
                                    {showKey ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(newlyCreatedKey, 'apikey')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'apikey' ? 'var(--accent-green)' : 'var(--text-muted)', padding: 4, display: 'flex' }}
                                >
                                    {copied === 'apikey' ? <CheckCircle style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                                </button>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--accent-amber)', marginTop: 8 }}>
                                ⚠ This key will not be shown again. Copy and store it securely.
                            </p>
                        </div>
                    )}
                </div>

                {/* Active Keys List */}
                {apiKeys.length > 0 && (
                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {apiKeys.map(key => (
                                <div key={key.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <Key style={{ width: 14, height: 14, color: 'var(--accent-purple)' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
                                            {key.label}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            <code>{key.key_prefix}</code>
                                            {' · '}
                                            Created {new Date(key.created_at).toLocaleDateString()}
                                            {key.last_used_at && (
                                                <> · Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                                            )}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                                        color: key.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
                                        background: key.is_active ? 'var(--accent-green-dim)' : 'rgba(100,116,139,0.1)',
                                    }}>
                                        {key.is_active ? 'Active' : 'Revoked'}
                                    </span>
                                    <button
                                        onClick={() => handleRevokeKey(key.id)}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--accent-rose)', padding: 4, display: 'flex',
                                        }}
                                        title="Revoke key"
                                    >
                                        <Trash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {apiKeys.length === 0 && !newlyCreatedKey && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                        No API keys yet. Generate one to start using n8n integration.
                    </p>
                )}
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
