"use client";

import React, { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Fabric } from "@/types/fabric";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPrice, formatWeight } from "@/lib/utils";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  BookmarkMinus,
} from "lucide-react";

interface FabricTableProps {
  data: Fabric[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onViewDetail: (fabric: Fabric) => void;
  onEdit: (fabric: Fabric) => void;
  onDelete: (id: string) => void;
  onSearchSimilar: (fabric: Fabric) => void;
  onRemoveFromPresentation?: (fabricId: string) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
}

export const FabricTable: React.FC<FabricTableProps> = ({
  data,
  selectedIds,
  onSelectionChange,
  onViewDetail,
  onEdit,
  onDelete,
  onSearchSimilar,
  onRemoveFromPresentation,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
}) => {
  const rowSelection = useMemo(() => {
    const sel: Record<string, boolean> = {};
    selectedIds.forEach((id) => {
      sel[id] = true;
    });
    return sel;
  }, [selectedIds]);

  const columns = useMemo<ColumnDef<Fabric>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "image",
        header: "Swatch",
        cell: ({ row }) => {
          const fabric = row.original;
          return (
            <div className="relative group/swatch h-12 w-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 shrink-0">
              {fabric.primary_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fabric.primary_image_url}
                  alt={fabric.fabric_name}
                  className="h-full w-full object-cover transition-transform group-hover/swatch:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                  N/A
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSearchSimilar(fabric);
                }}
                title="Find visually similar fabrics"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover/swatch:opacity-100 flex items-center justify-center text-white transition-opacity"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "article_no",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600"
          >
            Article No
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const fabric = row.original;
          return (
            <div className="space-y-0.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {fabric.article_no}
              </div>
              {fabric.article_aliases && (
                <div className="text-[11px] text-zinc-500 font-mono">
                  {fabric.article_aliases}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "fabric_name",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600"
          >
            Structure / Name
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {row.original.fabric_name}
          </span>
        ),
      },
      {
        accessorKey: "category_name",
        header: "Category",
        cell: ({ row }) => {
          const cat = row.original.category_name;
          return (
            <Badge
              variant={
                cat?.includes("Men")
                  ? "default"
                  : cat?.includes("Women")
                  ? "secondary"
                  : "outline"
              }
              className="text-xs"
            >
              {cat || "General"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "supplier_name",
        header: "Supplier & Contact",
        cell: ({ row }) => {
          const fabric = row.original;
          return (
            <div className="text-xs">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {fabric.supplier_name || "-"}
              </div>
              {fabric.supplier_contact && (
                <div className="text-zinc-500">{fabric.supplier_contact}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "composition_raw",
        header: "Composition",
        cell: ({ row }) => (
          <div className="max-w-[220px] text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed font-normal">
            {row.original.composition_raw}
          </div>
        ),
      },
      {
        accessorKey: "weight_gsm_min",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600"
          >
            Weight
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        ),
        cell: ({ row }) => {
          const f = row.original;
          return (
            <span className="font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {formatWeight(f.weight_gsm_min, f.weight_gsm_max)}
            </span>
          );
        },
      },
      {
        accessorKey: "width_inches",
        header: "Width",
        cell: ({ row }) => (
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {row.original.width_inches || "66/68\""}
          </span>
        ),
      },
      {
        accessorKey: "price_amount",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600"
          >
            Price
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        ),
        cell: ({ row }) => {
          const f = row.original;
          const formatted = formatPrice(f.price_amount, f.price_unit, f.price_notes);
          return (
            <span
              className={`text-xs font-semibold ${
                f.price_amount ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {formatted}
            </span>
          );
        },
      },
      {
        accessorKey: "moq_mcq",
        header: "MOQ / MCQ",
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              <div>MOQ: {f.moq || "-"}</div>
              <div>MCQ: {f.mcq || "-"}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "sample_holder",
        header: "Physical Sample",
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {f.sample_holder || "Showroom"}
              </span>
              {f.rack_location && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-500 font-mono">
                  {f.rack_location}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const fabric = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onViewDetail(fabric)}>
                  <Eye className="mr-2 h-4 w-4 text-indigo-600" />
                  View Card
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSearchSimilar(fabric)}>
                  <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                  Find Similar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(fabric)}>
                  <Edit className="mr-2 h-4 w-4 text-zinc-600" />
                  Edit Specs
                </DropdownMenuItem>
                {onRemoveFromPresentation && (
                  <DropdownMenuItem
                    onClick={() => onRemoveFromPresentation(fabric.id)}
                    className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                  >
                    <BookmarkMinus className="mr-2 h-4 w-4" />
                    Remove from Deck
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(fabric.id)}
                  className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onDelete, onEdit, onSearchSimilar, onViewDetail, onRemoveFromPresentation]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onRowSelectionChange: (updater) => {
      const nextSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      const selected = Object.keys(nextSelection).filter((key) => nextSelection[key]);
      onSelectionChange(selected);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(columnVisibility) : updater;
      onColumnVisibilityChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onViewDetail(row.original)}
                  className={`cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 ${
                    row.getIsSelected()
                      ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                      : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      onClick={(e) => {
                        if (
                          cell.column.id === "select" ||
                          cell.column.id === "actions"
                        ) {
                          e.stopPropagation();
                        }
                      }}
                      className="px-4 py-3 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-32 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No fabrics found matching the active filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
