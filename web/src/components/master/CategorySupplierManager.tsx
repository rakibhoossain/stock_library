"use client";

import React, { useState } from "react";
import { Category, Supplier } from "@/types/fabric";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Building2, Plus, Edit2, Trash2, Loader2, Check, X, Search } from "lucide-react";

interface CategorySupplierManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  suppliers: Supplier[];
  onRefreshData: () => void;
  defaultTab?: "categories" | "suppliers";
}

export const CategorySupplierManager: React.FC<CategorySupplierManagerProps> = ({
  isOpen,
  onClose,
  categories,
  suppliers,
  onRefreshData,
  defaultTab = "categories",
}) => {
  const [activeTab, setActiveTab] = useState<"categories" | "suppliers">(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.gender && c.gender.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const filteredSuppliers = React.useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.short_code && s.short_code.toLowerCase().includes(q)) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  // Category Edit / Create state
  const [catName, setCatName] = useState("");
  const [catGender, setCatGender] = useState("Men");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Supplier Edit / Create state
  const [supName, setSupName] = useState("");
  const [supShortCode, setSupShortCode] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supCountry, setSupCountry] = useState("Bangladesh");
  const [editingSupId, setEditingSupId] = useState<string | null>(null);

  // Category Handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (editingCatId) {
        await api.updateCategory(editingCatId, { name: catName.trim(), gender: catGender });
      } else {
        await api.createCategory({ name: catName.trim(), gender: catGender });
      }
      setCatName("");
      setCatGender("Men");
      setEditingCatId(null);
      onRefreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteCategory(id);
      onRefreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatGender(cat.gender || "Unisex");
  };

  // Supplier Handlers
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: supName.trim(),
        short_code: supShortCode.trim() || undefined,
        contact_person: supContact.trim() || undefined,
        email: supEmail.trim() || undefined,
        phone: supPhone.trim() || undefined,
        country: supCountry.trim() || "Bangladesh",
      };

      if (editingSupId) {
        await api.updateSupplier(editingSupId, payload);
      } else {
        await api.createSupplier(payload);
      }
      setSupName("");
      setSupShortCode("");
      setSupContact("");
      setSupEmail("");
      setSupPhone("");
      setEditingSupId(null);
      onRefreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteSupplier(id);
      onRefreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete supplier");
    } finally {
      setLoading(false);
    }
  };

  const startEditSupplier = (sup: Supplier) => {
    setEditingSupId(sup.id);
    setSupName(sup.name);
    setSupShortCode(sup.short_code || "");
    setSupContact(sup.contact_person || "");
    setSupEmail(sup.email || "");
    setSupPhone(sup.phone || "");
    setSupCountry(sup.country || "Bangladesh");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>Master Data Management</span>
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 mt-2">
          <Button
            type="button"
            variant={activeTab === "categories" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveTab("categories");
              setError(null);
            }}
            className="rounded-xl gap-2 text-xs"
          >
            <Layers className="h-4 w-4" />
            Categories ({categories.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === "suppliers" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveTab("suppliers");
              setError(null);
            }}
            className="rounded-xl gap-2 text-xs"
          >
            <Building2 className="h-4 w-4" />
            Suppliers & Mills ({suppliers.length})
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* TAB 1: CATEGORIES */}
        {activeTab === "categories" && (
          <div className="space-y-6 pt-2">
            {/* Create/Edit Form */}
            <form
              onSubmit={handleSaveCategory}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {editingCatId ? "Edit Category" : "Add New Category"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Category Name *
                  </label>
                  <Input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Knit Tops, Activewear, Denim"
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Gender / Line
                  </label>
                  <select
                    value={catGender}
                    onChange={(e) => setCatGender(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 shadow-sm"
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                    <option value="Unisex">Unisex</option>
                    <option value="All">All</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingCatId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCatId(null);
                      setCatName("");
                    }}
                    className="h-8 text-xs rounded-lg"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading || !catName.trim()}
                  size="sm"
                  className="h-8 text-xs rounded-lg px-4"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : editingCatId ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Update Category
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Category
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Existing Categories List with Search */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Existing Categories ({filteredCategories.length} / {categories.length})
                </h4>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search category or gender..."
                    className="pl-8 h-8 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  No categories found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {cat.name}
                        </p>
                        <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {cat.gender || "Unisex"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditCategory(cat)}
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-indigo-600"
                          title="Edit category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUPPLIERS */}
        {activeTab === "suppliers" && (
          <div className="space-y-6 pt-2">
            {/* Create/Edit Form */}
            <form
              onSubmit={handleSaveSupplier}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {editingSupId ? "Edit Supplier" : "Add New Supplier"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Supplier / Mill Name *
                  </label>
                  <Input
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="e.g. Ha-Meem Group, Square Fashions Ltd"
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Short Code / Acronym
                  </label>
                  <Input
                    value={supShortCode}
                    onChange={(e) => setSupShortCode(e.target.value)}
                    placeholder="e.g. HMG, SFL"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Contact Person
                  </label>
                  <Input
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="e.g. Mr. Rafiqul"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="sales@mill.com"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Phone / WhatsApp
                  </label>
                  <Input
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+8801700000000"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Country
                  </label>
                  <Input
                    value={supCountry}
                    onChange={(e) => setSupCountry(e.target.value)}
                    placeholder="Bangladesh"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingSupId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingSupId(null);
                      setSupName("");
                      setSupShortCode("");
                      setSupContact("");
                      setSupEmail("");
                      setSupPhone("");
                    }}
                    className="h-8 text-xs rounded-lg"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading || !supName.trim()}
                  size="sm"
                  className="h-8 text-xs rounded-lg px-4"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : editingSupId ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Update Supplier
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Supplier
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Existing Suppliers List with Search */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Existing Suppliers ({filteredSuppliers.length} / {suppliers.length})
                </h4>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, code, contact..."
                    className="pl-8 h-8 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {filteredSuppliers.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  No suppliers found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredSuppliers.map((sup) => (
                    <div
                      key={sup.id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 transition-colors flex items-start justify-between"
                    >
                      <div className="min-w-0 pr-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {sup.name}
                          </p>
                          {sup.short_code && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {sup.short_code}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 space-y-0.5">
                          {sup.contact_person && <p>Contact: {sup.contact_person}</p>}
                          {sup.phone && <p>Tel: {sup.phone}</p>}
                          {sup.email && <p className="truncate">Email: {sup.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditSupplier(sup)}
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-indigo-600"
                          title="Edit supplier"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600"
                          title="Delete supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
