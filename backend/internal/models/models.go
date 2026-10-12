package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

type FiberItem struct {
	Fiber      string  `json:"fiber"`
	Percentage float64 `json:"percentage"`
}

type CompositionBreakdown []FiberItem

func (c CompositionBreakdown) Value() (driver.Value, error) {
	if len(c) == 0 {
		return "[]", nil
	}
	return json.Marshal(c)
}

func (c *CompositionBreakdown) Scan(value interface{}) error {
	if value == nil {
		*c = CompositionBreakdown{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		str, okStr := value.(string)
		if !okStr {
			return errors.New("type assertion to []byte or string failed")
		}
		b = []byte(str)
	}
	return json.Unmarshal(b, c)
}

// User Models
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	FullName     string    `json:"full_name" db:"full_name"`
	Role         string    `json:"role" db:"role"`
	AvatarURL    *string   `json:"avatar_url,omitempty" db:"avatar_url"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// Master Data Models
type Category struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Gender    string    `json:"gender" db:"gender"`
	Slug      string    `json:"slug" db:"slug"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Supplier struct {
	ID            uuid.UUID `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	ShortCode     *string   `json:"short_code,omitempty" db:"short_code"`
	ContactPerson *string   `json:"contact_person,omitempty" db:"contact_person"`
	Email         *string   `json:"email,omitempty" db:"email"`
	Phone         *string   `json:"phone,omitempty" db:"phone"`
	Country       string    `json:"country" db:"country"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type Project struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Title     string    `json:"title" db:"title"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Fabric Model
type Fabric struct {
	ID                  uuid.UUID            `json:"id" db:"id"`
	ArticleNo           string               `json:"article_no" db:"article_no"`
	ArticleAliases      *string              `json:"article_aliases,omitempty" db:"article_aliases"`
	FabricName          string               `json:"fabric_name" db:"fabric_name"`
	CategoryID          *uuid.UUID           `json:"category_id,omitempty" db:"category_id"`
	CategoryName        *string              `json:"category_name,omitempty" db:"category_name"`
	SupplierID          *uuid.UUID           `json:"supplier_id,omitempty" db:"supplier_id"`
	SupplierName        *string              `json:"supplier_name,omitempty" db:"supplier_name"`
	SupplierContact     *string              `json:"supplier_contact,omitempty" db:"supplier_contact"`
	ProjectID           *uuid.UUID           `json:"project_id,omitempty" db:"project_id"`
	ProjectTitle        *string              `json:"project_title,omitempty" db:"project_title"`
	CompositionRaw      string               `json:"composition_raw" db:"composition_raw"`
	CompositionBreakdown CompositionBreakdown `json:"composition_breakdown" db:"composition_breakdown"`
	WeightGsmMin        int                  `json:"weight_gsm_min" db:"weight_gsm_min"`
	WeightGsmMax        *int                 `json:"weight_gsm_max,omitempty" db:"weight_gsm_max"`
	WidthInches         *string              `json:"width_inches,omitempty" db:"width_inches"`
	Construction        *string              `json:"construction,omitempty" db:"construction"`
	Shrinkage           *string              `json:"shrinkage,omitempty" db:"shrinkage"`
	FinishType          *string              `json:"finish_type,omitempty" db:"finish_type"`
	SampleHolder        *string              `json:"sample_holder,omitempty" db:"sample_holder"`
	RackLocation        *string              `json:"rack_location,omitempty" db:"rack_location"`
	PhysicalTag         *string              `json:"physical_tag,omitempty" db:"physical_tag"`
	AvailableStockNote  *string              `json:"available_stock_note,omitempty" db:"available_stock_note"`
	PriceStatus         string               `json:"price_status" db:"price_status"`
	PriceAmount         *float64             `json:"price_amount,omitempty" db:"price_amount"`
	PriceCurrency       string               `json:"price_currency" db:"price_currency"`
	PriceUnit           string               `json:"price_unit" db:"price_unit"`
	PriceNotes          *string              `json:"price_notes,omitempty" db:"price_notes"`
	MOQ                 *string              `json:"moq,omitempty" db:"moq"`
	MCQ                 *string              `json:"mcq,omitempty" db:"mcq"`
	PrimaryImageURL     *string              `json:"primary_image_url,omitempty" db:"primary_image_url"`
	HangerCardImageURL  *string              `json:"hanger_card_image_url,omitempty" db:"hanger_card_image_url"`
	CreatedAt           time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time            `json:"updated_at" db:"updated_at"`
}

// Fabric Input (Create/Update - matches frontend Zod schema)
type FabricInput struct {
	ArticleNo          string               `json:"article_no" binding:"required"`
	ArticleAliases     *string              `json:"article_aliases"`
	FabricName         string               `json:"fabric_name" binding:"required"`
	CategoryID         *uuid.UUID           `json:"category_id"`
	SupplierID         *uuid.UUID           `json:"supplier_id"`
	ProjectID          *uuid.UUID           `json:"project_id"`
	CompositionRaw     string               `json:"composition_raw" binding:"required"`
	Fibers             CompositionBreakdown `json:"fibers"`
	WeightGsmMin       int                  `json:"weight_gsm_min" binding:"required"`
	WeightGsmMax       *int                 `json:"weight_gsm_max"`
	WidthInches        *string              `json:"width_inches"`
	Construction       *string              `json:"construction"`
	Shrinkage          *string              `json:"shrinkage"`
	FinishType         *string              `json:"finish_type"`
	SampleHolder       *string              `json:"sample_holder"`
	RackLocation       *string              `json:"rack_location"`
	PhysicalTag        *string              `json:"physical_tag"`
	AvailableStockNote *string              `json:"available_stock_note"`
	PriceStatus        string               `json:"price_status"`
	PriceAmount        *float64             `json:"price_amount"`
	PriceCurrency      string               `json:"price_currency"`
	PriceUnit          string               `json:"price_unit"`
	PriceNotes         *string              `json:"price_notes"`
	MOQ                *string              `json:"moq"`
	MCQ                *string              `json:"mcq"`
	PrimaryImageURL    *string              `json:"primary_image_url"`
	HangerCardImageURL *string              `json:"hanger_card_image_url"`
}

// Fabric Filter for TanStack Table
type FabricFilter struct {
	Search         string  `form:"search"`
	CategoryID     string  `form:"category_id"`
	SupplierID     string  `form:"supplier_id"`
	ProjectID      string  `form:"project_id"`
	PresentationID string  `form:"presentation_id"`
	MinGSM         *int    `form:"min_gsm"`
	MaxGSM         *int    `form:"max_gsm"`
	SampleHolder   *string `form:"sample_holder"`
	PriceStatus    *string `form:"price_status"`
	SortBy         string  `form:"sort_by"`
	SortOrder      string  `form:"sort_order"` // "asc" or "desc"
	Page           int     `form:"page"`
	Limit          int     `form:"limit"`
}

type PaginatedFabrics struct {
	Items      []Fabric `json:"items"`
	Total      int      `json:"total"`
	Page       int      `json:"page"`
	Limit      int      `json:"limit"`
	TotalPages int      `json:"total_pages"`
}

// Swatch Search Result (pgvector visual similarity)
type SwatchSearchResult struct {
	Fabric          Fabric  `json:"fabric"`
	SimilarityScore float64 `json:"similarity_score"`
}

// Dashboard statistics
type DashboardStats struct {
	TotalFabrics    int            `json:"total_fabrics"`
	TotalSuppliers  int            `json:"total_suppliers"`
	TotalCategories int            `json:"total_categories"`
	TotalProjects   int            `json:"total_projects"`
	CategoryCounts  map[string]int `json:"category_counts"`
	SupplierCounts  map[string]int `json:"supplier_counts"`
	ProjectCounts   map[string]int `json:"project_counts"`
}

// Presentation Models
type Presentation struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	Title         string     `json:"title" db:"title"`
	Description   *string    `json:"description,omitempty" db:"description"`
	BuyerName     *string    `json:"buyer_name,omitempty" db:"buyer_name"`
	Season        *string    `json:"season,omitempty" db:"season"`
	WelcomeNotes  *string    `json:"welcome_notes,omitempty" db:"welcome_notes"`
	ClosingNotes  *string    `json:"closing_notes,omitempty" db:"closing_notes"`
	PresenterName *string    `json:"presenter_name,omitempty" db:"presenter_name"`
	ContactInfo   *string    `json:"contact_info,omitempty" db:"contact_info"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty" db:"created_by"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
	ItemCount     int        `json:"item_count" db:"item_count"`
}

type PresentationItem struct {
	ID             uuid.UUID `json:"id" db:"id"`
	PresentationID uuid.UUID `json:"presentation_id" db:"presentation_id"`
	FabricID       uuid.UUID `json:"fabric_id" db:"fabric_id"`
	SortOrder      int       `json:"sort_order" db:"sort_order"`
	Notes          *string   `json:"notes,omitempty" db:"notes"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type PresentationDetail struct {
	Presentation
	Items []Fabric `json:"items"`
}

type CreatePresentationRequest struct {
	Title         string   `json:"title" binding:"required"`
	Description   *string  `json:"description"`
	BuyerName     *string  `json:"buyer_name"`
	Season        *string  `json:"season"`
	WelcomeNotes  *string  `json:"welcome_notes"`
	ClosingNotes  *string  `json:"closing_notes"`
	PresenterName *string  `json:"presenter_name"`
	ContactInfo   *string  `json:"contact_info"`
	FabricIDs     []string `json:"fabric_ids"`
}

type UpdatePresentationRequest struct {
	Title         string  `json:"title" binding:"required"`
	Description   *string `json:"description"`
	BuyerName     *string `json:"buyer_name"`
	Season        *string `json:"season"`
	WelcomeNotes  *string `json:"welcome_notes"`
	ClosingNotes  *string `json:"closing_notes"`
	PresenterName *string `json:"presenter_name"`
	ContactInfo   *string `json:"contact_info"`
}

type BulkAssignPresentationItemsRequest struct {
	FabricIDs []string `json:"fabric_ids" binding:"required"`
}

