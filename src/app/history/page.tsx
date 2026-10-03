'use client';

import React, { useState } from 'react';
import {
    History,
    Search,
    Download,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Database,
    Filter
} from 'lucide-react';

export default function ExecutionHistoryPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const historyItems = [
        {
            id: 1,
            traceId: 'TRC-20261001-A4F91B',
            userName: 'Admin KAX',
            spName: 'spAnalisisVentasPeriodo',
            database: 'ZeusAgencias_23',
            server: '127.0.0.1',
            status: 'SUCCESS',
            records: 1250,
            durationMs: 320,
            date: '2026-10-01 17:45:10'
        },
        {
            id: 2,
            traceId: 'TRC-20261001-8C103E',
            userName: 'Admin KAX',
            spName: 'spKardexMovimientos',
            database: 'Korex_pruebas',
            server: '127.0.0.1',
            status: 'SUCCESS',
            records: 480,
            durationMs: 210,
            date: '2026-10-01 17:32:04'
        },
        {
            id: 3,
            traceId: 'TRC-20261001-FF021A',
            userName: 'Admin KAX',
            spName: 'spCarteraSaldosPendientes',
            database: 'ZeusAgencias_23',
            server: '127.0.0.1',
            status: 'SUCCESS',
            records: 890,
            durationMs: 510,
            date: '2026-10-01 16:50:22'
        },
        {
            id: 4,
            traceId: 'TRC-20261001-3E219D',
            userName: 'Admin KAX',
            spName: 'spAnalisisVentasPeriodo',
            database: 'ZeusAgencias_23',
            server: '127.0.0.1',
            status: 'SUCCESS',
            records: 2310,
            durationMs: 640,
            date: '2026-10-01 15:12:00'
        }
    ];

    const filtered = historyItems.filter(item =>
        item.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.spName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.database.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <History className="w-6 h-6 text-cyan-400" />
                        <span>Historial y Trazabilidad de Ejecuciones</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Auditoría inmutable de todas las consultas y Stored Procedures ejecutados.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por Trace ID, SP o Base de Datos..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-3.5 py-2 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                </div>

                <div className="text-xs text-slate-400 font-semibold">
                    Mostrando <span className="text-slate-200 font-bold">{filtered.length}</span> registros
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="py-3.5 px-4">Trace ID</th>
                                <th className="py-3.5 px-4">Usuario</th>
                                <th className="py-3.5 px-4">Procedimiento</th>
                                <th className="py-3.5 px-4">Servidor / Base</th>
                                <th className="py-3.5 px-4">Filas</th>
                                <th className="py-3.5 px-4">Duración</th>
                                <th className="py-3.5 px-4">Estado</th>
                                <th className="py-3.5 px-4 text-right">Fecha y Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                            {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{item.traceId}</td>
                                    <td className="py-3.5 px-4 text-slate-300 font-semibold">{item.userName}</td>
                                    <td className="py-3.5 px-4 font-bold text-white">{item.spName}</td>
                                    <td className="py-3.5 px-4 text-slate-400">
                                        {item.server} / <span className="text-slate-200">{item.database}</span>
                                    </td>
                                    <td className="py-3.5 px-4 font-semibold text-slate-200">{item.records.toLocaleString()}</td>
                                    <td className="py-3.5 px-4 text-slate-400">{item.durationMs} ms</td>
                                    <td className="py-3.5 px-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>{item.status}</span>
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">{item.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
