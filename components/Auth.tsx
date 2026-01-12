"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name }
                    }
                });
                if (error) throw error;
                setError("Please check your email for the confirmation link!");
                return;
            }
            onAuthSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-card glass-panel"
            >
                <div className="auth-header">
                    <div className="logo-icon">TS</div>
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{isLogin ? 'Sign in to access your workspace' : 'Join the TeamSync workspace'}</p>
                </div>

                <form onSubmit={handleAuth} className="form-layout auth-form">
                    {!isLogin && (
                        <div className="input-with-icon">
                            <User size={18} />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="input-with-icon">
                        <Mail size={18} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-with-icon">
                        <Lock size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="auth-error"
                            >
                                <AlertCircle size={14} /> {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button type="submit" className="primary-btn full-width auth-btn" disabled={loading}>
                        {loading ? 'Processing...' : isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Sign Up</>}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => setIsLogin(!isLogin)} className="text-link">
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </motion.div>

            <style jsx>{`
                .auth-container {
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(circle at top left, #1a1a2e, #16213e);
                }
                .auth-card {
                    width: 100%;
                    max-width: 400px;
                    padding: 40px;
                    border-radius: 24px;
                    text-align: center;
                }
                .auth-header { margin-bottom: 32px; }
                .auth-header h2 { font-size: 24px; color: white; margin: 16px 0 8px; }
                .auth-header p { color: var(--text-muted); font-size: 14px; }
                .auth-form { gap: 16px; }
                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .input-with-icon :global(svg) {
                    position: absolute;
                    left: 16px;
                    color: var(--text-muted);
                }
                .input-with-icon input {
                    padding-left: 48px !important;
                    width: 100%;
                }
                .auth-error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .auth-btn { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; }
                .auth-footer { margin-top: 24px; font-size: 14px; color: var(--text-muted); }
                .text-link { color: var(--primary); font-weight: 600; background: none; border: none; padding: 0; cursor: pointer; }
                .logo-icon { width: 48px; height: 48px; border-radius: 14px; background: var(--primary-gradient); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; margin: 0 auto; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3); }
                @media (max-width: 480px) {
                    .auth-card { padding: 32px 24px; }
                }
            `}</style>
        </div>
    );
}
