package service

import (
	"crypto/sha256"
	"encoding/binary"
	"math"
	"math/rand"
	"strings"

	"github.com/google/uuid"
	"stock_library/backend/internal/models"
	"stock_library/backend/internal/repository"
)

type FabricService struct {
	fabricRepo *repository.FabricRepository
}

func NewFabricService(fabricRepo *repository.FabricRepository) *FabricService {
	return &FabricService{
		fabricRepo: fabricRepo,
	}
}

func (s *FabricService) ListFabrics(filter models.FabricFilter) (*models.PaginatedFabrics, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	fabrics, total, err := s.fabricRepo.List(filter)
	if err != nil {
		return nil, err
	}

	totalPages := (total + filter.Limit - 1) / filter.Limit
	if totalPages == 0 {
		totalPages = 1
	}

	return &models.PaginatedFabrics{
		Items:      fabrics,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *FabricService) GetFabric(id uuid.UUID) (*models.Fabric, error) {
	return s.fabricRepo.GetByID(id)
}

func (s *FabricService) CreateFabric(input models.FabricInput) (*models.Fabric, error) {
	fabric := &models.Fabric{
		ID:                  uuid.New(),
		ArticleNo:           strings.TrimSpace(input.ArticleNo),
		ArticleAliases:      input.ArticleAliases,
		FabricName:          strings.TrimSpace(input.FabricName),
		CategoryID:          input.CategoryID,
		SupplierID:          input.SupplierID,
		CompositionRaw:      strings.TrimSpace(input.CompositionRaw),
		CompositionBreakdown: input.Fibers,
		WeightGsmMin:        input.WeightGsmMin,
		WeightGsmMax:        input.WeightGsmMax,
		WidthInches:         input.WidthInches,
		Construction:        input.Construction,
		Shrinkage:           input.Shrinkage,
		FinishType:          input.FinishType,
		SampleHolder:        input.SampleHolder,
		RackLocation:        input.RackLocation,
		PhysicalTag:         input.PhysicalTag,
		AvailableStockNote:  input.AvailableStockNote,
		PriceStatus:         input.PriceStatus,
		PriceAmount:         input.PriceAmount,
		PriceCurrency:       input.PriceCurrency,
		PriceUnit:           input.PriceUnit,
		PriceNotes:          input.PriceNotes,
		MOQ:                 input.MOQ,
		MCQ:                 input.MCQ,
		PrimaryImageURL:     input.PrimaryImageURL,
		HangerCardImageURL:  input.HangerCardImageURL,
	}

	if fabric.PriceStatus == "" {
		if fabric.PriceAmount != nil && *fabric.PriceAmount > 0 {
			fabric.PriceStatus = "CONFIRMED"
		} else {
			fabric.PriceStatus = "PENDING"
		}
	}
	if fabric.PriceCurrency == "" {
		fabric.PriceCurrency = "USD"
	}
	if fabric.PriceUnit == "" {
		fabric.PriceUnit = "KG"
	}

	err := s.fabricRepo.Create(fabric)
	if err != nil {
		return nil, err
	}

	// If an image URL is present, generate and save 768-dim embedding
	if fabric.PrimaryImageURL != nil && *fabric.PrimaryImageURL != "" {
		emb := GenerateDeterministicEmbedding(*fabric.PrimaryImageURL + fabric.ArticleNo + fabric.FabricName)
		_ = s.fabricRepo.SaveEmbedding(fabric.ID, *fabric.PrimaryImageURL, emb)
	}

	return s.fabricRepo.GetByID(fabric.ID)
}

func (s *FabricService) UpdateFabric(id uuid.UUID, input models.FabricInput) (*models.Fabric, error) {
	existing, err := s.fabricRepo.GetByID(id)
	if err != nil || existing == nil {
		return nil, err
	}

	existing.ArticleNo = strings.TrimSpace(input.ArticleNo)
	existing.ArticleAliases = input.ArticleAliases
	existing.FabricName = strings.TrimSpace(input.FabricName)
	existing.CategoryID = input.CategoryID
	existing.SupplierID = input.SupplierID
	existing.CompositionRaw = strings.TrimSpace(input.CompositionRaw)
	existing.CompositionBreakdown = input.Fibers
	existing.WeightGsmMin = input.WeightGsmMin
	existing.WeightGsmMax = input.WeightGsmMax
	existing.WidthInches = input.WidthInches
	existing.Construction = input.Construction
	existing.Shrinkage = input.Shrinkage
	existing.FinishType = input.FinishType
	existing.SampleHolder = input.SampleHolder
	existing.RackLocation = input.RackLocation
	existing.PhysicalTag = input.PhysicalTag
	existing.AvailableStockNote = input.AvailableStockNote
	existing.PriceStatus = input.PriceStatus
	existing.PriceAmount = input.PriceAmount
	existing.PriceCurrency = input.PriceCurrency
	existing.PriceUnit = input.PriceUnit
	existing.PriceNotes = input.PriceNotes
	existing.MOQ = input.MOQ
	existing.MCQ = input.MCQ
	existing.PrimaryImageURL = input.PrimaryImageURL
	existing.HangerCardImageURL = input.HangerCardImageURL

	err = s.fabricRepo.Update(existing)
	if err != nil {
		return nil, err
	}

	return s.fabricRepo.GetByID(id)
}

func (s *FabricService) DeleteFabric(id uuid.UUID) error {
	return s.fabricRepo.Delete(id)
}

func (s *FabricService) SearchByVector(embedding []float32, limit int) ([]models.SwatchSearchResult, error) {
	return s.fabricRepo.SearchByVector(embedding, limit)
}

func (s *FabricService) GetStats() (*models.DashboardStats, error) {
	return s.fabricRepo.GetStats()
}

// GenerateDeterministicEmbedding generates a normalized 768-dimensional float32 vector
// seeded from a string or image signature. When an actual CLIP/SigLIP inference endpoint
// is configured, this can be swapped or combined with HTTP call to the model.
func GenerateDeterministicEmbedding(seedStr string) []float32 {
	hasher := sha256.New()
	hasher.Write([]byte(seedStr))
	seedBytes := hasher.Sum(nil)
	seedInt := int64(binary.BigEndian.Uint64(seedBytes[:8]))

	r := rand.New(rand.NewSource(seedInt))
	dim := 768
	vec := make([]float32, dim)
	var sumSquares float64

	for i := 0; i < dim; i++ {
		val := r.NormFloat64()
		vec[i] = float32(val)
		sumSquares += val * val
	}

	norm := float32(math.Sqrt(sumSquares))
	if norm > 0 {
		for i := 0; i < dim; i++ {
			vec[i] /= norm
		}
	}
	return vec
}
