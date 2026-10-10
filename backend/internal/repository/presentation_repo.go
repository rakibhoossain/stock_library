package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"stock_library/backend/internal/models"
)

type PresentationRepository struct {
	db *sqlx.DB
}

func NewPresentationRepository(db *sqlx.DB) *PresentationRepository {
	return &PresentationRepository{db: db}
}

// List returns all presentations with their swatch item counts
func (r *PresentationRepository) List() ([]models.Presentation, error) {
	query := `
		SELECT 
			p.id, p.title, p.description, p.buyer_name, p.season,
			p.welcome_notes, p.closing_notes, p.presenter_name, p.contact_info,
			p.created_by, p.created_at, p.updated_at,
			COUNT(pi.id)::int AS item_count
		FROM presentations p
		LEFT JOIN presentation_items pi ON p.id = pi.presentation_id
		GROUP BY p.id
		ORDER BY p.updated_at DESC
	`

	list := []models.Presentation{}
	err := r.db.Select(&list, query)
	if err != nil {
		return nil, err
	}
	return list, nil
}

// GetByID returns the presentation record and all fabric swatch items assigned to it
func (r *PresentationRepository) GetByID(id uuid.UUID) (*models.PresentationDetail, error) {
	presQuery := `
		SELECT 
			p.id, p.title, p.description, p.buyer_name, p.season,
			p.welcome_notes, p.closing_notes, p.presenter_name, p.contact_info,
			p.created_by, p.created_at, p.updated_at,
			COUNT(pi.id)::int AS item_count
		FROM presentations p
		LEFT JOIN presentation_items pi ON p.id = pi.presentation_id
		WHERE p.id = $1
		GROUP BY p.id
	`

	var pres models.Presentation
	err := r.db.Get(&pres, presQuery, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("presentation not found")
		}
		return nil, err
	}

	itemsQuery := `
		SELECT 
			f.id, f.article_no, f.article_aliases, f.fabric_name,
			f.category_id, c.name AS category_name,
			f.supplier_id, s.name AS supplier_name, s.contact_person AS supplier_contact,
			f.composition_raw, f.composition_breakdown,
			f.weight_gsm_min, f.weight_gsm_max, f.width_inches,
			f.construction, f.shrinkage, f.finish_type,
			f.sample_holder, f.rack_location, f.physical_tag, f.available_stock_note,
			f.price_status, f.price_amount, f.price_currency, f.price_unit, f.price_notes,
			f.moq, f.mcq,
			f.primary_image_url, f.hanger_card_image_url,
			f.created_at, f.updated_at
		FROM presentation_items pi
		JOIN fabrics f ON pi.fabric_id = f.id
		LEFT JOIN categories c ON f.category_id = c.id
		LEFT JOIN suppliers s ON f.supplier_id = s.id
		WHERE pi.presentation_id = $1
		ORDER BY pi.sort_order ASC, pi.created_at ASC
	`

	var items []models.Fabric
	err = r.db.Select(&items, itemsQuery, id)
	if err != nil {
		return nil, err
	}

	return &models.PresentationDetail{
		Presentation: pres,
		Items:        items,
	}, nil
}

