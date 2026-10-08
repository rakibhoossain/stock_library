package service

import (
	"errors"

	"github.com/google/uuid"
	"stock_library/backend/internal/models"
	"stock_library/backend/internal/repository"
)

type PresentationService struct {
	repo *repository.PresentationRepository
}

func NewPresentationService(repo *repository.PresentationRepository) *PresentationService {
	return &PresentationService{repo: repo}
}

func (s *PresentationService) List() ([]models.Presentation, error) {
	return s.repo.List()
}

func (s *PresentationService) GetByID(id uuid.UUID) (*models.PresentationDetail, error) {
	return s.repo.GetByID(id)
}

func (s *PresentationService) Create(req models.CreatePresentationRequest, createdBy *uuid.UUID) (*models.Presentation, error) {
	if req.Title == "" {
		return nil, errors.New("presentation title is required")
	}
	return s.repo.Create(req, createdBy)
}

func (s *PresentationService) Update(id uuid.UUID, req models.UpdatePresentationRequest) (*models.Presentation, error) {
	if req.Title == "" {
		return nil, errors.New("presentation title is required")
	}
	return s.repo.Update(id, req)
}

func (s *PresentationService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *PresentationService) AddItems(id uuid.UUID, fabricIDs []string) (int, error) {
	if len(fabricIDs) == 0 {
		return 0, nil
	}
	return s.repo.AddItems(id, fabricIDs)
}

func (s *PresentationService) RemoveItems(id uuid.UUID, fabricIDs []string) error {
	return s.repo.RemoveItems(id, fabricIDs)
}
