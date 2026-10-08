package repository

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"stock_library/backend/internal/models"
)

type SupplierRepository struct {
	db *sqlx.DB
}

func NewSupplierRepository(db *sqlx.DB) *SupplierRepository {
	return &SupplierRepository{db: db}
}

func (r *SupplierRepository) GetAll() ([]models.Supplier, error) {
	var suppliers []models.Supplier
	query := `SELECT id, name, short_code, contact_person, email, phone, country, created_at, updated_at FROM suppliers ORDER BY name ASC`
	err := r.db.Select(&suppliers, query)
	return suppliers, err
}

func (r *SupplierRepository) GetByID(id uuid.UUID) (*models.Supplier, error) {
	var sup models.Supplier
	query := `SELECT id, name, short_code, contact_person, email, phone, country, created_at, updated_at FROM suppliers WHERE id = $1`
	err := r.db.Get(&sup, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &sup, nil
}

func (r *SupplierRepository) Create(sup *models.Supplier) error {
	if sup.ID == uuid.Nil {
		sup.ID = uuid.New()
	}
	sup.Name = strings.TrimSpace(sup.Name)
	if sup.Country == "" {
		sup.Country = "Bangladesh"
	}

	query := `
		INSERT INTO suppliers (id, name, short_code, contact_person, email, phone, country, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, name, short_code, contact_person, email, phone, country, created_at, updated_at
	`
	return r.db.QueryRow(query, sup.ID, sup.Name, sup.ShortCode, sup.ContactPerson, sup.Email, sup.Phone, sup.Country).
		Scan(&sup.ID, &sup.Name, &sup.ShortCode, &sup.ContactPerson, &sup.Email, &sup.Phone, &sup.Country, &sup.CreatedAt, &sup.UpdatedAt)
}

func (r *SupplierRepository) Update(sup *models.Supplier) error {
	sup.Name = strings.TrimSpace(sup.Name)

	query := `
		UPDATE suppliers
		SET name = $2, short_code = $3, contact_person = $4, email = $5, phone = $6, country = $7, updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, short_code, contact_person, email, phone, country, created_at, updated_at
	`
	return r.db.QueryRow(query, sup.ID, sup.Name, sup.ShortCode, sup.ContactPerson, sup.Email, sup.Phone, sup.Country).
		Scan(&sup.ID, &sup.Name, &sup.ShortCode, &sup.ContactPerson, &sup.Email, &sup.Phone, &sup.Country, &sup.CreatedAt, &sup.UpdatedAt)
}

func (r *SupplierRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM suppliers WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *SupplierRepository) FindOrCreate(name, contactPerson string) (*models.Supplier, error) {
	cleanName := strings.TrimSpace(name)
	var sup models.Supplier
	query := `SELECT id, name, short_code, contact_person, email, phone, country, created_at, updated_at FROM suppliers WHERE LOWER(name) = LOWER($1)`
	err := r.db.Get(&sup, query, cleanName)
	if err == nil {
		return &sup, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	sup = models.Supplier{
		ID:            uuid.New(),
		Name:          cleanName,
		ContactPerson: &contactPerson,
		Country:       "Bangladesh",
	}
	insertQuery := `
		INSERT INTO suppliers (id, name, contact_person, country, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (name) DO UPDATE SET contact_person = COALESCE(EXCLUDED.contact_person, suppliers.contact_person)
		RETURNING id, name, short_code, contact_person, email, phone, country, created_at, updated_at
	`
	err = r.db.QueryRow(insertQuery, sup.ID, sup.Name, sup.ContactPerson, sup.Country).
		Scan(&sup.ID, &sup.Name, &sup.ShortCode, &sup.ContactPerson, &sup.Email, &sup.Phone, &sup.Country, &sup.CreatedAt, &sup.UpdatedAt)
	return &sup, err
}
