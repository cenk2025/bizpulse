import { useState } from 'react'
import {
    Search,
    BookOpen,
    LifeBuoy,
    MessageCircle,
    Mail,
    ChevronDown,
    ChevronRight,
    BarChart3,
    CalendarDays,
    FileText,
    Users,
    Settings,
    Shield,
    ExternalLink,
} from 'lucide-react'

const faqs = [
    { q: 'How do I create a new invoice?', a: 'Go to the Invoices page from the sidebar, click "New Invoice", fill in the client details and line items, then click "Create Invoice". The invoice will appear in your list as a draft.' },
    { q: 'Can I export my financial data?', a: 'Data export functionality is on our roadmap. Currently, you can view all transactions on the Dashboard and use your browser\'s print function for reports.' },
    { q: 'How do I add a new appointment?', a: 'Navigate to the Calendar page, select a date, and click the "Add Appointment" button. Fill in the time, title, client name, and optional notes.' },
    { q: 'How do I change my password?', a: 'Go to Settings → Security section. Enter your new password and confirm it, then click "Save Changes".' },
    { q: 'Can I add team members?', a: 'Multi-user team support is planned for a future release. Currently, each account operates independently with its own data.' },
    { q: 'Is my data secure?', a: 'Yes. BizPulse uses Supabase with Row-Level Security (RLS), meaning each user can only access their own data. All connections are encrypted via HTTPS.' },
]

const guides = [
    { icon: BarChart3, title: 'Dashboard Overview', desc: 'Track revenue, expenses, and profit at a glance', color: 'var(--accent-teal)', bg: 'var(--accent-teal-dim)' },
    { icon: CalendarDays, title: 'Managing Appointments', desc: 'Schedule and organize your business calendar', color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
    { icon: FileText, title: 'Invoice Management', desc: 'Create, send, and track invoices', color: 'var(--accent-purple)', bg: 'var(--accent-purple-dim)' },
    { icon: Users, title: 'Client CRM', desc: 'Manage your client relationships', color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    { icon: Settings, title: 'Account Settings', desc: 'Configure your profile and preferences', color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
    { icon: Shield, title: 'Security & Privacy', desc: 'Understand how your data is protected', color: 'var(--accent-rose)', bg: 'var(--accent-rose-dim)' },
]

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [openFaq, setOpenFaq] = useState(null)

    const filteredFaqs = faqs.filter(f =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="help-page">
            {/* Hero */}
            <div className="help-hero fade-in-up">
                <LifeBuoy className="help-hero-icon" />
                <h2>How can we help?</h2>
                <p>Search our docs or browse the topics below</p>
                <div className="help-search">
                    <Search className="help-search-icon" />
                    <input
                        type="text"
                        placeholder="Search for help..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick guides */}
            <div className="help-section fade-in-up">
                <h3 className="help-section-title">
                    <BookOpen style={{ width: 20, height: 20 }} />
                    Quick Guides
                </h3>
                <div className="help-guides-grid">
                    {guides.map((g, i) => {
                        const Icon = g.icon
                        return (
                            <div key={i} className="help-guide-card">
                                <div className="help-guide-icon" style={{ background: g.bg, color: g.color }}>
                                    <Icon />
                                </div>
                                <div>
                                    <h4 className="help-guide-title">{g.title}</h4>
                                    <p className="help-guide-desc">{g.desc}</p>
                                </div>
                                <ChevronRight className="help-guide-arrow" />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* FAQ */}
            <div className="help-section fade-in-up">
                <h3 className="help-section-title">
                    <MessageCircle style={{ width: 20, height: 20 }} />
                    Frequently Asked Questions
                </h3>
                <div className="help-faq-list">
                    {filteredFaqs.map((faq, i) => (
                        <div key={i} className={`help-faq-item ${openFaq === i ? 'open' : ''}`}>
                            <button className="help-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <span>{faq.q}</span>
                                <ChevronDown className="help-faq-chevron" />
                            </button>
                            {openFaq === i && (
                                <div className="help-faq-a">{faq.a}</div>
                            )}
                        </div>
                    ))}
                    {filteredFaqs.length === 0 && (
                        <p className="help-empty">No matching questions found. Try a different search.</p>
                    )}
                </div>
            </div>

            {/* Contact */}
            <div className="help-contact fade-in-up">
                <div className="help-contact-inner">
                    <Mail className="help-contact-icon" />
                    <h3>Still need help?</h3>
                    <p>Our support team typically responds within 24 hours</p>
                    <a href="mailto:support@bizpulse.app" className="btn btn-primary">
                        <Mail style={{ width: 16, height: 16 }} />
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    )
}
