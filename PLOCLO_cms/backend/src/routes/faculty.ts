import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// ดึงข้อมูลคณะทั้งหมด (faculty) สำหรับ dropdown
// ใช้ในหน้าเพิ่ม/แก้ไขโปรแกรมหรือคอร์ส
router.get("/", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.university_id as string | undefined;

   let query = `
      SELECT 
        faculty.id, 
        faculty.name, 
        faculty.name_th, 
        faculty.abbreviation, 
        faculty.abbreviation_th, 
        faculty.university_id,
        university.name AS university_name,       -- English Name
        university.name_th AS university_name_th  -- Thai Name (Optional)
      FROM faculty
      JOIN university ON faculty.university_id = university.id
    `;
    const params: any[] = [];

    if (universityId) {
      query += ` WHERE university_id = $1`;
      params.push(universityId);
    }

    query += ` ORDER BY id ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Unable to retrieve faculty information" });
  }
});

router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.university_id as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    let query = `SELECT id, name, university_id FROM faculty`;
    const params: any[] = [];

    if (universityId) {
      query += ` WHERE university_id = $1`;
      params.push(universityId);
    }

    query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Optionally get total count
    const countResult = await pool.query(
      universityId
        ? `SELECT COUNT(*) FROM faculty WHERE university_id = $1`
        : `SELECT COUNT(*) FROM faculty`,
      universityId ? [universityId] : []
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({ data: result.rows, total });
  } catch (err: any) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Unable to retrieve paginated faculty information" });
  }
});

// src/routes/faculty.ts

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    
    const faculty = await prisma.faculty.findUnique({
      where: { id: id },
      // ✅ ADD THIS: Include the related University data
      include: {
        university: true 
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    res.json(faculty);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch faculty" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const { university_id, name, name_th, abbreviation, abbreviation_th } =
    req.body;

  if (!name || !name_th || !abbreviation || !abbreviation_th) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1️⃣ Check if the faculty already exists for this university
    const duplicateCheck = await pool.query(
      `SELECT id FROM faculty 
       WHERE university_id = $1 AND name = $2`,
      [university_id, name]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: "Faculty with this name already exists for the university",
      });
    }

    // 2️⃣ Insert if not duplicate
    const result = await pool.query(
      `INSERT INTO faculty (university_id, name, name_th, abbreviation, abbreviation_th)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, university_id, name, name_th, abbreviation, abbreviation_th`,
      [university_id, name, name_th, abbreviation, abbreviation_th]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("Database error details:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const facultyId = parseInt(req.params.id as string); ;
  const { name, name_th, abbreviation, abbreviation_th } = req.body;

  if (!name || !name_th || !abbreviation || !abbreviation_th) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if the faculty exists
    const facultyCheck = await pool.query(
      `SELECT id FROM faculty WHERE id = $1`,
      [facultyId]
    );

    if (facultyCheck.rows.length === 0) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Update the faculty
    const result = await pool.query(
      `UPDATE faculty 
       SET name = $1, name_th = $2, abbreviation = $3, abbreviation_th = $4 
       WHERE id = $5 
       RETURNING id, university_id, name, name_th, abbreviation, abbreviation_th`,
      [name, name_th, abbreviation, abbreviation_th, facultyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Database error details:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const facultyId = parseInt(req.params.id as string);

  try {
    // Check if the faculty exists
    const facultyCheck = await pool.query(
      `SELECT id FROM faculty WHERE id = $1`,
      [facultyId]
    );

    if (facultyCheck.rows.length === 0) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Delete the faculty
    await pool.query(`DELETE FROM faculty WHERE id = $1`, [facultyId]);

    res.status(204).send();
  } catch (err: any) {
    console.error("Database error details:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
