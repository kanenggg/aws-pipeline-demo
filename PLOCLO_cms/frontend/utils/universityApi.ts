import { apiClient } from "./apiClient";

export interface University {
  id: number;
  name: string;
  name_th?: string;
  abbreviation?: string;
  abbreviation_th?: string;
}

export interface CreateUniversityPayload {
  name: string;
  name_th?: string;
  abbreviation?: string;
  abbreviation_th?: string;
}

/**
 * Fetches the list of universities.
 * @param token The user's authentication token.
 * @returns A promise that resolves to an array of University objects.
 */

export async function getUniversities(token: string) {
  const res = await apiClient.get("/university", {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

/**
 * Create a new university
 */
export async function createUniversity(
  token: string,
  payload: CreateUniversityPayload
) {
  const res = await apiClient.post("/university", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

export async function getUniversityById(token: string, universityId: string) {
  const res = await apiClient.get(`/university/${universityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}
