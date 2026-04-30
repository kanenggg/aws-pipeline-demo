import { apiClient } from "./apiClient";

export interface PLO {
  id: string;
  code: string;
  name: string;
  engname: string;
  program_id: string;
  created_at: string;
  updated_at: string;
}

export interface PLOInputExcel {
  code: string;
  Code: string;
  PLO_code: string;
  nameTh: string;
  name: string;
  PLO_name: string;
  ชื่อไทย: string;
  nameEn: string;
  engname: string;
  PLO_engname: string;
  ชื่ออังกฤษ: string;
}

export async function addPlo(
  {
    code,
    name,
    engname,
    program_id,
  }: {
    code: string;
    name: string;
    engname: string;
    program_id: string | number;
  },
  token: string
) {
  const res = await apiClient.post(
    "/plo",
    {
      code,
      name,
      engname,
      program_id,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

export async function getPlos(token: string) {
  const res = await apiClient.get("/plo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Get paginated PLOs
export async function getPlosPaginated(
  token: string,
  page = 1,
  limit = 10,
  filters?: {
    universityId?: string;
    facultyId?: string;
    programId?: string;
    year?: string;
  }
) {
  const res = await apiClient.get("/plo/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page,
      limit,
      ...filters,
    },
  });
  return res.data;
}
