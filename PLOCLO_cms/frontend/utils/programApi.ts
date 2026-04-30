import { apiClient } from "../utils/apiClient";

export interface ProgramInput {
  program_code: string | number;
  facultyId?: string | number;
  faculty_id?: string | number;
  program_name_en: string;
  program_name_th: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
}

export interface Program {
  id: string;
  program_code: string;
  faculty_id: string;
  program_name_en: string;
  program_name_th: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
}

// Get all programs (for dropdowns, not paginated)
export async function getPrograms(token: string, facultyId?: string) {
  const res = await apiClient.get("/program", {
    headers: { Authorization: `Bearer ${token}` },
    params: facultyId ? { facultyId } : {},
  });
  return res.data;
}

// Corrected getProgramsPaginated utility
export async function getProgramsPaginated(
  token: string,
  page = 1,
  limit = 10,
  filters?: {
    universityId?: string;
    facultyId?: string;
    programId?: string; // This filter is likely for *Program ID* (the database ID)
    year?: string;
    program_code_filter?: string; // 💡 NEW: Use a clear name for the code filter
  }
) {
  const res = await apiClient.get("/program/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page,
      limit,
      ...filters,
    },
  });
  return res.data;
}

// utils/programApi.ts

export async function addProgram(data: ProgramInput, token: string) {
  const res = await apiClient.post("/program", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function bulkUploadPrograms(rows: ProgramInput[], token: string) {
  const res = await apiClient.post("/program/bulk", rows, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
