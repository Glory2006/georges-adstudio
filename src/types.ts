import type { Dispatch, SetStateAction, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;
export type ReservationStatut = "en_attente" | "accepte" | "rejete" | "cloture";
export type FiltreReservation = ReservationStatut | "tous";
export type Page = "dashboard" | "reservations" | "gallery" | "disponibilites" | "types" | "historique" | "settings";
export type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type Reservation = {
  id: string;
  nom_client: string;
  email: string;
  telephone: string;
  type: string;
  date_seance: string;
  heure_seance: string;
  heure_seance_end?: string | null;
  statut: ReservationStatut;
  disponibilite_id?: string | null;
  message: string;
  created_at?: string; // 📅 Date d'enregistrement (ISO 8601)
  updated_at?: string; // 📅 Dernière mise à jour
  type_photos?: { // Retourné par l'API
    nom: string;
    prix_indicatif: number | null;
  };
};

export type TypePhoto = {
  id: string;
  nom: string;
  description?: string | null;
  slug: string;
  prix_indicatif: number | null;
  is_active: boolean;
  nbPhotos: number;
};

export type Dispo = {
  id: string;
  date_dispo: string;
  heure_debut: string;
  heure_fin: string;
  est_reserve: boolean;
  statut?: 'disponible' | 'en_attente' | 'reserve' | 'cloture'; // ← ajout 'cloture'
  reservation_id?: string;
};
export type Photo = {
  id: string;
  type_id?: string;
  url_image: string;
  legende?: string | null;
  ordre?: number;
  is_visible?: boolean;
  type_photos?: {
    id?: string;
    nom?: string;
    slug?: string;
  };
  
};
export type TypePhotoForm = {
  nom: string;
  slug: string;
  description: string;
  prix_indicatif: string;
  is_active: boolean;
};

export interface ActivityLog {
  id: string;
  actor_type: 'client' | 'admin';
  actor_id: string | null;
  action: string;
  entity_type: 'reservation' | 'type_photo' | 'photo' | 'disponibilite';
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_email?: string | null;
}
