"use client";

import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No matching options found",
  className,
  allowClear = false,
  clearLabel = "All",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between rounded-xl font-normal text-left h-10 px-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800",
            !selectedOption && "text-zinc-400 dark:text-zinc-500",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-2 space-y-2 rounded-2xl shadow-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
          {allowClear && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                !value
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <span>{clearLabel}</span>
              {!value && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
            </button>
          )}

          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-400">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <div className="truncate mr-2">
                    <div className="truncate">{option.label}</div>
                    {option.subLabel && (
                      <div className="text-[10px] text-zinc-400 truncate">
                        {option.subLabel}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
