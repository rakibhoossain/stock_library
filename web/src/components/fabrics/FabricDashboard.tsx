"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Fabric, Category, Supplier, Project, DashboardStats, FabricFilter, User, Presentation } from "@/types/fabric";
import { api } from "@/lib/api";
import { FabricTable } from "@/components/fabrics/FabricTable";
import { FabricMobileCard } from "@/components/fabrics/FabricMobileCard";
import { FabricFilters } from "@/components/fabrics/FabricFilters";
import { FabricDetailModal } from "@/components/fabrics/FabricDetailModal";
import { FabricEntryForm } from "@/components/fabrics/FabricEntryForm";
import { ImageSearchModal } from "@/components/fabrics/ImageSearchModal";
import { ExportToolbar } from "@/components/fabrics/ExportToolbar";
import { FabricStatsHeader } from "@/components/fabrics/FabricStatsHeader";
import { CategorySupplierManager } from "@/components/master/CategorySupplierManager";
import { AssignToPresentationModal } from "@/components/presentations/AssignToPresentationModal";
import { PresentationListModal } from "@/components/presentations/PresentationListModal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Layers,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  FolderOpen,
  Building2,
  LogOut,
  User as UserIcon,
  Presentation as PresentationIcon,
  Play,
  BookmarkMinus,
} from "lucide-react";
import { SortingState, VisibilityState } from "@tanstack/react-table";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import Image from "next/image";

export const fabricFilterParsers = {
  search: parseAsString.withDefault(""),
  category_id: parseAsString.withDefault(""),
  supplier_id: parseAsString.withDefault(""),
  project_id: parseAsString.withDefault(""),
  presentation_id: parseAsString.withDefault(""),
  min_gsm: parseAsInteger,
  max_gsm: parseAsInteger,
  sample_holder: parseAsString.withDefault(""),
  price_status: parseAsString.withDefault(""),
  sort_by: parseAsString.withDefault("created_at"),
  sort_order: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
};

