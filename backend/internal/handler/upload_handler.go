package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"stock_library/backend/internal/config"
)

type UploadHandler struct {
	cfg *config.Config
}

func NewUploadHandler(cfg *config.Config) *UploadHandler {
	return &UploadHandler{cfg: cfg}
}

func (h *UploadHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded or invalid form field 'file'"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".avif" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported file format. Please upload JPG, PNG, WEBP, or AVIF."})
		return
	}

	if err := os.MkdirAll(h.cfg.UploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare storage directory"})
		return
	}

	newFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	dstPath := filepath.Join(h.cfg.UploadDir, newFileName)

	if err := c.SaveUploadedFile(file, dstPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
		return
	}

	fileURL := fmt.Sprintf("%s/%s", strings.TrimRight(h.cfg.StaticBaseURL, "/"), newFileName)
	c.JSON(http.StatusOK, gin.H{
		"url":       fileURL,
		"filename":  newFileName,
		"size":      file.Size,
		"mime_type": file.Header.Get("Content-Type"),
	})
}
