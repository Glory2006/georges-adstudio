import { KpiCard, StatusBadge } from "../components/UI";
import type { Reservation, TypePhoto } from "../types";

export function Dashboard({
  reservations,
  typePhotos,
}: {
  reservations: Reservation[];
  typePhotos: TypePhoto[];
}) {
  const enAttente = reservations.filter(r => r.statut === "en_attente").length;
  const acceptees = reservations.filter(r => r.statut === "accepte").length;
  const dernieres = reservations.slice(0, 4);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(today);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Vue d'ensemble
        </h1>
        <p className="text-gray-500 text-sm mt-1">{capitalizedDate}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Réservations totales" value={reservations.length} sub="ce mois" />
        <KpiCard label="En attente"           value={enAttente}           sub="à traiter" accent />
        <KpiCard label="Séances acceptées"    value={acceptees}           sub="confirmées" />
        <KpiCard label="Catégories actives"   value={typePhotos.filter(t => t.is_active).length} sub={`sur ${typePhotos.length}`} />
      </div>

      <div>
        <h2 className="text-lg font-medium text-white mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Dernières demandes
        </h2>
        <div className="space-y-3">
          {dernieres.map(r => (
            <div key={r.id}
              className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 rounded-xl px-5 py-4 hover:border-[#C9A96E]/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-[#C9A96E]/10 flex items-center justify-center text-[#C9A96E] text-sm font-medium">
                  {r.nom_client.charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{r.nom_client}</p>
                  <p className="text-gray-500 text-xs">{r.type} · {r.date_seance}</p>
                </div>
              </div>
              <StatusBadge statut={r.statut} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-white mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Catégories de séances
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {typePhotos.map(t => (
            <div key={t.id}
              className={`bg-[#1A1A1A] border rounded-xl p-4 ${t.is_active ? "border-white/5" : "border-white/5 opacity-50"}`}>
              <p className="text-white font-medium text-sm">{t.nom}</p>
              <p className="text-[#C9A96E] text-2xl font-light mt-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {t.nbPhotos} <span className="text-sm text-gray-500">photos</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">{t.prix_indicatif} FCFA · {t.is_active ? "Active" : "Inactive"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
