package repository

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"stock_library/backend/internal/models"
)

type CategoryRepository struct {
	db *sqlx.DB
}

func NewCategoryRepository(db *sqlx.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) GetAll() ([]models.Category, error) {
	var categories []models.Category
	query := `SELECT id, name, gender, slug, created_at FROM categories ORDER BY name ASC`
	err := r.db.Select(&categories, query)
	return categories, err
}

func (r *CategoryRepository) GetByID(id uuid.UUID) (*models.Category, error) {
	var cat models.Category
	query := `SELECT id, name, gender, slug, created_at FROM categories WHERE id = $1`
	err := r.db.Get(&cat, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

func (r *CategoryRepository) Create(cat *models.Category) error {
	if cat.ID == uuid.Nil {
		cat.ID = uuid.New()
	}
	cat.Name = strings.TrimSpace(cat.Name)
	if cat.Slug == "" {
		slug := strings.ToLower(strings.ReplaceAll(cat.Name, " ", "-"))
		cat.Slug = strings.ReplaceAll(slug, "/", "-")
	}
	if cat.Gender == "" {
		cat.Gender = "UNISEX"
	}

	query := `
		INSERT INTO categories (id, name, gender, slug, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, name, gender, slug, created_at
	`
	return r.db.QueryRow(query, cat.ID, cat.Name, cat.Gender, cat.Slug).
		Scan(&cat.ID, &cat.Name, &cat.Gender, &cat.Slug, &cat.CreatedAt)
}

func (r *CategoryRepository) Update(cat *models.Category) error {
	cat.Name = strings.TrimSpace(cat.Name)
	if cat.Slug == "" {
		slug := strings.ToLower(strings.ReplaceAll(cat.Name, " ", "-"))
		cat.Slug = strings.ReplaceAll(slug, "/", "-")
	}

	query := `
		UPDATE categories
		SET name = $2, gender = $3, slug = $4
		WHERE id = $1
		RETURNING id, name, gender, slug, created_at
	`
	return r.db.QueryRow(query, cat.ID, cat.Name, cat.Gender, cat.Slug).
		Scan(&cat.ID, &cat.Name, &cat.Gender, &cat.Slug, &cat.CreatedAt)
}

func (r *CategoryRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM categories WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *CategoryRepository) FindOrCreate(name, gender string) (*models.Category, error) {
	cleanName := strings.TrimSpace(name)
	slug := strings.ToLower(strings.ReplaceAll(cleanName, " ", "-"))
	slug = strings.ReplaceAll(slug, "/", "-")

	var cat models.Category
	query := `SELECT id, name, gender, slug, created_at FROM categories WHERE LOWER(name) = LOWER($1)`
	err := r.db.Get(&cat, query, cleanName)
	if err == nil {
		return &cat, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	cat = models.Category{
		ID:     uuid.New(),
		Name:   cleanName,
		Gender: gender,
		Slug:   slug,
	}
	insertQuery := `
		INSERT INTO categories (id, name, gender, slug, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (name) DO UPDATE SET gender = EXCLUDED.gender
		RETURNING id, name, gender, slug, created_at
	`
	err = r.db.QueryRow(insertQuery, cat.ID, cat.Name, cat.Gender, cat.Slug).
		Scan(&cat.ID, &cat.Name, &cat.Gender, &cat.Slug, &cat.CreatedAt)
	return &cat, err
}
