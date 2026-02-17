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
    { q: 'Kuinka luon uuden laskun?', a: 'Siirry sivupalkista Laskut-sivulle, klikkaa "Uusi lasku", täytä asiakkaan tiedot ja rivitiedot, ja klikkaa sitten "Luo lasku". Lasku ilmestyy luetteloon luonnoksena.' },
    { q: 'Voinko viedä taloustietoni?', a: 'Tietojen vientitoiminto on tulossa pian. Tällä hetkellä voit tarkastella kaikkia tapahtumia Hallintapaneelista ja käyttää selaimesi tulostustoimintoa raportteihin.' },
    { q: 'Kuinka lisään uuden tapaamisen?', a: 'Siirry Kalenteri-sivulle, valitse päivämäärä ja klikkaa "Lisää tapaaminen" -painiketta. Täytä aika, otsikko, asiakkaan nimi ja valinnaiset muistiinpanot.' },
    { q: 'Kuinka vaihdan salasanani?', a: 'Mene Asetukset → Turvallisuus -osioon. Syötä uusi salasanasi ja vahvista se, klikkaa sitten "Tallenna muutokset".' },
    { q: 'Voinko lisätä tiimin jäseniä?', a: 'Monen käyttäjän tiimituki on suunniteltu tulevaan julkaisuun. Tällä hetkellä jokainen tili toimii itsenäisesti omilla tiedoillaan.' },
    { q: 'Ovatko tietoni turvassa?', a: 'Kyllä. BizPulse käyttää Supabasea rivitason suojauksella (RLS), mikä tarkoittaa, että jokainen käyttäjä pääsee käsiksi vain omiin tietoihinsa. Kaikki yhteydet on salattu HTTPS:n kautta.' },
]

const guides = [
    { icon: BarChart3, title: 'Yleiskatsaus', desc: 'Seuraa tuloja, kuluja ja voittoa yhdellä silmäyksellä', color: 'var(--accent-teal)', bg: 'var(--accent-teal-dim)' },
    { icon: CalendarDays, title: 'Tapaamisten hallinta', desc: 'Aikatauluta ja järjestä yrityksesi kalenteri', color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
    { icon: FileText, title: 'Laskutuksen hallinta', desc: 'Luo, lähetä ja seuraa laskuja', color: 'var(--accent-purple)', bg: 'var(--accent-purple-dim)' },
    { icon: Users, title: 'Asiakasrekisteri', desc: 'Hallitse asiakassuhteitasi', color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    { icon: Settings, title: 'Tilin asetukset', desc: 'Määritä profiilisi ja asetuksesi', color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
    { icon: Shield, title: 'Turvallisuus & Yksityisyys', desc: 'Ymmärrä kuinka tietosi on suojattu', color: 'var(--accent-rose)', bg: 'var(--accent-rose-dim)' },
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
                <h2>Kuinka voimme auttaa?</h2>
                <p>Hae ohjeista tai selaa aiheita alta</p>
                <div className="help-search">
                    <Search className="help-search-icon" />
                    <input
                        type="text"
                        placeholder="Etsi apua..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick guides */}
            <div className="help-section fade-in-up">
                <h3 className="help-section-title">
                    <BookOpen style={{ width: 20, height: 20 }} />
                    Pikaopas
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
                    Usein kysytyt kysymykset
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
                        <p className="help-empty">Ei hakutuloksia. Kokeile toista hakusanaa.</p>
                    )}
                </div>
            </div>

            {/* Contact */}
            <div className="help-contact fade-in-up">
                <div className="help-contact-inner">
                    <Mail className="help-contact-icon" />
                    <h3>Tarvitsetko vielä apua?</h3>
                    <p>Tukitiimimme vastaa yleensä 24 tunnin kuluessa</p>
                    <a href="mailto:info@voon.fi" className="btn btn-primary">
                        <Mail style={{ width: 16, height: 16 }} />
                        Ota yhteyttä tukeen
                    </a>
                </div>
            </div>
        </div>
    )
}
