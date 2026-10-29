import type { Photo, Reservation, TypePhoto } from "../types";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
export const TOKEN_STORAGE_KEY = "photo_admin_token";

export async function apiRequest<T>(path: string, token?: string | null, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "Erreur API.";
    throw new Error(message);
  }

  return data as T;
}

export function normalizeReservation(
  reservation: Reservation & { type_photos?: { nom?: string } }
): Reservation {
  return {
    ...reservation,
    type: reservation.type_photos?.nom ?? reservation.type ?? "Séance",
    message: reservation.message ?? "",
  };
}

export function normalizeTypePhotos(typePhotos: TypePhoto[], photos?: Photo[]): TypePhoto[] {
  return typePhotos.map(typePhoto => {
    const nbPhotos = photos
      ? photos.filter(
          photo =>
            photo.type_id === typePhoto.id ||
            photo.type_photos?.id === typePhoto.id ||
            photo.type_photos?.slug === typePhoto.slug
        ).length
      : (typePhoto.nbPhotos ?? 0);
    return { ...typePhoto, nbPhotos };
  });
}
