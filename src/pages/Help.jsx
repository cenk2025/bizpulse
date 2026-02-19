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
    X,
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
    {
        icon: BarChart3,
        title: 'Yleiskatsaus',
        desc: 'Seuraa tuloja, kuluja ja voittoa yhdellä silmäyksellä',
        color: 'var(--accent-teal)',
        bg: 'var(--accent-teal-dim)',
        content: (
            <>
                <p><strong>Hallintapaneeli (Dashboard)</strong> on BizPulsen aloitusnäkymä, joka antaa nopean katsauksen yrityksesi taloudelliseen tilaan.</p>
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Keskeiset mittarit (KPI)</h3>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li><strong>Kokonaistulot:</strong> Kaikki "Maksettu"-tilassa olevat myyntilaskut.</li>
                    <li><strong>Kokonaiskulut:</strong> Kaikki "Maksettu"-tilassa olevat ostolaskut.</li>
                    <li><strong>Nettotulos:</strong> Tulot miinus kulut. Tämä on yrityksesi todellinen voitto.</li>
                </ul>
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Graafit</h3>
                <p>"Tulot vs. Kulut" -kaavio näyttää taloudellisen kehityksesi aikajanalla, jotta voit tunnistaa trendit helposti.</p>
            </>
        )
    },
    {
        icon: CalendarDays,
        title: 'Tapaamisten hallinta',
        desc: 'Aikatauluta ja järjestä yrityksesi kalenteri',
        color: 'var(--accent-blue)',
        bg: 'var(--accent-blue-dim)',
        content: (
            <>
                <p><strong>Kalenteri</strong> auttaa sinua pitämään kirjaa tapaamisista ja tärkeistä päivämääristä.</p>
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Ominaisuudet</h3>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li><strong>Tapaamisten lisäys:</strong> Klikkaa "Lisää tapaaminen", valitse päivä ja aika.</li>
                    <li><strong>Laskujen eräpäivät:</strong> Myynti- ja ostolaskujen eräpäivät näkyvät kalenterissa automaattisesti.</li>
                    <li><strong>Värien merkitykset:</strong> Tapaamiset näkyvät oletusvärillä, laskut erottuvat omalla tyylillään.</li>
                </ul>
            </>
        )
    },
    {
        icon: FileText,
        title: 'Laskutuksen hallinta',
        desc: 'Luo, lähetä ja seuraa laskuja',
        color: 'var(--accent-purple)',
        bg: 'var(--accent-purple-dim)',
        content: (
            <>
                <p><strong>Laskut</strong>-sivulla voit hallita sekä myynti- että ostolaskuja.</p>
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Uuden laskun luonti</h3>
                <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li>Klikkaa "Uusi lasku".</li>
                    <li>Valitse tyyppi: <strong>Myyntilasku (Vihreä)</strong> tuloille tai <strong>Ostolasku (Punainen)</strong> kuluille.</li>
                    <li>Täytä tiedot ja tallenna.</li>
                </ol>
                <p>Muista merkitä lasku tilaan <strong>"Maksettu"</strong>, kun rahaliikenne on tapahtunut, jotta se näkyy raporteissa.</p>
            </>
        )
    },
    {
        icon: Users,
        title: 'Asiakasrekisteri',
        desc: 'Hallitse asiakassuhteitasi',
        color: 'var(--accent-amber)',
        bg: 'var(--accent-amber-dim)',
        content: (
            <>
                <p><strong>Asiakkaat</strong>-osio toimii yksinkertaisena CRM-järjestelmänä.</p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li><strong>Asiakaskortti:</strong> Tallenna yhteystiedot, Y-tunnus ja osoite.</li>
                    <li><strong>Muistiinpanot:</strong> Kirjaa ylös tärkeät huomiot asiakassuhteesta.</li>
                    <li><strong>Muokkaus:</strong> Voit muokata tietoja klikkaamalla kynäikonia asiakkaan tiedoissa.</li>
                </ul>
            </>
        )
    },
    {
        icon: Settings,
        title: 'Tilin asetukset',
        desc: 'Määritä profiilisi ja asetuksesi',
        color: 'var(--accent-green)',
        bg: 'var(--accent-green-dim)',
        content: (
            <>
                <p><strong>Asetukset</strong>-sivulta hallinnoit tiliasi.</p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li><strong>Profiili:</strong> Päivitä nimesi ja sähköpostiosoitteesi.</li>
                    <li><strong>Salasana:</strong> Vaihda salasanasi Turvallisuus-osiosta.</li>
                    <li><strong>Yrityksen tiedot:</strong> Aseta oletusarvot (kuten ALV-kanta) tulevia laskuja varten (tulossa pian).</li>
                </ul>
            </>
        )
    },
    {
        icon: Shield,
        title: 'Turvallisuus & Yksityisyys',
        desc: 'Ymmärrä kuinka tietosi on suojattu',
        color: 'var(--accent-rose)',
        bg: 'var(--accent-rose-dim)',
        content: (
            <>
                <p>BizPulse on suunniteltu turvallisuus edellä.</p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li><strong>Tietojen eristys:</strong> Käytämme Supabase RLS (Row Level Security) -teknologiaa. Tämä takaa, että kukaan muu käyttäjä ei pääse käsiksi sinun tietoihisi.</li>
                    <li><strong>Salaus:</strong> Kaikki tietoliikenne on salattu SSL/HTTPS-yhteydellä.</li>
                    <li><strong>Varmuuskopiot:</strong> Tietokanta varmuuskopioidaan säännöllisesti automaattisesti.</li>
                </ul>
            </>
        )
    },
]

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [openFaq, setOpenFaq] = useState(null)
    const [selectedGuide, setSelectedGuide] = useState(null)

    const filteredFaqs = faqs.filter(f =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredGuides = guides.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.desc.toLowerCase().includes(searchQuery.toLowerCase())
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
                    {filteredGuides.map((g, i) => {
                        const Icon = g.icon
                        return (
                            <div
                                key={i}
                                className="help-guide-card"
                                onClick={() => setSelectedGuide(g)}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}
                            >
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
                {filteredGuides.length === 0 && (
                    <p className="help-empty" style={{ textAlign: 'center', marginTop: 20 }}>Ei oppaita hakusanalla.</p>
                )}
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

            {/* Guide Modal */}
            {selectedGuide && (
                <div className="modal-overlay" onClick={() => setSelectedGuide(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <selectedGuide.icon style={{ width: 24, height: 24, color: selectedGuide.color }} />
                                {selectedGuide.title}
                            </h3>
                            <button className="modal-close" onClick={() => setSelectedGuide(null)}>
                                <X />
                            </button>
                        </div>
                        <div className="modal-content" style={{ padding: 20, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                            {selectedGuide.content}
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={() => setSelectedGuide(null)}>
                                Sulje
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
