"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Fabric, PresentationDetail } from "@/types/fabric";
import { Button } from "@/components/ui/button";
import { formatWeight } from "@/lib/utils";
import { generateFabricPresentationDeck } from "@/lib/pptx-export";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  X,
  Download,
  ZoomIn,
  LayoutGrid,
} from "lucide-react";

interface SlideShowPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: PresentationDetail | null;
  initialSlideIndex?: number;
}

export const SlideShowPlayer: React.FC<SlideShowPlayerProps> = ({
  isOpen,
  onClose,
  presentation,
  initialSlideIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevOpenRef = useRef(false);

  const items = presentation?.items || [];
  const currentFabric: Fabric | undefined = items[currentIndex];

  // Sync state when opening
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setCurrentIndex(Math.min(initialSlideIndex, Math.max(0, items.length - 1)));
      setIsPlaying(false);
      setIsZoomed(false);
      setIsGridOpen(false);
      setShowControls(true);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialSlideIndex, items.length]);

  // Navigate functions
  const goToNext = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  const goToPrev = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const goToSlide = useCallback((index: number) => {
    setIsZoomed(false);
    setIsGridOpen(false);
    setCurrentIndex(index);
  }, []);

  // Fullscreen API toggle
  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Cleanly exit presentation & exit browser fullscreen
  const handleClose = useCallback(() => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    setIsPlaying(false);
    setIsZoomed(false);
    setIsGridOpen(false);
    setCurrentIndex(0);
    onClose();
  }, [onClose]);

  // Ensure browser fullscreen is exited when component unmounts
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Auto-hide controls timer (Industry standard: hide after 3 seconds of mouse stillness)
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      // Don't hide controls if grid or zoom is active
      if (!isGridOpen && !isZoomed) {
        setShowControls(false);
      }
    }, 3000);
  }, [isGridOpen, isZoomed]);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseMove = () => {
      resetControlsTimer();
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isOpen, resetControlsTimer]);

  // Keyboard navigation (Keynote / Google Slides / Pitch standards)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      resetControlsTimer();

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        if (isZoomed) {
          setIsZoomed(false);
        } else if (isGridOpen) {
          setIsGridOpen(false);
        } else {
          handleClose();
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "g" || e.key === "G") {
        setIsGridOpen((prev) => !prev);
      }
    },
    [isOpen, isZoomed, isGridOpen, goToNext, goToPrev, handleClose, toggleFullscreen, resetControlsTimer]
  );

  // Auto-play timer (advance every 6 seconds)
  useEffect(() => {
    if (!isOpen || !isPlaying || items.length <= 1) return;

    const timer = setInterval(() => {
      goToNext();
    }, 6000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, items.length, goToNext]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!isOpen || !presentation || items.length === 0) return null;

  // Format price display matching specimen (e.g. 4.56/kg)
  const priceDisplay = currentFabric
    ? currentFabric.price_amount != null
      ? `${currentFabric.price_amount}/${(currentFabric.price_unit || "kg").replace(/^\//, "").toLowerCase()}`
      : currentFabric.price_notes || currentFabric.price_status || "-"
    : "-";

  const widthDisplay = currentFabric?.width_inches
    ? currentFabric.width_inches.includes('"')
      ? currentFabric.width_inches
      : `${currentFabric.width_inches}"`
    : "-";

  const progressPercent = ((currentIndex + 1) / items.length) * 100;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[100] bg-zinc-950 flex flex-col text-white select-none animate-in fade-in duration-200 overflow-hidden ${
        !showControls ? "cursor-none" : ""
      }`}
    >
      {/* 1. Sleek Top Progress Bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-zinc-800/60 z-30 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. Top Title & Quick Actions Bar (Auto-hides on idle) */}
      <header
        className={`absolute top-0 inset-x-0 h-14 px-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
            {presentation.season || "Deck"}
          </span>
          <h2 className="text-sm font-semibold text-white/90 truncate max-w-sm sm:max-w-md">
            {presentation.title}
          </h2>
          {presentation.buyer_name && (
            <span className="text-xs text-zinc-400 font-medium truncate hidden md:inline">
              • Buyer: {presentation.buyer_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export PPTX */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateFabricPresentationDeck(items)}
            className="h-8 px-2.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/10 gap-1.5 hidden sm:flex"
            title="Download PowerPoint (.pptx)"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PPTX</span>
          </Button>

          {/* Slide Grid / Overview */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsGridOpen(true)}
            className="h-8 px-2.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/10 gap-1.5"
            title="View All Slides Grid (G)"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Exit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 rounded-lg text-zinc-300 hover:text-rose-400 hover:bg-rose-950/40"
            title="Exit Presentation (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* 3. Main Presentation Stage */}
      <main className="flex-1 w-full h-full flex items-center justify-center p-3 sm:p-6 md:p-8 relative">
        {/* Subtle Side Navigation Click Zones (Keynote / Pitch standard) */}
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Previous Slide"
          className={`absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10 flex items-center justify-start pl-3 sm:pl-5 group transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-11 w-11 rounded-full bg-black/40 hover:bg-black/75 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/70 group-hover:text-white group-hover:scale-110 transition-all shadow-xl">
            <ChevronLeft className="h-6 w-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={goToNext}
          aria-label="Next Slide"
          className={`absolute right-0 top-0 bottom-0 w-16 sm:w-24 z-10 flex items-center justify-end pr-3 sm:pr-5 group transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-11 w-11 rounded-full bg-black/40 hover:bg-black/75 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/70 group-hover:text-white group-hover:scale-110 transition-all shadow-xl">
            <ChevronRight className="h-6 w-6" />
          </div>
        </button>

        {/* Slide Canvas Card: Matches Specimen Layout Perfectly & Fits 100% of Viewport */}
        <div className="relative w-full max-w-xl sm:max-w-2xl max-h-[88vh] bg-white text-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 border border-zinc-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Swatch Photo Container with Click-To-Zoom */}
          <div
            onClick={() => setIsZoomed(true)}
            className="relative flex-1 min-h-[220px] max-h-[46vh] sm:max-h-[50vh] rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-200/80 group cursor-zoom-in flex items-center justify-center"
            title="Click to view high-resolution swatch inspection"
          >
            {currentFabric?.primary_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentFabric.primary_image_url}
                alt={currentFabric.fabric_name}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-102"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-zinc-400">
                No Swatch Photo Uploaded
              </div>
            )}

            {/* Click to Zoom hint */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
              <ZoomIn className="h-3 w-3" />
              <span>Inspect Swatch</span>
            </div>
          </div>

          {/* Structured Specification Table (Exact 8 rows as in sample card) */}
          <div className="w-full shrink-0 overflow-hidden rounded-xl border border-black text-xs font-sans">
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-black text-left">
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Category
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 font-medium text-[11px] sm:text-xs">
                    {currentFabric?.category_name || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Fabric
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 font-medium text-[11px] sm:text-xs">
                    {currentFabric?.fabric_name || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Composition
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs truncate">
                    {currentFabric?.composition_raw || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Weight
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 font-mono text-[11px] sm:text-xs">
                    {currentFabric
                      ? formatWeight(currentFabric.weight_gsm_min, currentFabric.weight_gsm_max)
                      : "-"}
                  </td>
                </tr>
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Width
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs">
                    {widthDisplay}
                  </td>
                </tr>
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Supplier
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 font-medium text-[11px] sm:text-xs truncate">
                    {currentFabric?.supplier_name || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Contact Person
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs truncate">
                    {currentFabric?.supplier_contact || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="w-2/5 p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs">
                    Price
                  </td>
                  <td className="w-3/5 p-1.5 sm:px-3 sm:py-1.5 font-bold text-zinc-900 text-[11px] sm:text-xs">
                    {priceDisplay}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 4. Industry Standard Floating Control Dock (HUD - Heads Up Display) */}
      <footer
        className={`absolute bottom-5 inset-x-0 flex justify-center z-20 pointer-events-none transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-zinc-900/90 hover:bg-zinc-900 text-white border border-zinc-700/60 rounded-full shadow-2xl backdrop-blur-xl transition-all">
          {/* Previous Slide */}
          <button
            type="button"
            onClick={goToPrev}
            className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Previous (←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Current Slide / Total */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-medium text-zinc-300 select-none">
            <span className="font-bold text-white">{currentIndex + 1}</span>
            <span className="text-zinc-600">/</span>
            <span>{items.length}</span>
          </div>

          {/* Next Slide */}
          <button
            type="button"
            onClick={goToNext}
            className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Next (→ / Space)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-zinc-700/80 mx-0.5" />

          {/* Auto Play / Pause */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs transition-colors ${
              isPlaying
                ? "bg-indigo-600 text-white font-semibold shadow-xs"
                : "text-zinc-300 hover:text-white hover:bg-zinc-800"
            }`}
            title="Toggle Auto Play"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Play</span>
              </>
            )}
          </button>

          {/* Slide Overview Grid Toggle */}
          <button
            type="button"
            onClick={() => setIsGridOpen(true)}
            className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Slide Grid (G)"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Exit Presentation */}
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
            title="Exit Presentation (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>

      {/* 5. Slide Overview Grid Modal Overlay (Industry standard jump navigator) */}
      {isGridOpen && (
        <div
          onClick={() => setIsGridOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-6 sm:p-10 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-6 max-w-6xl mx-auto w-full">
            <div>
              <h3 className="text-lg font-bold text-white">Slide Overview</h3>
              <p className="text-xs text-zinc-400">
                Click any swatch to jump directly to that slide ({items.length} swatches)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGridOpen(false)}
              className="rounded-xl bg-zinc-900 border-zinc-700 text-zinc-200 hover:text-white text-xs gap-1.5"
            >
              <X className="h-4 w-4" />
              Close Overview
            </Button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2"
          >
            {items.map((item, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`group relative flex flex-col rounded-2xl overflow-hidden border bg-zinc-900 text-left transition-all ${
                    isSelected
                      ? "ring-2 ring-indigo-500 border-indigo-500 scale-102 shadow-xl shadow-indigo-500/20"
                      : "border-zinc-800 hover:border-zinc-600 hover:scale-102"
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {item.primary_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.primary_image_url}
                        alt={item.fabric_name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="text-[10px] text-zinc-600">No Image</div>
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-mono font-bold text-white">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="p-2.5 space-y-0.5">
                    <p className="text-xs font-bold text-zinc-200 truncate">
                      {item.fabric_name || item.article_no}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {item.category_name || item.supplier_name || "-"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Click-To-Zoom Lightbox Modal */}
      {isZoomed && currentFabric?.primary_image_url && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentFabric.primary_image_url}
              alt={currentFabric.fabric_name}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
            />
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-300">
                {currentFabric.fabric_name} ({currentFabric.article_no})
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-medium text-white transition-colors"
              >
                Close Zoom (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
