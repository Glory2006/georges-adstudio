import { useState } from "react";
import type { FormEvent } from "react";

export function LoginScreen({
  onLogin,
  error,
  loading,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <p className="text-[#C9A96E] text-xs uppercase tracking-[0.2em] font-medium">Studio Admin</p>
          <h1 className="text-3xl font-light text-white mt-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Connexion
          </h1>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-5 py-2.5 rounded-xl bg-[#C9A96E] text-[#0D0D0D] text-sm font-medium hover:bg-[#D4B87A] transition-colors disabled:opacity-60">
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
