'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, AlertCircle, RefreshCw, Building, FileText } from 'lucide-react';
import { parseJsonResponse } from '@/lib/safe-json';

export default function LicenciaExpiradaPage() {
    const [clientName, setClientName] = useState('');
    const [nit, setNit] = useState('');
    const [licenseKey, setLicenseKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [isUnlicensed, setIsUnlicensed] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetch('/api/license')
            .then(res => parseJsonResponse<any>(res, null))
            .then(data => {
                if (!data) {
                    setCheckingStatus(false);
                    return;
                }
                if (data.clientName) setClientName(data.clientName);
                if (data.nit) setNit(data.nit);

                if (data.isLicensed && !data.isExpired && (data.status === 'ACTIVE' || data.status === 'WARNING')) {
                    window.location.replace('/');
                } else {
                    if (data.status === 'UNLICENSED' || !data.isLicensed) {
                        setIsUnlicensed(true);
                    }
                    setCheckingStatus(false);
                }
            })
            .catch(() => setCheckingStatus(false));
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clientName.trim()) {
            setStatusMessage({ type: 'error', text: 'Por favor ingrese el Nombre o Razón Social del Cliente.' });
            return;
        }

        if (!nit.trim()) {
            setStatusMessage({ type: 'error', text: 'Por favor ingrese la Cédula o NIT del Cliente.' });
            return;
        }

        if (!licenseKey.trim()) {
            setStatusMessage({ type: 'error', text: 'Por favor ingrese la Clave de Licencia (Token).' });
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

            const data = await parseJsonResponse<any>(res, { success: false, message: 'Respuesta inválida del servidor' });

            if (!res.ok || !data?.success) {
                throw new Error(data?.message || 'Error al validar la clave de licencia');
            }

            setStatusMessage({
                type: 'success',
                text: `¡Licencia activada con éxito para ${data.license?.client}! Válida hasta ${data.license?.expirationDate}. Redirigiendo...`
            });

            // Redirigir inmediatamente a login o inicio
            setTimeout(() => {
                window.location.replace('/');
            }, 1200);
        } catch (err: any) {
            setStatusMessage({
                type: 'error',
                text: err.message || 'La clave de licencia ingresada es inválida o expiró.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
                <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                    <span>Verificando estado de licencia...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-8 space-y-6">
                
                {/* Header Alerta */}
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-500">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        {isUnlicensed ? 'Licencia Requerida para Habilitar el Sistema' : 'Licencia del Sistema Expirada'}
                    </h1>
                    <p className="text-sm text-slate-400">
                        {isUnlicensed
                            ? 'Esta instalación de Korex Analytics requiere ingresar el Nombre, NIT y la Clave de Licencia inicial para activar el servicio.'
                            : 'El período de funcionamiento contratado para esta versión ha finalizado o requiere renovación.'
                        }
                    </p>
                </div>

                {/* Mensaje Informativo */}
                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>¿Cómo activar o renovar el acceso al sistema?</span>
                    </div>
                    <p>
                        Genere la nueva <strong>Clave de Licencia</strong> con el programa ejecutable <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">GenerarLicencia.bat</code> (ingresando exactamente el mismo Nombre y NIT) y péguela en el recuadro a continuación.
                    </p>
                </div>

                {/* Formulario de Activación */}
                <form onSubmit={handleActivate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                                <Building className="w-3.5 h-3.5 text-slate-400" />
                                <span>Cliente / Razón Social:</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Ej: Agencia de Viajes Korex"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>Cédula o NIT:</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={nit}
                                onChange={(e) => setNit(e.target.value)}
                                placeholder="Ej: 900123456-1"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                            <span>Clave de Licencia (Token):</span>
                        </label>
                        <textarea
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            placeholder="KOR1.eyJjIjoiQWdlbmNp... (Pegue la clave completa entregada por el generador)"
                            rows={4}
                            required
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none placeholder:text-slate-600"
                        />
                    </div>

                    {statusMessage && (
                        <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                            statusMessage.type === 'success'
                                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                                : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                        }`}>
                            {statusMessage.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            )}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Verificando y Activando...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Activar Nueva Licencia</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Soporte */}
                <div className="text-center pt-2 text-[11px] text-slate-500">
                    Soporte Técnico Korex ERP & Analytics | Versión 2026
                </div>

            </div>
        </div>
    );
}
