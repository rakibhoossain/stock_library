"use client";

import React, { useState } from "react";
import { Fabric } from "@/types/fabric";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatWeight } from "@/lib/utils";
import {
  Sparkles,
  MapPin,
  Building2,
  Tag,
  DollarSign,
  Download,
  Edit,
  Layers,
  Scale,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Maximize2,
  FolderKanban,
} from "lucide-react";
import { generateFabricPresentationDeck } from "@/lib/pptx-export";

interface FabricDetailModalProps {
  fabric: Fabric | null;
  isOpen: boolean;
  onClose: () => void;
  onSearchSimilar: (fabric: Fabric) => void;
  onEdit: (fabric: Fabric) => void;
}

export const FabricDetailModal: React.FC<FabricDetailModalProps> = ({
  fabric,
  isOpen,
  onClose,
  onSearchSimilar,
  onEdit,
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleOpenZoom = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setZoomLevel(1);
    setIsZoomOpen(true);
  };

  const handleCloseZoom = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsZoomOpen(false);
    setZoomLevel(1);
  };

  const handleParentClose = () => {
    setIsZoomOpen(false);
    setZoomLevel(1);
    onClose();
  };

  if (!fabric) return null;

  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleToggleZoom = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomLevel((prev) => (prev === 1 ? 2 : 1));
  };

  return (
    <>
      {/* 1. Main Fabric Detail Card Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleParentClose()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-950">
          <DialogTitle className="sr-only">
            {fabric.article_no} - {fabric.fabric_name}
          </DialogTitle>

          {/* Top Header Bar: Clean, modern light theme */}
          <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-12">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-800/80">
                  {fabric.category_name || "General Fabric"}
                </span>
                {fabric.project_title && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold tracking-wider border border-purple-200 dark:border-purple-800/80 flex items-center gap-1">
                    <FolderKanban className="h-3 w-3" />
                    {fabric.project_title}
                  </span>
                )}
                <Badge
                  variant={fabric.price_amount ? "success" : "warning"}
                  className="text-[11px] font-semibold"
                >
                  {fabric.price_status}
                </Badge>
                {fabric.physical_tag && (
                  <span className="h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    {fabric.physical_tag}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {fabric.article_no}
                </h2>
                {fabric.article_aliases && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono font-medium">
                    ({fabric.article_aliases})
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {fabric.fabric_name}
              </p>
            </div>

            {/* Quick Header Actions: Similar Search + Edit + Export */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSearchSimilar(fabric);
                  handleParentClose();
                }}
                className="bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 text-xs h-9 rounded-xl gap-1.5 font-medium transition-colors shadow-2xs"
                title="Find visually similar swatches in stock library"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="inline">Find Similar</span>
              </Button>

              <Button
                onClick={() => {
                  onEdit(fabric);
                  handleParentClose();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 rounded-xl shadow-xs gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Fabric
              </Button>

              <Button
                variant="outline"
                onClick={() => generateFabricPresentationDeck([fabric])}
                className="bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 text-xs h-9 rounded-xl gap-1.5 shadow-2xs"
                title="Download presentation slide"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                Export Slide
              </Button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex flex-col md:flex-row max-h-[75vh] overflow-y-auto">
            {/* Left Column: Visual Swatch & Custodian Spec */}
            <div className="md:w-5/12 p-5 bg-zinc-50/80 dark:bg-zinc-900/40 border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-4">
              {/* Unobstructed Swatch Picture Frame with Click-to-Zoom */}
              <div
                onClick={(e) => {
                  if (fabric.primary_image_url) {
                    handleOpenZoom(e);
                  }
                }}
                className={`relative aspect-4/3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-inner group ${
                  fabric.primary_image_url ? "cursor-zoom-in" : ""
                }`}
                title={fabric.primary_image_url ? "Click to inspect fabric texture" : undefined}
              >
                {fabric.primary_image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fabric.primary_image_url}
                      alt={fabric.fabric_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Subtle Hover Zoom Indicator Tag (no obstruction) */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none shadow-md">
                      <ZoomIn className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Click to zoom</span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-xs text-zinc-500 gap-2 p-4 text-center">
                    <Layers className="h-8 w-8 text-zinc-400 stroke-[1.5]" />
                    <span>No Swatch Image Available</span>
                  </div>
                )}
              </div>

              {/* Physical Reference & Custodian Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 font-semibold text-[11px] uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    Sample Custodian
                  </span>
                  {fabric.rack_location && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px] text-zinc-700 dark:text-zinc-300 font-bold">
                      Rack {fabric.rack_location}
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {fabric.sample_holder || "Showroom Archive"}
                  </div>
                  {fabric.physical_tag && (
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Physical Card Tag:{" "}
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {fabric.physical_tag}
                      </span>
                    </p>
                  )}
                </div>

                {fabric.available_stock_note && (
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-start gap-1.5">
                    <Tag className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{fabric.available_stock_note}</span>
                  </div>
                )}
              </div>

              {/* Supplier Information Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5 text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  Supplier / Mill
                </div>
                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {fabric.supplier_name || "-"}
                </div>
                {fabric.supplier_contact && (
                  <div className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                    Contact: {fabric.supplier_contact}
                  </div>
                )}
              </div>

              {/* Project Information Card */}
              {fabric.project_title && (
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5 text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">
                    <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                    Project / Collection
                  </div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {fabric.project_title}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Structured Specifications Table */}
            <div className="md:w-7/12 p-5 sm:p-6 space-y-5 bg-white dark:bg-zinc-950">
              {/* 1. Material & Fiber Breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                  Fiber Composition Breakdown
                </h3>
                <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {fabric.composition_raw}
                  </div>
                  {fabric.composition_breakdown?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {fabric.composition_breakdown.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-2xs"
                        >
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">
                            {item.percentage}%
                          </span>
                          {item.fiber}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Technical Construction & Physical Specs Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-indigo-600" />
                  Physical & Technical Specifications
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <span className="text-[11px] font-medium text-zinc-500">Weight (GSM)</span>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {formatWeight(fabric.weight_gsm_min, fabric.weight_gsm_max)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <span className="text-[11px] font-medium text-zinc-500">Cuttable Width</span>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {fabric.width_inches || "66/68\""}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <span className="text-[11px] font-medium text-zinc-500">Construction & Gauge</span>
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                      {fabric.construction || "Single Knit"}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <span className="text-[11px] font-medium text-zinc-500">Shrinkage Tolerance</span>
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {fabric.shrinkage || "± 5%"}
                    </div>
                  </div>

                  {fabric.finish_type && (
                    <div className="col-span-2 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <span className="text-[11px] font-medium text-zinc-500">Dyeing & Finish Type</span>
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {fabric.finish_type}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Commercial Terms & Pricing Box */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  Commercial Terms & MOQ
                </h3>
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                      Unit Price
                    </span>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {formatPrice(
                        fabric.price_amount,
                        fabric.price_currency,
                        fabric.price_unit,
                        fabric.price_notes,
                        fabric.price_status
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/10 text-xs">
                    <div>
                      <span className="text-[11px] text-zinc-500 font-medium">MOQ (Order):</span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {fabric.moq || "Upon Request"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-500 font-medium">MCQ (Color):</span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {fabric.mcq || "Upon Request"}
                      </p>
                    </div>
                  </div>

                  {fabric.price_notes && (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 italic pt-1">
                      Note: {fabric.price_notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Isolated Swatch Image Zoom Lightbox Dialog */}
      <Dialog
        open={isZoomOpen && !!fabric.primary_image_url}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseZoom();
          }
        }}
      >
        <DialogContent
          className="max-w-[95vw] w-[95vw] h-[92vh] max-h-[92vh] p-0 bg-zinc-950/95 border-zinc-800 text-white flex flex-col overflow-hidden rounded-3xl shadow-2xl z-[80] [&>button.absolute]:hidden"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            handleCloseZoom();
          }}
        >
          <DialogTitle className="sr-only">
            Swatch Inspection: {fabric.article_no}
          </DialogTitle>

          {/* Lightbox Top Control Bar */}
          <div
            className="p-4 sm:px-6 flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950 text-white shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-bold font-mono">
                {fabric.article_no}
              </span>
              <span className="text-sm font-semibold text-zinc-200 truncate max-w-[200px] sm:max-w-md">
                {fabric.fabric_name}
              </span>
            </div>

            {/* Zoom Controls & Close */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1}
                  className="h-8 w-8 p-0 text-zinc-300 hover:text-white rounded-lg disabled:opacity-40"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <button
                  type="button"
                  onClick={handleToggleZoom}
                  className="px-2.5 py-1 text-xs font-mono font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800"
                  title="Click to toggle 100% / 200%"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="h-8 w-8 p-0 text-zinc-300 hover:text-white rounded-lg disabled:opacity-40"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                {zoomLevel !== 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      if (e) e.stopPropagation();
                      setZoomLevel(1);
                    }}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white rounded-lg"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseZoom}
                className="h-9 px-3 rounded-xl bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:text-white text-xs gap-1.5"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Close</span>
              </Button>
            </div>
          </div>

          {/* Lightbox Interactive Image Viewing Area */}
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseZoom(e);
              }
            }}
          >
            <div
              className="relative max-w-full max-h-full transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
              }}
              onClick={handleToggleZoom}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fabric.primary_image_url}
                alt={fabric.fabric_name}
                className={`max-w-[85vw] max-h-[75vh] object-contain rounded-xl shadow-2xl transition-all ${
                  zoomLevel > 1 ? "cursor-zoom-out shadow-indigo-500/10" : "cursor-zoom-in"
                }`}
              />
            </div>
          </div>

          {/* Bottom Lightbox Helper Footer */}
          <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-950 border-t border-zinc-900 flex items-center justify-center gap-4">
            <span>Click image to toggle zoom</span>
            <span>•</span>
            <span>Use +/- buttons to inspect fiber weave up to 300%</span>
            <span>•</span>
            <span className="hidden sm:inline">Press Esc or Close button to return</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

