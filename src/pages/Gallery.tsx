import { useState, useEffect } from "react";
import type { FormEvent, ChangeEvent, DragEvent } from "react";
import { Icon } from "../components/Icons";
import { ConfirmDeleteModal } from "../components/UI";
import { apiRequest } from "../lib/api";
import type { StateSetter, TypePhoto, Photo } from "../types";

export function Gallery({
  typePhotos,
  setTypePhotos,
  token,
}: {
  typePhotos: TypePhoto[];
  setTypePhotos: StateSetter<TypePhoto[]>;
  token: string | null;
}) {
  const [currentView, setCurrentView] = useState<"list" | "detail" | "add">("list");
  const [selectedType, setSelectedType] = useState<TypePhoto | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États de pagination et carrousels
  const [currentPage, setCurrentPage] = useState(1);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});


  // États du formulaire d'ajout
  const [formTypeId, setFormTypeId] = useState("");
  const [formSource, setFormSource] = useState<"file" | "url">("file");
  const [formUrl, setFormUrl] = useState("");
  const [formFiles, setFormFiles] = useState<Array<{ name: string; base64: string }>>([]);
  const [formLegende, setFormLegende] = useState("");
  const [formOrdre, setFormOrdre] = useState("");
  const [uploading, setUploading] = useState(false);

  // États d'édition en ligne pour les détails de photos
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editLegende, setEditLegende] = useState("");
  const [editOrdre, setEditOrdre] = useState("");

  // États pour la modale de suppression de photos
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Charger les photos du backend
  const fetchPhotos = async () => {
    if (!token) return;
    setLoadingPhotos(true);
    try {
      const data = await apiRequest<{ photos: Photo[] }>("/admin/photos", token);
      setPhotos(data.photos);
    } catch (err) {
      console.error("Erreur lors du chargement des photos:", err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPhotos();
    }
  }, [token]);

  // Ouvrir la vue détaillée d'une catégorie
  const handleSelectType = (type: TypePhoto) => {
    setSelectedType(type);
    setCurrentView("detail");
  };

  useEffect(() => {
    if (typePhotos.length > 0) return;

    const fetchFallbackTypePhotos = async () => {
      try {
        const data = await apiRequest<{ type_photos: TypePhoto[] }>("/type-photos");
        setTypePhotos(data.type_photos.map(typePhoto => ({ ...typePhoto, nbPhotos: 0 })));
      } catch (err) {
        console.error("Erreur lors du chargement des categories:", err);
      }
    };

    void fetchFallbackTypePhotos();
  }, [setTypePhotos, typePhotos.length]);

  useEffect(() => {
    if (currentView === "add" && !formTypeId && typePhotos.length > 0) {
      setFormTypeId(typePhotos[0].id);
    }
  }, [currentView, formTypeId, typePhotos]);
  // Ouvrir le formulaire d'ajout pré-rempli (ou non) avec une catégorie
  const openAddPhoto = (typeId?: string) => {
    const defaultTypeId = typeId || (typePhotos.length > 0 ? typePhotos[0].id : "");
    setFormTypeId(defaultTypeId);
    setFormSource("file");
    setFormUrl("");
    setFormFiles([]);
    setFormLegende("");
    setFormOrdre("");
    setError(null);
    setCurrentView("add");
  };

  // Activer/Désactiver une catégorie (Mettre en ligne / Publier)
  const toggleCategoryActive = async (t: TypePhoto) => {
    if (!token) return;
    try {
      const nextActive = !t.is_active;
      // Appel API en PUT pour modifier le statut d'activité
      await apiRequest(`/admin/type-photos/${t.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ is_active: nextActive }),
      });
      setTypePhotos(prev => prev.map(p => p.id === t.id ? { ...p, is_active: nextActive } : p));
      if (selectedType?.id === t.id) {
        setSelectedType(prev => prev ? { ...prev, is_active: nextActive } : null);
      }
    } catch (err) {
      console.error("Erreur lors de l'activation/désactivation de la catégorie:", err);
    }
  };

  // Activer/Désactiver la visibilité d'une photo individuelle
  const handleToggleVisible = async (photo: Photo) => {
    if (!token) return;
    try {
      const nextVisible = !photo.is_visible;
      await apiRequest(`/admin/photos/${photo.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ is_visible: nextVisible }),
      });
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_visible: nextVisible } : p));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du changement de visibilité de la photo.");
    }
  };

  // Déclencher la modale de suppression d'une photo
  const triggerDeletePhoto = (id: string) => {
    setPhotoToDelete(id);
    setDeleteModalOpen(true);
  };

  // Exécuter la suppression de la photo après validation dans la modale
  const handleDeletePhoto = async () => {
    if (!token || !photoToDelete) return;
    try {
      await apiRequest(`/admin/photos/${photoToDelete}`, token, {
        method: "DELETE",
      });
      // Déterminer la catégorie pour décrémenter son compteur
      const targetPhoto = photos.find(p => p.id === photoToDelete);
      if (targetPhoto) {
        const catId = targetPhoto.type_id || targetPhoto.type_photos?.id;
        if (catId) {
          setTypePhotos(prev => prev.map(t => t.id === catId ? { ...t, nbPhotos: Math.max(0, t.nbPhotos - 1) } : t));
        }
      }
      setPhotos(prev => prev.filter(p => p.id !== photoToDelete));
    } catch (err) {
      console.error("Erreur lors de la suppression de la photo:", err);
      alert("Erreur lors de la suppression de la photo.");
    } finally {
      setDeleteModalOpen(false);
      setPhotoToDelete(null);
    }
  };

  // Commencer l'édition d'une photo
  const startEditPhoto = (photo: Photo) => {
    setEditingPhotoId(photo.id);
    setEditLegende(photo.legende || "");
    setEditOrdre(String(photo.ordre || 0));
  };

  // Enregistrer l'édition d'une photo
  const saveEditPhoto = async (photoId: string) => {
    if (!token) return;
    try {
      await apiRequest(`/admin/photos/${photoId}`, token, {
        method: "PUT",
        body: JSON.stringify({
          legende: editLegende.trim() || null,
          ordre: parseInt(editOrdre) || 0,
        }),
      });
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, legende: editLegende.trim() || null, ordre: parseInt(editOrdre) || 0 } : p));
      setEditingPhotoId(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour des informations de la photo.");
    }
  };

  // Sélectionner des fichiers locaux
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
  };

  // Drag and Drop
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    processFiles(files);
  };

  // Traiter les fichiers images et les encoder en Base64.
  // Certains navigateurs/gestionnaires de fichiers ne renseignent pas
  // file.type pour les JPEG : on se rabat donc sur l'extension.
  const processFiles = (files: FileList) => {
    const maxSize = 10 * 1024 * 1024;
    const imageExtensions = /\.(jpe?g|png|webp|gif)$/i;
    const selectedFiles = Array.from(files);
    const validFiles = selectedFiles.filter(
      f => (f.type.startsWith("image/") || imageExtensions.test(f.name)) && f.size <= maxSize
    );

    const rejectedByType = selectedFiles.filter(
      f => !(f.type.startsWith("image/") || imageExtensions.test(f.name))
    );
    const rejectedBySize = selectedFiles.filter(f => f.size > maxSize);
    if (rejectedByType.length || rejectedBySize.length) {
      const reasons = [];
      if (rejectedByType.length) reasons.push("format non image");
      if (rejectedBySize.length) reasons.push("taille supérieure à 10 Mo");
      setError(`Fichier(s) ignoré(s) : ${reasons.join(" et ")}.`);
    }

    if (validFiles.length === 0) return;

    const loadedFiles: Array<{ name: string; base64: string }> = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          loadedFiles.push({
            name: file.name,
            base64: event.target.result as string,
          });

          if (loadedFiles.length === validFiles.length) {
            setFormFiles(prev => [...prev, ...loadedFiles]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Retirer un fichier sélectionné de la file d'attente d'upload
  const removeSelectedFile = (index: number) => {
    setFormFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Envoi du formulaire d'ajout d'images au backend
  const handleSubmitPhoto = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setUploading(true);
    setError(null);

    try {
      if (formSource === "url") {
        if (!formUrl.trim()) throw new Error("Veuillez entrer une URL d'image.");
        const res = await apiRequest<{ photo: Photo }>("/admin/photos", token, {
          method: "POST",
          body: JSON.stringify({
            type_id: formTypeId,
            url_image: formUrl.trim(),
            legende: formLegende.trim() || null,
            ordre: formOrdre ? parseInt(formOrdre) : 0,
          }),
        });
        setPhotos(prev => [...prev, res.photo]);
        setTypePhotos(prev => prev.map(t => t.id === formTypeId ? { ...t, nbPhotos: t.nbPhotos + 1 } : t));
      } else {
        if (formFiles.length === 0) throw new Error("Veuillez sélectionner au moins une image.");

        // Envoi parallèle de toutes les photos
        const results = await Promise.all(
          formFiles.map((file, index) => {
            const baseOrder = formOrdre ? parseInt(formOrdre) : 0;
            return apiRequest<{ photo: Photo }>("/admin/photos", token, {
              method: "POST",
              body: JSON.stringify({
                type_id: formTypeId,
                url_image: file.base64,
                legende: formLegende.trim() || null,
                ordre: baseOrder + index,
              }),
            });
          })
        );
        const newPhotos = results.map(r => r.photo);
        setPhotos(prev => [...prev, ...newPhotos]);
        setTypePhotos(prev => prev.map(t => t.id === formTypeId ? { ...t, nbPhotos: t.nbPhotos + formFiles.length } : t));
      }

      // Réinitialisation des formulaires
      setFormUrl("");
      setFormFiles([]);
      setFormLegende("");
      setFormOrdre("");

      // Retourner sur la page d'accueil de la galerie (redirection automatique)
      setCurrentView("list");
      setSelectedType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'enregistrement des photos.");
    } finally {
      setUploading(false);
    }
  };

  // Récupérer les photos filtrées par ID de catégorie
  const getCategoryPhotos = (typeId: string) => {
    return photos.filter(
      p => p.type_id === typeId || p.type_photos?.id === typeId
    );
  };

  // ── RENDER 2 : VUE DÉTAILLÉE DE CATÉGORIE ─────────────────────────
  if (currentView === "detail" && selectedType) {
    const catPhotos = getCategoryPhotos(selectedType.id);

    return (
      <div className="space-y-6">
        {/* En-tête de la catégorie détaillée */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => {
                setSelectedType(null);
                setCurrentView("list");
              }}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors mb-2 cursor-pointer">
              ← Retour aux catégories
            </button>
            <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Photos : {selectedType.nom}
            </h1>
            <p className="text-gray-500 text-sm">
              Tarif indicatif : <span className="text-[#C9A96E]">{selectedType.prix_indicatif} FCFA</span> · {catPhotos.length} photo{catPhotos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => openAddPhoto(selectedType.id)}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A96E] text-[#0D0D0D] rounded-xl text-sm font-medium hover:bg-[#D4B87A] transition-colors cursor-pointer">
              <Icon.Plus className="w-4 h-4" />
              Ajouter des photos
            </button>
          </div>
        </div>

        {loadingPhotos ? (
          <div className="text-gray-400 py-12 text-center text-sm">Chargement des photos...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {catPhotos.map(p => (
              <div
                key={p.id}
                className={`bg-[#1A1A1A] border rounded-xl overflow-hidden transition-all duration-300 ${
                  p.is_visible ? "border-white/5" : "border-white/5 opacity-50 bg-[#161616]"
                }`}>
                {/* Visualiseur d'image */}
                <div className="aspect-video w-full bg-black relative group overflow-hidden">
                  <img
                    src={p.url_image}
                    alt={p.legende || ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {!p.is_visible && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 border border-white/10">
                        Masquée (Hors ligne)
                      </span>
                    </div>
                  )}
                </div>

                {/* Formulaire d'édition / Détails */}
                <div className="p-4 space-y-3">
                  {editingPhotoId === p.id ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider">Légende</label>
                        <input
                          type="text"
                          value={editLegende}
                          onChange={e => setEditLegende(e.target.value)}
                          className="w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#C9A96E]/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider">Ordre</label>
                        <input
                          type="number"
                          value={editOrdre}
                          onChange={e => setEditOrdre(e.target.value)}
                          className="w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#C9A96E]/50"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveEditPhoto(p.id)}
                          className="flex-1 py-1.5 rounded-lg bg-[#C9A96E] text-[#0D0D0D] text-xs font-medium hover:bg-[#D4B87A] transition-colors cursor-pointer">
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditingPhotoId(null)}
                          className="flex-1 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 transition-colors cursor-pointer">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-600 text-[10px] uppercase tracking-wider">Légende</p>
                        <p className="text-white text-xs truncate mt-0.5" title={p.legende || ""}>
                          {p.legende || <span className="text-gray-600 italic">Aucune légende</span>}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-2">
                        <span className="text-gray-500 text-xs">
                          Ordre : <span className="text-white font-medium">{p.ordre || 0}</span>
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {/* Bouton bascule de visibilité */}
                          <button
                            onClick={() => handleToggleVisible(p)}
                            className={`p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
                              !p.is_visible && "text-amber-500/80 bg-amber-500/5 hover:text-amber-400"
                            }`}
                            title={p.is_visible ? "Masquer la photo sur le site" : "Rendre la photo visible sur le site"}>
                            {p.is_visible ? (
                              <Icon.Eye className="w-3.5 h-3.5" />
                            ) : (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            )}
                          </button>
                          
                          {/* Bouton modifier */}
                          <button
                            onClick={() => startEditPhoto(p)}
                            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Modifier les détails de la photo">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          
                          {/* Bouton supprimer */}
                          <button
                            onClick={() => triggerDeletePhoto(p.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Supprimer la photo de la galerie">
                            <Icon.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {catPhotos.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-500 border border-white/5 rounded-2xl bg-[#1A1A1A]">
                <Icon.Photo className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-lg font-medium" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Aucune photo
                </p>
                <p className="text-sm text-gray-600 mt-1 max-w-xs mx-auto">
                  Cette catégorie ne contient aucune photo pour le moment. Cliquez sur le bouton "Ajouter des photos" pour commencer à l'enrichir.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modale de confirmation de suppression de photo */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="Supprimer la photo"
          description="Êtes-vous sûr de vouloir supprimer cette photo de votre galerie ? Cette opération supprimera définitivement l'enregistrement de l'image de la base de données Supabase."
          onConfirm={handleDeletePhoto}
          onCancel={() => {
            setDeleteModalOpen(false);
            setPhotoToDelete(null);
          }}
        />
      </div>
    );
  }

  // ── RENDER 3 : FORMULAIRE D'AJOUT DE PHOTOS (PLEINE LARGEUR) ──────
  if (currentView === "add") {
    return (
      // Suppression de max-w-2xl pour permettre au formulaire de prendre toute la largeur disponible
      <div className="space-y-6">
        <div className="space-y-1">
          <button
            onClick={() => {
              setCurrentView(selectedType ? "detail" : "list");
            }}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors mb-2 cursor-pointer">
            ← Retour
          </button>
          <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Ajouter de nouvelles photos
          </h1>
          <p className="text-gray-500 text-sm">
            Remplissez le formulaire ci-dessous pour insérer des images dans votre galerie.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-5">
          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmitPhoto} className="space-y-5">
            {/* Sélection de la catégorie */}
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                Catégorie (Type de séance) <span className="text-[#C9A96E]">*</span>
              </label>
              <select
                value={formTypeId}
                onChange={e => setFormTypeId(e.target.value)}
                required
                className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors">
                <option value="" disabled>Sélectionner une catégorie</option>
                {typePhotos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nom} {!t.is_active ? "(inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Source de l'image (Locale ou URL) */}
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2.5">
                Source de l'image
              </label>
              <div className="flex gap-2 p-1 bg-[#0D0D0D] border border-white/5 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setFormSource("file")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    formSource === "file" ? "bg-[#C9A96E] text-[#0D0D0D]" : "text-gray-400 hover:text-white"
                  }`}>
                  Fichiers locaux
                </button>
                <button
                  type="button"
                  onClick={() => setFormSource("url")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    formSource === "url" ? "bg-[#C9A96E] text-[#0D0D0D]" : "text-gray-400 hover:text-white"
                  }`}>
                  Lien URL externe
                </button>
              </div>
            </div>

            {/* Uploader local */}
            {formSource === "file" && (
              <div className="space-y-3">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("fileInput")?.click()}
                  className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-[#C9A96E]/30 transition-colors cursor-pointer bg-[#0D0D0D]">
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Icon.Plus className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Glissez-déposez des photos ou cliquez pour explorer</p>
                  <p className="text-gray-600 text-xs mt-1">Images JPG, PNG, WEBP · Max 10 Mo par image</p>
                </div>

                {/* Liste d'images sélectionnées avec miniatures de prévisualisation */}
                {formFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Images sélectionnées ({formFiles.length})</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {formFiles.map((file, i) => (
                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group bg-black">
                          <img src={file.base64} alt={file.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(i)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow"
                            title="Retirer cette image">
                            <Icon.X className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-0.5 truncate text-[10px] text-gray-400">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* URL externe */}
            {formSource === "url" && (
              <div className="space-y-4">
                <div>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://exemple.com/mon-image.jpg"
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors placeholder:text-gray-600"
                  />
                </div>

                {formUrl.trim() && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Aperçu de l'image URL</p>
                    <div className="aspect-video w-48 rounded-xl overflow-hidden border border-white/10 bg-black">
                      <img
                        src={formUrl}
                        alt="Aperçu de l'image"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Légende */}
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                Légende (Optionnelle)
              </label>
              <input
                type="text"
                value={formLegende}
                onChange={e => setFormLegende(e.target.value)}
                placeholder="ex : Portrait Noir et Blanc, Cérémonie de mariage…"
                className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors placeholder:text-gray-600"
              />
            </div>

            {/* Ordre */}
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                Ordre d'affichage (Optionnel)
              </label>
              <input
                type="number"
                value={formOrdre}
                onChange={e => setFormOrdre(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A96E]/50 transition-colors placeholder:text-gray-600"
              />
              <p className="text-gray-600 text-[10px] mt-1">Les photos sont triées par ordre croissant. La valeur par défaut est 0.</p>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentView(selectedType ? "detail" : "list");
                }}
                className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer">
                Annuler
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl bg-[#C9A96E] text-[#0D0D0D] hover:bg-[#D4B87A] text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer">
                {uploading ? "Enregistrement en cours..." : "Enregistrer la photo"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── RENDER 1 : VUE DE DÉPART (LISTE DES BLOCS DE CATÉGORIES) ──────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Galerie
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos photos par catégories de séances</p>
        </div>
        <button
          onClick={() => openAddPhoto()}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A96E] text-[#0D0D0D] rounded-xl text-sm font-medium hover:bg-[#D4B87A] transition-colors cursor-pointer">
          <Icon.Plus className="w-4 h-4" />
          Ajouter une photo
        </button>
      </div>

      {loadingPhotos ? (
        <div className="text-gray-400 py-16 text-center text-sm">Chargement de la galerie...</div>
      ) : (() => {
        const ITEMS_PER_PAGE = 4;
        const totalPages = Math.ceil(typePhotos.length / ITEMS_PER_PAGE);
        const activePageNum = Math.min(currentPage, Math.max(1, totalPages));
        const paginatedTypes = typePhotos.slice(
          (activePageNum - 1) * ITEMS_PER_PAGE,
          activePageNum * ITEMS_PER_PAGE
        );

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedTypes.map(t => {
                const catPhotos = getCategoryPhotos(t.id);
                return (
                  <div
                    key={t.id}
                    className={`bg-[#1A1A1A] border rounded-2xl p-5 transition-all duration-300 ${
                      t.is_active 
                        ? "border-white/5 hover:border-[#C9A96E]/30" 
                        : "border-red-500/10 opacity-50 bg-[#161616]"
                    }`}>
                    
                    {/* Header du bloc */}
                    <div className="flex items-start justify-between mb-4 gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-medium text-base">{t.nom}</h3>
                          {!t.is_active && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 select-none">
                              Invisible en ligne
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-xs mt-0.5">/{t.slug}</p>
                      </div>
                    </div>

                    {/* Aperçu photos réelles sous forme de carrousel */}
                    <div className="mb-4">
                      {catPhotos.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-gray-600 text-xs border border-dashed border-white/5 rounded-xl bg-black/20">
                          Aucune photo dans cette catégorie
                        </div>
                      ) : (
                        (() => {
                          const totalPhotos = catPhotos.length;
                          const rawIndex = carouselIndices[t.id] || 0;
                          const activeIndex = Math.min(rawIndex, Math.max(0, totalPhotos - 1));
                          const activePhoto = catPhotos[activeIndex];

                          const handlePrev = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setCarouselIndices(prev => ({
                              ...prev,
                              [t.id]: (activeIndex - 1 + totalPhotos) % totalPhotos,
                            }));
                          };

                          const handleNext = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setCarouselIndices(prev => ({
                              ...prev,
                              [t.id]: (activeIndex + 1) % totalPhotos,
                            }));
                          };

                          return (
                            <div className="relative h-48 w-full rounded-xl overflow-hidden border border-white/5 group bg-black">
                              <img
                                src={activePhoto.url_image}
                                alt={activePhoto.legende || ""}
                                className="w-full h-full object-cover"
                              />
                              
                              {/* Contrôles du carrousel */}
                              {totalPhotos > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-white/10"
                                    title="Photo précédente"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleNext}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-white/10"
                                    title="Photo suivante"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                  </button>
                                </>
                              )}

                              {/* Info Overlay */}
                              <div className="absolute bottom-0 inset-x-0 bg-black/70 px-3 py-1.5 flex items-center justify-between text-[11px] text-gray-300">
                                <span className="truncate max-w-[70%]" title={activePhoto.legende || ""}>
                                  {activePhoto.legende || <span className="italic text-gray-500">Sans légende</span>}
                                </span>
                                <span className="font-medium flex-shrink-0">
                                  {activeIndex + 1} / {totalPhotos}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Footer du bloc */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">{catPhotos.length} photo{catPhotos.length !== 1 ? "s" : ""}</span>
                        <span className="text-[#C9A96E] font-medium">{t.prix_indicatif} FCFA</span>
                      </div>
                      <div className="flex gap-2">
                        {/* Bouton Publier sur chaque bloc */}
                        <button
                          onClick={() => toggleCategoryActive(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                            t.is_active 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" 
                              : "bg-[#C9A96E] text-[#0D0D0D] hover:bg-[#D4B87A]"
                          }`}
                          title={t.is_active ? "Dépublier de la vitrine" : "Publier sur le site client"}>
                          {t.is_active ? (
                            <>
                              <Icon.Check className="w-3 h-3 text-emerald-400" />
                              <span>Publié</span>
                            </>
                          ) : (
                            <span>Publier</span>
                          )}
                        </button>

                        {/* Gérer/Voir les photos */}
                        <button
                          onClick={() => handleSelectType(t)}
                          className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Gérer les photos de cette catégorie">
                          <Icon.Eye className="w-4 h-4" />
                        </button>
                        {/* Ajouter directement une photo dans ce bloc */}
                        <button
                          onClick={() => openAddPhoto(t.id)}
                          className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Ajouter directement une photo à cette catégorie">
                          <Icon.Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 pt-5 mt-4">
                <button
                  type="button"
                  disabled={activePageNum === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-[#1A1A1A] border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-medium disabled:opacity-40 disabled:hover:text-gray-400 cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Précédent
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pNum = idx + 1;
                    const isCurrent = pNum === activePageNum;
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-[#C9A96E] text-[#0D0D0D]"
                            : "bg-[#1A1A1A] border border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={activePageNum === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 rounded-xl bg-[#1A1A1A] border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-medium disabled:opacity-40 disabled:hover:text-gray-400 cursor-pointer flex items-center gap-1.5"
                >
                  Suivant
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Zone d'upload rapide */}
      <div
        onClick={() => openAddPhoto()}
        className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-[#C9A96E]/30 transition-colors cursor-pointer bg-[#1A1A1A]/50">
        <Icon.Plus className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Glissez des photos ici ou cliquez pour en ajouter</p>
        <p className="text-gray-600 text-xs mt-1">Images JPG, PNG, WEBP · Max 10 Mo par fichier</p>
      </div>

      {/* Modale de confirmation de suppression de photo */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Supprimer la photo"
        description="Êtes-vous sûr de vouloir supprimer cette photo de votre galerie ? Cette opération supprimera définitivement l'enregistrement de l'image de la base de données en ligne (Supabase)."
        onConfirm={handleDeletePhoto}
        onCancel={() => {
          setDeleteModalOpen(false);
          setPhotoToDelete(null);
        }}
      />
    </div>
  );
}
