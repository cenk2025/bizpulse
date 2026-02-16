import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                    },
                })
                if (error) throw error
                setSuccess('Tili luotu! Tarkista sähköpostisi vahvistusta varten tai kokeile kirjautua sisään.')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            {/* Background glow effects */}
            <div className="login-glow login-glow-1"></div>
            <div className="login-glow login-glow-2"></div>

            <div className="login-container">
                {/* Branding */}
                <div className="login-brand">
                    <div className="login-brand-icon">B</div>
                    <h1 className="login-brand-title">BizPulse</h1>
                    <p className="login-brand-subtitle">Pienyritysten ERP</p>
                </div>

                {/* Card */}
                <div className="login-card">
                    <div className="login-card-header">
                        <h2>{isSignUp ? 'Luo tili' : 'Tervetuloa takaisin'}</h2>
                        <p>{isSignUp ? 'Aloita yrityksesi hallinta' : 'Kirjaudu hallintapaneeliin'}</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        {isSignUp && (
                            <div className="login-input-group">
                                <User className="login-input-icon" />
                                <input
                                    type="text"
                                    placeholder="Koko nimi"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="login-input-group">
                            <Mail className="login-input-icon" />
                            <input
                                type="email"
                                placeholder="Sähköpostiosoite"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="login-input-group">
                            <Lock className="login-input-icon" />
                            <input
                                type="password"
                                placeholder="Salasana"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        {error && <div className="login-message error">{error}</div>}
                        {success && <div className="login-message success">{success}</div>}

                        <button type="submit" className="login-submit" disabled={loading}>
                            {loading ? (
                                <Loader2 className="spin" />
                            ) : (
                                <>
                                    {isSignUp ? 'Luo tili' : 'Kirjaudu sisään'}
                                    <ArrowRight />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-switch">
                        {isSignUp ? 'Onko sinulla jo tili?' : 'Eikö sinulla ole tiliä?'}
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setError('')
                                setSuccess('')
                            }}
                        >
                            {isSignUp ? 'Kirjaudu sisään' : 'Luo tili'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
