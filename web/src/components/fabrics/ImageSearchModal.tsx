"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwatchSearchResult, Fabric } from "@/types/fabric";
import { api } from "@/lib/api";
import { Upload, Sparkles, Loader2, Camera, Eye } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFabric: (fabric: Fabric) => void;
  initialImageUrl?: string;
}

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectFabric,
  initialImageUrl,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SwatchSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    executeSearch({ file });
  };

  const executeSearch = async (payload: { file?: File; imageUrl?: string }) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await api.searchByImage(payload);
      setResults(data.results || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Search by image failed");
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    if (initialImageUrl && isOpen) {
      setPreviewUrl(initialImageUrl);
      executeSearch({ imageUrl: initialImageUrl });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialImageUrl, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Visual Swatch Similarity Search
          </DialogTitle>
        </DialogHeader>

        {/* Upload dropzone */}
        <div className="mt-2 space-y-4">
          <div className="relative rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-6 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {previewUrl ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="h-28 w-28 rounded-xl overflow-hidden border border-zinc-200 shadow-sm shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Query swatch" className="h-full w-full object-cover" />
                </div>
                <div className="text-left space-y-1">
                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    Query Swatch Active
                  </p>
                  <p className="text-xs text-zinc-500">
                    Click or drop another fabric photo to query against vector embeddings
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs rounded-xl"
                    onClick={() => {
                      if (selectedFile) executeSearch({ file: selectedFile });
                      else if (previewUrl) executeSearch({ imageUrl: previewUrl });
                    }}
                    disabled={isSearching}
                  >
                    {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-600" />}
                    Re-run Similarity Search
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center gap-2">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-300">
                    <Camera className="h-6 w-6" />
                  </div>
                </div>
                <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                  Drop fabric swatch photo or tap camera to search
                </div>
                <p className="text-xs text-zinc-400">
                  Searches texture, weave pattern, and color tone using vector embeddings
                </p>
              </div>
            )}
          </div>

          {/* Results Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {isSearching
                  ? "Comparing vector distances..."
                  : hasSearched
                  ? `Found ${results.length} Visually Similar Swatches`
                  : "Similar Swatches"}
              </h4>
            </div>

            {isSearching ? (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs">Calculating cosine similarity across 768-dim embeddings...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {results.map(({ fabric, similarity_score }) => {
                  const matchPct = Math.round(similarity_score * 100);
                  return (
                    <div
                      key={fabric.id}
                      onClick={() => {
                        onSelectFabric(fabric);
                        onClose();
                      }}
                      className="group cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 hover:border-indigo-500 transition-all bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="relative h-28 w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                          {fabric.primary_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={fabric.primary_image_url}
                              alt={fabric.fabric_name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-zinc-400">
                              No image
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-black/75 text-white backdrop-blur-xs text-[10px] py-0 px-2 font-mono">
                              {matchPct}% Match
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                            <span>{fabric.article_no}</span>
                            <span className="text-xs font-semibold text-emerald-600">
                              {formatPrice(
                                fabric.price_amount,
                                fabric.price_currency,
                                fabric.price_unit,
                                fabric.price_notes,
                                fabric.price_status
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {fabric.fabric_name} • {fabric.supplier_name}
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                            {fabric.composition_raw}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-indigo-600 font-medium">
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          View Specs
                        </span>
                        <span className="text-zinc-400 font-mono">
                          {fabric.weight_gsm_min} GSM
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hasSearched ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No swatches found matching the visual profile.
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
