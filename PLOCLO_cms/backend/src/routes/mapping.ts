import { Router } from "express";
import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

interface UpdateItem {
  assignment_id: number;
  clo_id: number;
  weight: number | string;
}

// GET /api/mapping/clo-plo/:courseId
// Fetches mappings for the Master Course
router.get("/clo-plo/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid Course ID" });
    }

    // Using pool query for direct SQL control or consistency with existing patterns
    const result = await pool.query(
      `SELECT m.clo_id, m.plo_id, m.weight 
       FROM clo_plo_mapping m
       JOIN clo c ON m.clo_id = c.id
       WHERE c.course_id = $1`,
      [courseId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

// POST /api/mapping/clo-plo
router.post("/clo-plo", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { updates } = req.body; // Array of { clo_id, plo_id, weight }

    await client.query("BEGIN");

    for (const item of updates) {
      if (item.weight > 0) {
        await client.query(
          `INSERT INTO clo_plo_mapping (clo_id, plo_id, weight)
           VALUES ($1, $2, $3)
           ON CONFLICT (clo_id, plo_id) 
           DO UPDATE SET weight = EXCLUDED.weight, updated_at = NOW()`,
          [item.clo_id, item.plo_id, item.weight],
        );
      } else {
        await client.query(
          `DELETE FROM clo_plo_mapping 
           WHERE clo_id = $1 AND plo_id = $2`,
          [item.clo_id, item.plo_id],
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Mapping saved" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to save mapping" });
  } finally {
    client.release();
  }
});

// POST /api/mapping/assignment-clo
router.post("/assignment-clo", authenticateToken, async (req, res) => {
  const { updates } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of updates as UpdateItem[]) {
        const weight = Number(item.weight ?? 0);

        // 1. Fetch Assignment (Now directly linked to Course)
        const assignment = await tx.assignment.findUnique({
          where: { id: Number(item.assignment_id) },
          select: { 
            section_id: true,
            section: {
              select: { course_id: true },
            },
          }, // Direct relation
        });

        // 2. Fetch CLO (Linked to Course)
        const clo = await tx.clo.findUnique({
          where: { id: Number(item.clo_id) },
          select: { course_id: true },
        });

        if (!assignment || !clo) {
          throw new Error("ASSIGNMENT_OR_CLO_NOT_FOUND");
        }

        // 3. Validation: Must belong to the same Master Course
        if (assignment.section.course_id !== clo.course_id) {
          throw new Error("COURSE_MISMATCH");
        }

        // 4. Weight Validation (Optional: Check total weight for assignment)
        //
        const existingMappings = await tx.assignmentCloMapping.findMany({
          where: {
            assId: Number(item.assignment_id),
            cloId: { not: Number(item.clo_id) }, // Exclude current CLO being updated
          },
          select: { weight: true },
        });

        const currentTotal = existingMappings.reduce(
          (acc, curr) => acc + Number(curr.weight ?? 0),
          0,
        );

        // Note: Strict validation logic depends on your business rules.
        // If updating mapping for one CLO, checking total > 100 might be tricky
        // if user hasn't finished adjusting others. Be careful here.
        if (currentTotal + weight > 100) {
          // throw new Error("WEIGHT_LIMIT_EXCEEDED"); // Uncomment if strict enforcement is desired
        }

        // 5. Update DB
        if (weight > 0 && weight <= 100) {
          await tx.assignmentCloMapping.upsert({
            where: {
              assId_cloId: {
                assId: Number(item.assignment_id),
                cloId: Number(item.clo_id),
              },
            },
            update: {
              weight,
              updatedAt: new Date(),
            },
            create: {
              assId: Number(item.assignment_id),
              cloId: Number(item.clo_id),
              weight,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.assignmentCloMapping.deleteMany({
            where: {
              assId: Number(item.assignment_id),
              cloId: Number(item.clo_id),
            },
          });
        }
      }
    });

    res.json({ success: true, message: "Mapping saved" });
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      if (err.message === "ASSIGNMENT_OR_CLO_NOT_FOUND") {
        return res.status(404).json({ error: "Assignment or CLO not found" });
      }
      if (err.message === "COURSE_MISMATCH") {
        return res
          .status(400)
          .json({ error: "Assignment and CLO must belong to the same course" });
      }
      if (err.message === "WEIGHT_LIMIT_EXCEEDED") {
        return res
          .status(400)
          .json({ error: "Total weight for assignment cannot exceed 100" });
      }
    }
    res.status(500).json({ error: "Failed to save mapping" });
  }
});

// GET /api/mapping/assignment-clo/:courseId
router.get(
  "/assignment-clo/:sectionId",
  authenticateToken,
  async (req, res) => {
    try {
      const sectionId = parseInt(req.params.sectionId as string);

      if (isNaN(sectionId)) {
        return res.status(400).json({ error: "Invalid Course ID" });
      }

      // Updated Query: Both Assignment and CLO are now directly under Course
      const result = await pool.query(
        `SELECT m.assignment_id, m.clo_id, m.weight 
       FROM assignment_clo_mapping m
       JOIN assignment a ON m.assignment_id = a.id
       JOIN clo c ON m.clo_id = c.id
       WHERE a.section_id = $1 AND c.course_id = $1`,
        [sectionId],
      );

      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch mappings" });
    }
  },
);

export default router;
