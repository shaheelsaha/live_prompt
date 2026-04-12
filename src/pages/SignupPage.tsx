import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, User } from 'lucide-react';
import AuthSidebar from '../components/AuthSidebar';

const SignupPage = () => {
    const { loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!acceptedTerms) {
            return setError('You must accept the Privacy Policy and Terms of Service.');
        }

        if (password.length < 8) {
            return setError('Password must be at least 8 characters long.');
        }

        setLoading(true);

        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCred.user, { displayName: name });
            
            await sendEmailVerification(userCred.user);
            
            // Log them out immediately until they verify
            await auth.signOut();

            setSuccess('Account created! Please check your email inbox to verify your account before logging in.');
            
            // Clear form
            setName('');
            setEmail('');
            setPassword('');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already in use. Please log in.');
            } else {
                setError('Failed to create account. Please try again.');
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
            setError('Failed to sign up with Google.');
        }
    };

    return (
        <div className="auth-page">
            {/* Sidebar Left */}
            <AuthSidebar />

            {/* Content Right */}
            <div className="auth-content">
                <div className="auth-box">
                    <Link to="/" className="flex items-center gap-2 mb-4" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Sparkles style={{ color: 'var(--accent-neon)' }} size={28} />
                        <span className="logo" style={{ fontSize: '1.6rem' }}>LivePrompt</span>
                    </Link>

                    <h1>Create Account</h1>
                    <p>Join the best AI prompt library and start unlocking premium prompts.</p>

                    {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}
                    {success && <div className="form-success" style={{ marginBottom: 16 }}>{success}</div>}

                    <button className="btn btn-outline w-full" onClick={handleGoogle} style={{ padding: '12px', fontSize: '1rem', marginBottom: 12 }}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: 18, height: 18 }} />
                        Continue with Google
                    </button>

                    <div className="auth-separator">
                        <span>or</span>
                    </div>

                    <form className="contact-form" onSubmit={handleSignup} style={{ marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label"><User size={16} /> Full Name</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="John Doe"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

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
                            <label className="form-label"><Lock size={16} /> Password</label>
                            <input 
                                type="password" 
                                className="form-input" 
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 8, marginBottom: 16 }}>
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={acceptedTerms}
                                onChange={e => setAcceptedTerms(e.target.checked)}
                                style={{ marginTop: 4 }}
                            />
                            <label htmlFor="terms" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                I agree to the <a href="/terms" className="text-gradient" style={{textDecoration: 'none'}}>Terms of Service</a> and <a href="/privacy" className="text-gradient" style={{textDecoration: 'none'}}>Privacy Policy</a>.
                            </label>
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '12px', fontSize: '1rem' }}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center mt-4 text-muted" style={{ fontSize: '0.9rem' }}>
                        Already have an account? <Link to="/login" className="text-gradient" style={{ fontWeight: 600, textDecoration: 'none' }}>Log In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
