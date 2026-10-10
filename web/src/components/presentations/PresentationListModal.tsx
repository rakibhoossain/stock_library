"use client";

import React, { useState, useCallback } from "react";
import { Presentation } from "@/types/fabric";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Presentation as PresentationIcon,
  Play,
  Filter,
  Plus,
  Trash2,
  Pencil,
  Layers,
  Search,
  Loader2,
  PhoneCall,
} from "lucide-react";

interface PresentationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentations: Presentation[];
  onRefresh: () => Promise<void>;
  onFilterByPresentation: (presentationId: string) => void;
  activePresentationId?: string;
}

type FormTab = "general" | "welcome" | "closing";

export const PresentationListModal: React.FC<PresentationListModalProps> = ({
  isOpen,
  onClose,
  presentations,
  onRefresh,
  onFilterByPresentation,
  activePresentationId,
}) => {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FormTab>("general");

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formBuyer, setFormBuyer] = useState("");
  const [formSeason, setFormSeason] = useState("SS28");
  const [formPresenter, setFormPresenter] = useState("");
  const [formWelcomeNotes, setFormWelcomeNotes] = useState("");
  const [formClosingNotes, setFormClosingNotes] = useState("");
  const [formContactInfo, setFormContactInfo] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetFormState = useCallback(() => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormTitle("");
    setFormBuyer("");
    setFormSeason("SS28");
    setFormPresenter("");
    setFormWelcomeNotes("");
    setFormClosingNotes("");
    setFormContactInfo("");
    setActiveTab("general");
    setError(null);
    setIsSubmitting(false);
  }, []);

  const resetAllState = useCallback(() => {
    setSearch("");
    setDeletingId(null);
    resetFormState();
  }, [resetFormState]);


  const filteredPresentations = presentations.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.buyer_name && p.buyer_name.toLowerCase().includes(q)) ||
      (p.season && p.season.toLowerCase().includes(q))
    );
  });

  const handleOpenCreate = () => {
    resetFormState();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Presentation) => {
    setEditingId(p.id);
    setFormTitle(p.title || "");
    setFormBuyer(p.buyer_name || "");
    setFormSeason(p.season || "SS28");
    setFormPresenter(p.presenter_name || "");
    setFormWelcomeNotes(p.welcome_notes || "");
    setFormClosingNotes(p.closing_notes || "");
    setFormContactInfo(p.contact_info || "");
    setActiveTab("general");
    setError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    resetFormState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setError("Please enter a presentation title.");
      setActiveTab("general");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: formTitle.trim(),
      buyer_name: formBuyer.trim() || undefined,
      season: formSeason.trim() || undefined,
      presenter_name: formPresenter.trim() || undefined,
      welcome_notes: formWelcomeNotes.trim() || undefined,
      closing_notes: formClosingNotes.trim() || undefined,
      contact_info: formContactInfo.trim() || undefined,
    };

    try {
      if (editingId) {
        await api.updatePresentation(editingId, payload);
      } else {
        await api.createPresentation(payload);
      }
      await onRefresh();
      handleCloseForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save presentation deck");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlay = (presentation: Presentation) => {
    if (presentation.item_count === 0) {
      alert("This presentation has no fabric swatches assigned yet. Select fabrics from the catalog and add them first!");
      return;
    }
    onClose();
    // Launch dedicated presentation page in a new window/tab so internal data is never exposed
    window.open(`/presentations?id=${presentation.id}`, "_blank");
  };

  const handleDelete = async (presentation: Presentation) => {
    if (!confirm(`Are you sure you want to delete presentation "${presentation.title}"?`)) return;
    setDeletingId(presentation.id);
    try {
      await api.deletePresentation(presentation.id);
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete presentation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetAllState();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pr-14 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <PresentationIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Buyer Presentation Decks
                </DialogTitle>
                <p className="text-xs text-zinc-500 truncate">
                  Organize swatches into curated decks and run interactive slide presentations.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="shrink-0 rounded-xl text-xs h-9 bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Deck
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Create / Edit Form Modal Segment */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50 space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    {editingId ? "Edit Presentation Deck" : "Create New Presentation Deck"}
                  </span>
                  {editingId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                      Updating Deck
                    </span>
                  )}
                </div>

                {/* Section Tabs */}
                <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/80 p-0.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/40">
                  <button
                    type="button"
                    onClick={() => setActiveTab("general")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      activeTab === "general"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-indigo-600"
                    }`}
                  >
                    1. General Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("welcome")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      activeTab === "welcome"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-indigo-600"
                    }`}
                  >
                    2. Welcome Slide
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("closing")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      activeTab === "closing"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-indigo-600"
                    }`}
                  >
                    3. Closing Slide
                  </button>
                </div>
              </div>

              {/* Tab 1: General Info */}
              {activeTab === "general" && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Deck Title *
                      </label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Zara SS28 Outerwear & Tailoring"
                        className="h-9 text-xs rounded-lg bg-white dark:bg-zinc-900"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Buyer / Client Brand
                      </label>
                      <Input
                        value={formBuyer}
                        onChange={(e) => setFormBuyer(e.target.value)}
                        placeholder="e.g. Inditex / Zara"
                        className="h-9 text-xs rounded-lg bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Season / Collection
                      </label>
                      <Input
                        value={formSeason}
                        onChange={(e) => setFormSeason(e.target.value)}
                        placeholder="e.g. SS28"
                        className="h-9 text-xs rounded-lg bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Presenter / Curated By
                      </label>
                      <Input
                        value={formPresenter}
                        onChange={(e) => setFormPresenter(e.target.value)}
                        placeholder="e.g. Textile R&D Sourcing Division"
                        className="h-9 text-xs rounded-lg bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Welcome Slide */}
              {activeTab === "welcome" && (
                <div className="space-y-2.5 animate-in fade-in">
                  <div className="text-[11px] text-zinc-700 dark:text-zinc-300 font-semibold">
                    Cover Slide: Introduction & Welcome Message
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Welcome Message / Collection Overview
                    </label>
                    <textarea
                      value={formWelcomeNotes}
                      onChange={(e) => setFormWelcomeNotes(e.target.value)}
                      rows={3}
                      placeholder="e.g. Welcome to our seasonal fabric showcase. This collection highlights premium circular knits, stretch poplins, and low-impact dyes specially tailored for your SS28 line."
                      className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Displayed on Slide #1 before starting swatch walkthroughs.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Closing Slide */}
              {activeTab === "closing" && (
                <div className="space-y-2.5 animate-in fade-in">
                  <div className="text-[11px] text-zinc-700 dark:text-zinc-300 font-semibold">
                    Final Slide: Closing Notes & Direct Inquiries
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Thank You & Next Steps Notes
                    </label>
                    <textarea
                      value={formClosingNotes}
                      onChange={(e) => setFormClosingNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. We appreciate your partnership. Physical swatch cards, hanger samples, and customized lab dips are available upon request with a 48h turnaround."
                      className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Contact Information & Inquiries
                    </label>
                    <div className="relative">
                      <PhoneCall className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <Input
                        value={formContactInfo}
                        onChange={(e) => setFormContactInfo(e.target.value)}
                        placeholder="e.g. sample-desk@texgroup.com • +880 1700-000000"
                        className="h-9 text-xs pl-8 rounded-lg bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

              <div className="flex items-center justify-between pt-1 border-t border-indigo-200/50 dark:border-indigo-800/40">
                <div className="text-[11px] text-zinc-500">
                  {editingId ? "Updating existing deck record" : "Will create deck ready for swatch assignment"}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseForm}
                    className="h-8 text-xs rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="h-8 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : null}
                    {editingId ? "Save Changes" : "Create Deck"}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter presentation decks by name, buyer, season..."
              className="pl-9 h-9 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            />
          </div>

          {/* Presentations List */}
          {presentations.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 space-y-2 border border-dashed rounded-xl dark:border-zinc-800">
              <PresentationIcon className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-semibold">No presentations created yet</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Click &quot;New Deck&quot; to create your first buyer presentation, then assign fabrics from the catalog.
              </p>
            </div>
          ) : filteredPresentations.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No presentations match your search.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPresentations.map((p) => {
                const isFiltered = activePresentationId === p.id;
                const isDeleting = deletingId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isFiltered
                        ? "border-indigo-500/60 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {p.title}
                        </span>
                        {p.season && (
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                            {p.season}
                          </span>
                        )}
                        {isFiltered && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider">
                            Active Filter
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                        {p.buyer_name && (
                          <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                            Buyer: {p.buyer_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3 text-indigo-500" />
                          <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">
                            {p.item_count}
                          </strong>{" "}
                          swatches
                        </span>
                        {p.presenter_name && (
                          <span className="hidden sm:inline text-zinc-400 truncate max-w-[180px]">
                            By: {p.presenter_name}
                          </span>
                        )}
                        <span className="hidden sm:inline text-zinc-400">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {/* Play Slides Button */}
                      <Button
                        size="sm"
                        onClick={() => handlePlay(p)}
                        disabled={p.item_count === 0}
                        className="h-8 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-xs"
                        title={
                          p.item_count === 0
                            ? "No swatches in deck"
                            : "Open presentation in dedicated page"
                        }
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Play Slides
                      </Button>

                      {/* Edit Deck Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        className="h-8 rounded-lg text-xs font-semibold gap-1 text-zinc-700 dark:text-zinc-300"
                        title="Edit presentation deck details, welcome slide, and closing slide"
                      >
                        <Pencil className="h-3.5 w-3.5 text-zinc-500" />
                        Edit
                      </Button>

                      {/* Filter by this deck button */}
                      <Button
                        variant={isFiltered ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          onFilterByPresentation(p.id);
                          onClose();
                        }}
                        className={`h-8 rounded-lg text-xs font-semibold gap-1 ${
                          isFiltered
                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                            : ""
                        }`}
                        title="Filter main table to show only items in this presentation"
                      >
                        <Filter className="h-3.5 w-3.5" />
                        {isFiltered ? "Filtered" : "Filter"}
                      </Button>

                      {/* Delete deck */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(p)}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete presentation"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
