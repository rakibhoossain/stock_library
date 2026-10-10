export interface FiberItem {
  fiber: string;
  percentage: number;
}

export interface Category {
  id: string;
  name: string;
  gender: string;
  slug: string;
}

export interface Supplier {
  id: string;
  name: string;
  short_code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  country: string;
}

export interface Fabric {
  id: string;
  article_no: string;
  article_aliases?: string;
  fabric_name: string;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_contact?: string;
  composition_raw: string;
  composition_breakdown: FiberItem[];
  weight_gsm_min: number;
  weight_gsm_max?: number | null;
  width_inches?: string;
  construction?: string;
  shrinkage?: string;
  finish_type?: string;
  sample_holder?: string;
  rack_location?: string;
  physical_tag?: string;
  available_stock_note?: string;
  price_status: "CONFIRMED" | "PENDING" | "UPON_REQUEST" | "NOT_DISCLOSED";
  price_amount?: number | null;
  price_currency: string;
  price_unit: "KG" | "YDS" | "METER" | "PIECE";
  price_notes?: string;
  moq?: string;
  mcq?: string;
  primary_image_url?: string;
  hanger_card_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FabricFilter {
  search?: string;
  category_id?: string;
  supplier_id?: string;
  presentation_id?: string;
  min_gsm?: number;
  max_gsm?: number;
  sample_holder?: string;
  price_status?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page: number;
  limit: number;
}

export interface PaginatedFabrics {
  items: Fabric[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SwatchSearchResult {
  fabric: Fabric;
  similarity_score: number;
}

export interface DashboardStats {
  total_fabrics: number;
  total_suppliers: number;
  total_categories: number;
  category_counts: Record<string, number>;
  supplier_counts: Record<string, number>;
}

export interface PresignedURLResponse {
  upload_url: string;
  file_url: string;
  key: string;
  expires_in_seconds: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  buyer_name?: string;
  season?: string;
  welcome_notes?: string;
  closing_notes?: string;
  presenter_name?: string;
  contact_info?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface PresentationDetail extends Presentation {
  items: Fabric[];
}

