import { useState } from "react";
import { Icon } from "../components/Icons";
import { StatusBadge } from "../components/UI";
import type { FiltreReservation, Reservation, ReservationStatut, StateSetter } from "../types";

const sendWhatsAppConfirmation = (r: Reservation) => {
  const phone = r.telephone.replace(/\D/g, '');
  const message = `Bonjour ${r.nom_client} ! 🎉\n\nVotre réservation chez Georges Studio a été acceptée.\n\n📅 Date : ${r.date_seance}\n🕐 Heure : ${r.heure_seance.substring(0,5)}${r.heure_seance_end ? ' - ' + r.heure_seance_end.substring(0,5) : ''}\n\nÀ très vite !`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export function Reservations({
  reservations,
  setReservations,
  onUpdateStatut,
  onUpdateSchedule,
  onRefresh,
}: {
  reservations: Reservation[];
  setReservations: StateSetter<Reservation[]>;
  onUpdateStatut: (id: string, statut: ReservationStatut) => Promise<void>;
  onUpdateSchedule: (id: string, payload: { date_seance: string; heure_seance: string; heure_seance_end?: string | null }) => Promise<void>;
  onRefresh?: () => void;
}) {
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [filtre, setFiltre]     = useState<FiltreReservation>("tous");
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState(""); // ← ajout
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const PER_PAGE = 10;
  const [page, setPage] = useState(0);

  const isReservationClosed = (r: Reservation): boolean => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (r.date_seance < today) return true;
    if (r.date_seance === today && r.heure_seance_end) {
      const [h, m] = r.heure_seance_end.split(':').map(Number);
      const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      return now > endTime;
    }
    if (r.date_seance === today && !r.heure_seance_end) {
      const [h, m] = r.heure_seance.split(':').map(Number);
      const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      return now > startTime;
    }
    return false;
  };
  const filtered = filtre === "tous"
    ? reservations
    : filtre === "cloture"
      ? reservations.filter(r => isReservationClosed(r))
      : reservations.filter(r => r.statut === filtre && !isReservationClosed(r));
  // Formater la date d'enregistrement
  const formatDateEnregistrement = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Formater l'heure d'enregistrement
  const formatHeureEnregistrement = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "—";
    }
  };

  const updateStatut = async (id: string, nouveauStatut: ReservationStatut) => {
    await onUpdateStatut(id, nouveauStatut);
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut: nouveauStatut } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, statut: nouveauStatut } : prev);
  };

  const startScheduleEdit = (reservation: Reservation) => {
    setSelected(reservation);
    setEditingSchedule(true);
    setScheduleDate(reservation.date_seance);
    setScheduleTime(reservation.heure_seance.substring(0, 5));
    setScheduleEndTime(reservation.heure_seance_end?.substring(0, 5) || "");
    setScheduleError(null);
  };

