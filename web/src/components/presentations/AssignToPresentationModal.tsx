"use client";

import React, { useState } from "react";
import { Presentation } from "@/types/fabric";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Presentation as PresentationIcon,
  Plus,
  Check,
  Loader2,
  FolderPlus,
  Sparkles,
} from "lucide-react";

interface AssignToPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFabricIds: string[];
  presentations: Presentation[];
  onSuccess: (presentationId: string) => void;
  onRefreshPresentations: () => void;
}

export const AssignToPresentationModal: React.FC<AssignToPresentationModalProps> = ({
  isOpen,
  onClose,
  selectedFabricIds,
  presentations,
  onSuccess,
  onRefreshPresentations,
}) => {
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [selectedPresentationId, setSelectedPresentationId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New presentation form state
  const [newTitle, setNewTitle] = useState("");
  const [newBuyer, setNewBuyer] = useState("");
  const [newSeason, setNewSeason] = useState("SS28");
  const [newDesc, setNewDesc] = useState("");

  const handleAssign = async () => {
    if (selectedFabricIds.length === 0) return;
    setIsSubmitting(true);

    try {
      if (activeTab === "existing") {
        if (!selectedPresentationId) {
          alert("Please select a presentation");
          setIsSubmitting(false);
          return;
        }

        await api.addPresentationItems(selectedPresentationId, selectedFabricIds);
        onRefreshPresentations();
        onSuccess(selectedPresentationId);
        onClose();
      } else {
        if (!newTitle.trim()) {
          alert("Please enter a presentation title");
          setIsSubmitting(false);
          return;
        }

        const created = await api.createPresentation({
          title: newTitle.trim(),
          buyer_name: newBuyer.trim() || undefined,
          season: newSeason.trim() || undefined,
          description: newDesc.trim() || undefined,
          fabric_ids: selectedFabricIds,
        });

        onRefreshPresentations();
        onSuccess(created.id);
        onClose();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to assign to presentation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PresentationIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Transfer to Presentation
              </DialogTitle>
              <p className="text-xs text-zinc-500">
                Add {selectedFabricIds.length} swatch(es) to a presentation deck
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mt-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("existing")}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "existing"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <PresentationIcon className="h-3.5 w-3.5 text-indigo-500" />
            Existing Deck
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "new"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-emerald-500" />
            New Deck
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-3">
          {activeTab === "existing" ? (
            <div>
              {presentations.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                  <FolderPlus className="h-8 w-8 text-zinc-400 mx-auto" />
                  <p className="text-xs text-zinc-500">No presentation decks created yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("new")}
                    className="text-xs rounded-xl"
                  >
                    Create your first deck
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {presentations.map((p) => {
                    const isSelected = selectedPresentationId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPresentationId(p.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {p.title}
                          </div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                            {p.buyer_name && <span>Buyer: {p.buyer_name}</span>}
                            {p.season && <span>• {p.season}</span>}
                            <span>• {p.item_count} items</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Deck Title *
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. SS28 Men's Polo Collection - Tommy Hilfiger"
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Buyer / Brand
                  </label>
                  <Input
                    value={newBuyer}
                    onChange={(e) => setNewBuyer(e.target.value)}
                    placeholder="e.g. H&M, Zara, PVH"
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Season
                  </label>
                  <Input
                    value={newSeason}
                    onChange={(e) => setNewSeason(e.target.value)}
                    placeholder="e.g. SS28, FW28"
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Description / Pitch Notes
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief context or buyer feedback focus..."
                  rows={2}
                  className="mt-1 w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={isSubmitting || (activeTab === "existing" && !selectedPresentationId)}
            className="rounded-xl text-xs h-9 bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Assign {selectedFabricIds.length} Swatch(es)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
