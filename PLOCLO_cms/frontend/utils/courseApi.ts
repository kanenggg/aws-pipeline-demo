import { apiClient } from "./apiClient";

// 🟢 1. Define the Course Interface (Matches your Backend Response)
export interface Course {
  id: number; // This is the CourseSection ID
  course_id: number; // This is the Master Course ID
  code: string;
  name: string;
  name_th: string;
  program_id: number;
  section: number; // Now included
  semester: number; // Now included
  year: number; // Now included
  program_year: number; // Now included
}

export interface PaginatedResponse {
  data: Course[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getCourses(
  token: string,
  programId?: string | number
): Promise<Course[]> {
  const res = await apiClient.get<Course[]>("/course", {
    headers: { Authorization: `Bearer ${token}` },
    params: programId ? { programId } : {},
  });
  return res.data;
}

// 🟢 2. Paginated Fetch Function
export async function getCoursePaginate(
  token: string,
  page = 1,
  limit = 10,
  filters: {
    universityId?: string;
    facultyId?: string;
    programId?: string;
    year?: string;
    semester?: string;
    section?: string;
    courseCode?: string;
  } = {}
) {
  // Filter out keys with empty strings or undefined values
  const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string | number>);
  const res = await apiClient.get<PaginatedResponse>("/course/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page,
      limit,
      ...cleanFilters, // Spreads only valid filters
    },
  });

  return res.data;
}

// 🟢 3. Add Course Function
export async function addCourse(
  data: {
    code: string;
    name: string;
    name_th?: string;
    program_id: string | number;
    year?: string | number;
    semester?: string | number;
    section?: string | number;
  },
  token: string
) {
  const res = await apiClient.post("/course", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
