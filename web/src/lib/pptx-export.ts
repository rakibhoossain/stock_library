import pptxgen from "pptxgenjs";
import { Fabric, Presentation, PresentationDetail } from "@/types/fabric";
import { formatWeight, formatPrice } from "./utils";

export async function generateFabricPresentationDeck(
  fabrics: Fabric[],
  presentation?: Presentation | PresentationDetail | null
): Promise<void> {
  if (!fabrics || fabrics.length === 0) return;

  const pptx = new pptxgen();

  // Define portrait slide layout matching the physical card presentation deck (8.5" x 11.0")
  pptx.defineLayout({ name: "PORTRAIT_SWATCH_CARD", width: 8.5, height: 11.0 });
  pptx.layout = "PORTRAIT_SWATCH_CARD";

  // 1. Welcome / Introduction Cover Slide
  if (presentation || fabrics.length > 1) {
    const coverSlide = pptx.addSlide();
    coverSlide.background = { color: "FFFFFF" };

    // Decorative top accent border
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 0.8,
      w: 6.9,
      h: 0.1,
      fill: { color: "4F46E5" },
      line: { color: "4F46E5" },
    });

    const deckTitle = presentation?.title || "Fabric Library";
    coverSlide.addText(deckTitle.toUpperCase(), {
      x: 0.8,
      y: 2.2,
      w: 6.9,
      fontSize: 26,
      bold: true,
      color: "111827",
      fontFace: "Arial",
      align: "center",
    });

    if (presentation?.buyer_name) {
      coverSlide.addText(`PREPARED FOR: ${presentation.buyer_name.toUpperCase()}`, {
        x: 0.8,
        y: 3.1,
        w: 6.9,
        fontSize: 14,
        bold: true,
        color: "4F46E5",
        fontFace: "Arial",
        align: "center",
      });
    }

    const metaParts = [
      presentation?.season ? `Season: ${presentation.season}` : null,
      `${fabrics.length} Curated Swatches`,
      presentation?.presenter_name ? `By: ${presentation.presenter_name}` : null,
    ].filter(Boolean);

    coverSlide.addText(metaParts.join("  •  "), {
      x: 0.8,
      y: 3.8,
      w: 6.9,
      fontSize: 12,
      color: "4B5563",
      fontFace: "Arial",
      align: "center",
    });

    // Welcome / Executive Summary Callout Box
    if (presentation?.welcome_notes) {
      coverSlide.addShape(pptx.ShapeType.roundRect, {
        x: 1.0,
        y: 4.8,
        w: 6.5,
        h: 3.2,
        fill: { color: "F8FAFC" },
        line: { color: "CBD5E1", width: 1 },
      });

      coverSlide.addText("COLLECTION NOTES", {
        x: 1.2,
        y: 5.1,
        w: 6.1,
        fontSize: 11,
        bold: true,
        color: "475569",
        fontFace: "Arial",
        align: "left",
      });

      coverSlide.addText(presentation.welcome_notes, {
        x: 1.2,
        y: 5.6,
        w: 6.1,
        h: 2.1,
        fontSize: 12,
        color: "1E293B",
        fontFace: "Arial",
        align: "left",
        valign: "top",
      });
    }

    // Cover Footer
    coverSlide.addText(
      `Stock Library Presentation  •  Date: ${new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
      {
        x: 0.8,
        y: 9.8,
        w: 6.9,
        fontSize: 10,
        color: "9CA3AF",
        fontFace: "Arial",
        align: "center",
      }
    );
  }

  // 2. Individual fabric swatch card slides
  for (const fabric of fabrics) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Swatch Photo on Top (centered, full hanger card & swatch visible)
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

    // Format price to match card layout with Intl currency (e.g. $4.56/kg)
    const priceDisplay = formatPrice(
      fabric.price_amount,
      fabric.price_currency || "USD",
      fabric.price_unit || "kg",
      fabric.price_notes,
      fabric.price_status
    );

    // Format width ensuring unit
    const widthDisplay = fabric.width_inches
      ? fabric.width_inches.includes('"')
        ? fabric.width_inches
        : `${fabric.width_inches}"`
      : "-";

    // Format MOQ and MCQ display (strip Explore Files artifacts if any)
    const cleanMoq = fabric.moq && !fabric.moq.toLowerCase().includes("explore") ? fabric.moq : null;
    const cleanMcq = fabric.mcq && !fabric.mcq.toLowerCase().includes("explore") ? fabric.mcq : null;
    const moqMcqDisplay =
      cleanMoq || cleanMcq
        ? `MOQ: ${cleanMoq || "-"}   /   MCQ: ${cleanMcq || "-"}`
        : "-";

    // Structured Specifications Table on Bottom (Exact specimen rows as physical spec card)
    const rows = [
      [{ text: "Category" }, { text: fabric.category_name || "-" }],
      [{ text: "Fabric" }, { text: fabric.fabric_name || "-" }],
      [{ text: "Composition" }, { text: fabric.composition_raw || "-" }],
      [{ text: "Weight" }, { text: formatWeight(fabric.weight_gsm_min, fabric.weight_gsm_max) }],
      [{ text: "Width" }, { text: widthDisplay }],
      [{ text: "Supplier" }, { text: fabric.supplier_name || "-" }],
      [{ text: "Contact Person" }, { text: fabric.supplier_contact || "-" }],
      [{ text: "Price" }, { text: priceDisplay }],
      [{ text: "MOQ / MCQ" }, { text: moqMcqDisplay }],
    ];

    slide.addTable(rows, {
      x: 1.25,
      y: 7.5,
      w: 6.0,
      colW: [2.0, 4.0],
      fontSize: 10.5,
      color: "000000",
      fontFace: "Arial",
      border: { pt: 0.75, color: "000000" },
      fill: { color: "FFFFFF" },
      align: "left",
      valign: "middle",
      margin: [2.5, 6, 2.5, 6],
      autoPage: false,
    });
  }

  // 3. Thank You / Closing Slide
  if (presentation || fabrics.length > 1) {
    const closingSlide = pptx.addSlide();
    closingSlide.background = { color: "FFFFFF" };

    // Decorative top accent border
    closingSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 0.8,
      w: 6.9,
      h: 0.1,
      fill: { color: "4F46E5" },
      line: { color: "4F46E5" },
    });

    closingSlide.addText("THANK YOU", {
      x: 0.8,
      y: 2.2,
      w: 6.9,
      fontSize: 32,
      bold: true,
      color: "111827",
      fontFace: "Arial",
      align: "center",
    });

    closingSlide.addText("We appreciate your time & partnership", {
      x: 0.8,
      y: 3.1,
      w: 6.9,
      fontSize: 15,
      color: "4B5563",
      fontFace: "Arial",
      align: "center",
    });

    // Optional Next steps / Sample dispatch box
    if (presentation?.closing_notes?.trim()) {
      closingSlide.addShape(pptx.ShapeType.roundRect, {
        x: 1.0,
        y: 4.2,
        w: 6.5,
        h: 2.8,
        fill: { color: "F8FAFC" },
        line: { color: "CBD5E1", width: 1 },
      });

      closingSlide.addText("SAMPLE DISPATCH & NEXT STEPS", {
        x: 1.2,
        y: 4.5,
        w: 6.1,
        fontSize: 11,
        bold: true,
        color: "4F46E5",
        fontFace: "Arial",
        align: "left",
      });

      closingSlide.addText(presentation.closing_notes.trim(), {
        x: 1.2,
        y: 5.0,
        w: 6.1,
        h: 1.7,
        fontSize: 12,
        color: "1E293B",
        fontFace: "Arial",
        align: "left",
        valign: "top",
      });
    }

    // Contact Information Box
    if (presentation?.contact_info || presentation?.presenter_name) {
      closingSlide.addShape(pptx.ShapeType.roundRect, {
        x: 1.0,
        y: 7.4,
        w: 6.5,
        h: 1.6,
        fill: { color: "EEF2FF" },
        line: { color: "C7D2FE", width: 1 },
      });

      closingSlide.addText("DIRECT CONTACT", {
        x: 1.2,
        y: 7.6,
        w: 6.1,
        fontSize: 10,
        bold: true,
        color: "4338CA",
        fontFace: "Arial",
        align: "left",
      });

      const contactLine = [
        presentation.presenter_name ? `Presenter: ${presentation.presenter_name}` : null,
        presentation.contact_info ? `Inquiries: ${presentation.contact_info}` : null,
      ]
        .filter(Boolean)
        .join("   •   ");

      closingSlide.addText(contactLine, {
        x: 1.2,
        y: 8.0,
        w: 6.1,
        fontSize: 12,
        bold: true,
        color: "1E1B4B",
        fontFace: "Arial",
        align: "left",
      });
    }

    // Closing Footer
    closingSlide.addText("Stock Library Fabric Deck  •  Confidential Sourcing Document", {
      x: 0.8,
      y: 9.8,
      w: 6.9,
      fontSize: 10,
      color: "9CA3AF",
      fontFace: "Arial",
      align: "center",
    });
  }

  const baseTitle = presentation?.title ? presentation.title.replace(/[^a-zA-Z0-9_-]/g, "_") : "Fabric_Presentation";
  const fileName = `${baseTitle}_${new Date().toISOString().slice(0, 10)}.pptx`;
  await pptx.writeFile({ fileName });
}
