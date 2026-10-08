"use client";

import React from "react";
import { Category, Supplier, FabricFilter, Presentation } from "@/types/fabric";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  SlidersHorizontal,
  Columns3,
  RotateCcw,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import { VisibilityState } from "@tanstack/react-table";

interface FabricFiltersProps {
  filter: Partial<FabricFilter>;
  onFilterChange: (newFilter: Partial<FabricFilter>) => void;
  onReset: () => void;
  categories: Category[];
  suppliers: Supplier[];
  presentations?: Presentation[];
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
  onOpenMobileFilters: () => void;
  activeFilterCount: number;
}

export const FabricFilters: React.FC<FabricFiltersProps> = ({
  filter,
  onFilterChange,
  onReset,
  categories,
  suppliers,
  presentations = [],
  columnVisibility,
  onColumnVisibilityChange,
  viewMode,
  onViewModeChange,
  onOpenMobileFilters,
  activeFilterCount,
}) => {
  const columnsList = [
    { id: "article_no", label: "Article No" },
    { id: "fabric_name", label: "Structure / Name" },
    { id: "category_name", label: "Category" },
    { id: "supplier_name", label: "Supplier & Contact" },
    { id: "composition_raw", label: "Composition" },
    { id: "weight_gsm_min", label: "Weight (GSM)" },
    { id: "width_inches", label: "Width" },
    { id: "price_amount", label: "Price" },
    { id: "moq_mcq", label: "MOQ / MCQ" },
    { id: "sample_holder", label: "Physical Sample" },
  ];

  return (
    <div className="space-y-3">
      {/* Top Search & Actions Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search input with icon */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={filter.search || ""}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search article, fabric name, composition, supplier, mill..."
            className="pl-10 pr-9 h-11 sm:h-10 rounded-xl"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "", page: 1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile Filter Sheet Trigger Button (Visible only on mobile/tablet) */}
          <Button
            variant="outline"
            onClick={onOpenMobileFilters}
            className="md:hidden relative h-11 flex-1 sm:flex-initial rounded-xl"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2 text-indigo-600" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* View Mode Switcher (Grid vs Table) */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              title="Card Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              title="Tabular List View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Column Visibility Menu (Desktop only) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden lg:flex h-10 rounded-xl">
                <Columns3 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5">
                Toggle Columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columnsList.map((col) => {
                const isVisible = columnVisibility[col.id] !== false;
                return (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={isVisible}
                    onCheckedChange={(checked) =>
                      onColumnVisibilityChange({
                        ...columnVisibility,
                        [col.id]: checked,
                      })
                    }
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 h-10 px-3 rounded-xl font-semibold gap-1.5"
              title="Clear all filters and search"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Searchable Filter Strip */}
      <div className="hidden md:flex flex-wrap items-center gap-2 pt-1 text-xs">
        {/* Searchable Category Combobox */}
        <div className="w-48">
          <SearchableSelect
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
              subLabel: c.gender,
            }))}
            value={filter.category_id || ""}
            onChange={(val) => onFilterChange({ category_id: val || undefined, page: 1 })}
            placeholder="All Categories"
            searchPlaceholder="Search category..."
            allowClear={true}
            clearLabel="All Categories"
            className="h-9 rounded-xl text-xs"
          />
        </div>

        {/* Searchable Supplier Combobox */}
        <div className="w-52">
          <SearchableSelect
            options={suppliers.map((s) => ({
              value: s.id,
              label: s.name,
              subLabel: s.short_code,
            }))}
            value={filter.supplier_id || ""}
            onChange={(val) => onFilterChange({ supplier_id: val || undefined, page: 1 })}
            placeholder="All Suppliers"
            searchPlaceholder="Search supplier or mill..."
            allowClear={true}
            clearLabel="All Suppliers"
            className="h-9 rounded-xl text-xs"
          />
        </div>

        {/* Searchable Presentation Deck Filter */}
        {presentations.length > 0 && (
          <div className="w-52">
            <SearchableSelect
              options={presentations.map((p) => ({
                value: p.id,
                label: p.title,
                subLabel: p.season ? `${p.season} (${p.item_count})` : `(${p.item_count} items)`,
              }))}
              value={filter.presentation_id || ""}
              onChange={(val) =>
                onFilterChange({ presentation_id: val || undefined, page: 1 })
              }
              placeholder="All Presentations"
              searchPlaceholder="Filter by deck..."
              allowClear={true}
              clearLabel="All Presentations"
              className="h-9 rounded-xl text-xs"
            />
          </div>
        )}

        {/* GSM Quick Weight Filters */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
          {[
            { label: "All GSM", min: undefined, max: undefined },
            { label: "< 160", min: undefined, max: 160 },
            { label: "160-240", min: 160, max: 240 },
            { label: "240-300", min: 240, max: 300 },
            { label: "> 300", min: 300, max: undefined },
          ].map((preset, idx) => {
            const isSelected =
              filter.min_gsm === preset.min && filter.max_gsm === preset.max;
            return (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  onFilterChange({
                    min_gsm: preset.min,
                    max_gsm: preset.max,
                    page: 1,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Sample Custodian Filter */}
        <select
          value={filter.sample_holder || ""}
          onChange={(e) =>
            onFilterChange({
              sample_holder: e.target.value || undefined,
              page: 1,
            })
          }
          className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Sample Custodians</option>
          <option value="Jewel-Tom">Jewel-Tom</option>
          <option value="Tom only">Tom only</option>
        </select>

        {/* Price Status Filter */}
        <select
          value={filter.price_status || ""}
          onChange={(e) =>
            onFilterChange({
              price_status: e.target.value || undefined,
              page: 1,
            })
          }
          className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Price Statuses</option>
          <option value="CONFIRMED">Price Confirmed</option>
          <option value="PENDING">Pending Quote</option>
          <option value="UPON_REQUEST">Upon Request</option>
          <option value="NOT_DISCLOSED">Not Disclosed</option>
        </select>
      </div>
    </div>
  );
};
