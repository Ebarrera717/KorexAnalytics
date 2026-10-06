'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';
import {
    Activity,
    Play,
    Database,
    Sliders,
    History,
    Shield,
    LogOut,
    Menu,
    X,
    ChevronRight
} from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // No mostrar sidebar en login ni en pantalla de licencia expirada
    const isBlankPage = pathname === '/login' || pathname === '/licencia-expirada';

    const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

    React.useEffect(() => {
        if (!isBlankPage) {
            fetch('/api/auth/me')
                .then(r => r.json())
                .then(d => {
                    if (d.authenticated && d.user) {
                        setCurrentUser({ name: d.user.name, role: d.user.role });
                    }
                })
                .catch(() => {});
        }
    }, [pathname, isBlankPage]);

    const navItems = [
        { name: 'Dashboard', href: '/', icon: Activity },
        { name: 'Ejecuciones', href: '/executions', icon: Play },
        { name: 'SQL Server', href: '/sqlserver', icon: Database },
        { name: 'Parámetros', href: '/parameters', icon: Sliders },
        { name: 'Historial', href: '/history', icon: History },
        { name: 'Seguridad / Licencia', href: '/users', icon: Shield }
    ];

    if (isBlankPage) {
        return (
            <html lang="es" suppressHydrationWarning>
                <body className="bg-slate-950 text-slate-100 antialiased font-sans" suppressHydrationWarning>
                    {children}
                </body>
            </html>
        );
    }


    return (
        <html lang="es" suppressHydrationWarning>
            <body className="bg-slate-950 text-slate-100 antialiased font-sans" suppressHydrationWarning>
                <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-sans">
                    {/* Sidebar Desktop */}
                    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 shrink-0 select-none">
                        {/* Brand Logo & Tagline */}
                        <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <Activity className="w-5 h-5 text-slate-950" />
                            </div>
                            <div>
                                <h1 className="font-extrabold text-base tracking-wider text-white">KOREX</h1>
                                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">ANALYTICS</p>
                            </div>
                        </div>

                        {/* Navigation Items */}
                        <nav className="flex-1 py-6 space-y-1.5">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                            isActive
                                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                                            <span>{item.name}</span>
                                        </div>
                                        {isActive && <ChevronRight className="w-4 h-4 text-cyan-400" />}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User Session Footer */}
                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    <Shield className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.name || 'Administrador'}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{currentUser?.role || 'SUPER_ADMIN'}</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
                                    window.location.href = '/login';
                                }}
                                title="Cerrar sesión"
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </aside>


                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-slate-950" />
                            </div>
                            <span className="font-extrabold text-sm text-white">KOREX ANALYTICS</span>
                        </div>
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="p-2 text-slate-400 hover:text-white"
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
