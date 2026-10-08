package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"stock_library/backend/internal/storage"
)

type StorageHandler struct {
	s3Service *storage.S3Service
}

func NewStorageHandler(s3Service *storage.S3Service) *StorageHandler {
	return &StorageHandler{s3Service: s3Service}
}

type PresignedURLRequest struct {
	FileName    string `json:"file_name" binding:"required"`
	ContentType string `json:"content_type" binding:"required"`
	Folder      string `json:"folder"`
}

func (h *StorageHandler) GetPresignedUploadURL(c *gin.Context) {
	var req PresignedURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	result, err := h.s3Service.GeneratePresignedPutURL(c.Request.Context(), req.FileName, req.ContentType, req.Folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate presigned upload URL", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