// Create inserts a new presentation and assigns initial fabric IDs in bulk
func (r *PresentationRepository) Create(req models.CreatePresentationRequest, createdBy *uuid.UUID) (*models.Presentation, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	newID := uuid.New()
	now := time.Now()

	insertQuery := `
		INSERT INTO presentations (
			id, title, description, buyer_name, season,
			welcome_notes, closing_notes, presenter_name, contact_info,
			created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING 
			id, title, description, buyer_name, season,
			welcome_notes, closing_notes, presenter_name, contact_info,
			created_by, created_at, updated_at
	`

	var pres models.Presentation
	err = tx.Get(
		&pres, insertQuery,
		newID, req.Title, req.Description, req.BuyerName, req.Season,
		req.WelcomeNotes, req.ClosingNotes, req.PresenterName, req.ContactInfo,
		createdBy, now, now,
	)
	if err != nil {
		return nil, err
	}

	// Bulk assign initial items if provided
	if len(req.FabricIDs) > 0 {
		for idx, fidStr := range req.FabricIDs {
			fid, err := uuid.Parse(fidStr)
			if err != nil {
				continue
			}
			_, _ = tx.Exec(`
				INSERT INTO presentation_items (id, presentation_id, fabric_id, sort_order, created_at)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (presentation_id, fabric_id) DO NOTHING
			`, uuid.New(), newID, fid, idx, now)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	pres.ItemCount = len(req.FabricIDs)
	return &pres, nil
}

// Update updates presentation meta fields
func (r *PresentationRepository) Update(id uuid.UUID, req models.UpdatePresentationRequest) (*models.Presentation, error) {
	query := `
		UPDATE presentations
		SET 
			title = $2, description = $3, buyer_name = $4, season = $5,
			welcome_notes = $6, closing_notes = $7, presenter_name = $8, contact_info = $9,
			updated_at = NOW()
		WHERE id = $1
		RETURNING 
			id, title, description, buyer_name, season,
			welcome_notes, closing_notes, presenter_name, contact_info,
			created_by, created_at, updated_at
	`

	var pres models.Presentation
	err := r.db.Get(
		&pres, query,
		id, req.Title, req.Description, req.BuyerName, req.Season,
		req.WelcomeNotes, req.ClosingNotes, req.PresenterName, req.ContactInfo,
	)
	if err != nil {
		return nil, err
	}

	// Fetch item count
	_ = r.db.Get(&pres.ItemCount, `SELECT COUNT(*)::int FROM presentation_items WHERE presentation_id = $1`, id)
	return &pres, nil
}

// Delete removes presentation and cascades presentation_items
func (r *PresentationRepository) Delete(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM presentations WHERE id = $1`, id)
	return err
}

// AddItems bulk assigns fabric swatch IDs to a presentation
func (r *PresentationRepository) AddItems(presentationID uuid.UUID, fabricIDs []string) (int, error) {
	if len(fabricIDs) == 0 {
		return 0, nil
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Get current max sort_order
	var maxSort int
	_ = tx.Get(&maxSort, `SELECT COALESCE(MAX(sort_order), -1) FROM presentation_items WHERE presentation_id = $1`, presentationID)

	now := time.Now()
	addedCount := 0

	for _, fidStr := range fabricIDs {
		fid, err := uuid.Parse(fidStr)
		if err != nil {
			continue
		}
		maxSort++
		res, err := tx.Exec(`
			INSERT INTO presentation_items (id, presentation_id, fabric_id, sort_order, created_at)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (presentation_id, fabric_id) DO NOTHING
		`, uuid.New(), presentationID, fid, maxSort, now)
		if err == nil {
			rows, _ := res.RowsAffected()
			if rows > 0 {
				addedCount++
			}
		}
	}

	// Touch presentation updated_at
	_, _ = tx.Exec(`UPDATE presentations SET updated_at = NOW() WHERE id = $1`, presentationID)

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return addedCount, nil
}

// RemoveItems removes fabric swatches from a presentation
func (r *PresentationRepository) RemoveItems(presentationID uuid.UUID, fabricIDs []string) error {
	if len(fabricIDs) == 0 {
		return nil
	}

	parsedIDs := make([]uuid.UUID, 0, len(fabricIDs))
	for _, idStr := range fabricIDs {
		if uid, err := uuid.Parse(idStr); err == nil {
			parsedIDs = append(parsedIDs, uid)
		}
	}

	if len(parsedIDs) == 0 {
		return nil
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		DELETE FROM presentation_items
		WHERE presentation_id = $1 AND fabric_id = ANY($2)
	`, presentationID, pq.Array(parsedIDs))
	if err != nil {
		return err
	}

	_, _ = tx.Exec(`UPDATE presentations SET updated_at = NOW() WHERE id = $1`, presentationID)

	return tx.Commit()
}
