'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, AlertCircle, RefreshCw, Building, FileText, ArrowRight } from 'lucide-react';

export default function LicenciaExpiradaPage() {
    const [licenseKey, setLicenseKey] = useState('');
    const [clientName, setClientName] = useState('');
    const [nit, setNit] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [currentStatus, setCurrentStatus] = useState<any>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetch('/api/license')
            .then(res => res.json())
            .then(data => {
                setCurrentStatus(data);
                if (data.clientName) setClientName(data.clientName);
                if (data.nit) setNit(data.nit);

                // Si la licencia está activa y vigente, volver al inicio
                if (data.isLicensed && !data.isExpired && (data.status === 'ACTIVE' || data.status === 'WARNING')) {
                    window.location.replace('/');
                } else {
                    setCheckingStatus(false);
                }
            })
            .catch(() => setCheckingStatus(false));
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licenseKey.trim()) {
            setStatusMessage({ type: 'error', text: 'Por favor ingrese la clave de licencia entregada por el proveedor.' });
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        try {
            const res = await fetch('/api/license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseKey: licenseKey.trim(),
                    clientName: clientName.trim(),
                    nit: nit.trim()
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Error al validar la clave de licencia');
            }

            setStatusMessage({
                type: 'success',
                text: `¡Licencia activada con éxito para ${data.license?.client || 'el cliente'}! Válida hasta ${data.license?.expirationDate}. Redirigiendo a Korex Analytics...`
            });

            setTimeout(() => {
                window.location.replace('/');
            }, 1200);
        } catch (err: any) {
            setStatusMessage({
                type: 'error',
                text: err.message || 'La clave de licencia ingresada es inválida o ha expirado.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4">
                <div className="flex items-center gap-3 text-cyan-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                    <span>Verificando estado de licencia en Korex Analytics...</span>
                </div>
            </div>
        );
    }

    const isUnlicensed = !currentStatus?.isLicensed || currentStatus?.status === 'UNLICENSED';

    return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background glow effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-xl w-full bg-[#0d121f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 space-y-6 relative z-10 backdrop-blur-xl">
                
                {/* Header Alerta */}
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/40">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        {isUnlicensed ? 'Software No Licenciado' : 'Licencia de Software Expirada'}
                    </h1>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        {isUnlicensed
                            ? 'Este despliegue de Korex Analytics no posee una licencia activa registrada en la base de datos interna.'
                            : `El período de uso autorizado para este servidor finalizó el ${currentStatus?.expirationDate || 'la fecha indicada'}. Por favor active una clave vigente para continuar.`}
                    </p>
                </div>

                {/* Info Card de la Empresa */}
                {(clientName || nit || currentStatus?.expirationDate) && (
                    <div className="bg-[#121929] border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs">
                        <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                            Datos del Registro Actual
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            {clientName && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Building className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span className="truncate">{clientName}</span>
                                </div>
                            )}
                            {nit && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span>NIT: {nit}</span>
                                </div>
                            )}
                            {currentStatus?.expirationDate && (
                                <div className="col-span-2 flex items-center justify-between text-slate-400 border-t border-slate-800/60 pt-2 mt-1">
                                    <span>Vencimiento anterior:</span>
                                    <span className="font-mono text-rose-400">{currentStatus.expirationDate}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mensaje de Estado */}
                {statusMessage && (
                    <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                        statusMessage.type === 'success'
                            ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
                    }`}>
                        {statusMessage.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <p>{statusMessage.text}</p>
                    </div>
                )}

                {/* Formulario de Activación */}
                <form onSubmit={handleActivate} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Nueva Clave de Licencia
                        </label>
                        <div className="relative">
                            <textarea
                                value={licenseKey}
                                onChange={(e) => setLicenseKey(e.target.value)}
                                placeholder="Pegue la clave de licencia (KOR1.ey...)"
                                rows={3}
                                required
                                className="w-full bg-[#121929] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition resize-none"
                            />
                            <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                        </div>
                        <p className="text-[11px] text-slate-500">
                            La clave contiene la firma criptográfica HMAC SHA-256 autorizada para su NIT o Razón Social.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-xl transition shadow-lg shadow-cyan-900/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Verificando y Activando...</span>
                            </>
                        ) : (
                            <>
                                <span>Activar Licencia del Sistema</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Soporte */}
                <div className="text-center border-t border-slate-800/80 pt-4">
                    <p className="text-xs text-slate-500">
                        ¿Necesita renovar o adquirir una licencia? Contacte al equipo de soporte de{' '}
                        <span className="text-cyan-400 font-medium">Korex Analytics</span>.
                    </p>
                </div>
            </div>
        </div>
    );
}
