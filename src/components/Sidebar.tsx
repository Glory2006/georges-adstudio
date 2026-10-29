import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icons";
import type { IconProps, Page, StateSetter } from "../types";

export function Sidebar({
  activePage,
  setActivePage,
  onLogout,
  pendingCount = 0,
}: {
  activePage: Page;
  setActivePage: StateSetter<Page>;
  onLogout: () => void;
  pendingCount?: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: Page; label: string; icon: (props: IconProps) => ReactNode; badge?: number }> = [
    { id: "dashboard", label: "Dashboard", icon: Icon.Dashboard },
    { id: "reservations", label: "Réservations", icon: Icon.Calendar, badge: pendingCount },
    { id: "types", label: "Types de séances", icon: Icon.Tag },
    { id: "gallery", label: "Galerie", icon: Icon.Photo },
    { id: "disponibilites", label: "Disponibilités", icon: Icon.Clock },
    { id: "historique", label: "Historique", icon: Icon.History },
    { id: "settings", label: "Paramètres", icon: Icon.Settings },
  ];

  const handleNavClick = (id: Page) => {
    setActivePage(id);
    setMobileOpen(false); // ferme le menu après sélection sur mobile
  };

  return (
    <>
      {/* Bouton hamburger — visible uniquement sur mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-white">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Overlay sombre derrière le menu mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-60 min-h-screen bg-[#111111] border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-6 py-7 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[#C9A96E] text-xs uppercase tracking-[0.2em] font-medium">Studio Admin</p>
            <p className="text-white text-lg mt-0.5" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Photographe
            </p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
            <Icon.X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                    ? "bg-[#C9A96E]/10 text-[#C9A96E]"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                  }`}>
                <span className={`absolute left-0 h-5 w-0.5 rounded-full bg-[#C9A96E] transition-opacity ${isActive ? "opacity-100" : "opacity-0"
                  }`} />
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span
                    className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#C9A96E] text-[#0D0D0D] text-[11px] font-semibold flex items-center justify-center tabular-nums"
                    title={`${item.badge} réservation(s) en attente`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-400 hover:bg-red-500/5 transition-all">
            <Icon.Logout className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}