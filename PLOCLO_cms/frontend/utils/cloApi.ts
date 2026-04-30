import { apiClient } from "./apiClient";

// 1. Interfaces
export interface CLO {
  id: number;
  code: string;
  name: string;
  name_th?: string;
  description?: string;
  course_id: string;
}

export interface CLOFilters {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
  semester?: string;
  section?: string;
  courseId?: string;
  courseCode?: string;
}
export interface CLOInputExcel {
  code?: string | number;
  CLO_code?: string | number;
  CLO_name?: string;
  CLO_engname?: string;
  nameEn?: string;
  nameTh?: string;
  clo_name?: string;
  clo_code?: string;
  [key: string]: unknown;
}

export interface ExcelCLORow {
  [key: string]: string | number | undefined;
}

// --- Main Fetch Function ---

export async function getCLOsPaginate(
  token: string,
  page: number = 1,
  limit: number = 10,
  filters?: CLOFilters
) {
  // Axios automatically handles the ?page=1&limit=10 logic via the 'params' object
  const response = await apiClient.get("/clo/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page,
      limit,
      ...filters, // Spread all filters directly; undefined values are ignored by Axios automatically
    },
  });

  return response.data;
}

// --- Add CLO ---

export async function addClo(
  data: {
    code: string;
    name: string;
    name_th?: string;
    course_id: string | number;
  },
  token: string
) {
  // Axios automatically stringifies the body to JSON
  const response = await apiClient.post("/clo", data, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
}

// --- Simple Get ---

export async function getCLOs(token: string, page = 1, limit = 10) {
  const response = await apiClient.get("/clo/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: { page, limit },
  });

  return response.data;
}
