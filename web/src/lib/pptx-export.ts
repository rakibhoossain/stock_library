import pptxgen from "pptxgenjs";
import { Fabric } from "@/types/fabric";
import { formatWeight } from "./utils";

export async function generateFabricPresentationDeck(fabrics: Fabric[]): Promise<void> {
  if (!fabrics || fabrics.length === 0) return;

  const pptx = new pptxgen();

  // Define portrait slide layout matching the physical card presentation deck (8.5" x 11.0")
  pptx.defineLayout({ name: "PORTRAIT_SWATCH_CARD", width: 8.5, height: 11.0 });
  pptx.layout = "PORTRAIT_SWATCH_CARD";

  // Optional cover slide for batch exports (> 1 swatch)
  if (fabrics.length > 1) {
    const coverSlide = pptx.addSlide();
    coverSlide.background = { color: "FFFFFF" };

    coverSlide.addText("TEXSTOCK LIBRARY", {
      x: 1.0,
      y: 4.2,
      w: 6.5,
      fontSize: 32,
      bold: true,
      color: "000000",
      fontFace: "Arial",
      align: "center",
    });

    coverSlide.addText("Fabric Sourcing Presentation Deck", {
      x: 1.0,
      y: 4.9,
      w: 6.5,
      fontSize: 18,
      color: "4B5563",
      fontFace: "Arial",
      align: "center",
    });

    coverSlide.addText(
      `${fabrics.length} Swatches • Generated: ${new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
      {
        x: 1.0,
        y: 5.6,
        w: 6.5,
        fontSize: 13,
        color: "6B7280",
        fontFace: "Arial",
        align: "center",
      }
    );
  }

  // Individual fabric swatch card slides
  for (const fabric of fabrics) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // 1. Swatch Photo on Top (centered, full hanger card & swatch visible)
    if (fabric.primary_image_url) {
      slide.addImage({
        path: fabric.primary_image_url,
        x: 0.6,
        y: 0.5,
        w: 7.3,
        h: 6.8,
        sizing: { type: "contain", w: 7.3, h: 6.8 },
      });
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.6,
        y: 0.5,
        w: 7.3,
        h: 6.8,
        fill: { color: "F3F4F6" },
        line: { color: "D1D5DB", width: 1 },
      });
      slide.addText("NO SWATCH PHOTO AVAILABLE", {
        x: 0.6,
        y: 3.6,
        w: 7.3,
        fontSize: 14,
        color: "9CA3AF",
        align: "center",
        fontFace: "Arial",
      });
    }

    // Format price to match card layout (e.g. 4.56/kg)
    const priceDisplay =
      fabric.price_amount != null
        ? `${fabric.price_amount}/${(fabric.price_unit || "kg").replace(/^\//, "").toLowerCase()}`
        : fabric.price_notes || fabric.price_status || "-";

    // Format width ensuring unit
    const widthDisplay = fabric.width_inches
      ? fabric.width_inches.includes('"')
        ? fabric.width_inches
        : `${fabric.width_inches}"`
      : "-";

    // 2. Structured Specifications Table on Bottom (Exact 8 rows as physical spec card)
    const rows = [
      [{ text: "Category" }, { text: fabric.category_name || "-" }],
      [{ text: "Fabric" }, { text: fabric.fabric_name || "-" }],
      [{ text: "Composition" }, { text: fabric.composition_raw || "-" }],
      [{ text: "Weight" }, { text: formatWeight(fabric.weight_gsm_min, fabric.weight_gsm_max) }],
      [{ text: "Width" }, { text: widthDisplay }],
      [{ text: "Supplier" }, { text: fabric.supplier_name || "-" }],
      [{ text: "Contact Person" }, { text: fabric.supplier_contact || "-" }],
      [{ text: "Price" }, { text: priceDisplay }],
    ];

    slide.addTable(rows, {
      x: 1.25,
      y: 7.6,
      w: 6.0,
      colW: [2.1, 3.9],
      fontSize: 11,
      color: "000000",
      fontFace: "Arial",
      border: { pt: 0.75, color: "000000" },
      fill: { color: "FFFFFF" },
      align: "left",
      valign: "middle",
      margin: [3, 8, 3, 8],
      autoPage: false,
    });
  }

  const fileName = `Fabric_Presentation_${new Date().toISOString().slice(0, 10)}.pptx`;
  await pptx.writeFile({ fileName });
}
