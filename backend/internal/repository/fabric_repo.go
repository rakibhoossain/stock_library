package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pgvector/pgvector-go"
	"stock_library/backend/internal/models"
)

type FabricRepository struct {
	db *sqlx.DB
}

func NewFabricRepository(db *sqlx.DB) *FabricRepository {
	return &FabricRepository{db: db}
}

const baseFabricSelect = `
	SELECT 
		f.id, f.article_no, f.article_aliases, f.fabric_name,
		f.category_id, c.name AS category_name,
		f.supplier_id, s.name AS supplier_name, s.contact_person AS supplier_contact,
		f.project_id, p.title AS project_title,
		f.composition_raw, f.composition_breakdown,
		f.weight_gsm_min, f.weight_gsm_max, f.width_inches, f.construction, f.shrinkage, f.finish_type,
		f.sample_holder, f.rack_location, f.physical_tag, f.available_stock_note,
		f.price_status, f.price_amount, f.price_currency, f.price_unit, f.price_notes,
		f.moq, f.mcq, f.primary_image_url, f.hanger_card_image_url,
		f.created_at, f.updated_at
	FROM fabrics f
	LEFT JOIN categories c ON f.category_id = c.id
	LEFT JOIN suppliers s ON f.supplier_id = s.id
	LEFT JOIN projects p ON f.project_id = p.id
`

