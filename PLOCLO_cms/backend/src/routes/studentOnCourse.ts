import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// --- GET: Fetch students ---
// 1. If sectionId is provided: Fetch students in THAT specific section (for table display)
// 2. If courseId is provided: Fetch students in ANY section of that course (for filtering popup)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { sectionId, courseId } = req.query;

    if (!sectionId && !courseId) {
      return res
        .status(400)
        .json({ error: "Either sectionId or courseId is required" });
    }

    // CASE A: Fetch by Master Course ID (Used for filtering "Available Students")
    // We want to find students enrolled in ANY section belonging to this courseId
    if (courseId) {
      const result = await pool.query(
        `
        SELECT DISTINCT
          s.id,
          s.student_code,
          s.first_name,
          s.last_name
        FROM student_on_section sos
        JOIN course_section cs ON sos.section_id = cs.id
        JOIN student s ON sos.student_id = s.id
        WHERE cs.course_id = $1
        `,
        [courseId],
      );
      return res.json(result.rows);
    }

    // CASE B: Fetch by Specific Section ID (Used for the main table)
    if (sectionId) {
      const result = await pool.query(
        `
        SELECT 
          sos.student_id,
          sos.section_id,
          sos."assignedAt", 
          c.name AS course_name,
          c.code AS course_code,
          cs.section,
          cs.semester,
          cs.year,
          s.student_code,
          s.first_name,
          s.last_name
        FROM student_on_section sos
        JOIN course_section cs ON sos.section_id = cs.id
        JOIN course c ON cs.course_id = c.id
        JOIN student s ON sos.student_id = s.id
        WHERE sos.section_id = $1
        ORDER BY s.student_code ASC
        `,
        [sectionId],
      );
      return res.json(result.rows);
    }
  } catch (err: any) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch records", details: err.message });
  }
});

router.get("/all", authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        sos.student_id,
        sos.section_id,
        sos."assignedAt", 
        c.name AS course_name,
        c.code AS course_code,
        cs.section,
        cs.semester,
        cs.year,
        s.student_code,
        s.first_name,
        s.last_name
      FROM student_on_section sos
      JOIN course_section cs ON sos.section_id = cs.id
      JOIN course c ON cs.course_id = c.id
      JOIN student s ON sos.student_id = s.id
      ORDER BY s.id ASC
      `,
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch records", details: err.message });
  }
});

// --- POST: Bulk insert students into a section ---
router.post("/bulk", authenticateToken, async (req, res) => {
  const { sectionId, studentIds } = req.body;

  if (!sectionId)
    return res.status(400).json({ error: "sectionId is required" });
  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: "studentIds must be a valid list" });
  }

  try {
    // 1. Get the course_code for the provided sectionId
    const sectionInfo = await pool.query(
      `SELECT c.code FROM course_section cs
       JOIN course c ON cs.course_id = c.id
       WHERE cs.id = $1`,
      [sectionId],
    );

    if (sectionInfo.rowCount === 0) {
      return res.status(404).json({ error: "Section not found" });
    }

    const courseCode = sectionInfo.rows[0].code;

    // 2. Identify students already enrolled in ANY section of this course code
    // (This prevents a student from being in Sec 1 AND Sec 2 of the same course)
    const existingEnrollments = await pool.query(
      `SELECT sos.student_id 
       FROM student_on_section sos
       JOIN course_section cs ON sos.section_id = cs.id
       JOIN course c ON cs.course_id = c.id
       WHERE c.code = $1 AND sos.student_id = ANY($2)`,
      [courseCode, studentIds],
    );

    const alreadyEnrolledIds = existingEnrollments.rows.map(
      (row) => row.student_id,
    );

    // 3. Filter the list to only include students NOT already in this course code
    const studentsToAdd = studentIds.filter(
      (id) => !alreadyEnrolledIds.includes(id),
    );

    if (studentsToAdd.length === 0) {
      return res.status(400).json({
        error:
          "All selected students are already enrolled in a section of this course code.",
      });
    }

    // 4. Perform the bulk insert for valid students
    const queries = studentsToAdd.map((sId: number) =>
      pool.query(
        "INSERT INTO student_on_section (student_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [sId, sectionId],
      ),
    );

    await Promise.all(queries);

    res.json({
      message: `Successfully assigned ${studentsToAdd.length} students.`,
      skippedCount: alreadyEnrolledIds.length,
    });
  } catch (err: any) {
    console.error("Bulk insert error:", err);
    res
      .status(500)
      .json({ error: "Failed to assign students", details: err.message });
  }
});

// --- DELETE: Remove a student from a section ---
// Bulk Delete: Remove multiple students from a specific section
router.delete("/bulk-delete", authenticateToken, async (req, res) => {
  const { sectionId, studentIds } = req.body;

  if (!sectionId || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "Invalid sectionId or studentIds" });
  }

  try {
    // 🟢 ใช้ Transaction เพื่อความปลอดภัย: ลบคะแนนก่อน แล้วค่อยลบรายชื่อออกจาก Section
    const result = await prisma.$transaction(async (tx) => {
      // 1. ลบคะแนนทั้งหมดของนักศึกษาเหล่านี้ใน Section ที่กำหนด
      await tx.studentScore.deleteMany({
        where: {
          student_id: { in: studentIds.map((id) => Number(id)) },
          assignment: {
            section_id: Number(sectionId), // หรือใช้เงื่อนไขที่เชื่อมโยงกับ Section ของคุณ
          },
        },
      });

      // 2. ลบนักศึกษาออกจากกลุ่มเรียน (Table: student_on_section)
      const deleteResult = await tx.$executeRawUnsafe(
        `DELETE FROM student_on_section 
         WHERE section_id = $1 AND student_id = ANY($2::int[])`,
        sectionId,
        studentIds,
      );

      return deleteResult;
    });

    res.json({
      message: `Successfully removed students and their associated scores`,
      removedCount: result,
    });
  } catch (err) {
    console.error("Error bulk deleting:", err);
    res.status(500).json({ error: "Failed to delete records" });
  }
});

export default router;
