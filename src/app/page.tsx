'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Activity,
    Play,
    Database,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Server,
    ArrowUpRight,
    RefreshCw
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function AnalyticsDashboardPage() {
    const [stats, setStats] = useState({
        totalExecutions: 142,
        successRate: 98.6,
        avgDurationMs: 430,
        activeProfiles: 2
    });

    const recentRuns = [
        {
            traceId: 'TRC-20261001-A4F91B',
            spName: 'spAnalisisVentasPeriodo',
            database: 'ZeusAgencias_23',
            server: '127.0.0.1',
            status: 'SUCCESS',
            records: 1250,
            durationMs: 320,
            time: 'Hace 5 min'
        },
        {
            traceId: 'TRC-20261001-8C103E',
            spName: 'spKardexMovimientos',
            database: 'Korex_pruebas',
            server: '127.0.0.1',
            status: 'SUCCESS',
            records: 480,
            durationMs: 210,
            time: 'Hace 18 min'
        },
        {
            traceId: 'TRC-20261001-FF021A',
            spName: 'spCarteraSaldosPendientes',
            database: 'ZeusAgencias_23',
            server: '127.0.0.1',
            status: 'SUCCESS',
            records: 890,
            durationMs: 510,
            time: 'Hace 1 hora'
        }
    ];

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
            {/* Header / Welcome Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <span>Dashboard de Operaciones</span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            PRODUCCIÓN ACTIVA
                        </span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Monitoreo en tiempo real de ejecuciones analíticas, perfiles SQL Server y trazabilidad.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/executions"
                        className="px-5 h-11 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Nueva Ejecución</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Ejecuciones */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ejecuciones Totales</span>
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{stats.totalExecutions}</span>
                        <span className="text-xs font-semibold text-emerald-400 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-0.5" /> +12% hoy
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">Consultas y SPs ejecutados</p>
                </div>

                {/* Tasa de Éxito */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa de Éxito</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-400">{stats.successRate}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">0 errores no controlados</p>
                </div>

                {/* Duración Promedio */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiempo Promedio</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{stats.avgDurationMs}</span>
                        <span className="text-xs text-slate-400">ms</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">Rendimiento óptimo de socket</p>
                </div>

                {/* Servidores Activos */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfiles SQL</span>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                            <Server className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{stats.activeProfiles}</span>
                        <span className="text-xs font-semibold text-cyan-400">Conectados</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">Multi-base de datos activa</p>
                </div>
            </div>

            {/* Recent Executions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-white">Actividad Reciente y Trazabilidad</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Últimos procedimientos ejecutados contra SQL Server</p>
                    </div>
                    <Link
                        href="/history"
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                        <span>Ver Historial Completo</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="py-3.5 px-4">Trace ID</th>
                                <th className="py-3.5 px-4">Procedimiento</th>
                                <th className="py-3.5 px-4">Base Destino</th>
                                <th className="py-3.5 px-4">Registros</th>
                                <th className="py-3.5 px-4">Duración</th>
                                <th className="py-3.5 px-4">Estado</th>
                                <th className="py-3.5 px-4 text-right">Momento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                            {recentRuns.map((run) => (
                                <tr key={run.traceId} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{run.traceId}</td>
                                    <td className="py-3.5 px-4 font-bold text-white">{run.spName}</td>
                                    <td className="py-3.5 px-4 text-slate-400">{run.database} ({run.server})</td>
                                    <td className="py-3.5 px-4 font-semibold text-slate-200" suppressHydrationWarning>{formatNumber(run.records)}</td>
                                    <td className="py-3.5 px-4 text-slate-400">{run.durationMs} ms</td>
                                    <td className="py-3.5 px-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>{run.status}</span>
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right text-slate-500">{run.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
