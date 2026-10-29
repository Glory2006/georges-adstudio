import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { StudioHoursEditor } from "../components/StudioHoursEditor";

type Notice = { type: "ok" | "error"; text: string } | null;

export function Settings({ token, role }: { token: string | null; role?: "photographe" | "developer" | null }) {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<{ admin: { email: string | null } }>("/admin/me", token);
        if (cancelled) return;
        const loaded = data.admin?.email ?? "";
        setEmail(loaded);
        setInitialEmail(loaded);
      } catch (err) {
        if (!cancelled) {
          setProfileNotice({ type: "error", text: err instanceof Error ? err.message : "Impossible de charger le profil." });
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileNotice(null);
    if (email.trim() === initialEmail) {
      setProfileNotice({ type: "ok", text: "Aucune modification à enregistrer." });
      return;
    }
    setSavingProfile(true);
    try {
      const data = await apiRequest<{ admin: { email: string }; message: string }>("/admin/profile", token, {
        method: "PUT",
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail(data.admin.email);
      setInitialEmail(data.admin.email);
      setProfileNotice({ type: "ok", text: data.message || "Profil mis à jour." });
    } catch (err) {
      setProfileNotice({ type: "error", text: err instanceof Error ? err.message : "Erreur lors de la sauvegarde." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordNotice(null);

    if (!currentPassword || !newPassword) {
      setPasswordNotice({ type: "error", text: "Renseignez le mot de passe actuel et le nouveau." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordNotice({ type: "error", text: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "error", text: "Les deux nouveaux mots de passe ne correspondent pas." });
      return;
    }

    setSavingPassword(true);
    try {
      const data = await apiRequest<{ message: string }>("/admin/password", token, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordNotice({ type: "ok", text: data.message || "Mot de passe mis à jour." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordNotice({ type: "error", text: err instanceof Error ? err.message : "Erreur lors de la mise à jour." });
    } finally {
      setSavingPassword(false);
    }
  };

  const inputClass =
    "w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Paramètres
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gérez votre compte administrateur</p>
      </div>

      <StudioHoursEditor token={token} canEdit={role === "photographe"} />

      {/* Profil */}
      <form onSubmit={handleSaveProfile} className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-5">
        <h2 className="text-white font-medium">Profil admin</h2>

        {profileNotice && (
          <p className={`rounded-xl border px-3 py-2 text-sm ${
            profileNotice.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }`}>
            {profileNotice.text}
          </p>
        )}

        <div>
          <label htmlFor="admin-email" className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Email</label>
          <input
            id="admin-email"
            type="email"
            required
            disabled={loadingProfile}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={`${inputClass} disabled:opacity-50`}
          />
          <p className="text-gray-600 text-xs mt-2">Cet email sert d'identifiant de connexion.</p>
        </div>

        <button
          type="submit"
          disabled={savingProfile || loadingProfile}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60 ${
            profileNotice?.type === "ok"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-[#C9A96E] text-[#0D0D0D] hover:bg-[#D4B87A]"
          }`}>
          {loadingProfile ? "Chargement..." : savingProfile ? "Sauvegarde..." : profileNotice?.type === "ok" ? "✓ Sauvegardé" : "Sauvegarder"}
        </button>
      </form>

      {/* Mot de passe */}
      <form onSubmit={handleChangePassword} className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-5">
        <h2 className="text-white font-medium">Changer le mot de passe</h2>

        {passwordNotice && (
          <p className={`rounded-xl border px-3 py-2 text-sm ${
            passwordNotice.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }`}>
            {passwordNotice.text}
          </p>
        )}

        <div>
          <label htmlFor="current-pw" className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Mot de passe actuel</label>
          <input
            id="current-pw"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-pw" className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Nouveau mot de passe</label>
          <input
            id="new-pw"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirm-pw" className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Confirmer</label>
          <input
            id="confirm-pw"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-60">
          {savingPassword ? "Mise à jour..." : "Mettre à jour"}
        </button>
      </form>
    </div>
  );
}
