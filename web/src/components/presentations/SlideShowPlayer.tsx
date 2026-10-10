"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Fabric, PresentationDetail } from "@/types/fabric";
import { formatWeight, formatPrice } from "@/lib/utils";
import { generateFabricPresentationDeck } from "@/lib/pptx-export";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

  const containerRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);

  const items = presentation?.items || [];
  // Deck structure: Slide 0 = Welcome Cover, Slides 1..N = Swatches, Slide N+1 = Thank You Outro
  const totalSlides = items.length + 2;

  const isWelcomeSlide = currentIndex === 0;
  const isClosingSlide = currentIndex === totalSlides - 1;
  const isFabricSlide = !isWelcomeSlide && !isClosingSlide;
  const currentFabric: Fabric | undefined = isFabricSlide ? items[currentIndex - 1] : undefined;

  // Sync state when opening
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setCurrentIndex(Math.min(initialSlideIndex, Math.max(0, totalSlides - 1)));
      setIsPlaying(false);
      setIsZoomed(false);
      setIsGridOpen(false);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialSlideIndex, totalSlides]);

  // Navigate functions
  const goToNext = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  }, [totalSlides]);

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

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToSlide(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToSlide(totalSlides - 1);
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
      } else if (e.key === "p" || e.key === "P") {
        setIsPlaying((prev) => !prev);
      }
    },
    [isOpen, isZoomed, isGridOpen, goToNext, goToPrev, goToSlide, handleClose, toggleFullscreen, totalSlides]
  );

  // Auto-play timer
  useEffect(() => {
    if (!isOpen || !isPlaying || totalSlides <= 1) return;

    const timer = setInterval(() => {
      goToNext();
    }, 6000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, totalSlides, goToNext]);

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

  // Format price display matching specimen with Intl currency (e.g. $7.85/kg)
  const priceDisplay = currentFabric
    ? formatPrice(
        currentFabric.price_amount,
        currentFabric.price_currency || "USD",
        currentFabric.price_unit || "kg",
        currentFabric.price_notes,
        currentFabric.price_status
      )
    : "-";

  const widthDisplay = currentFabric?.width_inches
    ? currentFabric.width_inches.includes('"')
      ? currentFabric.width_inches
      : `${currentFabric.width_inches}"`
    : "-";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col text-white select-none animate-in fade-in duration-200 overflow-hidden"
    >
      {/* 1. Top Header Bar (Appears strictly on hover at top) */}
      <header className="absolute top-0 inset-x-0 h-16 px-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-30 opacity-0 hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-3 min-w-0">
          {presentation.season && (
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
              {presentation.season}
            </span>
          )}
          <span className="font-semibold text-xs sm:text-sm text-zinc-200 truncate">
            {presentation.title}
          </span>
          {presentation.buyer_name && (
            <span className="hidden md:inline-block text-xs text-zinc-400 truncate border-l border-zinc-800 pl-3">
              {presentation.buyer_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export PPTX button */}
          <button
            type="button"
            onClick={() => generateFabricPresentationDeck(items, presentation)}
            className="h-8 px-2.5 rounded-md text-xs text-zinc-300 hover:text-white hover:bg-white/10 border-0 outline-none ring-0 flex items-center gap-1.5 transition-colors"
            title="Export PowerPoint (.pptx)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export PPTX</span>
          </button>

          {/* Close presentation button */}
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 border-0 outline-none ring-0 flex items-center justify-center transition-colors"
            title="Exit Presentation (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Side Navigation Arrows (Appear on hover) */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={goToPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full flex items-center justify-center text-zinc-400 hover:text-white bg-black/40 hover:bg-black/80 opacity-0 hover:opacity-100 transition-opacity border-0 outline-none ring-0"
          title="Previous Slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {currentIndex < totalSlides - 1 && (
        <button
          type="button"
          onClick={goToNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full flex items-center justify-center text-zinc-400 hover:text-white bg-black/40 hover:bg-black/80 opacity-0 hover:opacity-100 transition-opacity border-0 outline-none ring-0"
          title="Next Slide"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* 2. Main Stage Canvas */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center px-4 py-8 md:py-12 overflow-hidden">
        {/* SLIDE A: Welcome / Introduction Cover Slide */}
        {isWelcomeSlide && (
          <div className="w-full max-w-3xl h-auto max-h-[calc(100vh-140px)] bg-zinc-900 rounded-2xl shadow-2xl p-8 sm:p-14 flex flex-col justify-center animate-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  {presentation.title}
                </h1>
                {presentation.buyer_name && (
                  <p className="text-base sm:text-lg font-medium text-zinc-300 pt-1">
                    Prepared for {presentation.buyer_name}
                  </p>
                )}
              </div>

              <div className="h-px w-full bg-zinc-800" />

              {/* User-Provided Welcome / Overview Message (Strictly conditional, zero dummy content) */}
              {(presentation.welcome_notes?.trim() || presentation.description?.trim()) && (
                <div className="border-l-2 border-zinc-600 pl-4 py-1 text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
                  {presentation.welcome_notes?.trim() || presentation.description?.trim()}
                </div>
              )}

              {/* Metadata Row */}
              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-zinc-400">
                <div>
                  <span className="text-zinc-500">Collection:</span>{" "}
                  <strong className="text-zinc-200 font-semibold">{items.length} Swatches</strong>
                </div>
                {presentation.season && (
                  <div>
                    <span className="text-zinc-500">Season:</span>{" "}
                    <strong className="text-zinc-200 font-semibold">{presentation.season}</strong>
                  </div>
                )}
                {presentation.presenter_name && (
                  <div>
                    <span className="text-zinc-500">Curated By:</span>{" "}
                    <strong className="text-zinc-200 font-semibold">{presentation.presenter_name}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE B: Fabric Swatch Specimen Slide */}
        {isFabricSlide && currentFabric && (
          <div className="w-full max-w-xl md:max-w-2xl h-auto max-h-[calc(100vh-130px)] bg-white rounded-2xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col my-auto transition-all duration-200 animate-in fade-in select-none">
            {/* Top Swatch Photo */}
            <div className="relative w-full bg-zinc-100 flex items-center justify-center overflow-hidden group">
              {currentFabric.primary_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentFabric.primary_image_url}
                  alt={currentFabric.fabric_name}
                  className="w-full h-auto max-h-[46vh] object-contain cursor-zoom-in block"
                  onClick={() => setIsZoomed(true)}
                />
              ) : (
                <div className="h-44 sm:h-52 flex items-center justify-center text-zinc-400 text-xs font-medium uppercase tracking-wider">
                  No Swatch Photo Available
                </div>
              )}

              {/* Hover Zoom Hint */}
              {currentFabric.primary_image_url && (
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="absolute bottom-2.5 right-2.5 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 border-0 outline-none ring-0"
                  title="Enlarge Swatch"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Bottom Technical Specimen Table */}
            <div className="shrink-0 p-3 sm:p-4.5 bg-white border-t border-zinc-200">
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Category
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {currentFabric.category_name || "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Fabric
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 font-bold text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {currentFabric.fabric_name || "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Composition
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {currentFabric.composition_raw || "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Weight
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {formatWeight(currentFabric.weight_gsm_min, currentFabric.weight_gsm_max)}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Width
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {widthDisplay}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Supplier
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {currentFabric.supplier_name || "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Contact Person
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {currentFabric.supplier_contact || "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      Price
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 font-bold text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {priceDisplay}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-[32%] p-1.5 sm:px-3 sm:py-1.5 border-r border-black font-semibold text-zinc-900 bg-zinc-50/70 text-[11px] sm:text-xs align-middle">
                      MOQ / MCQ
                    </td>
                    <td className="w-[68%] p-1.5 sm:px-3 sm:py-1.5 text-zinc-900 text-[11px] sm:text-xs leading-snug whitespace-normal break-words align-middle">
                      {(() => {
                        const cleanMoq =
                          currentFabric.moq && !currentFabric.moq.toLowerCase().includes("explore")
                            ? currentFabric.moq
                            : null;
                        const cleanMcq =
                          currentFabric.mcq && !currentFabric.mcq.toLowerCase().includes("explore")
                            ? currentFabric.mcq
                            : null;
                        if (!cleanMoq && !cleanMcq) return "-";
                        return (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>
                              <span className="text-zinc-500 font-medium">MOQ:</span>{" "}
                              <span className="font-semibold text-zinc-900">{cleanMoq || "-"}</span>
                            </span>
                            <span className="text-zinc-300">/</span>
                            <span>
                              <span className="text-zinc-500 font-medium">MCQ:</span>{" "}
                              <span className="font-semibold text-zinc-900">{cleanMcq || "-"}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SLIDE C: Thank You / Closing Slide */}
        {isClosingSlide && (
          <div className="w-full max-w-3xl h-auto max-h-[calc(100vh-140px)] bg-zinc-900 rounded-2xl shadow-2xl p-8 sm:p-14 flex flex-col justify-center animate-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
                  Thank You
                </h1>
                <p className="text-base text-zinc-400 pt-1">
                  We appreciate your partnership and consideration.
                </p>
              </div>

              {/* User-Provided Sample Dispatch Notes (Strictly conditional, zero dummy content) */}
              {presentation.closing_notes?.trim() && (
                <>
                  <div className="h-px w-full bg-zinc-800" />
                  <div className="border-l-2 border-zinc-600 pl-4 py-1 text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
                    {presentation.closing_notes.trim()}
                  </div>
                </>
              )}

              {/* User-Provided Contact Information */}
              {(presentation.contact_info || presentation.presenter_name) && (
                <div className="pt-2 space-y-1 text-xs text-zinc-400">
                  {presentation.presenter_name && (
                    <div>
                      <span className="text-zinc-500">Presenter:</span>{" "}
                      <strong className="text-zinc-200 font-semibold">{presentation.presenter_name}</strong>
                    </div>
                  )}
                  {presentation.contact_info && (
                    <div>
                      <span className="text-zinc-500">Direct Inquiries:</span>{" "}
                      <strong className="text-zinc-200 font-semibold">{presentation.contact_info}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Professional Floating Navigation Bar (First, Prev, Counter, Next, Last) */}
      <footer className="absolute bottom-0 inset-x-0 h-16 z-30 group flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md shadow-2xl border-0 outline-none ring-0 select-none">
          {/* Go to First Slide (|◀) */}
          <button
            type="button"
            onClick={() => goToSlide(0)}
            disabled={currentIndex === 0}
            className={`h-8 w-8 rounded-full border-0 outline-none ring-0 flex items-center justify-center transition-colors ${
              currentIndex === 0
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-300 hover:text-white hover:bg-white/10 active:bg-white/20"
            }`}
            title="First Slide (Home)"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous Slide (◀) */}
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`h-8 w-8 rounded-full border-0 outline-none ring-0 flex items-center justify-center transition-colors ${
              currentIndex === 0
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-300 hover:text-white hover:bg-white/10 active:bg-white/20"
            }`}
            title="Previous (← / PageUp)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Slide Indicator */}
          <span className="px-2 text-xs font-mono text-zinc-300 min-w-[70px] text-center select-none">
            {currentIndex === 0
              ? `1 / ${totalSlides}`
              : currentIndex === totalSlides - 1
              ? `${totalSlides} / ${totalSlides}`
              : `${currentIndex + 1} / ${totalSlides}`}
          </span>

          {/* Next Slide (▶) */}
          <button
            type="button"
            onClick={goToNext}
            disabled={currentIndex === totalSlides - 1}
            className={`h-8 w-8 rounded-full border-0 outline-none ring-0 flex items-center justify-center transition-colors ${
              currentIndex === totalSlides - 1
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-300 hover:text-white hover:bg-white/10 active:bg-white/20"
            }`}
            title="Next (→ / Space / PageDown)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Go to Last Slide (▶|) */}
          <button
            type="button"
            onClick={() => goToSlide(totalSlides - 1)}
            disabled={currentIndex === totalSlides - 1}
            className={`h-8 w-8 rounded-full border-0 outline-none ring-0 flex items-center justify-center transition-colors ${
              currentIndex === totalSlides - 1
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-300 hover:text-white hover:bg-white/10 active:bg-white/20"
            }`}
            title="Last Slide (End)"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>

          <div className="w-px h-3.5 bg-zinc-700/60 mx-1" />

          {/* Autoplay Play/Pause */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`h-8 w-8 rounded-full border-0 outline-none ring-0 flex items-center justify-center transition-colors ${
              isPlaying
                ? "text-white bg-white/20"
                : "text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title={isPlaying ? "Pause (P)" : "Autoplay (P)"}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          </button>

          {/* Slide Sorter Grid */}
          <button
            type="button"
            onClick={() => setIsGridOpen(true)}
            className="h-8 w-8 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 border-0 outline-none ring-0 flex items-center justify-center transition-colors"
            title="Slide Overview (G)"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-8 w-8 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 border-0 outline-none ring-0 flex items-center justify-center transition-colors"
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </footer>

      {/* 4. Slide Sorter Modal */}
      {isGridOpen && (
        <div
          onClick={() => setIsGridOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-4 max-w-6xl mx-auto w-full border-b border-zinc-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Slide Overview</h2>
              <p className="text-xs text-zinc-400">Select any slide to jump</p>
            </div>
            <button
              type="button"
              onClick={() => setIsGridOpen(false)}
              className="h-8 px-3 rounded-md bg-zinc-800 text-zinc-200 hover:text-white text-xs border-0 outline-none ring-0 flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close</span>
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2 mt-4"
          >
            {/* Slide 1 Thumbnail: Welcome Cover */}
            <button
              type="button"
              onClick={() => goToSlide(0)}
              className={`group flex flex-col rounded-xl overflow-hidden border p-3 bg-zinc-900 text-left transition-all ${
                currentIndex === 0
                  ? "border-white bg-zinc-800"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="aspect-[4/3] rounded-lg bg-zinc-800/80 p-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Cover</span>
                <p className="text-xs font-semibold text-white line-clamp-2">{presentation.title}</p>
                <span className="text-[10px] text-zinc-400">{presentation.buyer_name || "Welcome"}</span>
              </div>
              <div className="p-1.5">
                <p className="text-xs font-medium text-zinc-300">Slide 1 • Cover</p>
              </div>
            </button>

            {/* Swatch Slides Thumbnails */}
            {items.map((item, idx) => {
              const slideIdx = idx + 1;
              const isSelected = slideIdx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToSlide(slideIdx)}
                  className={`group flex flex-col rounded-xl overflow-hidden border bg-zinc-900 text-left transition-all ${
                    isSelected
                      ? "border-white bg-zinc-800"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {item.primary_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.primary_image_url}
                        alt={item.fabric_name}
                        className="h-full w-full object-cover group-hover:scale-102 transition-transform"
                      />
                    ) : (
                      <div className="text-[10px] text-zinc-600">No Image</div>
                    )}
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white">
                      #{slideIdx + 1}
                    </span>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {item.fabric_name || item.article_no}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {item.category_name || item.supplier_name || "-"}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Slide N+2 Thumbnail: Thank You Outro */}
            <button
              type="button"
              onClick={() => goToSlide(totalSlides - 1)}
              className={`group flex flex-col rounded-xl overflow-hidden border p-3 bg-zinc-900 text-left transition-all ${
                currentIndex === totalSlides - 1
                  ? "border-white bg-zinc-800"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="aspect-[4/3] rounded-lg bg-zinc-800/80 p-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Closing</span>
                <p className="text-xs font-semibold text-white">Thank You</p>
                <span className="text-[10px] text-zinc-400">Direct Inquiries</span>
              </div>
              <div className="p-1.5">
                <p className="text-xs font-medium text-zinc-300">Slide {totalSlides} • Closing</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 5. Click-To-Zoom Lightbox Modal */}
      {isZoomed && currentFabric?.primary_image_url && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentFabric.primary_image_url}
              alt={currentFabric.fabric_name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/80 text-white hover:bg-black border-0 outline-none ring-0 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
