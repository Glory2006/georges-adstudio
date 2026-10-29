import { useMemo, useState } from "react";
import { Icon } from "../components/Icons";
import type { Dispo, Reservation, StateSetter } from "../types";

type Statut = 'disponible' | 'en_attente' | 'reserve' | 'cloture';

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMin(aStart) < timeToMin(bEnd) && timeToMin(aEnd) > timeToMin(bStart);
}

function isReservationClosed(dateSeance: string, heureSeanceFin?: string | null, heureSeance?: string): boolean {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (dateSeance < today) return true;
  if (dateSeance === today) {
    const timeStr = heureSeanceFin || heureSeance;
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      return now > endTime;
    }
  }
  return false;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateClientSlotPayload {
  date_dispo: string;
  heure_debut: string;
  heure_fin: string;
  nom_client: string;
  email: string;
  telephone: string;
  type_photo_id: string;
  message?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Disponibilites({
  dispos,
  setDispos,
  reservations,
  typePhotos,
  onCreateClientSlot,
}: {
  dispos: Dispo[];
  setDispos: StateSetter<Dispo[]>;
  reservations?: Reservation[];
  /** Liste des types de photos pour le select dans le formulaire */
  typePhotos?: { id: string; nom: string }[];
  /** Callback pour créer un créneau + réservation pour un client */
  onCreateClientSlot?: (payload: CreateClientSlotPayload) => Promise<void>;
}) {
  // ── Modal state ──────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);

  // Champs communs
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");

  // Champs client
  const [clientNom, setClientNom] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [clientTypePhoto, setClientTypePhoto] = useState(typePhotos?.[0]?.id ?? "");
  const [clientMessage, setClientMessage] = useState("");

  // Avertissement créneau existant
  const [slotConflict, setSlotConflict] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Pagination ───────────────────────────────────────────────────────────
  const PER_PAGE = 5;
  const [page, setPage] = useState(0);

  // ── Status computation ───────────────────────────────────────────────────
  const disposWithStatus = useMemo(() => {
    return dispos.map(d => {
      let statut: Statut = 'disponible';
      let reservation_id: string | undefined;

      if (isReservationClosed(d.date_dispo, undefined, d.heure_debut)) {
        statut = 'cloture';
      } else if (d.est_reserve) {
        statut = 'reserve';
      } else if (reservations) {
        const matching = reservations.find(r => {
          if (d.id && r.disponibilite_id === d.id) return true;
          if (r.date_seance !== d.date_dispo) return false;
          const rEnd = r.heure_seance_end || r.heure_seance;
          return rangesOverlap(d.heure_debut, d.heure_fin, r.heure_seance, rEnd);
        });

        if (matching) {
          const closed = isReservationClosed(
            matching.date_seance,
            matching.heure_seance_end,
            matching.heure_seance
          );
          statut = closed ? 'cloture' : matching.statut === 'accepte' ? 'reserve' : 'en_attente';
          reservation_id = matching.id;
        }
      }

      return { ...d, statut, reservation_id };
    });
  }, [dispos, reservations]);

  const reservationsSansDispo = useMemo(() => {
    if (!reservations) return [];
    return reservations
      .filter(r => {
        if (r.disponibilite_id) return false;
        const rEnd = r.heure_seance_end || r.heure_seance;
        const overlapsOfficial = dispos.some(
          d => d.date_dispo === r.date_seance &&
               rangesOverlap(d.heure_debut, d.heure_fin, r.heure_seance, rEnd)
        );
        return !overlapsOfficial;
      })
      .map(r => ({
        id: `resa-${r.id}`,
        date_dispo: r.date_seance,
        heure_debut: r.heure_seance,
        heure_fin: r.heure_seance_end || r.heure_seance,
        est_reserve: r.statut === 'accepte',
        statut: (isReservationClosed(r.date_seance, r.heure_seance_end, r.heure_seance)
          ? 'cloture'
          : r.statut === 'accepte'
            ? 'reserve'
            : 'en_attente') as Statut,
        reservation_id: r.id,
        isVirtual: true,
      }));
  }, [reservations, dispos]);

  const tousLesCreneaux = useMemo(() => {
    return [...disposWithStatus, ...reservationsSansDispo];
  }, [disposWithStatus, reservationsSansDispo]);

  type CreneauItem = (typeof tousLesCreneaux)[number];
  const parDate = tousLesCreneaux.reduce<Record<string, CreneauItem[]>>((acc, d) => {
    if (!acc[d.date_dispo]) acc[d.date_dispo] = [];
    acc[d.date_dispo].push(d);
    return acc;
  }, {});

  const toggleReserve = (id: string) => {
    setDispos(prev => prev.map(d => d.id === id ? { ...d, est_reserve: !d.est_reserve } : d));
  };

  const statusConfig: Record<Statut, { color: string; text: string; label: string }> = {
    disponible: { color: 'bg-emerald-500/40', text: 'text-emerald-400', label: 'Disponible' },
    en_attente: { color: 'bg-yellow-500/40',  text: 'text-yellow-400',  label: 'En attente' },
    reserve:    { color: 'bg-red-500/40',     text: 'text-red-400',     label: 'Réservé'    },
    cloture:    { color: 'bg-gray-500/40',    text: 'text-gray-500',    label: 'Clôturé'    },
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Vérifie si un créneau chevauche déjà un créneau existant */
  const checkSlotConflict = (date: string, start: string, end: string): string | null => {
    if (!date || !start || !end) return null;
    const existing = tousLesCreneaux.find(c => {
      if (c.date_dispo !== date) return false;
      return rangesOverlap(c.heure_debut, c.heure_fin, `${start}:00`, `${end}:00`);
    });
    if (!existing) return null;
    const cfg = statusConfig[existing.statut as Statut];
    return `Ce créneau chevauche un horaire déjà ${cfg?.label.toLowerCase() ?? existing.statut} (${existing.heure_debut.substring(0,5)}-${existing.heure_fin.substring(0,5)}). Choisissez un autre horaire.`;
  };

  const handleDateOrTimeChange = (date: string, start: string, end: string) => {
    setSlotConflict(checkSlotConflict(date, start, end));
  };

  const resetForm = () => {
    setFormDate("");
    setFormStart("");
    setFormEnd("");
    setClientNom("");
    setClientEmail("");
    setClientTel("");
    setClientTypePhoto(typePhotos?.[0]?.id ?? "");
    setClientMessage("");
    setFormError(null);
    setSlotConflict(null);
    setSuccessMsg(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };
  const MESSAGE_SUGGESTIONS: Record<string, string> = {
    mariage: "Je souhaite réserver une séance photo de mariage. Je reste ouvert(e) aux conseils du photographe sur le lieu et le style, et je me conformerai aux règles du studio.",
    portrait: "Je souhaite faire une séance portrait. Je peux toutefois ajuster le style ou le cadre sur place selon les suggestions du photographe, en respectant les règles du studio.",
    grossesse: "Je souhaite une séance photo de grossesse/famille. Je reste flexible sur les détails et me conformerai aux règles du studio.",
    corporate: "Je souhaite organiser une séance photo pour mon entreprise. Je peux ajuster certains aspects sur place selon les recommandations du photographe, dans le respect des règles du studio.",
  };
  const getDefaultSuggestion = (nom: string) =>
  `Le client souhaite une séance de type "${nom}". Le type peut être ajusté sur place selon les recommandations du studio.`;

  const suggestMessage = () => {
    const selectedType = typePhotos?.find(t => t.id === clientTypePhoto);
    if (!selectedType) return;
    // On utilise le nom en minuscule sans accents comme clé approximative
    const key = selectedType.nom.toLowerCase();
    const suggestion = MESSAGE_SUGGESTIONS[key] || getDefaultSuggestion(selectedType.nom);
    setClientMessage(suggestion);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateCommon = (): boolean => {
    if (!formDate || !/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
      setFormError("Veuillez choisir une date valide.");
      return false;
    }
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(formStart)) {
      setFormError("Heure de début invalide.");
      return false;
    }
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(formEnd)) {
      setFormError("Heure de fin invalide.");
      return false;
    }
    if (formEnd <= formStart) {
      setFormError("L'heure de fin doit être après l'heure de début.");
      return false;
    }
    if (checkSlotConflict(formDate, formStart, formEnd)) {
      setFormError("Ce créneau chevauche un horaire déjà occupé. Choisissez un autre horaire.");
      return false;
    }
    return true;
  };

  // ── Submit : créneau pour un client ──────────────────────────────────────
  const handleCreateClientSlot = async () => {
    setFormError(null);
    if (!validateCommon()) return;

    if (!clientNom.trim()) { setFormError("Le nom du client est requis."); return; }
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      setFormError("Adresse e-mail invalide."); return;
    }
    if (!clientTel.trim()) { setFormError("Le numéro de téléphone est requis."); return; }
    if (!clientTypePhoto) { setFormError("Veuillez sélectionner un type de séance."); return; }
    if (!onCreateClientSlot) return;

    setFormLoading(true);
    try {
      await onCreateClientSlot({
        date_dispo: formDate,
        heure_debut: `${formStart}:00`,
        heure_fin: `${formEnd}:00`,
        nom_client: clientNom.trim(),
        email: clientEmail.trim(),
        telephone: clientTel.trim(),
        type_photo_id: clientTypePhoto,
        message: clientMessage.trim() || undefined,
      });

      // ← Ouvre WhatsApp avec le message pré-rempli
      const phone = clientTel.replace(/\D/g, '');
      const waMessage = `Bonjour ${clientNom} ! 🎉\n\nVotre séance chez Georges Studio est confirmée.\n\n📅 Date : ${formDate}\n🕐 Heure : ${formStart} - ${formEnd}\n\nÀ très vite !`;
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
      window.open(waUrl, '_blank');

      setSuccessMsg(`Créneau créé et confirmation envoyée à ${clientEmail}.`);
      setTimeout(closeModal, 2500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Impossible de créer le créneau client.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Pagination ───────────────────────────────────────────────────────────
  const datesSorted = Object.entries(parDate).sort(([a], [b]) => b.localeCompare(a));
  const totalPages = Math.ceil(datesSorted.length / PER_PAGE);
  const datesPage = datesSorted.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  // ── Shared field classes ─────────────────────────────────────────────────
  const inputCls = "w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 py-2 text-sm text-white outline-none focus:border-[#C9A96E] placeholder:text-gray-600 transition-colors";
  const labelCls = "text-xs text-gray-500 uppercase tracking-wider block mb-1.5";

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Disponibilités
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos créneaux de séances</p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A96E] text-[#0D0D0D] rounded-xl text-sm font-medium hover:bg-[#D4B87A] transition-colors">
          <Icon.User className="w-4 h-4" />
          Créneau client
        </button>
      </div>

      {/* ── Légende ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 text-xs text-gray-500">
        {(Object.entries(statusConfig) as [Statut, typeof statusConfig[Statut]][]).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* ── Créneaux par date ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {datesPage.map(([date, creneaux]) => (
          <div key={date} className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-white font-medium">
                {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long",
                })}
              </p>
              <span className="text-gray-500 text-xs">
                {creneaux.length} créneau{creneaux.length > 1 ? "x" : ""}
              </span>
            </div>

            {creneaux.map(c => {
              const cfg = statusConfig[c.statut as Statut] ?? statusConfig.disponible;
              const isVirtual = 'isVirtual' in c && (c as { isVirtual: boolean }).isVirtual;

              return (
                <div key={c.id}
                  className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon.Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-white text-sm">
                      {c.heure_debut.substring(0, 5)} – {c.heure_fin.substring(0, 5)}
                    </span>
                    {isVirtual && (
                      <span className="text-xs text-gray-600 italic">créneau client</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${cfg.text}`}>
                      {cfg.label}
                    </span>

                    {c.statut === 'reserve' && !isVirtual && (
                      <button
                        onClick={() => toggleReserve(c.id)}
                        className={`relative w-9 rounded-full transition-colors ${cfg.color}`}
                        style={{ height: "1.1rem" }}>
                        <span
                          className="absolute bg-white rounded-full transition-all shadow-sm left-5"
                          style={{ height: "0.7rem", width: "0.7rem", top: "0.2rem" }}
                        />
                      </button>
                    )}

                    {c.statut === 'disponible' && !isVirtual && (
                      <button className="text-gray-600 hover:text-red-400 transition-colors">
                        <Icon.Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Jours {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, datesSorted.length)} / {datesSorted.length}
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

      {/* ════════════════════════════════════════════════════════════════════
          MODALE — Créneau client
          ════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 pointer-events-auto max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Créneau pour un client
                </h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-white">
                  <Icon.X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonne gauche : date/heure */}
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => {
                        setFormDate(e.target.value);
                        handleDateOrTimeChange(e.target.value, formStart, formEnd);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Heure début</label>
                      <input
                        type="time"
                        value={formStart}
                        onChange={e => {
                          setFormStart(e.target.value);
                          handleDateOrTimeChange(formDate, e.target.value, formEnd);
                        }}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Heure fin</label>
                      <input
                        type="time"
                        value={formEnd}
                        onChange={e => {
                          setFormEnd(e.target.value);
                          handleDateOrTimeChange(formDate, formStart, e.target.value);
                        }}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {slotConflict && (
                    <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2.5 text-xs text-yellow-400">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      </svg>
                      {slotConflict}
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Type de séance</label>
                    <select
                      value={clientTypePhoto}
                      onChange={e => setClientTypePhoto(e.target.value)}
                      className={inputCls + " cursor-pointer"}>
                      {(!typePhotos || typePhotos.length === 0) && (
                        <option value="">Aucun type disponible</option>
                      )}
                      {typePhotos?.map(t => (
                        <option key={t.id} value={t.id}>{t.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Colonne droite : infos client */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Informations du client</p>

                  <div>
                    <label className={labelCls}>Nom complet</label>
                    <input
                      type="text"
                      placeholder="Ex: Jean Dupont"
                      value={clientNom}
                      onChange={e => setClientNom(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input
                      type="email"
                      placeholder="client@mail.com"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Téléphone / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="+229 97 000 000"
                      value={clientTel}
                      onChange={e => setClientTel(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Message / Note (optionnel)</label>
                    <button
                      type="button"
                      onClick={suggestMessage}
                      disabled={!clientTypePhoto}
                      className="text-xs text-[#C9A96E] hover:text-[#D4B87A] disabled:opacity-50">
                      ✨ Suggérer un texte
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Précisions sur la séance…"
                    value={clientMessage}
                    onChange={e => setClientMessage(e.target.value)}
                    className={inputCls + " resize-none"}
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-600 leading-relaxed">
                Un e-mail de confirmation et un message WhatsApp seront envoyés automatiquement au client.
              </p>

              {formError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                  {formError}
                </p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  {successMsg}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium">
                  Annuler
                </button>
                <button
                  onClick={handleCreateClientSlot}
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#C9A96E] text-[#0D0D0D] hover:bg-[#D4B87A] transition-colors text-sm font-medium disabled:opacity-60">
                  {formLoading ? "Envoi en cours…" : "Créer & notifier"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}