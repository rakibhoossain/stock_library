"use client";

import React, { useState } from "react";
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
  Layers,
  Search,
  Loader2,
} from "lucide-react";

interface PresentationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentations: Presentation[];
  onRefresh: () => Promise<void>;
  onFilterByPresentation: (presentationId: string) => void;
  activePresentationId?: string;
}

export const PresentationListModal: React.FC<PresentationListModalProps> = ({
  isOpen,
  onClose,
  presentations,
  onRefresh,
  onFilterByPresentation,
  activePresentationId,
}) => {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New deck form fields
  const [newTitle, setNewTitle] = useState("");
  const [newBuyer, setNewBuyer] = useState("");
  const [newSeason, setNewSeason] = useState("SS28");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPresentations = presentations.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.buyer_name && p.buyer_name.toLowerCase().includes(q)) ||
      (p.season && p.season.toLowerCase().includes(q))
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError("Please enter a presentation title.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.createPresentation({
        title: newTitle.trim(),
        buyer_name: newBuyer.trim() || undefined,
        season: newSeason.trim() || undefined,
      });
      setNewTitle("");
      setNewBuyer("");
      setIsCreating(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deck");
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
    window.open(`/presentations/${presentation.id}`, "_blank");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              onClick={() => setIsCreating(!isCreating)}
              className="shrink-0 rounded-xl text-xs h-9 bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Deck
            </Button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* New Deck Collapsible Form */}
          {isCreating && (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 space-y-3 animate-in fade-in"
            >
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                Create New Presentation Deck
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Deck Title *
                  </label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Zara SS28 Outerwear"
                    className="h-9 text-xs rounded-lg bg-white dark:bg-zinc-900"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Buyer / Client
                  </label>
                  <Input
                    value={newBuyer}
                    onChange={(e) => setNewBuyer(e.target.value)}
                    placeholder="e.g. Inditex / Zara"
                    className="h-9 text-xs rounded-lg bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Season
                  </label>
                  <Input
                    value={newSeason}
                    onChange={(e) => setNewSeason(e.target.value)}
                    placeholder="e.g. SS28"
                    className="h-9 text-xs rounded-lg bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  className="h-8 text-xs rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Save Deck
                </Button>
              </div>
            </form>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter presentation decks by name, buyer, season..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          {/* Presentations List */}
          {presentations.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <PresentationIcon className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-semibold">No presentations created yet</p>
              <p className="text-xs text-zinc-400">
                Click &ldquo;New Deck&rdquo; to start curating fabric collections for buyers.
              </p>
            </div>
          ) : filteredPresentations.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
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

                      <div className="flex items-center gap-4 text-xs text-zinc-500">
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
