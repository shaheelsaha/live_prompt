import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock } from 'lucide-react';
import AuthSidebar from '../components/AuthSidebar';

const LoginPage = () => {
    const { loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            if (!userCred.user.emailVerified) {
                // AuthContext will automatically log them out if we used the password provider and they are unverified
                throw new Error("Please verify your email address before logging in. Check your inbox.");
            }
            navigate('/dashboard');
        } catch (err: any) {
            console.error("Login Error", err);
            if (err.message.includes('verify your email')) {
                setError(err.message);
            } else {
                setError('Failed to log in. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            await loginWithGoogle();
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Failed to log in with Google.');
        }
    };

    const handleReset = async () => {
        if (!email) {
            return setError('Please enter your email to reset your password.');
        }
        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/login`,
                handleCodeInApp: false,
            };
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            setMessage('Password reset email sent. Check your inbox.');
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to send reset email. Ensure the account exists.');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-content">
                <div className="auth-box">
                    <Link to="/" className="flex items-center gap-2 mb-4" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Sparkles style={{ color: 'var(--accent-neon)' }} size={28} />
                        <span className="logo" style={{ fontSize: '1.6rem' }}>Prompt Factory</span>
                    </Link>

                    <h1>Welcome Back</h1>
                    <p>Log in to access your saved and unlocked prompts.</p>

                    {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}
                    {message && <div className="form-success" style={{ marginBottom: 16 }}>{message}</div>}

                    <form className="contact-form" onSubmit={handleLogin} style={{ marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label"><Mail size={16} /> Email Address</label>
                            <input 
                                type="email" 
                                className="form-input" 
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <div className="flex justify-between items-center">
                                <label className="form-label"><Lock size={16} /> Password</label>
                                <button type="button" onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--accent-neon)', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    Forgot Password?
                                </button>
                            </div>
                            <input 
                                type="password" 
                                className="form-input" 
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '12px', fontSize: '1rem', marginTop: 8 }}>
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                    </form>

                    <div className="auth-separator">
                        <span>or</span>
                    </div>

                    <button className="btn btn-outline w-full" onClick={handleGoogle} style={{ padding: '12px', fontSize: '1rem' }}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: 18, height: 18 }} />
                        Continue with Google
                    </button>

                    <p className="text-center mt-6 text-muted" style={{ fontSize: '0.9rem' }}>
                        Don't have an account? <Link to="/signup" className="text-gradient" style={{ fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
                    </p>
                </div>
            </div>

            {/* Vertical Marquee Sidebar */}
            <AuthSidebar />
        </div>
    );
};

export default LoginPage;
