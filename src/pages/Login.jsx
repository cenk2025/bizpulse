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
                setSuccess('Account created! Check your email for verification, or try logging in.')
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
                    <p className="login-brand-subtitle">Small Business ERP</p>
                </div>

                {/* Card */}
                <div className="login-card">
                    <div className="login-card-header">
                        <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                        <p>{isSignUp ? 'Start managing your business' : 'Sign in to your dashboard'}</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        {isSignUp && (
                            <div className="login-input-group">
                                <User className="login-input-icon" />
                                <input
                                    type="text"
                                    placeholder="Full Name"
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
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="login-input-group">
                            <Lock className="login-input-icon" />
                            <input
                                type="password"
                                placeholder="Password"
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
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                    <ArrowRight />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-switch">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setError('')
                                setSuccess('')
                            }}
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
