import { useCallback, useEffect, useState } from "react";

import { LoginScreen } from "./components/LoginScreen";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Reservations } from "./pages/Reservations";
import { Gallery } from "./pages/Gallery";
import { Disponibilites } from "./pages/Disponibilites";
import { Settings } from "./pages/Settings";
import { TypesPhotos } from "./pages/TypesPhotos";
import { Historique } from "./pages/Historique";
import { StudioHoursEditor } from "./components/StudioHoursEditor";
import { apiRequest, normalizeReservation, normalizeTypePhotos, TOKEN_STORAGE_KEY } from "./lib/api";

import type { Dispo, Page, Reservation, ReservationStatut, TypePhoto } from "./types";

export default function App() {
  const [activePage, setActivePage]     = useState<Page>("dashboard");
  const [token, setToken]               = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState<string | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [typePhotos, setTypePhotos]     = useState<TypePhoto[]>([]);
  const [dispos, setDispos]             = useState<Dispo[]>([]);
  const [adminRole, setAdminRole]       = useState<"photographe" | "developer" | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setReservations([]);
    setTypePhotos([]);
    setDispos([]);
    setAdminRole(null);
  }, []);

  const loadData = useCallback(async (authToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [reservationsData, typePhotosData, disposData] = await Promise.all([
        apiRequest<{ reservations: Array<Reservation & { type_photos?: { nom?: string } }> }>("/admin/reservations", authToken),
        apiRequest<{ type_photos: TypePhoto[] }>("/admin/type-photos", authToken),
        apiRequest<{ disponibilites: Dispo[] }>("/admin/disponibilites", authToken),
      ]);
      setReservations(reservationsData.reservations.map(normalizeReservation));
      setTypePhotos(normalizeTypePhotos(typePhotosData.type_photos));
      setDispos(disposData.disponibilites);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les données.";
      setError(message);
      if (message.toLowerCase().includes("token")) logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

useEffect(() => {
  if (!token) return;

  void apiRequest<{ admin: { role?: "photographe" | "developer" } }>("/admin/me", token)
    .then(data => setAdminRole(data.admin?.role === "developer" ? "developer" : "photographe"))
    .catch(() => undefined);
  
  const interval = setInterval(() => {
    void loadData(token);
  }, 30000); // ← rafraîchit toutes les 30 secondes

  return () => clearInterval(interval);
}, [token, loadData]);

  const handleLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await apiRequest<{ token: string }>("/admin/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setShowHoursModal(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoginLoading(false);
    }
  };

  const updateReservationStatut = async (id: string, statut: ReservationStatut) => {
    if (!token) return;
    await apiRequest<{ reservation: Reservation }>(`/admin/reservations/${id}/statut`, token, {
      method: "PATCH",
      body: JSON.stringify({ statut }),
    });
    await loadData(token);
  };

  const updateReservationSchedule = async (id: string, payload: { date_seance: string; heure_seance: string }) => {
    if (!token) return;
    await apiRequest<{ reservation: Reservation }>(`/admin/reservations/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await loadData(token);
  };

  const createClientSlot = async (payload: {
    date_dispo: string; heure_debut: string; heure_fin: string;
    nom_client: string; email: string; telephone: string;
    type_photo_id: string; message?: string;
  }) => {
    if (!token) return;
    await apiRequest("/admin/disponibilites/client", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadData(token);
  };

  const pendingCount = reservations.filter(r => r.statut === "en_attente").length;

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":      return <Dashboard reservations={reservations} typePhotos={typePhotos} />;
      case "reservations":   return <Reservations reservations={reservations} setReservations={setReservations} onUpdateStatut={updateReservationStatut} onUpdateSchedule={updateReservationSchedule} onRefresh={() => token && loadData(token)}/>;
      case "types": return <TypesPhotos typePhotos={typePhotos} setTypePhotos={setTypePhotos} token={token} />;
      case "gallery":        return <Gallery typePhotos={typePhotos} setTypePhotos={setTypePhotos} token={token} />;
      case "disponibilites": return <Disponibilites dispos={dispos} setDispos={setDispos} reservations={reservations} typePhotos={typePhotos} onCreateClientSlot={createClientSlot}/>;
      case "historique": return <Historique token={token} />;
      case "settings":       return <Settings token={token} role={adminRole} />;
      default:               return <Dashboard reservations={reservations} typePhotos={typePhotos} />;
    }
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />;
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen bg-[#0D0D0D]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={logout} pendingCount={pendingCount} />
        <main className="lg:ml-60 px-4 md:px-6 lg:px-8 pb-8 min-h-screen pt-16 lg:pt-8 overflow-x-hidden">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {isLoading && (
            <div className="mb-5 rounded-xl border border-white/5 bg-[#1A1A1A] px-4 py-3 text-sm text-gray-400">
              Chargement des données...
            </div>
          )}
          {renderPage()}
          {showHoursModal && adminRole === "photographe" && (
            <StudioHoursEditor token={token} canEdit modal onClose={() => setShowHoursModal(false)} />
          )}
        </main>
      </div>
    </>
  );
}
