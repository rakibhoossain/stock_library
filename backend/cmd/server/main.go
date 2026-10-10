package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"stock_library/backend/internal/config"
	"stock_library/backend/internal/database"
	"stock_library/backend/internal/handler"
	"stock_library/backend/internal/repository"
	"stock_library/backend/internal/service"
	"stock_library/backend/internal/storage"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()

	// Initialize S3 Storage Service
	s3Service, err := storage.NewS3Service(cfg)
	if err != nil {
		log.Printf("Warning: S3 Service initialization failed: %v", err)
	}

	// Initialize Repositories
	userRepo := repository.NewUserRepository(db)
	catRepo := repository.NewCategoryRepository(db)
	supRepo := repository.NewSupplierRepository(db)
	fabricRepo := repository.NewFabricRepository(db)
	presRepo := repository.NewPresentationRepository(db)

	// Initialize Services
	authService := service.NewAuthService(userRepo, cfg)
	exportService := service.NewExportService()
	fabricService := service.NewFabricService(fabricRepo)
	presService := service.NewPresentationService(presRepo)

	// Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	masterHandler := handler.NewMasterHandler(catRepo, supRepo, fabricService)
	fabricHandler := handler.NewFabricHandler(fabricService, exportService)
	presHandler := handler.NewPresentationHandler(presService)
	var storageHandler *handler.StorageHandler
	if s3Service != nil {
		storageHandler = handler.NewStorageHandler(s3Service)
	}

	// Router setup
	r := gin.Default()
	r.Use(handler.CORSMiddleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":   "healthy",
			"database": "connected (PostgreSQL 18 + pgvector 0.8.7)",
			"storage":  "AWS S3 (" + cfg.AWSS3Bucket + ")",
			"service":  "fabric-stock-library-api",
		})
	})

	// API v1
	v1 := r.Group("/api/v1")
	{
		// Authentication
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/login", authHandler.Login)
			authGroup.GET("/me", handler.AuthMiddleware(cfg.JWTSecret), authHandler.Me)
		}

		// Master Data
		v1.GET("/categories", masterHandler.GetCategories)
		v1.GET("/suppliers", masterHandler.GetSuppliers)
		v1.GET("/stats", masterHandler.GetStats)

		// Presentations (Public Read)
		v1.GET("/presentations", presHandler.List)
		v1.GET("/presentations/:id", presHandler.Get)

		// Fabrics Listing & Search (Public / Read)
		v1.GET("/fabrics", fabricHandler.ListFabrics)
		v1.GET("/fabrics/:id", fabricHandler.GetFabric)
		v1.POST("/fabrics/search-by-image", fabricHandler.SearchByImage)
		v1.GET("/fabrics/export", fabricHandler.Export)

		// Fabric Mutation, Storage & Uploads (Protected)
		protected := v1.Group("")
		protected.Use(handler.AuthMiddleware(cfg.JWTSecret))
		{
			protected.POST("/fabrics", fabricHandler.CreateFabric)
			protected.PUT("/fabrics/:id", fabricHandler.UpdateFabric)
			protected.DELETE("/fabrics/:id", fabricHandler.DeleteFabric)

			// Presentations Management (Protected)
			protected.POST("/presentations", presHandler.Create)
			protected.PUT("/presentations/:id", presHandler.Update)
			protected.DELETE("/presentations/:id", presHandler.Delete)
			protected.POST("/presentations/:id/items", presHandler.AddItems)
			protected.DELETE("/presentations/:id/items", presHandler.RemoveItems)

			// Categories Management
			protected.POST("/categories", masterHandler.CreateCategory)
			protected.PUT("/categories/:id", masterHandler.UpdateCategory)
			protected.DELETE("/categories/:id", masterHandler.DeleteCategory)

			// Suppliers Management
			protected.POST("/suppliers", masterHandler.CreateSupplier)
			protected.PUT("/suppliers/:id", masterHandler.UpdateSupplier)
			protected.DELETE("/suppliers/:id", masterHandler.DeleteSupplier)

			if storageHandler != nil {
				protected.POST("/storage/presigned-url", storageHandler.GetPresignedUploadURL)
			}
		}
	}

	log.Printf("Fabric Stock Library API starting on port %s...", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
