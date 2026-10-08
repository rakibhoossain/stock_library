package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"stock_library/backend/internal/models"
	"stock_library/backend/internal/service"
)

type PresentationHandler struct {
	service *service.PresentationService
}

func NewPresentationHandler(service *service.PresentationService) *PresentationHandler {
	return &PresentationHandler{service: service}
}

// List returns all presentations
func (h *PresentationHandler) List(c *gin.Context) {
	list, err := h.service.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

// Get returns single presentation with full swatch items
func (h *PresentationHandler) Get(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid presentation ID"})
		return
	}

	detail, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// Create creates a new presentation with optional initial swatches
func (h *PresentationHandler) Create(c *gin.Context) {
	var req models.CreatePresentationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var userID *uuid.UUID
	if val, exists := c.Get("user_id"); exists {
		if uid, ok := val.(uuid.UUID); ok {
			userID = &uid
		}
	}

	pres, err := h.service.Create(req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, pres)
}

// Update updates presentation meta
func (h *PresentationHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid presentation ID"})
		return
	}

	var req models.UpdatePresentationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pres, err := h.service.Update(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, pres)
}

// Delete deletes presentation
func (h *PresentationHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid presentation ID"})
		return
	}

	err = h.service.Delete(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Presentation deleted successfully"})
}

// AddItems bulk assigns fabrics to presentation
func (h *PresentationHandler) AddItems(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid presentation ID"})
		return
	}

	var req models.BulkAssignPresentationItemsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	addedCount, err := h.service.AddItems(id, req.FabricIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Items assigned successfully",
		"added_count": addedCount,
	})
}

// RemoveItems removes fabrics from presentation
func (h *PresentationHandler) RemoveItems(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid presentation ID"})
		return
	}

	var req models.BulkAssignPresentationItemsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.service.RemoveItems(id, req.FabricIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Items removed successfully"})
}
