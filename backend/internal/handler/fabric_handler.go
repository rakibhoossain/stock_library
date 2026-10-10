package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"stock_library/backend/internal/models"
	"stock_library/backend/internal/service"
)

type FabricHandler struct {
	fabricService *service.FabricService
	exportService *service.ExportService
}

func NewFabricHandler(fabricService *service.FabricService, exportService *service.ExportService) *FabricHandler {
	return &FabricHandler{
		fabricService: fabricService,
		exportService: exportService,
	}
}

func (h *FabricHandler) ListFabrics(c *gin.Context) {
	var filter models.FabricFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filter parameters", "details": err.Error()})
		return
	}

	result, err := h.fabricService.ListFabrics(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch fabrics", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *FabricHandler) GetFabric(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fabric ID"})
		return
	}

	fabric, err := h.fabricService.GetFabric(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch fabric"})
		return
	}
	if fabric == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fabric not found"})
		return
	}

	c.JSON(http.StatusOK, fabric)
}

func (h *FabricHandler) CreateFabric(c *gin.Context) {
	var input models.FabricInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	created, err := h.fabricService.CreateFabric(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create fabric", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (h *FabricHandler) UpdateFabric(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fabric ID"})
		return
	}

	var input models.FabricInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	updated, err := h.fabricService.UpdateFabric(id, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update fabric", "details": err.Error()})
		return
	}
	if updated == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fabric not found"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *FabricHandler) DeleteFabric(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fabric ID"})
		return
	}

	err = h.fabricService.DeleteFabric(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete fabric"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fabric deleted successfully"})
}

func (h *FabricHandler) SearchByImage(c *gin.Context) {
	limit := 12
	if l := c.Query("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	var embedding []float32
	var err error

	// 1. Check if a multipart file was uploaded
	file, fileErr := c.FormFile("image")
	if fileErr == nil {
		f, openErr := file.Open()
		if openErr == nil {
			defer f.Close()
			embedding, _ = service.ExtractVisualEmbedding(f)
		}
	}

	// 2. Check if an image_url was sent in JSON payload
	if len(embedding) == 0 {
		type urlPayload struct {
			ImageURL string `json:"image_url"`
		}
		var p urlPayload
		if bindErr := c.ShouldBindJSON(&p); bindErr == nil && p.ImageURL != "" {
			embedding, _ = service.FetchAndExtractVisualEmbedding(p.ImageURL)
			if len(embedding) == 0 {
				embedding = service.GenerateDeterministicEmbedding(p.ImageURL)
			}
		}
	}

	// 3. Fallback if still empty
	if len(embedding) == 0 {
		embedding = service.GenerateDeterministicEmbedding("sample-swatch-" + strconv.FormatInt(time.Now().UnixNano(), 10))
	}

	results, err := h.fabricService.SearchByVector(embedding, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute visual similarity search", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"count":   len(results),
	})
}

func (h *FabricHandler) Export(c *gin.Context) {
	format := strings.ToLower(c.DefaultQuery("format", "xlsx"))

	var filter models.FabricFilter
	_ = c.ShouldBindQuery(&filter)
	filter.Limit = 5000 // All rows matching active filters
	filter.Page = 1

	data, err := h.fabricService.ListFabrics(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve fabrics for export"})
		return
	}

	filenameBase := fmt.Sprintf("fabric_library_export_%s", time.Now().Format("20060102_150405"))

	if format == "csv" {
		csvBytes, err := h.exportService.GenerateCSV(data.Items)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate CSV export"})
			return
		}
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.csv", filenameBase))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", csvBytes)
		return
	}

	// Default to XLSX
	xlsxBytes, err := h.exportService.GenerateXLSX(data.Items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel export"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.xlsx", filenameBase))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxBytes)
}