func (r *FabricRepository) List(filter models.FabricFilter) ([]models.Fabric, int, error) {
	whereClauses := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if filter.Search != "" {
		searchTerm := strings.TrimSpace(filter.Search)
		whereClauses = append(whereClauses, fmt.Sprintf(
			"(f.tsv_search @@ plainto_tsquery('english', $%d) OR f.article_no ILIKE $%d OR f.fabric_name ILIKE $%d OR f.composition_raw ILIKE $%d OR s.name ILIKE $%d)",
			argIdx, argIdx+1, argIdx+1, argIdx+1, argIdx+1,
		))
		args = append(args, searchTerm, "%"+searchTerm+"%")
		argIdx += 2
	}

	if filter.CategoryID != "" {
		if catID, err := uuid.Parse(filter.CategoryID); err == nil && catID != uuid.Nil {
			whereClauses = append(whereClauses, fmt.Sprintf("f.category_id = $%d", argIdx))
			args = append(args, catID)
			argIdx++
		}
	}

	if filter.SupplierID != "" {
		if supID, err := uuid.Parse(filter.SupplierID); err == nil && supID != uuid.Nil {
			whereClauses = append(whereClauses, fmt.Sprintf("f.supplier_id = $%d", argIdx))
			args = append(args, supID)
			argIdx++
		}
	}

	if filter.ProjectID != "" {
		if projID, err := uuid.Parse(filter.ProjectID); err == nil && projID != uuid.Nil {
			whereClauses = append(whereClauses, fmt.Sprintf("f.project_id = $%d", argIdx))
			args = append(args, projID)
			argIdx++
		}
	}

	if filter.PresentationID != "" {
		if presID, err := uuid.Parse(filter.PresentationID); err == nil && presID != uuid.Nil {
			whereClauses = append(whereClauses, fmt.Sprintf("f.id IN (SELECT fabric_id FROM presentation_items WHERE presentation_id = $%d)", argIdx))
			args = append(args, presID)
			argIdx++
		}
	}

	if filter.MinGSM != nil && *filter.MinGSM > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("COALESCE(f.weight_gsm_max, f.weight_gsm_min) >= $%d", argIdx))
		args = append(args, *filter.MinGSM)
		argIdx++
	}

	if filter.MaxGSM != nil && *filter.MaxGSM > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("f.weight_gsm_min <= $%d", argIdx))
		args = append(args, *filter.MaxGSM)
		argIdx++
	}

	if filter.SampleHolder != nil && *filter.SampleHolder != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("f.sample_holder ILIKE $%d", argIdx))
		args = append(args, "%"+*filter.SampleHolder+"%")
		argIdx++
	}

	if filter.PriceStatus != nil && *filter.PriceStatus != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("f.price_status = $%d", argIdx))
		args = append(args, *filter.PriceStatus)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM fabrics f LEFT JOIN suppliers s ON f.supplier_id = s.id WHERE %s", whereSQL)
	var total int
	err := r.db.Get(&total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Sorting
	sortBy := "f.created_at"
	sortOrder := "DESC"
	if filter.SortBy != "" {
		switch strings.ToLower(filter.SortBy) {
		case "article_no":
			sortBy = "f.article_no"
		case "fabric_name":
			sortBy = "f.fabric_name"
		case "weight_gsm", "weight_gsm_min":
			sortBy = "f.weight_gsm_min"
		case "price_amount":
			sortBy = "f.price_amount"
		case "supplier_name":
			sortBy = "s.name"
		case "category_name":
			sortBy = "c.name"
		case "project_title", "project_name":
			sortBy = "p.title"
		case "created_at":
			sortBy = "f.created_at"
		}
	}
	if strings.ToLower(filter.SortOrder) == "asc" {
		sortOrder = "ASC"
	}

	// Pagination
	limit := filter.Limit
	if limit <= 0 || limit > 500 {
		limit = 20
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	query := fmt.Sprintf("%s WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d",
		baseFabricSelect, whereSQL, sortBy, sortOrder, argIdx, argIdx+1)
	args = append(args, limit, offset)

	var fabrics []models.Fabric
	err = r.db.Select(&fabrics, query, args...)
	if err != nil {
		return nil, 0, err
	}

	return fabrics, total, nil
}

func (r *FabricRepository) GetByID(id uuid.UUID) (*models.Fabric, error) {
	var fabric models.Fabric
	query := fmt.Sprintf("%s WHERE f.id = $1", baseFabricSelect)
	err := r.db.Get(&fabric, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &fabric, nil
}

func (r *FabricRepository) GetByArticleNo(articleNo string) (*models.Fabric, error) {
	var fabric models.Fabric
	query := fmt.Sprintf("%s WHERE f.article_no = $1 ORDER BY f.created_at DESC LIMIT 1", baseFabricSelect)
	err := r.db.Get(&fabric, query, articleNo)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &fabric, nil
}

func (r *FabricRepository) Create(fabric *models.Fabric) error {
	if fabric.ID == uuid.Nil {
		fabric.ID = uuid.New()
	}

	query := `
		INSERT INTO fabrics (
			id, article_no, article_aliases, fabric_name, category_id, supplier_id, project_id,
			composition_raw, composition_breakdown, weight_gsm_min, weight_gsm_max,
			width_inches, construction, shrinkage, finish_type,
			sample_holder, rack_location, physical_tag, available_stock_note,
			price_status, price_amount, price_currency, price_unit, price_notes,
			moq, mcq, primary_image_url, hanger_card_image_url,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11,
			$12, $13, $14, $15,
			$16, $17, $18, $19,
			$20, $21, $22, $23, $24,
			$25, $26, $27, $28,
			NOW(), NOW()
		)
		RETURNING created_at, updated_at
	`
	return r.db.QueryRow(query,
		fabric.ID, fabric.ArticleNo, fabric.ArticleAliases, fabric.FabricName, fabric.CategoryID, fabric.SupplierID, fabric.ProjectID,
		fabric.CompositionRaw, fabric.CompositionBreakdown, fabric.WeightGsmMin, fabric.WeightGsmMax,
		fabric.WidthInches, fabric.Construction, fabric.Shrinkage, fabric.FinishType,
		fabric.SampleHolder, fabric.RackLocation, fabric.PhysicalTag, fabric.AvailableStockNote,
		fabric.PriceStatus, fabric.PriceAmount, fabric.PriceCurrency, fabric.PriceUnit, fabric.PriceNotes,
		fabric.MOQ, fabric.MCQ, fabric.PrimaryImageURL, fabric.HangerCardImageURL,
	).Scan(&fabric.CreatedAt, &fabric.UpdatedAt)
}

func (r *FabricRepository) Update(fabric *models.Fabric) error {
	query := `
		UPDATE fabrics SET
			article_no = $2,
			article_aliases = $3,
			fabric_name = $4,
			category_id = $5,
			supplier_id = $6,
			project_id = $7,
			composition_raw = $8,
			composition_breakdown = $9,
			weight_gsm_min = $10,
			weight_gsm_max = $11,
			width_inches = $12,
			construction = $13,
			shrinkage = $14,
			finish_type = $15,
			sample_holder = $16,
			rack_location = $17,
			physical_tag = $18,
			available_stock_note = $19,
			price_status = $20,
			price_amount = $21,
			price_currency = $22,
			price_unit = $23,
			price_notes = $24,
			moq = $25,
			mcq = $26,
			primary_image_url = $27,
			hanger_card_image_url = $28,
			updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`
	return r.db.QueryRow(query,
		fabric.ID, fabric.ArticleNo, fabric.ArticleAliases, fabric.FabricName, fabric.CategoryID, fabric.SupplierID, fabric.ProjectID,
		fabric.CompositionRaw, fabric.CompositionBreakdown, fabric.WeightGsmMin, fabric.WeightGsmMax,
		fabric.WidthInches, fabric.Construction, fabric.Shrinkage, fabric.FinishType,
		fabric.SampleHolder, fabric.RackLocation, fabric.PhysicalTag, fabric.AvailableStockNote,
		fabric.PriceStatus, fabric.PriceAmount, fabric.PriceCurrency, fabric.PriceUnit, fabric.PriceNotes,
		fabric.MOQ, fabric.MCQ, fabric.PrimaryImageURL, fabric.HangerCardImageURL,
	).Scan(&fabric.UpdatedAt)
}

func (r *FabricRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM fabrics WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *FabricRepository) SaveEmbedding(fabricID uuid.UUID, imageURL string, embedding []float32) error {
	vec := pgvector.NewVector(embedding)
	query := `
		INSERT INTO fabric_swatch_embeddings (id, fabric_id, image_url, embedding, created_at)
		VALUES ($1, $2, $3, $4, NOW())
	`
	_, err := r.db.Exec(query, uuid.New(), fabricID, imageURL, vec)
	return err
}

func (r *FabricRepository) SearchByVector(embedding []float32, limit int) ([]models.SwatchSearchResult, error) {
	if limit <= 0 {
		limit = 12
	}
	vec := pgvector.NewVector(embedding)

	query := `
		SELECT 
			f.id, f.article_no, f.article_aliases, f.fabric_name,
			f.category_id, c.name AS category_name,
			f.supplier_id, s.name AS supplier_name, s.contact_person AS supplier_contact,
			f.project_id, p.title AS project_title,
			f.composition_raw, f.composition_breakdown,
			f.weight_gsm_min, f.weight_gsm_max, f.width_inches, f.construction, f.shrinkage, f.finish_type,
			f.sample_holder, f.rack_location, f.physical_tag, f.available_stock_note,
			f.price_status, f.price_amount, f.price_currency, f.price_unit, f.price_notes,
			f.moq, f.mcq, f.primary_image_url, f.hanger_card_image_url,
			f.created_at, f.updated_at,
			(1.0 - (e.embedding <=> $1)) AS similarity_score
		FROM fabric_swatch_embeddings e
		JOIN fabrics f ON f.id = e.fabric_id
		LEFT JOIN categories c ON f.category_id = c.id
		LEFT JOIN suppliers s ON f.supplier_id = s.id
		LEFT JOIN projects p ON f.project_id = p.id
		ORDER BY e.embedding <=> $1 ASC
		LIMIT $2
	`

	type rowResult struct {
		models.Fabric
		SimilarityScore float64 `db:"similarity_score"`
	}

	var rows []rowResult
	err := r.db.Select(&rows, query, vec, limit)
	if err != nil {
		return nil, err
	}

	results := make([]models.SwatchSearchResult, len(rows))
	for i, r := range rows {
		results[i] = models.SwatchSearchResult{
			Fabric:          r.Fabric,
			SimilarityScore: r.SimilarityScore,
		}
	}
	return results, nil
}

func (r *FabricRepository) GetStats() (*models.DashboardStats, error) {
	stats := &models.DashboardStats{
		CategoryCounts: make(map[string]int),
		SupplierCounts: make(map[string]int),
		ProjectCounts:  make(map[string]int),
	}

	_ = r.db.Get(&stats.TotalFabrics, "SELECT COUNT(*) FROM fabrics")
	_ = r.db.Get(&stats.TotalSuppliers, "SELECT COUNT(*) FROM suppliers")
	_ = r.db.Get(&stats.TotalCategories, "SELECT COUNT(*) FROM categories")
	_ = r.db.Get(&stats.TotalProjects, "SELECT COUNT(*) FROM projects")

	type countRow struct {
		Name  string `db:"name"`
		Count int    `db:"count"`
	}

	var catRows []countRow
	_ = r.db.Select(&catRows, `
		SELECT COALESCE(c.name, 'Uncategorized') as name, COUNT(f.id) as count
		FROM fabrics f
		LEFT JOIN categories c ON f.category_id = c.id
		GROUP BY c.name
		ORDER BY count DESC
		LIMIT 10
	`)
	for _, row := range catRows {
		stats.CategoryCounts[row.Name] = row.Count
	}

	var supRows []countRow
	_ = r.db.Select(&supRows, `
		SELECT COALESCE(s.name, 'Unknown') as name, COUNT(f.id) as count
		FROM fabrics f
		LEFT JOIN suppliers s ON f.supplier_id = s.id
		GROUP BY s.name
		ORDER BY count DESC
		LIMIT 10
	`)
	for _, row := range supRows {
		stats.SupplierCounts[row.Name] = row.Count
	}

	var projRows []countRow
	_ = r.db.Select(&projRows, `
		SELECT COALESCE(p.title, 'No Project') as name, COUNT(f.id) as count
		FROM fabrics f
		LEFT JOIN projects p ON f.project_id = p.id
		GROUP BY p.title
		ORDER BY count DESC
		LIMIT 10
	`)
	for _, row := range projRows {
		stats.ProjectCounts[row.Name] = row.Count
	}

	return stats, nil
}
