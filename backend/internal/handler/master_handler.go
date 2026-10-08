package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"stock_library/backend/internal/models"
	"stock_library/backend/internal/repository"
	"stock_library/backend/internal/service"
)

type MasterHandler struct {
	catRepo       *repository.CategoryRepository
	supRepo       *repository.SupplierRepository
	fabricService *service.FabricService
}

func NewMasterHandler(
	catRepo *repository.CategoryRepository,
	supRepo *repository.SupplierRepository,
	fabricService *service.FabricService,
) *MasterHandler {
	return &MasterHandler{
		catRepo:       catRepo,
		supRepo:       supRepo,
		fabricService: fabricService,
	}
}

// Category Endpoints
func (h *MasterHandler) GetCategories(c *gin.Context) {
	categories, err := h.catRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func (h *MasterHandler) CreateCategory(c *gin.Context) {
	var input struct {
		Name   string `json:"name" binding:"required"`
		Gender string `json:"gender"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category payload", "details": err.Error()})
		return
	}

	cat, err := h.catRepo.FindOrCreate(input.Name, input.Gender)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, cat)
}

func (h *MasterHandler) UpdateCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	var input struct {
		Name   string `json:"name" binding:"required"`
		Gender string `json:"gender"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category payload"})
		return
	}

	cat := &models.Category{
		ID:     id,
		Name:   input.Name,
		Gender: input.Gender,
	}
	if err := h.catRepo.Update(cat); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
		return
	}
	c.JSON(http.StatusOK, cat)
}

func (h *MasterHandler) DeleteCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	if err := h.catRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

// Supplier Endpoints
func (h *MasterHandler) GetSuppliers(c *gin.Context) {
	suppliers, err := h.supRepo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch suppliers"})
		return
	}
	c.JSON(http.StatusOK, suppliers)
}

func (h *MasterHandler) CreateSupplier(c *gin.Context) {
	var input struct {
		Name          string  `json:"name" binding:"required"`
		ShortCode     *string `json:"short_code"`
		ContactPerson *string `json:"contact_person"`
		Email         *string `json:"email"`
		Phone         *string `json:"phone"`
		Country       string  `json:"country"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid supplier payload", "details": err.Error()})
		return
	}

	sup := &models.Supplier{
		ID:            uuid.New(),
		Name:          input.Name,
		ShortCode:     input.ShortCode,
		ContactPerson: input.ContactPerson,
		Email:         input.Email,
		Phone:         input.Phone,
		Country:       input.Country,
	}
	if sup.Country == "" {
		sup.Country = "Bangladesh"
	}

	if err := h.supRepo.Create(sup); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create supplier", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sup)
}

func (h *MasterHandler) UpdateSupplier(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid supplier ID"})
		return
	}

	var input struct {
		Name          string  `json:"name" binding:"required"`
		ShortCode     *string `json:"short_code"`
		ContactPerson *string `json:"contact_person"`
		Email         *string `json:"email"`
		Phone         *string `json:"phone"`
		Country       string  `json:"country"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid supplier payload"})
		return
	}

	sup := &models.Supplier{
		ID:            id,
		Name:          input.Name,
		ShortCode:     input.ShortCode,
		ContactPerson: input.ContactPerson,
		Email:         input.Email,
		Phone:         input.Phone,
		Country:       input.Country,
	}
	if sup.Country == "" {
		sup.Country = "Bangladesh"
	}

	if err := h.supRepo.Update(sup); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update supplier"})
		return
	}
	c.JSON(http.StatusOK, sup)
}

func (h *MasterHandler) DeleteSupplier(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid supplier ID"})
		return
	}

	if err := h.supRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete supplier"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Supplier deleted successfully"})
}

// Stats Endpoint
func (h *MasterHandler) GetStats(c *gin.Context) {
	stats, err := h.fabricService.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch statistics"})
		return
	}
	c.JSON(http.StatusOK, stats)
}
