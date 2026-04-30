import { apiClient } from "./apiClient";

export interface Faculty {
  id: number;
  name: string;
  name_th?: string;
  university_id?: number;
  university_name?: string;
  university_name_th?: string;
  abbreviation?: string;
  abbreviation_th?: string;
}

export interface CreateFacultyPayload {
  name: string;
  name_th: string;
  university_id: number;
  abbreviation: string;
  abbreviation_th: string;
}

/**
 * Fetches the list of faculties.
 * @param token The user's authentication token.
 * @param universityId Optional ID to filter faculties by a specific university.
 * @returns A promise that resolves to an array of Faculty objects.
 */
export async function getFaculties(token: string, universityId?: string) {
  const res = await apiClient.get("/faculty", {
    headers: { Authorization: `Bearer ${token}` },
    params: universityId ? { university_id: universityId } : {},
  });

  return res.data;
}

/**
 * Create a new faculty
 */
export async function createFaculty(
  token: string,
  payload: CreateFacultyPayload
) {
  const res = await apiClient.post("/faculty", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}
