import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/**
 * 1. STATIC ROUTES (กลุ่ม Path เฉพาะเจาะจง - ต้องอยู่ด้านบน)
 */

// GET /paginate - ระบบดึงข้อมูลแบบแบ่งหน้าและกรองข้อมูลขั้นสูง
router.get(
  "/paginate",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const parseIntSafe = (value: any) => {
        if (!value) return undefined;
        const parsed = parseInt(String(value));
        return isNaN(parsed) ? undefined : parsed;
      };

      const programParam = req.query.programId as string | undefined;
      const universityId = parseIntSafe(req.query.universityId);
      const facultyId = parseIntSafe(req.query.facultyId);
      const year = parseIntSafe(req.query.year);
      const semester = parseIntSafe(req.query.semester);
      const section = parseIntSafe(req.query.section);
      const courseCode = req.query.courseCode as string | undefined;

      const page = parseIntSafe(req.query.page) || 1;
      const limit = parseIntSafe(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (year) where.year = year;
      if (semester) where.semester = semester;
      if (section) where.section = section;

      const courseWhere: any = {};
      if (courseCode) {
        courseWhere.OR = [
          { code: { contains: courseCode, mode: "insensitive" } },
          { name: { contains: courseCode, mode: "insensitive" } },
          { name_th: { contains: courseCode, mode: "insensitive" } },
        ];
      }

      const programRelationFilter: any = {};
      if (programParam) {
        const asInt = parseInt(programParam);
        const isSafeId = !isNaN(asInt) && asInt > 0 && asInt < 2147483647;
        if (isSafeId) {
          programRelationFilter.OR = [
            { id: asInt },
            { program_code: programParam },
          ];
        } else {
          programRelationFilter.program_code = programParam;
        }
      }

      if (facultyId) programRelationFilter.faculty = { id: facultyId };
      if (universityId) {
        programRelationFilter.faculty = {
          ...(programRelationFilter.faculty || {}),
          university: { id: universityId },
        };
      }

      if (Object.keys(programRelationFilter).length > 0)
        courseWhere.program = programRelationFilter;
      if (Object.keys(courseWhere).length > 0) where.course = courseWhere;

      const [total, sections] = await prisma.$transaction([
        prisma.courseSection.count({ where }),
        prisma.courseSection.findMany({
          where,
          include: { course: true },
          orderBy: [
            { year: "desc" },
            { semester: "desc" },
            { course: { code: "asc" } },
            { section: "asc" },
          ],
          skip,
          take: limit,
        }),
      ]);

      res.json({
        data: sections.map((s) => ({
          id: s.id,
          course_id: s.course_id,
          code: s.course.code,
          name: s.course.name,
          name_th: s.course.name_th,
          credits: s.course.credits,
          program_id: s.course.program_id,
          section: s.section,
          semester: s.semester,
          year: s.year,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("Pagination Error:", err);
      res
        .status(500)
        .json({ error: "Unable to retrieve paginated information" });
    }
  },
);

// GET /forSummary - ดึงรายชื่อรายวิชาพื้นฐานสำหรับเลือกใน UI
router.get(
  "/forSummary",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // 1. ตรวจสอบว่ามีการส่ง programId มาหรือไม่
      const queryProgramId = req.query.programId;

      if (!queryProgramId) {
        return res.status(400).json({
          error: "programId is required to fetch records",
        });
      }

      const programId = parseInt(String(queryProgramId));

      // 2. ตรวจสอบว่า programId เป็นตัวเลขที่ถูกต้องหรือไม่
      if (isNaN(programId)) {
        return res.status(400).json({ error: "Invalid programId format" });
      }

      // 3. ดึงข้อมูลโดยบังคับเงื่อนไข program_id
      const result = await prisma.course.findMany({
        where: { program_id: programId }, // บังคับให้ต้องมีค่าเสมอ
        include: { program: true },
        orderBy: { code: "asc" },
      });

      res.json(
        result.map((course) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          name_th: course.name_th,
          credits: course.credits,
          program_id: course.program.id,
          program_code: course.program.program_code,
          program_year: course.program.program_year,
        })),
      );
    } catch (err: any) {
      res
        .status(500)
        .json({ error: "Failed to fetch records", details: err.message });
    }
  },
);