export function FabricDashboard() {
  const router = useRouter();

  // User session
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Master data
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Fabrics data
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination synced with URL query parameters via nuqs
  const [urlParams, setUrlParams] = useQueryStates(fabricFilterParsers, {
    shallow: true,
  });

  const filter: Partial<FabricFilter> = useMemo(
    () => ({
      search: urlParams.search || undefined,
      category_id: urlParams.category_id || undefined,
      supplier_id: urlParams.supplier_id || undefined,
      project_id: urlParams.project_id || undefined,
      presentation_id: urlParams.presentation_id || undefined,
      min_gsm: urlParams.min_gsm ?? undefined,
      max_gsm: urlParams.max_gsm ?? undefined,
      sample_holder: urlParams.sample_holder || undefined,
      price_status: urlParams.price_status || undefined,
      sort_by: urlParams.sort_by || "created_at",
      sort_order: (urlParams.sort_order as "asc" | "desc") || "desc",
      page: urlParams.page || 1,
      limit: urlParams.limit || 20,
    }),
    [urlParams]
  );

  const COLUMN_STORAGE_KEY = "stock_library_table_columns";
  const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
    width_inches: false,
    moq_mcq: true,
  };

  const getInitialColumnVisibility = (): VisibilityState => {
    if (typeof window === "undefined") return DEFAULT_COLUMN_VISIBILITY;
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Failed to read column visibility from localStorage:", err);
    }
    return DEFAULT_COLUMN_VISIBILITY;
  };

  // TanStack table sorting state derived from URL query parameters
  const sorting = useMemo<SortingState>(() => {
    if (urlParams.sort_by) {
      return [{ id: urlParams.sort_by, desc: urlParams.sort_order === "desc" }];
    }
    return [];
  }, [urlParams.sort_by, urlParams.sort_order]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getInitialColumnVisibility);

  const handleColumnVisibilityChange = useCallback(
    (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
          }
        } catch (err) {
          console.warn("Failed to save column visibility to localStorage:", err);
        }
        return next;
      });
    },
    []
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals & Sheets
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [editingFabric, setEditingFabric] = useState<Fabric | null>(null);
  const [viewingFabric, setViewingFabric] = useState<Fabric | null>(null);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [imageSearchSeedUrl, setImageSearchSeedUrl] = useState<string | undefined>(undefined);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMasterManagerOpen, setIsMasterManagerOpen] = useState(false);

  // Presentation State
  const [isDeckListModalOpen, setIsDeckListModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Reusable Master Data loader for manual refreshes
  const loadMasterData = useCallback(async () => {
    try {
      const user = await api.getCurrentUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setCurrentUser(user);
      const [cats, sups, projs, st, decks] = await Promise.all([
        api.getCategories(),
        api.getSuppliers(),
        api.getProjects(),
        api.getStats(),
        api.getPresentations(),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setStats(st);
      setPresentations(Array.isArray(decks) ? decks : []);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  }, [router]);

  const loadPresentations = useCallback(async () => {
    try {
      const decks = await api.getPresentations();
      setPresentations(decks);
    } catch (err) {
      console.error("Failed to load presentations:", err);
    }
  }, []);

  // Window resize effect for responsive default view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("grid");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Verify authentication on mount and fetch master data
  useEffect(() => {
    let cancelled = false;
    const initMaster = async () => {
      const token = api.getToken();
      if (!token) {
        if (!cancelled) {
          setIsAuthChecking(false);
          router.replace("/login");
        }
        return;
      }

      try {
        const user = await api.getCurrentUser();
        if (cancelled) return;
        if (!user) {
          setIsAuthChecking(false);
          router.replace("/login");
          return;
        }

        setCurrentUser(user);
        setIsAuthChecking(false);

        const [cats, sups, projs, st, decks] = await Promise.all([
          api.getCategories(),
          api.getSuppliers(),
          api.getProjects(),
          api.getStats(),
          api.getPresentations(),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setSuppliers(Array.isArray(sups) ? sups : []);
        setProjects(Array.isArray(projs) ? projs : []);
        setStats(st);
        setPresentations(Array.isArray(decks) ? decks : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Authentication or master data load failed:", err);
          setIsAuthChecking(false);
          router.replace("/login");
        }
      }
    };
    void initMaster();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Reusable manual loader for fabrics
  const loadFabrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getFabrics(filter);
      setFabrics(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error("Failed to fetch fabrics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Synchronize fabrics on filter changes (only when authenticated)
  useEffect(() => {
    if (isAuthChecking || !currentUser) return;
    let cancelled = false;
    const fetchFiltered = async () => {
      setIsLoading(true);
      try {
        const res = await api.getFabrics(filter);
        if (!cancelled) {
          setFabrics(res.items || []);
          setTotal(res.total || 0);
          setTotalPages(res.total_pages || 1);
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch fabrics:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchFiltered();
    return () => {
      cancelled = true;
    };
  }, [filter, isAuthChecking, currentUser]);

  // Sync sorting with URL query parameters
  const handleSortingChange = useCallback(
    (updaterOrNewSorting: SortingState | ((old: SortingState) => SortingState)) => {
      const resolved =
        typeof updaterOrNewSorting === "function"
          ? updaterOrNewSorting(sorting)
          : updaterOrNewSorting;
      if (resolved.length > 0) {
        setUrlParams({
          sort_by: resolved[0].id,
          sort_order: resolved[0].desc ? "desc" : "asc",
          page: 1,
        });
      } else {
        setUrlParams({
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
        });
      }
    },
    [sorting, setUrlParams]
  );

  const handleFilterChange = useCallback(
    (newFilter: Partial<FabricFilter>) => {
      const next: Parameters<typeof setUrlParams>[0] = {};
      if ("search" in newFilter) next.search = newFilter.search || "";
      if ("category_id" in newFilter) next.category_id = newFilter.category_id || "";
      if ("supplier_id" in newFilter) next.supplier_id = newFilter.supplier_id || "";
      if ("project_id" in newFilter) next.project_id = newFilter.project_id || "";
      if ("presentation_id" in newFilter) next.presentation_id = newFilter.presentation_id || "";
      if ("min_gsm" in newFilter) next.min_gsm = newFilter.min_gsm ?? null;
      if ("max_gsm" in newFilter) next.max_gsm = newFilter.max_gsm ?? null;
      if ("sample_holder" in newFilter) next.sample_holder = newFilter.sample_holder || "";
      if ("price_status" in newFilter) next.price_status = newFilter.price_status || "";
      if ("sort_by" in newFilter) next.sort_by = newFilter.sort_by || "created_at";
      if ("sort_order" in newFilter)
        next.sort_order = (newFilter.sort_order as "asc" | "desc") || "desc";
      if ("page" in newFilter) next.page = newFilter.page || 1;
      if ("limit" in newFilter) next.limit = newFilter.limit || 20;
      setUrlParams(next);
    },
    [setUrlParams]
  );

  const handleResetFilters = useCallback(() => {
    setUrlParams({
      search: "",
      category_id: "",
      supplier_id: "",
      project_id: "",
      presentation_id: "",
      min_gsm: null,
      max_gsm: null,
      sample_holder: "",
      price_status: "",
      sort_by: "created_at",
      sort_order: "desc",
      page: 1,
      limit: 20,
    });
    setSelectedIds([]);
  }, [setUrlParams]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fabric swatch?")) return;
    try {
      await api.deleteFabric(id);
      loadFabrics();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete fabric");
    }
  };

  // Current active presentation filter details if set
  const activeFilteredPresentation = useMemo(() => {
    if (!filter.presentation_id) return null;
    return presentations.find((p) => p.id === filter.presentation_id) || null;
  }, [filter.presentation_id, presentations]);

  const handleRemoveFromPresentation = async (fabricIds: string[]) => {
    if (!filter.presentation_id || fabricIds.length === 0) return;
    const deckTitle = activeFilteredPresentation?.title || "this presentation deck";
    if (
      !confirm(
        `Are you sure you want to remove ${fabricIds.length} swatch(es) from "${deckTitle}"?`
      )
    ) {
      return;
    }

    try {
      await api.removePresentationItems(filter.presentation_id, fabricIds);
      setSelectedIds((prev) => prev.filter((id) => !fabricIds.includes(id)));
      await loadFabrics();
      await loadPresentations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove items from presentation");
    }
  };

  // Selected Fabric objects for batch operations
  const selectedFabrics = useMemo(
    () => fabrics.filter((f) => selectedIds.includes(f.id)),
    [fabrics, selectedIds]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.search) count++;
    if (filter.category_id) count++;
    if (filter.supplier_id) count++;
    if (filter.project_id) count++;
    if (filter.presentation_id) count++;
    if (filter.min_gsm || filter.max_gsm) count++;
    if (filter.sample_holder) count++;
    if (filter.price_status) count++;
    return count;
  }, [filter]);

  if (isAuthChecking || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs text-zinc-400">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-24 md:pb-12">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & System Badges */}
          <div className="flex items-center gap-3">
            <div>
              <Image src="/logo.png" alt="Logo" width={40} height={40} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight">
                  FabricLibrary
                </h1>
              </div>
              <p className="hidden sm:block text-[11px] text-zinc-500">
                Textile Sourcing & Swatch Intelligence
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeckListModalOpen(true)}
              className="rounded-xl text-xs h-9 font-semibold gap-1.5 border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
              title="Manage Buyer Presentation Decks"
            >
              <PresentationIcon className="h-3.5 w-3.5 text-indigo-600" />
              <span>Decks</span>
              {presentations.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                  {presentations.length}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMasterManagerOpen(true)}
              className="hidden lg:flex rounded-xl text-xs h-9 font-semibold gap-1.5"
              title="Manage Categories and Suppliers"
            >
              <Building2 className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
              Categories & Mills
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImageSearchSeedUrl(undefined);
                setIsImageSearchOpen(true);
              }}
              className="hidden sm:flex rounded-xl text-xs h-9 font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
              Visual Search
            </Button>

            <ExportToolbar
              selectedFabrics={selectedFabrics}
              allFilteredFabrics={fabrics}
              activeFilter={filter}
            />

            <Button
              size="sm"
              onClick={() => {
                setEditingFabric(null);
                setIsNewEntryOpen(true);
              }}
              className="rounded-xl text-xs h-9 font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Entry Product</span>
              <span className="sm:hidden">Entry</span>
            </Button>

            {/* User Session & Logout */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                <div className="hidden xl:block text-right">
                  <p className="text-xs font-bold leading-tight truncate max-w-[120px]">
                    {currentUser.full_name || currentUser.email.split("@")[0]}
                  </p>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                    {currentUser.role}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    api.logout();
                    router.push("/login");
                  }}
                  className="h-9 w-9 p-0 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="h-9 rounded-xl text-xs font-semibold text-zinc-600"
              >
                <UserIcon className="h-3.5 w-3.5 mr-1" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Stats & Category Quick Select Banner */}
        <FabricStatsHeader
          stats={stats}
          categories={categories}
          selectedCategoryId={filter.category_id}
          onSelectCategory={(catId) => handleFilterChange({ category_id: catId, page: 1 })}
        />

        {/* Search & Faceted Filter Bar */}
        <FabricFilters
          filter={filter}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          categories={categories}
          suppliers={suppliers}
          projects={projects}
          presentations={presentations}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenMobileFilters={() => setIsMobileFilterOpen(true)}
          activeFilterCount={activeFilterCount}
        />

        {/* Active Presentation Banner (if filtering by deck) */}
        {activeFilteredPresentation && (
          <div className="p-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <PresentationIcon className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-indigo-950 dark:text-indigo-200">
                  Filtered by Presentation: {activeFilteredPresentation.title}
                </span>
                <span className="ml-2 text-zinc-500 text-[11px]">
                  ({activeFilteredPresentation.item_count} items in deck
                  {activeFilteredPresentation.buyer_name ? ` • Buyer: ${activeFilteredPresentation.buyer_name}` : ""}
                  )
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  window.open(`/presentations?id=${activeFilteredPresentation.id}`, "_blank");
                }}
                className="h-8 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-xs"
                title="Open presentation deck in clean, dedicated viewer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Play Slide Show
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFilterChange({ presentation_id: undefined, page: 1 })}
                className="h-8 text-xs rounded-xl"
              >
                Clear Deck Filter
              </Button>
            </div>
          </div>
        )}

        {/* Selected Rows Sticky Banner */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
            <span className="font-semibold text-indigo-900 dark:text-indigo-200">
              {selectedIds.length} swatch(es) selected
              {activeFilteredPresentation ? ` in "${activeFilteredPresentation.title}"` : ""}
            </span>
            <div className="flex items-center gap-2">
              {activeFilteredPresentation && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveFromPresentation(selectedIds)}
                  className="h-8 text-xs rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 font-semibold gap-1.5 shadow-xs"
                  title="Remove selected swatches from this presentation deck"
                >
                  <BookmarkMinus className="h-3.5 w-3.5" />
                  Remove from Deck ({selectedIds.length})
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="h-8 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                <PresentationIcon className="h-3.5 w-3.5" />
                Transfer to Deck
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs rounded-xl"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Data Display: Table or Card Grid */}
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-sm font-medium text-zinc-500">
              Loading fabric stock library...
            </p>
          </div>
        ) : fabrics.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
            <FolderOpen className="h-10 w-10 text-zinc-400 mx-auto" />
            <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">
              No matching fabric swatches
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try adjusting your search criteria, clearing category filters, or add a new fabric entry.
            </p>
            <Button
              size="sm"
              onClick={handleResetFilters}
              className="mt-2 text-xs rounded-xl"
            >
              Reset All Filters
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {(fabrics || []).map((fabric) => (
              <FabricMobileCard
                key={fabric.id}
                fabric={fabric}
                isSelected={selectedIds.includes(fabric.id)}
                onSelect={(checked) => {
                  setSelectedIds((prev) =>
                    checked ? [...prev, fabric.id] : prev.filter((id) => id !== fabric.id)
                  );
                }}
                onClick={() => setViewingFabric(fabric)}
                onSearchSimilar={() => {
                  setImageSearchSeedUrl(fabric.primary_image_url);
                  setIsImageSearchOpen(true);
                }}
                onRemoveFromPresentation={
                  filter.presentation_id
                    ? () => handleRemoveFromPresentation([fabric.id])
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <FabricTable
            data={fabrics}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onViewDetail={(fabric) => setViewingFabric(fabric)}
            onEdit={(fabric) => {
              setEditingFabric(fabric);
              setIsNewEntryOpen(true);
            }}
            onDelete={handleDelete}
            onSearchSimilar={(fabric) => {
              setImageSearchSeedUrl(fabric.primary_image_url);
              setIsImageSearchOpen(true);
            }}
            onRemoveFromPresentation={
              filter.presentation_id
                ? (id) => handleRemoveFromPresentation([id])
                : undefined
            }
            sorting={sorting}
            onSortingChange={handleSortingChange}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
          />
        )}

        {/* Pagination Footer */}
        {fabrics.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-zinc-500">
            <div>
              Showing{" "}
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {(filter.page! - 1) * filter.limit! + 1}-
                {Math.min(filter.page! * filter.limit!, total)}
              </span>{" "}
              of <span className="font-bold text-zinc-800 dark:text-zinc-200">{total}</span>{" "}
              swatches
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filter.limit}
                onChange={(e) =>
                  handleFilterChange({ limit: Number(e.target.value), page: 1 })
                }
                className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange({ page: (filter.page || 1) - 1 })}
                  disabled={(filter.page || 1) <= 1}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 font-medium">
                  {filter.page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange({ page: (filter.page || 1) + 1 })}
                  disabled={(filter.page || 1) >= totalPages}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Touch Optimized) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 py-2 px-6 flex items-center justify-between text-zinc-500 shadow-xl">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-1 text-indigo-600"
        >
          <Layers className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Catalog</span>
        </button>

        <button
          onClick={() => {
            setImageSearchSeedUrl(undefined);
            setIsImageSearchOpen(true);
          }}
          className="flex flex-col items-center gap-1 hover:text-indigo-600"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Visual Search</span>
        </button>

        <button
          onClick={() => {
            setEditingFabric(null);
            setIsNewEntryOpen(true);
          }}
          className="-translate-y-4 h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>

        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-indigo-600 relative"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex flex-col items-center gap-1 hover:text-indigo-600">
          <ExportToolbar
            selectedFabrics={selectedFabrics}
            allFilteredFabrics={fabrics}
            activeFilter={filter}
          />
        </div>
      </nav>

      {/* Modals & Slide-overs */}
      {/* 1. Detail Modal with Direct Edit Button */}
      <FabricDetailModal
        key={viewingFabric?.id || "empty"}
        fabric={viewingFabric}
        isOpen={!!viewingFabric}
        onClose={() => setViewingFabric(null)}
        onSearchSimilar={(fabric) => {
          setImageSearchSeedUrl(fabric.primary_image_url);
          setIsImageSearchOpen(true);
        }}
        onEdit={(fabric) => {
          setEditingFabric(fabric);
          setIsNewEntryOpen(true);
        }}
      />

      {/* 2. Product Entry / Edit Form (Zod + S3 presigned direct upload) */}
      <FabricEntryForm
        isOpen={isNewEntryOpen}
        onClose={() => {
          setIsNewEntryOpen(false);
          setEditingFabric(null);
        }}
        categories={categories}
        suppliers={suppliers}
        projects={projects}
        initialData={editingFabric}
        onSuccess={() => {
          loadFabrics();
          loadMasterData();
        }}
        onRefreshMasterData={loadMasterData}
      />

      {/* 3. Category & Supplier Management Modal */}
      <CategorySupplierManager
        isOpen={isMasterManagerOpen}
        onClose={() => setIsMasterManagerOpen(false)}
        categories={categories}
        suppliers={suppliers}
        projects={projects}
        onRefreshData={loadMasterData}
      />

      {/* 4. Reverse Image Search Modal (pgvector) */}
      <ImageSearchModal
        isOpen={isImageSearchOpen}
        onClose={() => setIsImageSearchOpen(false)}
        initialImageUrl={imageSearchSeedUrl}
        onSelectFabric={(fabric) => {
          setViewingFabric(fabric);
        }}
      />

      {/* 4. Mobile Bottom Filter Sheet */}
      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent side="bottom" className="p-6 space-y-4">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold">Filter Fabrics</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Category</label>
              <div className="mt-1">
                <SearchableSelect
                  options={(categories || []).map((c) => ({
                    value: c.id,
                    label: c.name,
                    subLabel: c.gender,
                  }))}
                  value={filter.category_id || ""}
                  onChange={(val) =>
                    handleFilterChange({ category_id: val || undefined, page: 1 })
                  }
                  placeholder="All Categories"
                  searchPlaceholder="Search category..."
                  allowClear={true}
                  clearLabel="All Categories"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Supplier</label>
              <div className="mt-1">
                <SearchableSelect
                  options={(suppliers || []).map((s) => ({
                    value: s.id,
                    label: s.name,
                    subLabel: s.short_code,
                  }))}
                  value={filter.supplier_id || ""}
                  onChange={(val) =>
                    handleFilterChange({ supplier_id: val || undefined, page: 1 })
                  }
                  placeholder="All Suppliers"
                  searchPlaceholder="Search supplier..."
                  allowClear={true}
                  clearLabel="All Suppliers"
                />
              </div>
            </div>

            {(projects || []).length > 0 && (
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Project / Collection</label>
                <div className="mt-1">
                  <SearchableSelect
                    options={(projects || []).map((p) => ({
                      value: p.id,
                      label: p.title,
                    }))}
                    value={filter.project_id || ""}
                    onChange={(val) =>
                      handleFilterChange({ project_id: val || undefined, page: 1 })
                    }
                    placeholder="All Projects"
                    searchPlaceholder="Search project..."
                    allowClear={true}
                    clearLabel="All Projects"
                  />
                </div>
              </div>
            )}

            {(presentations || []).length > 0 && (
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Presentation Deck</label>
                <div className="mt-1">
                  <SearchableSelect
                    options={(presentations || []).map((p) => ({
                      value: p.id,
                      label: p.title,
                      subLabel: p.season ? `${p.season} (${p.item_count})` : `(${p.item_count} items)`,
                    }))}
                    value={filter.presentation_id || ""}
                    onChange={(val) =>
                      handleFilterChange({ presentation_id: val || undefined, page: 1 })
                    }
                    placeholder="All Presentation Decks"
                    searchPlaceholder="Filter by presentation deck..."
                    allowClear={true}
                    clearLabel="All Presentation Decks"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Sample Custodian
              </label>
              <select
                value={filter.sample_holder || ""}
                onChange={(e) =>
                  handleFilterChange({ sample_holder: e.target.value || undefined, page: 1 })
                }
                className="mt-1 w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <option value="">All Sample Custodians</option>
                <option value="Jewel-Tom">Jewel-Tom</option>
                <option value="Tom only">Tom only</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => {
                  handleResetFilters();
                  setIsMobileFilterOpen(false);
                }}
              >
                Reset All
              </Button>
              <Button
                className="flex-1 rounded-xl bg-indigo-600"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 5. Bulk Assign to Presentation Modal */}
      <AssignToPresentationModal
        key={isAssignModalOpen ? "assign-open" : "assign-closed"}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedFabricIds={selectedIds}
        presentations={presentations}
        onSuccess={async (presId) => {
          await loadPresentations();
          await loadFabrics();
          setSelectedIds([]);
          // Optional: filter table to show the assigned deck so merchandiser sees it
          handleFilterChange({ presentation_id: presId, page: 1 });
        }}
        onRefreshPresentations={loadPresentations}
      />

      {/* 6. Presentations Management & Launcher Modal */}
      <PresentationListModal
        key={isDeckListModalOpen ? "decks-open" : "decks-closed"}
        isOpen={isDeckListModalOpen}
        onClose={() => setIsDeckListModalOpen(false)}
        presentations={presentations}
        onRefresh={loadPresentations}
        onFilterByPresentation={(id) => {
          handleFilterChange({ presentation_id: id, page: 1 });
        }}
        activePresentationId={filter.presentation_id}
      />
    </div>
  );
}
