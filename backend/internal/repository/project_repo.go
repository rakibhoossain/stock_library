package repository

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"stock_library/backend/internal/models"
)

type ProjectRepository struct {
	db *sqlx.DB
}

func NewProjectRepository(db *sqlx.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) GetAll() ([]models.Project, error) {
	var projects []models.Project
	query := `SELECT id, title, created_at, updated_at FROM projects ORDER BY title ASC`
	err := r.db.Select(&projects, query)
	return projects, err
}

func (r *ProjectRepository) GetByID(id uuid.UUID) (*models.Project, error) {
	var proj models.Project
	query := `SELECT id, title, created_at, updated_at FROM projects WHERE id = $1`
	err := r.db.Get(&proj, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &proj, nil
}

func (r *ProjectRepository) Create(proj *models.Project) error {
	if proj.ID == uuid.Nil {
		proj.ID = uuid.New()
	}
	proj.Title = strings.TrimSpace(proj.Title)

	query := `
		INSERT INTO projects (id, title, created_at, updated_at)
		VALUES ($1, $2, NOW(), NOW())
		RETURNING id, title, created_at, updated_at
	`
	return r.db.QueryRow(query, proj.ID, proj.Title).
		Scan(&proj.ID, &proj.Title, &proj.CreatedAt, &proj.UpdatedAt)
}

func (r *ProjectRepository) Update(proj *models.Project) error {
	proj.Title = strings.TrimSpace(proj.Title)

	query := `
		UPDATE projects
		SET title = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, created_at, updated_at
	`
	return r.db.QueryRow(query, proj.ID, proj.Title).
		Scan(&proj.ID, &proj.Title, &proj.CreatedAt, &proj.UpdatedAt)
}

func (r *ProjectRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM projects WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *ProjectRepository) FindOrCreate(title string) (*models.Project, error) {
	cleanTitle := strings.TrimSpace(title)
	if cleanTitle == "" {
		return nil, errors.New("project title cannot be empty")
	}

	var proj models.Project
	query := `SELECT id, title, created_at, updated_at FROM projects WHERE LOWER(title) = LOWER($1)`
	err := r.db.Get(&proj, query, cleanTitle)
	if err == nil {
		return &proj, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	proj = models.Project{
		ID:    uuid.New(),
		Title: cleanTitle,
	}
	insertQuery := `
		INSERT INTO projects (id, title, created_at, updated_at)
		VALUES ($1, $2, NOW(), NOW())
		ON CONFLICT (title) DO UPDATE SET updated_at = NOW()
		RETURNING id, title, created_at, updated_at
	`
	err = r.db.QueryRow(insertQuery, proj.ID, proj.Title).
		Scan(&proj.ID, &proj.Title, &proj.CreatedAt, &proj.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &proj, nil
}
