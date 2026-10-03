'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Lock, Mail, ArrowRight, AlertCircle, Shield } from 'lucide-react';

export default function AnalyticsLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('admin@korexanalytics.com');
    const [password, setPassword] = useState('Admin2026!*');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || 'Credenciales inválidas');
            } else {
                router.push('/analytics');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 antialiased">
            <div className="max-w-md w-full space-y-6">
                {/* Brand Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-cyan-400 items-center justify-center shadow-xl shadow-cyan-500/20">
                        <Activity className="w-7 h-7 text-slate-950" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wider text-white">KOREX ANALYTICS</h1>
                        <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mt-0.5">PLATAFORMA DE OPERACIONES Y ANÁLISIS</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-5">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4 text-xs">
                        <div>
                            <label className="block text-slate-300 font-bold mb-1.5">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@korexanalytics.com"
                                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-3.5 py-2.5 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-300 font-bold mb-1.5">Contraseña</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-3.5 py-2.5 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all text-xs"
                        >
                            <span>{loading ? 'Validando...' : 'Iniciar Sesión'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Sesión Segura y Cifrado AES-256</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
