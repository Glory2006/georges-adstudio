import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icons";
import { ConfirmDeleteModal } from "../components/UI";
import { apiRequest } from "../lib/api";
import type { StateSetter, TypePhoto, TypePhotoForm } from "../types";

export function TypesPhotos({
    typePhotos,
    setTypePhotos,
    token,
}: {
    typePhotos: TypePhoto[];
    setTypePhotos: StateSetter<TypePhoto[]>;
    token: string | null;
}) {
    const emptyForm: TypePhotoForm = {
        nom: "", slug: "", description: "", prix_indicatif: "", is_active: true,
    };

    const [form, setForm] = useState<TypePhotoForm>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const PER_PAGE = 4;
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(typePhotos.length / PER_PAGE);
    const paginatedTypes = typePhotos.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

    // États pour la modale de confirmation de suppression
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    // Auto-génère le slug depuis le nom (lowercase, tirets, sans accents)
    const slugify = (str: string) =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const handleNomChange = (val: string) => {
        setForm(f => ({
            ...f,
            nom: val,
            slug: editingId ? f.slug : slugify(val), // slug auto seulement en création
        }));
    };

    const startEdit = (t: TypePhoto) => {
        setEditingId(t.id);
        setForm({
            nom: t.nom,
            slug: t.slug,
            description: t.description ?? "",
            prix_indicatif: t.prix_indicatif != null ? String(t.prix_indicatif) : "",
            is_active: t.is_active,
        });
        setError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError(null);
        setPage(0);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.nom.trim() || !form.slug.trim()) return;
        setSaving(true);
        setError(null);

        const payload = {
            nom: form.nom.trim(),
            slug: form.slug.trim(),
            description: form.description.trim() || null,
            prix_indicatif: form.prix_indicatif ? parseFloat(form.prix_indicatif) : null,
            is_active: form.is_active,
        };

        try {
            if (editingId) {
                const res = await apiRequest<{ type_photo: TypePhoto }>(`/admin/type-photos/${editingId}`, token, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                setTypePhotos(prev => prev.map(p => p.id === editingId ? { ...p, ...res.type_photo } : p));
            } else {
                const res = await apiRequest<{ type_photo: TypePhoto }>("/admin/type-photos", token, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                setTypePhotos(prev => [{ ...res.type_photo, nbPhotos: 0 }, ...prev]);
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            cancelEdit();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    };

    // Ouvre la modale de suppression en enregistrant l'ID ciblé
    const triggerDelete = (id: string) => {
        setIdToDelete(id);
        setDeleteModalOpen(true);
    };

    // Exécute la suppression après validation dans la modale
    const handleDelete = async () => {
        if (!idToDelete) return;
        try {
            await apiRequest(`/admin/type-photos/${idToDelete}`, token, { method: "DELETE" });
            setTypePhotos(prev => prev.filter(t => t.id !== idToDelete));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
        } finally {
            setDeleteModalOpen(false);
            setIdToDelete(null);
            setPage(0);
        }
    };

    const handleToggleActive = async (t: TypePhoto) => {
        try {
            await apiRequest(`/admin/type-photos/${t.id}`, token, {
                method: "PUT",
                body: JSON.stringify({ is_active: !t.is_active }),
            });
            setTypePhotos(prev => prev.map(p => p.id === t.id ? { ...p, is_active: !p.is_active } : p));
        } catch (err) { console.error("Erreur lors du changement de statut :", err);}
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Types de séances
                </h1>
                <p className="text-gray-500 text-sm mt-1">Catégories proposées aux clients sur le site</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* ── FORMULAIRE ── */}
                <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-5">
                    <h2 className="text-white font-medium" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {editingId ? "Modifier le type" : "Nouveau type"}
                    </h2>

                    {error && (
                        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {error}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nom */}
                        <div>
                            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                                Nom <span className="text-[#C9A96E]">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.nom}
                                onChange={e => handleNomChange(e.target.value)}
                                placeholder="ex : Mariage, Portrait, Famille…"
                                required
                                className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors placeholder:text-gray-600"
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                                Slug <span className="text-[#C9A96E]">*</span>
                                <span className="ml-2 normal-case text-gray-600 text-xs tracking-normal font-normal">
                                    (généré automatiquement)
                                </span>
                            </label>
                            <div className="flex items-center bg-[#0D0D0D] border border-white/10 rounded-xl overflow-hidden focus-within:border-[#C9A96E]/50 transition-colors">
                                <span className="px-3 text-gray-600 text-sm select-none">/</span>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                                    placeholder="mariage"
                                    required
                                    className="flex-1 bg-transparent py-2.5 pr-4 text-white text-sm focus:outline-none placeholder:text-gray-600"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                                Description
                            </label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Courte description affichée sur le site…"
                                rows={3}
                                className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors resize-none placeholder:text-gray-600"
                            />
                        </div>

                        {/* Prix indicatif */}
                        <div>
                            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                                Prix indicatif (FCFA)
                            </label>
                            <div className="flex items-center bg-[#0D0D0D] border border-white/10 rounded-xl overflow-hidden focus-within:border-[#C9A96E]/50 transition-colors">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.prix_indicatif}
                                    onChange={e => setForm(f => ({ ...f, prix_indicatif: e.target.value }))}
                                    placeholder="0"
                                    className="flex-1 bg-transparent px-4 py-2.5 text-white text-sm focus:outline-none placeholder:text-gray-600"
                                />
                                <span className="px-3 text-gray-600 text-sm select-none">FCFA</span>
                            </div>
                        </div>

                        {/* Actif toggle */}
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <p className="text-sm text-white">Visible sur le site</p>
                                <p className="text-xs text-gray-500 mt-0.5">Les clients peuvent choisir ce type de séance</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.is_active ? "bg-[#C9A96E]" : "bg-white/10"
                                    }`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${form.is_active ? "left-5" : "left-0.5"
                                    }`} />
                            </button>
                        </div>

                        {/* Boutons */}
                        <div className="flex gap-3 pt-1">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors">
                                    Annuler
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${saved
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-[#C9A96E] text-[#0D0D0D] hover:bg-[#D4B87A] disabled:opacity-60"
                                    }`}>
                                {saved ? "✓ Enregistré" : saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer le type"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── LISTE DES TYPES EXISTANTS ── */}
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                        {typePhotos.length} type{typePhotos.length !== 1 ? "s" : ""} enregistré{typePhotos.length !== 1 ? "s" : ""}
                    </p>

                    {typePhotos.length === 0 && (
                        <div className="text-center py-16 text-gray-600">
                            <p className="text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Aucun type créé</p>
                            <p className="text-sm mt-1">Utilisez le formulaire pour en ajouter un.</p>
                        </div>
                    )}

                    {paginatedTypes.map(t => (
                        <div
                            key={t.id}
                            className={`bg-[#1A1A1A] border rounded-xl px-5 py-4 transition-all ${editingId === t.id
                                    ? "border-[#C9A96E]/40 bg-[#C9A96E]/5"
                                    : "border-white/5 hover:border-[#C9A96E]/20"
                                } ${!t.is_active ? "opacity-50" : ""}`}>

                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-white text-sm font-medium truncate">{t.nom}</p>
                                        {!t.is_active && (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500">
                                                Inactif
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 text-xs mt-0.5">/{t.slug}</p>
                                    {t.description && (
                                        <p className="text-gray-500 text-xs mt-1 line-clamp-1">{t.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {t.prix_indicatif != null && (
                                        <span className="text-[#C9A96E] text-xs mr-2">{t.prix_indicatif} FCFA</span>
                                    )}
                                    {/* Toggle actif inline */}
                                    <button
                                        onClick={() => handleToggleActive(t)}
                                        className={`relative w-8 h-4 rounded-full transition-colors ${t.is_active ? "bg-[#C9A96E]" : "bg-white/10"
                                            }`}
                                        title={t.is_active ? "Désactiver" : "Activer"}>
                                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${t.is_active ? "left-4" : "left-0.5"
                                            }`} />
                                    </button>
                                    {/* Modifier */}
                                    <button
                                        onClick={() => startEdit(t)}
                                        className="w-7 h-7 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center ml-1"
                                        title="Modifier">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                    {/* Supprimer */}
                                    <button
                                        onClick={() => triggerDelete(t.id)}
                                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center"
                                        title="Supprimer">
                                        <Icon.Trash className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
                                <span className="text-gray-600 text-xs">{t.nbPhotos} photo{t.nbPhotos !== 1 ? "s" : ""}</span>
                            </div>
                        </div>
                    ))}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-500">
                                {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, typePhotos.length)} / {typePhotos.length} types
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/10 text-gray-400 flex items-center justify-center hover:border-[#C9A96E]/40 hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-default transition-all"
                                    aria-label="Page précédente">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6"/></svg>
                                </button>
                                <div className="flex items-center gap-1.5">
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i)}
                                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === page ? "bg-[#C9A96E]" : "bg-white/10 hover:bg-white/20"}`}
                                            aria-label={`Page ${i + 1}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/10 text-gray-400 flex items-center justify-center hover:border-[#C9A96E]/40 hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-default transition-all"
                                    aria-label="Page suivante">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Modale de confirmation de suppression de catégorie */}
            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                title="Supprimer la catégorie"
                description="Êtes-vous sûr de vouloir supprimer cette catégorie de séance ? Toutes les photos associées dans la galerie seront également supprimées définitivement de la base de données en ligne (Supabase)."
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setIdToDelete(null);
                }}
            />
        </div>
    );
}
