"use client";

import React from "react";
import { DashboardStats, Category } from "@/types/fabric";
import { Layers, Building2, Tag, FolderKanban } from "lucide-react";

interface FabricStatsHeaderProps {
  stats: DashboardStats | null;
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
}

export const FabricStatsHeader: React.FC<FabricStatsHeaderProps> = ({
  stats,
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="space-y-4">
      {/* Clean 4-Card KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Swatches
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            {stats?.total_fabrics || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Physical card records</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Mills & Suppliers
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            {stats?.total_suppliers || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Partner mills archive</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Categories
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            {stats?.total_categories || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">End-use garment lines</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Projects
            </span>
            <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            {stats?.total_projects || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Seasonal collections</p>
        </div>
      </div>

      {/* Horizontal Scrollable Category Filter Pills (Mobile First Friendly) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => onSelectCategory(undefined)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full font-medium transition-all ${
            !selectedCategoryId
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
              : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
          }`}
        >
          All Items
        </button>
        {categories.map((c) => {
          const isSelected = selectedCategoryId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