const saveSchedule = async () => {
  if (!selected) return;
  setScheduleError(null);
  if (!scheduleDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) {
    setScheduleError("Date invalide.");
    return;
  }
  if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleTime)) {
    setScheduleError("Heure de début invalide. Format attendu : HH:MM.");
    return;
  }
  if (scheduleEndTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(scheduleEndTime)) {
    setScheduleError("Heure de fin invalide. Format attendu : HH:MM.");
    return;
  }
  setScheduleLoading(true);
  try {
    await onUpdateSchedule(selected.id, {
      date_seance: scheduleDate,
      heure_seance: `${scheduleTime}:00`,
      heure_seance_end: scheduleEndTime ? `${scheduleEndTime}:00` : null, // ← ajout
    });
    setReservations(prev => prev.map(r => r.id === selected.id ? {
      ...r,
      date_seance: scheduleDate,
      heure_seance: `${scheduleTime}:00`,
      heure_seance_end: scheduleEndTime ? `${scheduleEndTime}:00` : null, // ← ajout
    } : r));
    setSelected(prev => prev ? {
      ...prev,
      date_seance: scheduleDate,
      heure_seance: `${scheduleTime}:00`,
      heure_seance_end: scheduleEndTime ? `${scheduleEndTime}:00` : null, // ← ajout
    } : prev);
    setEditingSchedule(false);
  } catch (err) {
    setScheduleError(err instanceof Error ? err.message : "Modification impossible.");
  } finally {
    setScheduleLoading(false);
  }
};

  const onglets: Array<{ key: FiltreReservation; label: string; count: number }> = [
    { key: "tous",       label: "Toutes",     count: reservations.length },
    { key: "en_attente", label: "En attente", count: reservations.filter(r => r.statut === "en_attente" && !isReservationClosed(r)).length },
    { key: "accepte",    label: "Acceptées",  count: reservations.filter(r => r.statut === "accepte" && !isReservationClosed(r)).length },
    { key: "rejete",     label: "Rejetées",   count: reservations.filter(r => r.statut === "rejete" && !isReservationClosed(r)).length },
    { key: "cloture", label: "Clôturées", count: reservations.filter(r => isReservationClosed(r)).length },
  ];
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const filteredPage = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Réservations
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gérez les demandes de vos clients</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 text-sm transition-colors flex-shrink-0"
          >
            ↻ Actualiser
          </button>
        )}
      </div>

      {/* Onglets filtre — scrollable horizontalement sur mobile */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-1 bg-[#1A1A1A] p-1 rounded-xl border border-white/5 w-max min-w-full sm:w-fit sm:min-w-0">
          {onglets.map(o => (
            <button
              key={o.key}
              onClick={() => {setFiltre(o.key); setPage(0);}}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filtre === o.key ? "bg-[#C9A96E] text-[#0D0D0D]" : "text-gray-400 hover:text-white"
              }`}>
              {o.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                filtre === o.key ? "bg-black/20 text-[#0D0D0D]" : "bg-white/10 text-gray-300"
              }`}>{o.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* 📊 TABLEAU DES RÉSERVATIONS */}
        <div className="flex-1 min-w-0">
          {/* En-têtes du tableau (visible sur desktop) */}
          <div className="hidden lg:grid grid-cols-8 gap-3 px-4 py-3 bg-[#1A1A1A]/50 rounded-t-xl border-b border-white/5 text-xs text-gray-500 font-medium uppercase tracking-wider">
            <div className="col-span-2">Client</div>
            <div>Séance</div>
            <div>Enregistré</div>
            <div>Date & Heure</div>
            <div>Status</div>
            <div className="col-span-2">Actions</div>
          </div>

          {/* Lignes du tableau */}
          <div className="space-y-2">
            {filteredPage.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                className={`grid grid-cols-1 lg:grid-cols-8 gap-2 lg:gap-3 p-3 md:p-4 rounded-xl border cursor-pointer transition-all min-w-0 ${
                  selected?.id === r.id
                    ? "bg-[#C9A96E]/10 border-[#C9A96E]/40"
                    : "bg-[#1A1A1A] border-white/5 hover:border-[#C9A96E]/20"
                }`}>
                
                {/* Layout mobile : ligne compacte haut + bas */}
                {/* Layout desktop : grille 8 colonnes */}

                {/* Ligne haute : avatar + nom + status (mobile) */}
                <div className="col-span-1 lg:col-span-2 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center text-[#C9A96E] text-xs font-semibold flex-shrink-0">
                    {r.nom_client.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{r.nom_client}</p>
                    <p className="text-gray-500 text-xs truncate">{r.email}</p>
                  </div>
                  {/* Status visible inline sur mobile */}
                  <div className="lg:hidden flex-shrink-0">
                    <StatusBadge statut={r.statut} isClosed={isReservationClosed(r)} />
                  </div>
                </div>

                {/* Colonne 3 : Type de séance */}
                <div className="col-span-1 hidden lg:block">
                  <p className="text-white text-sm font-medium truncate">
                    {r.type_photos?.nom || r.type || '—'}
                  </p>
                </div>

                {/* Colonne 4 : Date d'enregistrement — desktop uniquement */}
                <div className="col-span-1 hidden lg:block">
                  <div className="text-white text-sm">
                    <p>{formatDateEnregistrement(r.created_at)}</p>
                    <p className="text-gray-500 text-xs">{formatHeureEnregistrement(r.created_at)}</p>
                  </div>
                </div>

                {/* Colonne 5 : Date séance — desktop full, mobile compact sous le nom */}
                <div className="col-span-1 hidden lg:block">
                  <div className="text-white text-sm">
                    <p>{r.date_seance}</p>
                    <p className="text-gray-500 text-xs">
                      {r.heure_seance?.substring(0, 5)}
                      {r.heure_seance_end ? ` - ${r.heure_seance_end.substring(0, 5)}` : ''}
                    </p>
                  </div>
                </div>

                {/* Colonne 6 : Status — desktop uniquement */}
                <div className="col-span-1 hidden lg:flex items-center">
                  <StatusBadge statut={r.statut} isClosed={isReservationClosed(r)} />
                </div>

                {/* Info secondaire visible sur mobile : séance + date */}
                <div className="col-span-1 lg:hidden flex items-center justify-between text-xs text-gray-400 -mt-1">
                  <span className="truncate">{r.type_photos?.nom || r.type || '—'} · {r.date_seance} {r.heure_seance?.substring(0, 5)}{r.heure_seance_end ? `–${r.heure_seance_end.substring(0, 5)}` : ''}</span>
                </div>

                {/* Colonne 7-8 : Actions */}
                <div className="col-span-1 lg:col-span-2 flex items-center gap-2 justify-end">
                  {r.statut === "en_attente" && !isReservationClosed(r) && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => updateStatut(r.id, "accepte")}
                        className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center justify-center flex-shrink-0"
                        title="Accepter">
                        <Icon.Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateStatut(r.id, "rejete")}
                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-colors flex items-center justify-center flex-shrink-0"
                        title="Rejeter">
                        <Icon.X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {!isReservationClosed(r) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startScheduleEdit(r);
                      }}
                      className="px-2.5 h-7 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-xs whitespace-nowrap"
                      title="Modifier l'heure">
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <p className="text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Aucune réservation</p>
                <p className="text-sm mt-1">Modifiez le filtre pour voir d'autres résultats</p>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500">
                      {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} / {filtered.length} réservations
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
        </div>

        {/* 📋 PANNEAU DÉTAIL — bottom sheet sur mobile, sidebar sur desktop */}
        {selected && (
          <>
            {/* Overlay mobile */}
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setSelected(null)}
            />
            <div className={`
              fixed lg:static bottom-0 left-0 right-0 z-50
              lg:w-72 lg:self-start lg:sticky lg:top-0
              bg-[#1A1A1A] border border-white/5
              rounded-t-2xl lg:rounded-2xl
              p-5 space-y-5
              max-h-[85vh] lg:max-h-none overflow-y-auto
              transition-transform duration-300
            `}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white font-medium">{selected.nom_client}</p>
                <StatusBadge statut={selected.statut} />
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white">
                <Icon.X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t border-white/5" />

            {[
              { label: "Email",   value: selected.email },
              { label: "Tél",     value: selected.telephone },
              { label: "Séance",  value: selected.type_photos?.nom || selected.type },
              { label: "Date", value: `${selected.date_seance} · ${selected.heure_seance?.substring(0,5)}${selected.heure_seance_end ? ` - ${selected.heure_seance_end.substring(0,5)}` : ''}` },
              { label: "Enregistré", value: `${formatDateEnregistrement(selected.created_at)} ${formatHeureEnregistrement(selected.created_at)}` },
              { label: "Message", value: selected.message || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
                <p className="text-white text-sm mt-0.5 break-words">{value}</p>
              </div>
            ))}

            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Horaire admin</p>
              {editingSchedule ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 py-2 text-sm text-white outline-none focus:border-[#C9A96E]"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    step={3600}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 py-2 text-sm text-white outline-none focus:border-[#C9A96E]"
                    placeholder="Heure de debut"
                  />
                  {/* ← ajout */}
                  <input
                    type="time"
                    value={scheduleEndTime}
                    step={3600}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 py-2 text-sm text-white outline-none focus:border-[#C9A96E]"
                    placeholder="Heure fin"
                  />
                  {scheduleError && <p className="text-xs text-red-400">{scheduleError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveSchedule}
                      disabled={scheduleLoading}
                      className="flex-1 py-2 rounded-lg bg-[#C9A96E] text-[#0D0D0D] text-sm font-medium disabled:opacity-60">
                      {scheduleLoading ? "..." : "Enregistrer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSchedule(false)}
                      className="flex-1 py-2 rounded-lg bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startScheduleEdit(selected)}
                  className="mt-2 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">
                  Modifier l'heure indiquée
                </button>
              )}
            </div>

            {selected.statut === "en_attente" && !isReservationClosed(selected) && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    await updateStatut(selected.id, "accepte");
                    sendWhatsAppConfirmation(selected);  // ← ajout
                  }} 
                  className="flex-1 py-2 rounded-lg bg-[#C9A96E] text-[#0D0D0D] text-sm font-medium hover:bg-[#D4B87A] transition-colors">
                  Accepter
                </button>
                <button
                  onClick={() => updateStatut(selected.id, "rejete")}
                  className="flex-1 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors">
                  Rejeter
                </button>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