/**
 * 2. GENERAL ROUTES (Root paths)
 */

// GET / - ดึงข้อมูลแบบ Simple List
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId
      ? parseInt(String(req.query.programId))
      : undefined;
    const sections = await prisma.courseSection.findMany({
      where: programId ? { course: { program_id: programId } } : {},
      include: { course: true },
      orderBy: { id: "desc" },
    });

    res.json(
      sections.map((s) => ({
        id: s.id,
        code: s.course.code,
        name: s.course.name,
        nameTh: s.course.name_th,
        credits: s.course.credits,
        programId: s.course.program_id,
        section: s.section,
        semester: s.semester,
        year: s.year,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// POST / - สร้าง Master Course และ Section ใหม่
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const { code, name, name_th, credits, program_id, section, semester, year } = req.body;
  if (!code || !name || !credits || !program_id || !section || !semester || !year) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let masterCourse = await tx.course.findFirst({
        where: { code, program_id: parseInt(program_id) },
      });

      if (!masterCourse) {
        masterCourse = await tx.course.create({
          data: {
            code,
            name,
            name_th: name_th || name,
            credits,
            program_id: parseInt(program_id),
          },
        });
      }

      const existingSection = await tx.courseSection.findFirst({
        where: {
          course_id: masterCourse.id,
          section: parseInt(section),
          semester: parseInt(semester),
          year: parseInt(year),
        },
      });

      if (existingSection)
        throw new Error(`Section ${section} already exists.`);

      return await tx.courseSection.create({
        data: {
          course_id: masterCourse.id,
          section: parseInt(section),
          semester: parseInt(semester),
          year: parseInt(year),
        },
        include: { course: true },
      });
    });

    res
      .status(201)
      .json({ message: "Course section created successfully", data: result });
  } catch (err: any) {
    res
      .status(400)
      .json({ error: err.message || "Unable to add course section" });
  }
});

/**
 * 3. DYNAMIC ROUTES (กลุ่มตัวแปร :id - ต้องอยู่ด้านล่างสุดเสมอ)
 */

// GET /:id - ดึงข้อมูลรายตัวด้วย ID
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const idRaw = req.params.id;
    const id = parseInt(String(idRaw));

    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID format" });

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

// DELETE /:id - ลบ Section
router.delete(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(String(req.params.id));
      await prisma.courseSection.delete({ where: { id } });
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: "Unable to delete course section" });
    }
  },
);

// DELETE /?id= - ลบ Master Course พร้อม Section ทั้งหมด (ถ้าไม่มี Section อื่นที่ใช้ Master Course นี้)
// DELETE /api/course (หรือ path ที่คุณตั้งไว้)
router.delete("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.query.id));

    // ค้นหา Section เพื่อดูว่าเชื่อมกับ Course ไหน
    const section = await prisma.courseSection.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!section) return res.status(404).json({ error: "Section not found" });

    const courseId = section.course_id;

    // ลบทุก Sections ใน Course นั้น และลบตัว Master Course ทิ้งด้วย
    await prisma.$transaction([
      prisma.courseSection.deleteMany({ where: { course_id: courseId } }),
      prisma.course.delete({ where: { id: courseId } }),
    ]);

    res.json({ success: true, deletedCourseId: courseId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to delete course and sections" });
  }
});

// PATCH /:id - อัปเดตข้อมูล Section
router.patch("/:id", authenticateToken, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const { code, name, name_th, credits, program_id, section, semester, year } = req.body;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.courseSection.findUnique({
        where: { id },
        include: { course: true },
      });
      if (!current) throw new Error("Section not found");

      if (code !== current.course.code || name !== current.course.name) {
        await tx.course.update({
          where: { id: current.course_id },
          data: { code, name, name_th, credits, program_id: parseInt(program_id) },
        });
      }

      return await tx.courseSection.update({
        where: { id },
        data: {
          section: parseInt(section),
          semester: parseInt(semester),
          year: parseInt(year),
        },
        include: { course: true },
      });
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Unable to update course" });
  }
});

export default router;
