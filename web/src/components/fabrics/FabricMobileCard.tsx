import React from "react";
import { Fabric } from "@/types/fabric";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice, formatWeight } from "@/lib/utils";
import { MapPin, Sparkles, Building2, Layers, BookmarkMinus } from "lucide-react";

interface FabricMobileCardProps {
  fabric: Fabric;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  onSearchSimilar?: () => void;
  onRemoveFromPresentation?: () => void;
}

export const FabricMobileCard: React.FC<FabricMobileCardProps> = ({
  fabric,
  isSelected,
  onSelect,
  onClick,
  onSearchSimilar,
  onRemoveFromPresentation,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl border p-3.5 transition-all cursor-pointer bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md ${
        isSelected
          ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      }`}
    >
      {/* Top Bar: Select checkbox & Article badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(!!checked)}
              className="h-4 w-4 rounded"
            />
          </div>
          <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
            {fabric.article_no}
          </span>
          {fabric.article_aliases && (
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {fabric.article_aliases}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {fabric.project_title && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 truncate max-w-[120px]">
              {fabric.project_title}
            </span>
          )}

          <Badge
            variant={
              fabric.category_name?.includes("Men")
                ? "default"
                : fabric.category_name?.includes("Women")
                ? "secondary"
                : "outline"
            }
            className="text-[11px] py-0 px-2"
          >
            {fabric.category_name || "Fabric"}
          </Badge>

          {onRemoveFromPresentation && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromPresentation();
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Remove from this presentation deck"
            >
              <BookmarkMinus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Center: Swatch Image + Specs Grid */}
      <div className="flex gap-3">
        <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
          {fabric.primary_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fabric.primary_image_url}
              alt={fabric.fabric_name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
              No Photo
            </div>
          )}

          {onSearchSimilar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchSimilar();
              }}
              title="Find visually similar swatches"
              className="absolute bottom-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-indigo-600 backdrop-blur-xs transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate mb-1">
              <span>{fabric.fabric_name}</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {fabric.composition_raw}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
            <span className="inline-flex items-center font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              <Layers className="h-3 w-3 mr-1 text-zinc-500" />
              {formatWeight(fabric.weight_gsm_min, fabric.weight_gsm_max)}
            </span>

            {fabric.width_inches && (
              <span className="text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                {fabric.width_inches}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar: Supplier & Price */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 truncate max-w-[60%]">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span className="truncate">{fabric.supplier_name || "Supplier N/A"}</span>
        </div>

        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
          {formatPrice(
            fabric.price_amount,
            fabric.price_currency,
            fabric.price_unit,
            fabric.price_notes,
            fabric.price_status
          )}
        </div>
      </div>

      {fabric.sample_holder && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
          <MapPin className="h-3 w-3" />
          <span>
            {fabric.sample_holder} {fabric.rack_location ? `• Rack ${fabric.rack_location}` : ""}
          </span>
        </div>
      )}
    </div>
  );
};
