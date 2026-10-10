"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Category, Supplier, Fabric } from "@/types/fabric";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Upload,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  Check,
} from "lucide-react";

const fiberItemSchema = z.object({
  fiber: z.string().min(1, "Fiber is required"),
  percentage: z.number().min(1, "Min 1%").max(100, "Max 100%"),
});

export const fabricFormSchema = z.object({
  article_no: z.string().trim().min(2, "Article No is required"),
  article_aliases: z.string().trim().optional(),
  fabric_name: z.string().trim().min(2, "Fabric structure/name is required"),
  category_id: z.string().min(1, "Please select a category"),
  supplier_id: z.string().min(1, "Please select a supplier"),
  composition_raw: z.string().trim().min(2, "Raw composition is required"),
  fibers: z.array(fiberItemSchema).min(1, "Add at least one fiber component"),
  weight_gsm_min: z.coerce.number().int().positive("Weight must be positive"),
  weight_gsm_max: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().positive("Max weight must be positive").optional().nullable()
  ),
  width_inches: z.string().trim().optional(),
  construction: z.string().trim().optional(),
  shrinkage: z.string().trim().optional(),
  finish_type: z.string().trim().optional(),
  sample_holder: z.string().trim().optional(),
  rack_location: z.string().trim().optional(),
  physical_tag: z.string().trim().optional(),
  available_stock_note: z.string().trim().optional(),
  price_status: z.enum(["CONFIRMED", "PENDING", "UPON_REQUEST", "NOT_DISCLOSED"]),
  price_amount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().nonnegative("Price cannot be negative").optional().nullable()
  ),
  price_currency: z.string().default("USD"),
  price_unit: z.enum(["KG", "YDS", "METER", "PIECE"]),
  price_notes: z.string().trim().optional(),
  moq: z.string().trim().optional(),
  mcq: z.string().trim().optional(),
  primary_image_url: z.string().optional(),
});

export type FabricFormValues = z.infer<typeof fabricFormSchema>;

interface FabricEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  suppliers: Supplier[];
  initialData?: Fabric | null;
  onSuccess: (saved: Fabric) => void;
  onRefreshMasterData?: () => void;
}

const COMMON_FIBERS = [
  "Cotton",
  "Organic Cotton",
  "BCI Cotton",
  "Polyester",
  "Recycled Polyester",
  "Viscose",
  "Rayon",
  "Modal",
  "Tencel",
  "Nylon",
  "Linen",
  "Spandex",
  "Elastane",
  "Wool",
  "Acrylic",
  "Metallic",
];

