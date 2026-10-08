"use client";

import React, { useState } from "react";
import { Fabric, FabricFilter } from "@/types/fabric";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { generateFabricPresentationDeck } from "@/lib/pptx-export";
import { Download, FileSpreadsheet, FileText, Presentation, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface ExportToolbarProps {
  selectedFabrics: Fabric[];
  allFilteredFabrics: Fabric[];
  activeFilter: Partial<FabricFilter>;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  selectedFabrics,
  allFilteredFabrics,
  activeFilter,
}) => {
  const [isExportingPPTX, setIsExportingPPTX] = useState(false);

  const hasSelection = selectedFabrics.length > 0;
  const targetList = hasSelection ? selectedFabrics : allFilteredFabrics;
  const countLabel = hasSelection
    ? `${selectedFabrics.length} selected swatches`
    : `${allFilteredFabrics.length} filtered fabrics`;

  const exportItemsToExcelOrCsv = (items: Fabric[], format: "xlsx" | "csv") => {
    const rows = items.map((f) => ({
      "Article No": f.article_no,
      "Aliases": f.article_aliases || "",
      "Fabric Structure": f.fabric_name,
      "End-Use Category": f.category_name || "",
      "Supplier / Mill": f.supplier_name || "",
      "Supplier Contact": f.supplier_contact || "",
      "Composition": f.composition_raw,
      "Min Weight (GSM)": f.weight_gsm_min,
      "Max Weight (GSM)": f.weight_gsm_max || "",
      "Cuttable Width": f.width_inches || "",
      "Gauge & Construction": f.construction || "",
      "Shrinkage": f.shrinkage || "",
      "Finish Type": f.finish_type || "",
      "Price Status": f.price_status,
      "Unit Price": f.price_amount != null ? f.price_amount : "",
      "Price Unit": f.price_unit,
      "Currency": f.price_currency || "USD",
      "MOQ": f.moq || "",
      "MCQ": f.mcq || "",
      "Commercial Notes": f.price_notes || "",
      "Sample Custodian": f.sample_holder || "",
      "Rack Location": f.rack_location || "",
      "Physical Tag": f.physical_tag || "",
      "Stock Note": f.available_stock_note || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fabric Stock");

    const dateStr = new Date().toISOString().slice(0, 10);
    const filenameBase = hasSelection ? `fabric_selection_${dateStr}` : `fabric_stock_export_${dateStr}`;

    if (format === "csv") {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `${filenameBase}.csv`);
    } else {
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `${filenameBase}.xlsx`);
    }
  };

  const handleExportCSV = () => {
    if (hasSelection) {
      exportItemsToExcelOrCsv(selectedFabrics, "csv");
    } else {
      const url = api.getExportUrl("csv", activeFilter);
      window.open(url, "_blank");
    }
  };

  const handleExportXLSX = () => {
    if (hasSelection) {
      exportItemsToExcelOrCsv(selectedFabrics, "xlsx");
    } else {
      const url = api.getExportUrl("xlsx", activeFilter);
      window.open(url, "_blank");
    }
  };

  const handleExportPPTX = async () => {
    if (targetList.length === 0) {
      alert("No fabrics available to export");
      return;
    }
    setIsExportingPPTX(true);
    try {
      await generateFabricPresentationDeck(targetList);
    } catch (err: unknown) {
      console.error("PPTX Generation error:", err);
      alert("Failed to generate presentation deck");
    } finally {
      setIsExportingPPTX(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 sm:h-10 rounded-xl text-xs font-semibold">
          {isExportingPPTX ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-indigo-600" />
          ) : (
            <Download className="h-4 w-4 mr-1.5 text-indigo-600" />
          )}
          <span>Export {hasSelection ? `(${selectedFabrics.length})` : "Data"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-2xl shadow-xl">
        <div className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 mb-1">
          Export Scope: {countLabel}
        </div>
        <DropdownMenuItem onClick={handleExportXLSX} className="rounded-xl py-2 cursor-pointer">
          <FileSpreadsheet className="mr-2.5 h-4 w-4 text-emerald-600" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Excel Workbook (.xlsx)</span>
            <span className="text-[10px] text-zinc-400">
              {hasSelection ? "Export selected rows" : "Export active filtered list"}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl py-2 cursor-pointer">
          <FileText className="mr-2.5 h-4 w-4 text-sky-600" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">CSV Data (.csv)</span>
            <span className="text-[10px] text-zinc-400">
              {hasSelection ? "Export selected rows" : "Export active filtered list"}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleExportPPTX}
          disabled={isExportingPPTX}
          className="rounded-xl py-2 cursor-pointer"
        >
          <Presentation className="mr-2.5 h-4 w-4 text-amber-600" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Buyer Deck (.pptx)</span>
            <span className="text-[10px] text-zinc-400">
              {hasSelection ? "Slides for selected fabrics" : "Slides for all fabrics"}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
