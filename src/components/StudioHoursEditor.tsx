import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type StudioConfig = {
  opening_time: string;
  closing_time: string;
  default_slot_duration: number;
};

export function StudioHoursEditor({
  token,
  canEdit,
  modal = false,
  onClose,
}: {
  token: string | null;
  canEdit: boolean;
  modal?: boolean;
  onClose?: () => void;
}) {
  const [config, setConfig] = useState<StudioConfig | null>(null);
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("20:00");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const data = await apiRequest<{ config: StudioConfig }>("/admin/studio-config", token);
        setConfig(data.config);
        setOpeningTime(data.config.opening_time.slice(0, 5));
        setClosingTime(data.config.closing_time.slice(0, 5));
        setDuration(String(data.config.default_slot_duration));
      } catch (err) {
        setNotice({ type: "error", text: err instanceof Error ? err.message : "Impossible de charger les horaires." });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const save = async () => {
    setNotice(null);
    if (openingTime >= closingTime) {
      setNotice({ type: "error", text: "L'heure de fermeture doit être après l'heure d'ouverture." });
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest<{ config: StudioConfig; message: string }>("/admin/studio-config", token, {
        method: "PUT",
        body: JSON.stringify({
          opening_time: openingTime,
          closing_time: closingTime,
          default_slot_duration: Number(duration),
        }),
      });
      setConfig(data.config);
      setNotice({ type: "ok", text: data.message || "Horaires enregistrés." });
      if (modal) onClose?.();
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Impossible d'enregistrer les horaires." });
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-medium">Horaires du studio</h2>
        <p className="text-gray-500 text-sm mt-1">Le calendrier public et la génération des créneaux s’adapteront à ces horaires.</p>
      </div>
      {notice && (
        <p className={`rounded-xl border px-3 py-2 text-sm ${notice.type === "ok" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
          {notice.text}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-gray-400 text-xs uppercase tracking-wider">
          Ouverture
          <input type="time" value={openingTime} disabled={loading || !canEdit} onChange={e => setOpeningTime(e.target.value)} className="mt-2 w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm disabled:opacity-50" />
        </label>
        <label className="text-gray-400 text-xs uppercase tracking-wider">
          Fermeture
          <input type="time" value={closingTime} disabled={loading || !canEdit} onChange={e => setClosingTime(e.target.value)} className="mt-2 w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm disabled:opacity-50" />
        </label>
      </div>
      <label className="block text-gray-400 text-xs uppercase tracking-wider">
        Durée d’un créneau (minutes)
        <input type="number" min="1" value={duration} disabled={loading || !canEdit} onChange={e => setDuration(e.target.value)} className="mt-2 w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm disabled:opacity-50" />
      </label>
      {!canEdit && <p className="text-amber-300 text-xs">Seul le compte photographe peut modifier ces horaires.</p>}
      <div className="flex justify-end gap-3">
        {modal && <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm">Plus tard</button>}
        {canEdit && <button type="button" onClick={() => void save()} disabled={saving || loading} className="px-5 py-2.5 rounded-xl bg-[#C9A96E] text-[#0D0D0D] text-sm font-medium disabled:opacity-60">{saving ? "Enregistrement..." : modal ? "Valider les horaires" : "Enregistrer les horaires"}</button>}
      </div>
      {config && !modal && <p className="text-gray-600 text-xs">Dernière configuration chargée depuis Supabase.</p>}
    </div>
  );

  if (!modal) return <section className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">{content}</section>;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 shadow-2xl">{content}</div></div>;
}
