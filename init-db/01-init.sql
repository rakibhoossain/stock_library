-- PostgreSQL Database Initialization for Fabric Stock Library with pgvector

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enum types
DO $$ BEGIN
    CREATE TYPE price_unit_enum AS ENUM ('KG', 'YDS', 'METER', 'PIECE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE price_status_enum AS ENUM ('CONFIRMED', 'PENDING', 'UPON_REQUEST', 'NOT_DISCLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'merchandiser', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'merchandiser',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    gender VARCHAR(50) NOT NULL DEFAULT 'UNISEX',
    slug VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE,
    short_code VARCHAR(50),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    country VARCHAR(60) DEFAULT 'Bangladesh',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Fabrics Table
CREATE TABLE IF NOT EXISTS fabrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_no VARCHAR(100) NOT NULL,
    article_aliases VARCHAR(100),
    fabric_name VARCHAR(120) NOT NULL DEFAULT 'Standard Knit',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Technical Specifications
    composition_raw TEXT NOT NULL,
    composition_breakdown JSONB DEFAULT '[]'::jsonb,
    weight_gsm_min INT NOT NULL,
    weight_gsm_max INT,
    width_inches VARCHAR(50),
    construction VARCHAR(100),
    shrinkage VARCHAR(50),
    finish_type VARCHAR(100),
    
    -- Sample Physical Presence
    sample_holder VARCHAR(100) DEFAULT 'Jewel-Tom',
    rack_location VARCHAR(50),
    physical_tag VARCHAR(20),
    available_stock_note TEXT,
    
    -- Commercials
    price_status price_status_enum NOT NULL DEFAULT 'CONFIRMED',
    price_amount NUMERIC(10, 2),
    price_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    price_unit price_unit_enum NOT NULL DEFAULT 'KG',
    price_notes TEXT,
    moq VARCHAR(50),
    mcq VARCHAR(50),
    
    -- Media
    primary_image_url TEXT,
    hanger_card_image_url TEXT,
    
    -- Full Text Search
    tsv_search tsvector,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Fabric Swatch Embeddings (pgvector - 768 dimensions for CLIP/SigLIP)
CREATE TABLE IF NOT EXISTS fabric_swatch_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fabric_id UUID NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    model_name VARCHAR(50) DEFAULT 'siglip-base-patch16-224',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full text search updater function & trigger
CREATE OR REPLACE FUNCTION update_fabrics_tsv() RETURNS trigger AS $$
BEGIN
    NEW.tsv_search :=
        setweight(to_tsvector('simple', coalesce(NEW.article_no, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.article_aliases, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.fabric_name, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.composition_raw, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.sample_holder, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.finish_type, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fabrics_tsv_update ON fabrics;
CREATE TRIGGER trg_fabrics_tsv_update
BEFORE INSERT OR UPDATE ON fabrics
FOR EACH ROW EXECUTE FUNCTION update_fabrics_tsv();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_fabrics_tsv ON fabrics USING gin (tsv_search);
CREATE INDEX IF NOT EXISTS idx_fabrics_article_trgm ON fabrics USING gin (article_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fabrics_name_trgm ON fabrics USING gin (fabric_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fabrics_comp_raw ON fabrics USING gin (composition_raw gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fabrics_category_id ON fabrics (category_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_supplier_id ON fabrics (supplier_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_project_id ON fabrics (project_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_weight ON fabrics (weight_gsm_min, weight_gsm_max);
CREATE INDEX IF NOT EXISTS idx_fabrics_price ON fabrics (price_amount);

-- HNSW Cosine Distance Index on embeddings
CREATE INDEX IF NOT EXISTS idx_swatch_embedding_hnsw 
ON fabric_swatch_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Buyer Presentations & Decks
CREATE TABLE IF NOT EXISTS presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    buyer_name VARCHAR(150),
    season VARCHAR(50),
    welcome_notes TEXT,
    closing_notes TEXT,
    presenter_name VARCHAR(150),
    contact_info VARCHAR(255),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Presentation Items (Join table with sort ordering)
CREATE TABLE IF NOT EXISTS presentation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    fabric_id UUID NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presentation_fabric UNIQUE (presentation_id, fabric_id)
);

CREATE INDEX IF NOT EXISTS idx_presentation_items_pres_id ON presentation_items(presentation_id);
CREATE INDEX IF NOT EXISTS idx_presentation_items_fabric_id ON presentation_items(fabric_id);
CREATE INDEX IF NOT EXISTS idx_presentation_items_sort ON presentation_items(presentation_id, sort_order);

