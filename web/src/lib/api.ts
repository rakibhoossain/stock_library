import {
  Fabric,
  FabricFilter,
  PaginatedFabrics,
  Category,
  Supplier,
  DashboardStats,
  SwatchSearchResult,
  PresignedURLResponse,
  User,
  Presentation,
  PresentationDetail,
} from "@/types/fabric";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || errorBody.details || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  logout() {
    removeToken();
  },

  getToken(): string | null {
    return getToken();
  },

  async getCurrentUser(): Promise<User | null> {
    const token = getToken();
    if (!token) return null;
    try {
      return await request<User>("/auth/me");
    } catch {
      removeToken();
      return null;
    }
  },

  async ensureAuth(): Promise<User | null> {
    const user = await this.getCurrentUser();
    if (user) return user;
    // Default demo fallback if needed during dev
    try {
      const loginData = await this.login("admin@stocklibrary.com", "password123");
      return loginData.user;
    } catch {
      return null;
    }
  },

  async getFabrics(filter: Partial<FabricFilter>): Promise<PaginatedFabrics> {
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.category_id) params.set("category_id", filter.category_id);
    if (filter.supplier_id) params.set("supplier_id", filter.supplier_id);
    if (filter.presentation_id) params.set("presentation_id", filter.presentation_id);
    if (filter.min_gsm) params.set("min_gsm", filter.min_gsm.toString());
    if (filter.max_gsm) params.set("max_gsm", filter.max_gsm.toString());
    if (filter.sample_holder) params.set("sample_holder", filter.sample_holder);
    if (filter.price_status) params.set("price_status", filter.price_status);
    if (filter.sort_by) params.set("sort_by", filter.sort_by);
    if (filter.sort_order) params.set("sort_order", filter.sort_order);
    if (filter.page) params.set("page", filter.page.toString());
    if (filter.limit) params.set("limit", filter.limit.toString());

    return request<PaginatedFabrics>(`/fabrics?${params.toString()}`);
  },

  async getFabric(id: string): Promise<Fabric> {
    return request<Fabric>(`/fabrics/${id}`);
  },

  async createFabric(data: unknown): Promise<Fabric> {
    return request<Fabric>("/fabrics", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateFabric(id: string, data: unknown): Promise<Fabric> {
    return request<Fabric>(`/fabrics/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteFabric(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/fabrics/${id}`, {
      method: "DELETE",
    });
  },

  async getCategories(): Promise<Category[]> {
    return request<Category[]>("/categories");
  },

  async createCategory(data: { name: string; gender?: string }): Promise<Category> {
    return request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: string, data: { name: string; gender?: string }): Promise<Category> {
    return request<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/categories/${id}`, {
      method: "DELETE",
    });
  },

  async getSuppliers(): Promise<Supplier[]> {
    return request<Supplier[]>("/suppliers");
  },

  async createSupplier(data: {
    name: string;
    short_code?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    country?: string;
  }): Promise<Supplier> {
    return request<Supplier>("/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateSupplier(
    id: string,
    data: {
      name: string;
      short_code?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      country?: string;
    }
  ): Promise<Supplier> {
    return request<Supplier>(`/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteSupplier(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/suppliers/${id}`, {
      method: "DELETE",
    });
  },

  async getStats(): Promise<DashboardStats> {
    return request<DashboardStats>("/stats");
  },

  async searchByImage(payload: { imageUrl?: string; file?: File }): Promise<{ results: SwatchSearchResult[]; count: number }> {
    if (payload.file) {
      const formData = new FormData();
      formData.append("image", payload.file);
      return request<{ results: SwatchSearchResult[]; count: number }>("/fabrics/search-by-image", {
        method: "POST",
        body: formData,
      });
    }

    return request<{ results: SwatchSearchResult[]; count: number }>("/fabrics/search-by-image", {
      method: "POST",
      body: JSON.stringify({ image_url: payload.imageUrl }),
    });
  },

  // S3 Presigned URL direct upload
  async getPresignedUploadURL(fileName: string, contentType: string, folder: string = "fabrics"): Promise<PresignedURLResponse> {
    return request<PresignedURLResponse>("/storage/presigned-url", {
      method: "POST",
      body: JSON.stringify({
        file_name: fileName,
        content_type: contentType,
        folder,
      }),
    });
  },

  async uploadFileToS3(file: File, folder: string = "fabrics"): Promise<string> {
    // 1. Get presigned upload URL from Golang backend
    const presigned = await this.getPresignedUploadURL(file.name, file.type || "image/jpeg", folder);

    // 2. Direct PUT directly to AWS S3 bucket from browser
    const uploadRes = await fetch(presigned.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "image/jpeg",
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`S3 direct upload failed with status ${uploadRes.status}`);
    }

    // 3. Return persistent S3 URL
    return presigned.file_url;
  },

  getExportUrl(format: "xlsx" | "csv", filter: Partial<FabricFilter>): string {
    const params = new URLSearchParams();
    params.set("format", format);
    if (filter.search) params.set("search", filter.search);
    if (filter.category_id) params.set("category_id", filter.category_id);
    if (filter.supplier_id) params.set("supplier_id", filter.supplier_id);
    if (filter.presentation_id) params.set("presentation_id", filter.presentation_id);
    if (filter.min_gsm) params.set("min_gsm", filter.min_gsm.toString());
    if (filter.max_gsm) params.set("max_gsm", filter.max_gsm.toString());
    if (filter.price_status) params.set("price_status", filter.price_status);
    return `${API_BASE}/fabrics/export?${params.toString()}`;
  },

  // Presentation Deck APIs
  async getPresentations(): Promise<Presentation[]> {
    const res = await request<Presentation[]>("/presentations");
    return res || [];
  },

  async getPresentation(id: string): Promise<PresentationDetail> {
    return request<PresentationDetail>(`/presentations/${id}`);
  },

  async createPresentation(data: {
    title: string;
    description?: string;
    buyer_name?: string;
    season?: string;
    fabric_ids?: string[];
  }): Promise<Presentation> {
    return request<Presentation>("/presentations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updatePresentation(
    id: string,
    data: {
      title: string;
      description?: string;
      buyer_name?: string;
      season?: string;
    }
  ): Promise<Presentation> {
    return request<Presentation>(`/presentations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deletePresentation(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/presentations/${id}`, {
      method: "DELETE",
    });
  },

  async addPresentationItems(
    id: string,
    fabricIds: string[]
  ): Promise<{ message: string; added_count: number }> {
    return request<{ message: string; added_count: number }>(`/presentations/${id}/items`, {
      method: "POST",
      body: JSON.stringify({ fabric_ids: fabricIds }),
    });
  },

  async removePresentationItems(
    id: string,
    fabricIds: string[]
  ): Promise<{ message: string }> {
    return request<{ message: string }>(`/presentations/${id}/items`, {
      method: "DELETE",
      body: JSON.stringify({ fabric_ids: fabricIds }),
    });
  },
};

