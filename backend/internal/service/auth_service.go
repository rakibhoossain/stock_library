package service

import (
	"errors"
	"strings"

	"github.com/google/uuid"
	"stock_library/backend/internal/auth"
	"stock_library/backend/internal/config"
	"stock_library/backend/internal/models"
	"stock_library/backend/internal/repository"
)

type AuthService struct {
	userRepo *repository.UserRepository
	cfg      *config.Config
}

func NewAuthService(userRepo *repository.UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (s *AuthService) Login(req models.LoginRequest) (*models.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role, s.cfg.JWTSecret, s.cfg.JWTExpirationHours)
	if err != nil {
		return nil, err
	}

	return &models.LoginResponse{
		Token: token,
		User: models.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FullName:  user.FullName,
			Role:      user.Role,
			AvatarURL: user.AvatarURL,
		},
	}, nil
}

func (s *AuthService) GetUserByID(id uuid.UUID) (*models.UserResponse, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	return &models.UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		Role:      user.Role,
		AvatarURL: user.AvatarURL,
	}, nil
}
