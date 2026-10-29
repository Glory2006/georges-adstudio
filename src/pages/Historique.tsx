import { useEffect, useState } from "react";
import { Icon } from "../components/Icons";
import { apiRequest } from "../lib/api";
import type { ActivityLog } from "../types";

const actionConfig: Record<string, { color: string; label: string }> = {
    creation:      { color: 'text-emerald-400', label: 'Créé' },
    acceptation:   { color: 'text-emerald-400', label: 'Accepté' },
    rejet:         { color: 'text-red-400',     label: 'Rejeté' },
    modification:  { color: 'text-[#C9A96E]',   label: 'Modifié' },
    suppression:   { color: 'text-red-400',     label: 'Supprimé' },
    publication:   { color: 'text-emerald-400', label: 'Publié' },
    depublication: { color: 'text-gray-400',    label: 'Dépublié' },
};

const entityLabel: Record<string, string> = {
    reservation: 'Réservation',
    type_photo: 'Type de séance',
    photo: 'Photo',
    disponibilite: 'Disponibilité',
    configuration: 'Configuration',
    admin: 'Compte admin',
};


export function Historique({ token }: { token: string | null }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtreActor, setFiltreActor] = useState<'tous' | 'client' | 'admin'>('tous');
    const PER_PAGE = 10;
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (!token) return;

        async function fetchLogs() {
            setLoading(true);
            try {
            const data = await apiRequest<{ logs: ActivityLog[] }>("/admin/activity-logs", token);
            setLogs(data.logs);
            } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de chargement.");
            } finally {
            setLoading(false);
            }
        }

        fetchLogs();
    }, [token]);

    const filtered = filtreActor === 'tous'
        ? logs
        : logs.filter(l => l.actor_type === filtreActor);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
        });
    };
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const filteredPage = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    return (
        <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Historique
            </h1>
            <p className="text-gray-500 text-sm mt-1">Traçabilité de toutes les actions</p>
        </div>

        {/* Filtres */}
        <div className="flex gap-1 bg-[#1A1A1A] p-1 rounded-xl w-fit border border-white/5">
            {(['tous', 'client', 'admin'] as const).map(f => (
            <button
                key={f}
                onClick={() => { setFiltreActor(f); setPage(0);}}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtreActor === f ? "bg-[#C9A96E] text-[#0D0D0D]" : "text-gray-400 hover:text-white"
                }`}>
                {f === 'tous' ? 'Toutes' : f === 'client' ? 'Clients' : 'Admin'}
            </button>
            ))}
        </div>

        {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            </div>
        )}

        {loading ? (
            <div className="text-center py-16 text-gray-600">Chargement...</div>
        ) : (
            <div className="space-y-2">
            {filteredPage.map(log => {
                const cfg = actionConfig[log.action] ?? { color: 'text-gray-400', label: log.action };
                return (
                <div key={log.id}
                    className="flex items-start gap-4 bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.actor_type === 'admin' ? 'bg-[#C9A96E]/10 text-[#C9A96E]' : 'bg-white/5 text-gray-400'
                    }`}>
                    <Icon.Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
                        {cfg.label}
                        </span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-500">
                        {entityLabel[log.entity_type] || log.entity_type}
                        </span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-500 capitalize">
                        {log.actor_type === 'admin' ? (log.actor_email || 'Admin') : 'Client'}
                        </span>
                    </div>
                    <p className="text-white text-sm mt-1">{log.description}</p>
                    <p className="text-gray-600 text-xs mt-1">{formatDate(log.created_at)}</p>
                    </div>
                </div>
                );
            })}

            {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-600">
                <p className="text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Aucune activité
                </p>
                </div>
            )}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                        {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} / {filtered.length} entrées
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/10 text-gray-400 flex items-center justify-center hover:border-[#C9A96E]/40 hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-default transition-all">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div className="flex items-center gap-1.5">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === page ? "bg-[#C9A96E]" : "bg-white/10 hover:bg-white/20"}`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/10 text-gray-400 flex items-center justify-center hover:border-[#C9A96E]/40 hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-default transition-all">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
            )}
            </div>
        )}
        </div>
    );
    }
