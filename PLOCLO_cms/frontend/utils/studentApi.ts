import { apiClient } from "../utils/apiClient";

export interface Student {
  student_id: number;
  id: number;
  student_code: string;
  program_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  grade: string;
}

export interface StudentInput {
  student_code: string | number;
  program_id: number | string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * ✅ Get paginated students
 * Matches backend route: GET /api/student/paginate
 */
export async function getStudentsPaginated(
  token: string,
  page = 1,
  limit = 10,
  filters?: {
    universityId?: string;
    facultyId?: string;
    programId?: string;
    year?: string;
  },
) {
  const res = await apiClient.get("/student/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page,
      limit,
      ...filters,
    },
  });
  return res.data;
}

/**
 * ✅ Add a single student
 * Matches backend route: POST /api/student
 */
export async function addStudent(data: StudentInput, token: string) {
  const res = await apiClient.post("/student", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * ✅ Bulk upload students
 * Matches backend route: POST /api/student/bulk
 */
export async function bulkUploadStudents(rows: StudentInput[], token: string) {
  const res = await apiClient.post("/student/bulk", rows, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
