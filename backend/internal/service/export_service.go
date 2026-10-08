package service

import (
	"bytes"
	"encoding/csv"
	"fmt"

	"github.com/xuri/excelize/v2"
	"stock_library/backend/internal/models"
)

type ExportService struct{}

func NewExportService() *ExportService {
	return &ExportService{}
}

func (s *ExportService) GenerateCSV(fabrics []models.Fabric) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	headers := []string{
		"Article No", "Aliases", "Fabric Name", "Category", "Supplier",
		"Contact Person", "Composition", "Weight (GSM)", "Width",
		"Sample Location", "Price", "Unit", "Price Status", "MOQ", "MCQ", "Stock Note",
	}
	if err := writer.Write(headers); err != nil {
		return nil, err
	}

	for _, f := range fabrics {
		cat := ""
		if f.CategoryName != nil {
			cat = *f.CategoryName
		}
		sup := ""
		if f.SupplierName != nil {
			sup = *f.SupplierName
		}
		contact := ""
		if f.SupplierContact != nil {
			contact = *f.SupplierContact
		}
		aliases := ""
		if f.ArticleAliases != nil {
			aliases = *f.ArticleAliases
		}
		width := ""
		if f.WidthInches != nil {
			width = *f.WidthInches
		}
		location := ""
		if f.SampleHolder != nil {
			location = *f.SampleHolder
		}
		if f.RackLocation != nil && *f.RackLocation != "" {
			location += " (" + *f.RackLocation + ")"
		}

		priceStr := "-"
		if f.PriceAmount != nil {
			priceStr = fmt.Sprintf("$%.2f", *f.PriceAmount)
		} else if f.PriceNotes != nil && *f.PriceNotes != "" {
			priceStr = *f.PriceNotes
		}

		moq := ""
		if f.MOQ != nil {
			moq = *f.MOQ
		}
		mcq := ""
		if f.MCQ != nil {
			mcq = *f.MCQ
		}
		stockNote := ""
		if f.AvailableStockNote != nil {
			stockNote = *f.AvailableStockNote
		}

		gsmStr := fmt.Sprintf("%d", f.WeightGsmMin)
		if f.WeightGsmMax != nil && *f.WeightGsmMax > f.WeightGsmMin {
			gsmStr = fmt.Sprintf("%d-%d", f.WeightGsmMin, *f.WeightGsmMax)
		}

		record := []string{
			f.ArticleNo,
			aliases,
			f.FabricName,
			cat,
			sup,
			contact,
			f.CompositionRaw,
			gsmStr,
			width,
			location,
			priceStr,
			f.PriceUnit,
			f.PriceStatus,
			moq,
			mcq,
			stockNote,
		}

		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	return buf.Bytes(), writer.Error()
}

func (s *ExportService) GenerateXLSX(fabrics []models.Fabric) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Fabric Stock Library"
	f.SetSheetName("Sheet1", sheetName)

	// Create header style
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Color:  "FFFFFF",
			Family: "Calibri",
			Size:   11,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#1E293B"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
			WrapText:   true,
		},
	})
	if err != nil {
		return nil, err
	}

	headers := []string{
		"SI", "Article No", "Aliases", "Fabric Name", "Category", "Supplier",
		"Contact", "Composition", "GSM", "Width", "Sample Location",
		"Price", "Unit", "Status", "MOQ", "MCQ", "Stock Remarks",
	}

	for colIdx, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Apply header styling to row 1
	lastCol, _ := excelize.CoordinatesToCellName(len(headers), 1)
	_ = f.SetRowHeight(sheetName, 1, 28)
	_ = f.SetCellStyle(sheetName, "A1", lastCol, headerStyle)

	for rowIdx, item := range fabrics {
		row := rowIdx + 2
		cat := ""
		if item.CategoryName != nil {
			cat = *item.CategoryName
		}
		sup := ""
		if item.SupplierName != nil {
			sup = *item.SupplierName
		}
		contact := ""
		if item.SupplierContact != nil {
			contact = *item.SupplierContact
		}
		aliases := ""
		if item.ArticleAliases != nil {
			aliases = *item.ArticleAliases
		}
		width := ""
		if item.WidthInches != nil {
			width = *item.WidthInches
		}
		location := ""
		if item.SampleHolder != nil {
			location = *item.SampleHolder
		}
		if item.RackLocation != nil && *item.RackLocation != "" {
			location += " (" + *item.RackLocation + ")"
		}

		priceStr := "-"
		if item.PriceAmount != nil {
			priceStr = fmt.Sprintf("%.2f", *item.PriceAmount)
		} else if item.PriceNotes != nil && *item.PriceNotes != "" {
			priceStr = *item.PriceNotes
		}

		moq := ""
		if item.MOQ != nil {
			moq = *item.MOQ
		}
		mcq := ""
		if item.MCQ != nil {
			mcq = *item.MCQ
		}
		stockNote := ""
		if item.AvailableStockNote != nil {
			stockNote = *item.AvailableStockNote
		}

		gsmStr := fmt.Sprintf("%d", item.WeightGsmMin)
		if item.WeightGsmMax != nil && *item.WeightGsmMax > item.WeightGsmMin {
			gsmStr = fmt.Sprintf("%d-%d", item.WeightGsmMin, *item.WeightGsmMax)
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), rowIdx+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), item.ArticleNo)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), aliases)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), item.FabricName)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), cat)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), sup)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), contact)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), item.CompositionRaw)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), gsmStr)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), width)
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), location)
		f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), priceStr)
		f.SetCellValue(sheetName, fmt.Sprintf("M%d", row), item.PriceUnit)
		f.SetCellValue(sheetName, fmt.Sprintf("N%d", row), item.PriceStatus)
		f.SetCellValue(sheetName, fmt.Sprintf("O%d", row), moq)
		f.SetCellValue(sheetName, fmt.Sprintf("P%d", row), mcq)
		f.SetCellValue(sheetName, fmt.Sprintf("Q%d", row), stockNote)
		_ = f.SetRowHeight(sheetName, row, 20)
	}

	// Auto-fit column widths
	colWidths := map[string]float64{
		"A": 6, "B": 15, "C": 14, "D": 16, "E": 18, "F": 22,
		"G": 16, "H": 34, "I": 12, "J": 12, "K": 18, "L": 12,
		"M": 8, "N": 14, "O": 12, "P": 14, "Q": 24,
	}
	for col, width := range colWidths {
		_ = f.SetColWidth(sheetName, col, col, width)
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
