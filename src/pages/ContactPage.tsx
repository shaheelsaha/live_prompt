import React, { useState } from 'react';
import { Send, Mail, MessageSquare, User } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const ContactPage = () => {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        try {
            await addDoc(collection(db, 'contactMessages'), {
                ...form,
                createdAt: serverTimestamp(),
            });
            setStatus('sent');
            setForm({ name: '', email: '', message: '' });
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    return (
        <section className="page-section">
            <div className="container" style={{ maxWidth: 600 }}>
                <div className="text-center" style={{ marginBottom: 48 }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
                        Get in <span className="text-gradient">touch</span>
                    </h1>
                    <p className="text-muted" style={{ fontSize: '1.1rem' }}>
                        Have a question, suggestion, or want to request a custom prompt? We would love to hear from you.
                    </p>
                </div>

                <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label"><User size={14} /> Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Your name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label"><Mail size={14} /> Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label"><MessageSquare size={14} /> Message</label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Tell us what you need..."
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            required
                            rows={5}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={status === 'sending'}
                        style={{ padding: '14px' }}
                    >
                        {status === 'sending' ? 'Sending...' : <><Send size={16} /> Send Message</>}
                    </button>

                    {status === 'sent' && (
                        <p className="form-success">✅ Message sent! We will get back to you soon.</p>
                    )}
                    {status === 'error' && (
                        <p className="form-error">❌ Something went wrong. Please try again.</p>
                    )}
                </form>
            </div>
        </section>
    );
};

export default ContactPage;
