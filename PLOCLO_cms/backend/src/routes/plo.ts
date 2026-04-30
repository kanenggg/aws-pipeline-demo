import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
const router = Router();

// เพิ่มข้อมูล PLO
// POST /api/plo
router.post("/", authenticateToken, async (req, res) => {
  const { code, program_id, name, engname } = req.body;
  if (!code || !program_id || !name || !engname) {
    return res
      .status(400)
      .json({ error: "code, program_id, name, engname จำเป็นต้องกรอก" });
  }
  try {
    // Check for duplicate (same code and program_id)
    const dupCheck = await pool.query(
      `SELECT id FROM plo WHERE code = $1 AND program_id = $2`,
      [code, program_id],
    );
    if (dupCheck.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "PLO with this code and program already exists" });
    }
    const result = await pool.query(
      `INSERT INTO plo (code, program_id, name, engname) VALUES ($1, $2, $3, $4) RETURNING id, code, program_id, name, engname`,
      [code, program_id, name, engname],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถเพิ่มข้อมูล PLO ได้" });
  }
});

router.post("/bulk", authenticateToken, async (req, res) => {
  const { plos } = req.body;
  if (!Array.isArray(plos) || plos.length === 0) {
    return res.status(400).json({ error: "plos ต้องเป็นอาเรย์ที่มีข้อมูล" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertedPLOs = [];
    let skipCount = 0;

    for (const plo of plos) {
      const { code, program_id, name, engname } = plo;

      // 1. Validation เบื้องต้น
      if (!code || !program_id || !name || !engname) {
        // หากข้อมูลไม่ครบ เราอาจจะเลือกข้ามหรือหยุด ขึ้นอยู่กับนโยบายข้อมูล
        continue;
      }

      // 2. ตรวจสอบข้อมูลซ้ำ
      const dupCheck = await client.query(
        `SELECT id FROM plo WHERE code = $1 AND program_id = $2`,
        [code, program_id],
      );

      if (dupCheck.rows.length > 0) {
        // 🟢 พบข้อมูลซ้ำ -> ข้ามรายการนี้ไป (Skip)
        skipCount++;
        continue;
      }

      // 3. เพิ่มข้อมูลรายการใหม่
      const result = await client.query(
        `INSERT INTO plo (code, program_id, name, engname) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, code, program_id, name, engname`,
        [code, program_id, name, engname],
      );
      insertedPLOs.push(result.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Bulk processing completed",
      inserted: insertedPLOs.length,
      skipped: skipCount,
      plos: insertedPLOs,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถประมวลผลข้อมูล PLO ได้" });
  } finally {
    client.release();
  }
});

router.delete("/bulk-delete", authenticateToken, async (req, res) => {
  const { ploIds } = req.body; // รับ [101, 102, 103]

  if (!Array.isArray(ploIds) || ploIds.length === 0) {
    return res.status(400).json({ error: "No PLO IDs provided" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ใช้ ANY($1) เพื่อลบรายการทั้งหมดที่มี ID อยู่ใน Array
    await client.query("DELETE FROM plo WHERE id = ANY($1::int[])", [ploIds]);

    await client.query("COMMIT");
    res
      .status(200)
      .json({ message: `Successfully deleted ${ploIds.length} PLOs` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bulk Delete Error:", err);
    res.status(500).json({ error: "Failed to delete PLOs" });
  } finally {
    client.release();
  }
});

// ดึงข้อมูล PLO ทั้งหมด
// GET /api/plo
router.get("/", authenticateToken, async (req, res) => {
  try {
    // FIX 1: Use req.query.programId instead of req.params.id
    // The frontend sends: /plo?programId=123
    const programId = parseInt(req.query.programId as string);

    if (!programId) {
      return res.status(400).json({ error: "Program ID is required" });
    }

    const result = await pool.query(
      `SELECT 
          plo.id, plo.code, plo.program_id, plo.name, plo.engname,
          program.program_shortname_th, program.program_shortname_en, program.program_year
       FROM plo
       JOIN program ON plo.program_id = program.id
       WHERE plo.program_id = $1`, // FIX 2: Filter by program_id, not plo.id
      [programId],
    );

    // FIX 3: Return all rows (array), not just the first one
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to retrieve plo information" });
  }
});

// ดึงข้อมูล PLO แบบแบ่งหน้า
// GET /api/plo/paginate?page=1&limit=10
router.get("/paginate", authenticateToken, async (req, res) => {
  try {
    const universityId = req.query.universityId;
    const facultyId = req.query.facultyId;
    const programId = req.query.programId; // This receives the ID (e.g. 52)
    const year = req.query.year;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        plo.id, plo.code, plo.program_id, plo.name, plo.engname,
        program.program_shortname_th, program.program_shortname_en, program.program_year
      FROM plo
      JOIN program ON plo.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      WHERE 1=1
    `;
    const params = [];

    if (universityId) {
      params.push(universityId);
      query += ` AND university.id = $${params.length}`;
    }
    if (facultyId) {
      params.push(facultyId);
      query += ` AND faculty.id = $${params.length}`;
    }

    // ✅ FIX: Change 'program.program_code' to 'program.id'
    if (programId) {
      params.push(programId);
      query += ` AND program.id = $${params.length}`;
    }

    if (year) {
      params.push(year);
      query += ` AND program.program_year = $${params.length}`;
    }

    query += ` ORDER BY LENGTH(plo.code) ASC, plo.code ASC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM plo
      JOIN program ON plo.program_id = program.id
      JOIN faculty ON program.faculty_id = faculty.id
      JOIN university ON faculty.university_id = university.id
      WHERE 1=1
    `;
    const countParams = [];

    if (universityId) {
      countParams.push(universityId);
      countQuery += ` AND university.id = $${countParams.length}`;
    }
    if (facultyId) {
      countParams.push(facultyId);
      countQuery += ` AND faculty.id = $${countParams.length}`;
    }

    // ✅ FIX: Same fix for the count query
    if (programId) {
      countParams.push(programId);
      countQuery += ` AND program.id = $${countParams.length}`;
    }

    if (year) {
      countParams.push(year);
      countQuery += ` AND program.program_year = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Ensure frontend receives the pagination structure it expects
    res.json({
      data: result.rows,
      pagination: {
        // Make sure this matches what your frontend expects: res.data.pagination.totalPages
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Unable to retrieve paginated plos information",
    });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id as string);

  const { code, name, engname } = req.body;

  try {
    const result = await pool.query(
      `UPDATE plo SET code = $1, name = $2, engname = $3 WHERE id = $4 RETURNING *`,
      [code, name, engname, id],
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Error updating PLO:", err);
    res.status(500).json({ error: "Failed to update PLO" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const ploId = parseInt(req.params.id as string);
  if (!ploId) {
    return res.status(400).json({ error: "PLO ID is required" });
  }
  try {
    await pool.query(`DELETE FROM plo WHERE id = $1`, [ploId]);
    res.status(204).send();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถลบข้อมูล PLO ได้" });
  }
});

export default router;
