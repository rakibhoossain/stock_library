package repository

import (
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"stock_library/backend/internal/models"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	query := `SELECT id, email, password_hash, full_name, role, avatar_url, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)`
	err := r.db.Get(&user, query, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	query := `SELECT id, email, password_hash, full_name, role, avatar_url, created_at, updated_at FROM users WHERE id = $1`
	err := r.db.Get(&user, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Create(user *models.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, full_name, role, avatar_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	return r.db.QueryRow(query, user.ID, user.Email, user.PasswordHash, user.FullName, user.Role, user.AvatarURL).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}
