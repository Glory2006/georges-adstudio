import type { ReactNode } from "react";
import type { ReservationStatut } from "../types";

// ── Badge statut ──────────────────────────────────────────────
export function StatusBadge({ statut,isClosed=false }: { statut: ReservationStatut;isClosed?:boolean }) {
  // Si clôturé, override le statut affiché
  if (isClosed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/15 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        Clôturé
      </span>
    );
  }
  const config = {
    en_attente: { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "En attente", dot: "bg-amber-400"   },
    accepte:    { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Accepté",    dot: "bg-emerald-400" },
    rejete:     { bg: "bg-red-500/15",     text: "text-red-400",     label: "Rejeté",     dot: "bg-red-400"     },
    cloture:    { bg: "bg-gray-500/15",    text: "text-gray-500",    label: "Clôturé",    dot: "bg-gray-500"    },
  };
  const c = config[statut] ?? config.en_attente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${statut === "en_attente" ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}

// ── Carte KPI ─────────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 flex flex-col gap-2 hover:border-[#C9A96E]/30 transition-colors">
      <p className="text-4xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        {value}
      </p>
      <p className="text-sm text-gray-400">{label}</p>
      {sub && <p className={`text-xs ${accent ? "text-[#C9A96E]" : "text-gray-500"}`}>{sub}</p>}
    </div>
  );
}

// ── Fenêtre modale de confirmation de suppression ────────────────
// Cette modale remplace les alertes natives "confirm" par une interface plus élégante et cohérente.
export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* En-tête de la modale avec icône de danger */}
        <div className="flex items-center gap-3 text-red-400">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        {/* Description explicative */}
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        {/* Boutons d'action de la modale */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium cursor-pointer">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-medium cursor-pointer">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