export const FabricEntryForm: React.FC<FabricEntryFormProps> = ({
  isOpen,
  onClose,
  categories,
  suppliers,
  initialData,
  onSuccess,
  onRefreshMasterData,
}) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(suppliers);

  // Quick add states
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatGender, setNewCatGender] = useState("Men");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupShortCode, setNewSupShortCode] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.primary_image_url || null
  );

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setLocalSuppliers(suppliers);
  }, [suppliers]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FabricFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(fabricFormSchema) as any,
    defaultValues: {
      article_no: initialData?.article_no || "",
      article_aliases: initialData?.article_aliases || "",
      fabric_name: initialData?.fabric_name || "Single Jersey",
      category_id: initialData?.category_id || categories[0]?.id || "",
      supplier_id: initialData?.supplier_id || suppliers[0]?.id || "",
      composition_raw: initialData?.composition_raw || "100% Cotton",
      fibers: initialData?.composition_breakdown?.length
        ? initialData.composition_breakdown
        : [{ fiber: "Cotton", percentage: 100 }],
      weight_gsm_min: initialData?.weight_gsm_min || 180,
      weight_gsm_max: initialData?.weight_gsm_max || undefined,
      width_inches: initialData?.width_inches || "66/68\"",
      construction: initialData?.construction || "",
      shrinkage: initialData?.shrinkage || "",
      finish_type: initialData?.finish_type || "",
      sample_holder: initialData?.sample_holder || "Jewel-Tom",
      rack_location: initialData?.rack_location || "P-01",
      physical_tag: initialData?.physical_tag || "A",
      available_stock_note: initialData?.available_stock_note || "",
      price_status: (initialData?.price_status as "CONFIRMED" | "PENDING" | "UPON_REQUEST" | "NOT_DISCLOSED") || "CONFIRMED",
      price_amount: initialData?.price_amount || undefined,
      price_currency: initialData?.price_currency || "USD",
      price_unit: (initialData?.price_unit as "KG" | "YDS" | "METER" | "PIECE") || "KG",
      price_notes: initialData?.price_notes || "",
      moq: initialData?.moq || "",
      mcq: initialData?.mcq || "",
      primary_image_url: initialData?.primary_image_url || "",
    },
  });

  // Re-sync form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        article_no: initialData.article_no || "",
        article_aliases: initialData.article_aliases || "",
        fabric_name: initialData.fabric_name || "",
        category_id: initialData.category_id || categories[0]?.id || "",
        supplier_id: initialData.supplier_id || suppliers[0]?.id || "",
        composition_raw: initialData.composition_raw || "",
        fibers: initialData.composition_breakdown?.length
          ? initialData.composition_breakdown
          : [{ fiber: "Cotton", percentage: 100 }],
        weight_gsm_min: initialData.weight_gsm_min || 180,
        weight_gsm_max: initialData.weight_gsm_max || undefined,
        width_inches: initialData.width_inches || "",
        construction: initialData.construction || "",
        shrinkage: initialData.shrinkage || "",
        finish_type: initialData.finish_type || "",
        sample_holder: initialData.sample_holder || "",
        rack_location: initialData.rack_location || "",
        physical_tag: initialData.physical_tag || "",
        available_stock_note: initialData.available_stock_note || "",
        price_status: initialData.price_status || "CONFIRMED",
        price_amount: initialData.price_amount || undefined,
        price_currency: initialData.price_currency || "USD",
        price_unit: initialData.price_unit || "KG",
        price_notes: initialData.price_notes || "",
        moq: initialData.moq || "",
        mcq: initialData.mcq || "",
        primary_image_url: initialData.primary_image_url || "",
      });
      setPreviewUrl(initialData.primary_image_url || null);
    }
  }, [initialData, categories, suppliers, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fibers",
  });

  const watchFibers = watch("fibers");

  // Synchronize raw text when fibers change
  const handleUpdateRawComposition = (newFibers: { fiber: string; percentage: number }[]) => {
    const rawStr = newFibers
      .filter((f) => f.fiber && f.percentage > 0)
      .map((f) => `${f.percentage}% ${f.fiber}`)
      .join(", ");
    if (rawStr) {
      setValue("composition_raw", rawStr);
    }
  };

  // Direct S3 Upload via Backend-signed Presigned URL
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const s3Url = await api.uploadFileToS3(file, "fabrics");
      setValue("primary_image_url", s3Url);
      setPreviewUrl(s3Url);
    } catch (err: unknown) {
      console.error("Direct S3 upload failed:", err);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload to S3"
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Quick Add Category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setIsAddingCategory(true);
    try {
      const created = await api.createCategory({
        name: newCatName.trim(),
        gender: newCatGender,
      });
      setLocalCategories((prev) => [...prev, created]);
      setValue("category_id", created.id);
      setNewCatName("");
      setShowQuickAddCategory(false);
      onRefreshMasterData?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setIsAddingCategory(false);
    }
  };

  // Quick Add Supplier
  const handleCreateSupplier = async () => {
    if (!newSupName.trim()) return;
    setIsAddingSupplier(true);
    try {
      const created = await api.createSupplier({
        name: newSupName.trim(),
        short_code: newSupShortCode.trim() || undefined,
        phone: newSupPhone.trim() || undefined,
      });
      setLocalSuppliers((prev) => [...prev, created]);
      setValue("supplier_id", created.id);
      setNewSupName("");
      setNewSupShortCode("");
      setNewSupPhone("");
      setShowQuickAddSupplier(false);
      onRefreshMasterData?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setIsAddingSupplier(false);
    }
  };

  const onSubmit = async (values: FabricFormValues) => {
    try {
      let saved: Fabric;
      if (initialData?.id) {
        saved = await api.updateFabric(initialData.id, values);
      } else {
        saved = await api.createFabric(values);
      }
      onSuccess(saved);
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save fabric");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>{initialData ? "Edit Fabric Swatch" : "Entry New Product / Fabric Swatch"}</span>
            <span className="text-xs font-normal text-zinc-500">
              Complete physical & commercial specifications
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
          {/* Swatch Picture Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Swatch Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 rounded-2xl overflow-hidden border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Swatch Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-zinc-400">
                    <Upload className="h-6 w-6 mx-auto mb-1 text-zinc-400" />
                    <span className="text-[10px]">Upload Photo</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-xs">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="block w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500">
                  Upload fabric swatch or hanger card photo. Visual search index will update automatically.
                </p>
                {uploadError && (
                  <div className="flex items-center text-rose-500 text-xs gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Article & Taxonomy with Quick-Add */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Article No *
              </label>
              <Input
                {...register("article_no")}
                placeholder="e.g. MAT-110, YS-63345"
                className="mt-1"
              />
              {errors.article_no && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.article_no.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Article Aliases
              </label>
              <Input
                {...register("article_aliases")}
                placeholder="e.g. MAT-114C, Sub-Code"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Fabric Name / Structure *
              </label>
              <Input
                {...register("fabric_name")}
                placeholder="e.g. Scuba, Interlock, Rib 1x1, Terry"
                className="mt-1"
              />
              {errors.fabric_name && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.fabric_name.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  End-Use Category *
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddCategory(!showQuickAddCategory)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  Quick Add
                </button>
              </div>

              {showQuickAddCategory ? (
                <div className="mt-1 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                      New Category
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCategory(false)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className="h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                    <select
                      value={newCatGender}
                      onChange={(e) => setNewCatGender(e.target.value)}
                      className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 text-xs"
                    >
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                      <option value="Kids">Kids</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isAddingCategory || !newCatName.trim()}
                    onClick={handleCreateCategory}
                    className="w-full h-7 text-xs rounded-lg"
                  >
                    {isAddingCategory ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Save & Select Category
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <SearchableSelect
                    options={localCategories.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.gender || "Unisex"})`,
                      subLabel: c.gender,
                    }))}
                    value={watch("category_id")}
                    onChange={(val) => setValue("category_id", val, { shouldValidate: true })}
                    placeholder="Search & select category..."
                    searchPlaceholder="Type category or gender..."
                  />
                  {errors.category_id && (
                    <p className="text-rose-500 text-[11px] mt-1">{errors.category_id.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Supplier with Quick-Add */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Supplier / Mill *
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddSupplier(!showQuickAddSupplier)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  Quick Add
                </button>
              </div>

              {showQuickAddSupplier ? (
                <div className="mt-1 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                      New Supplier
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddSupplier(false)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    placeholder="Supplier / Mill Name *"
                    className="h-8 text-xs bg-white dark:bg-zinc-900"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newSupShortCode}
                      onChange={(e) => setNewSupShortCode(e.target.value)}
                      placeholder="Code (e.g. HMG)"
                      className="h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                    <Input
                      value={newSupPhone}
                      onChange={(e) => setNewSupPhone(e.target.value)}
                      placeholder="Phone / WhatsApp"
                      className="h-8 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isAddingSupplier || !newSupName.trim()}
                    onClick={handleCreateSupplier}
                    className="w-full h-7 text-xs rounded-lg"
                  >
                    {isAddingSupplier ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Save & Select Supplier
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <SearchableSelect
                    options={localSuppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                      subLabel: [s.short_code, s.contact_person, s.phone].filter(Boolean).join(" • "),
                    }))}
                    value={watch("supplier_id")}
                    onChange={(val) => setValue("supplier_id", val, { shouldValidate: true })}
                    placeholder="Search & select supplier..."
                    searchPlaceholder="Type supplier name or code..."
                  />
                  {errors.supplier_id && (
                    <p className="text-rose-500 text-[11px] mt-1">{errors.supplier_id.message}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Physical Sample Holder
              </label>
              <Input
                {...register("sample_holder")}
                placeholder="e.g. Jewel-Tom, Tom only"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Rack & Physical Tag
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input {...register("rack_location")} placeholder="P-26" />
                <Input {...register("physical_tag")} placeholder="Tag C" />
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Fiber Composition Builder */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Fiber Breakdown Builder (Percentage %)
                </label>
                <p className="text-[11px] text-zinc-500">
                  Specify fiber percentages (Total must equal 100%)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  append({ fiber: "Polyester", percentage: 50 });
                }}
                className="h-8 text-xs rounded-lg"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Fiber
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <select
                    {...register(`fibers.${index}.fiber` as const)}
                    onChange={(e) => {
                      register(`fibers.${index}.fiber`).onChange(e);
                      const updated = [...watchFibers];
                      updated[index].fiber = e.target.value;
                      handleUpdateRawComposition(updated);
                    }}
                    className="flex-1 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs"
                  >
                    {COMMON_FIBERS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center w-28">
                    <Input
                      type="number"
                      {...register(`fibers.${index}.percentage` as const, { valueAsNumber: true })}
                      onChange={(e) => {
                        register(`fibers.${index}.percentage`).onChange(e);
                        const updated = [...watchFibers];
                        updated[index].percentage = Number(e.target.value);
                        handleUpdateRawComposition(updated);
                      }}
                      className="h-9 text-xs"
                      placeholder="100"
                    />
                    <span className="ml-1 text-xs text-zinc-500 font-semibold">%</span>
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-9 w-9 p-0 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500">
                Raw Composition Output
              </label>
              <Input
                {...register("composition_raw")}
                className="mt-1 h-9 text-xs bg-white dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Section 4: Physical Specs WITH EXPLICIT UNITS */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-white dark:bg-zinc-900/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Fabric Specifications & Units
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Weight (GSM - g/m²) *
                </label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    {...register("weight_gsm_min")}
                    placeholder="200"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-medium text-zinc-400">
                    GSM
                  </span>
                </div>
                {errors.weight_gsm_min && (
                  <p className="text-rose-500 text-[11px] mt-1">{errors.weight_gsm_min.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Max Weight (GSM)
                  </label>
                  <span className="text-[10px] text-zinc-400 font-normal">Optional</span>
                </div>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    {...register("weight_gsm_max")}
                    placeholder="Optional (if range)"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-medium text-zinc-400">
                    GSM
                  </span>
                </div>
                {errors.weight_gsm_max && (
                  <p className="text-rose-500 text-[11px] mt-1">{errors.weight_gsm_max.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Cuttable Width (Inches / &quot;)
                </label>
                <div className="relative mt-1">
                  <Input
                    {...register("width_inches")}
                    placeholder="66/68&quot;"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-medium text-zinc-400">
                    inch (&quot;)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Shrinkage Tolerance
                </label>
                <Input
                  {...register("shrinkage")}
                  placeholder="e.g. ±5% (L: -3%, W: -2%)"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Gauge & Construction
                </label>
                <Input
                  {...register("construction")}
                  placeholder="e.g. 24 GG / 32s Cotton Combed"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Dyeing & Finish Type
                </label>
                <Input
                  {...register("finish_type")}
                  placeholder="e.g. Bio-wash, Mercerized, Peached, Enzyme"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Commercial Terms & Pricing WITH EXPLICIT UNITS */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Commercial Terms, Units & Pricing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Price Status
                </label>
                <select
                  {...register("price_status")}
                  className="mt-1 flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs"
                >
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="UPON_REQUEST">UPON_REQUEST</option>
                  <option value="NOT_DISCLOSED">NOT_DISCLOSED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Unit Price (Amount)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-xs font-semibold text-zinc-400">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("price_amount")}
                    placeholder="4.50"
                    className="pl-7"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Price Unit *
                </label>
                <select
                  {...register("price_unit")}
                  className="mt-1 flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  <option value="KG">Per Kilogram (/ KG)</option>
                  <option value="YDS">Per Yard (/ YDS)</option>
                  <option value="METER">Per Meter (/ MTR)</option>
                  <option value="PIECE">Per Piece (/ PC)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Currency
                </label>
                <select
                  {...register("price_currency")}
                  className="mt-1 flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="BDT">BDT (৳)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  MOQ (Min Order Qty)
                </label>
                <Input
                  {...register("moq")}
                  placeholder="e.g. 5,000 YDS, 1,000 KG"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  MCQ (Min Color Qty)
                </label>
                <Input
                  {...register("mcq")}
                  placeholder="e.g. 500 KG / color, 1,000 YDS"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Commercial Pricing Notes
                </label>
                <Input
                  {...register("price_notes")}
                  placeholder="e.g. FOB Chittagong, DDP available"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading} className="rounded-xl px-6">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Fabric...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {initialData ? "Update Fabric" : "Save Fabric Product"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
