import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// 1. GET: Fetch assignments (Filter by COURSE ID, not Section)
router.get("/", authenticateToken, async (req, res) => {
  try {
    // Assignments are now defined at the Course level, so we filter by courseId
    const sectionId = req.query.sectionId
      ? Number(req.query.sectionId)
      : undefined;

    if (!sectionId) {
      return res
        .status(400)
        .json({ error: "sectionId query parameter is required" });
    }

    const assignments = await prisma.assignment.findMany({
      where: { section_id: sectionId },
      orderBy: { createdAt: "asc" },
    });

    res.json(assignments);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// 2. POST: Create a new assignment
router.post("/", authenticateToken, async (req, res) => {
  try {
    // Note: 'course_id' replaces 'section_id'
    const { section_id, name, description, category, maxScore, weight } =
      req.body;

    // Validation
    if (!section_id || !name) {
      return res.status(400).json({ error: "course_id and name are required" });
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        section_id: Number(section_id),
        name,
        description: description || "",
        category: category || "assignment",
        maxScore: Number(maxScore ?? 100),
        weight: Number(weight ?? 0),
        createdAt: new Date(),
      },
    });

    res.status(201).json(newAssignment);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

router.post("/bulk", authenticateToken, async (req, res) => {
  try {
    const { assignments } = req.body; // Expecting an array of assignments

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "assignments array is required" });
    }

    const createdAssignments = await prisma.assignment.createMany({
      data: assignments.map((a: any) => ({
        section_id: Number(a.section_id),
        name: a.name,
        description: a.description || "",
        category: a.category,
        maxScore: Number(a.maxScore ?? 100),
        weight: Number(a.weight ?? 0),
        createdAt: new Date(),
      })),
    });

    res.status(201).json({
      message: `${createdAssignments.count} assignments created successfully`,
    });
  } catch (err: any) {
    console.error("Bulk Create Error:", err);
    res.status(500).json({ error: "Failed to create assignments in bulk" });
  }
});

// 3. DELETE: Remove an assignment
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    res.json({ message: "Assignment deleted successfully" });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// 4. PATCH: Update an assignment
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const { name, description, maxScore, weight, category } = req.body;

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        name,
        description,
        maxScore: maxScore !== undefined ? Number(maxScore) : undefined,
        weight: weight !== undefined ? Number(weight) : undefined,
        category,
      },
    });

    res.json(updatedAssignment);
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

// GET: ดึงเกณฑ์น้ำหนักของแต่ละหมวดในวิชานั้นๆ
router.get("/categoriesWeights", authenticateToken, async (req, res) => {
  try {
    const sectionId = req.query.sectionId
      ? Number(req.query.sectionId)
      : undefined;

    if (!sectionId || isNaN(sectionId)) {
      return res
        .status(400)
        .json({ error: "Valid sectionId query parameter is required" });
    }

    const categoryWeights = await prisma.assignmentCategoryWeight.findMany({
      where: { section_id: sectionId },
      orderBy: { category: "asc" }, // เรียงลำดับให้แสดงผลในหน้าบ้านง่ายขึ้น
    });

    res.json(categoryWeights);
  } catch (err: any) {
    console.error("GET Error:", err);
    res.status(500).json({ error: "Failed to fetch category weights" });
  }
});

// POST: บันทึกหรือแก้ไขเกณฑ์น้ำหนัก
router.post("/categoriesWeights", authenticateToken, async (req, res) => {
  try {
    const { sectionId, category, maxWeight } = req.body;

    // ตรวจสอบค่าที่ส่งมา (maxWeight อาจเป็น 0 ได้ จึงเช็ค undefined)
    if (!sectionId || !category || maxWeight === undefined) {
      return res.status(400).json({
        error: "sectionId, category, and maxWeight are required",
      });
    }

    // Upsert: ถ้ามีคู่ (section_id, category) เดิมอยู่แล้วจะ Update ถ้าไม่มีจะ Create
    const updatedRecord = await prisma.assignmentCategoryWeight.upsert({
      where: {
        section_id_category: {
          section_id: Number(sectionId),
          category: category,
        },
      },
      update: {
        maxWeight: parseFloat(maxWeight),
      },
      create: {
        section_id: Number(sectionId),
        category: category,
        maxWeight: parseFloat(maxWeight),
      },
    });

    res.json(updatedRecord);
  } catch (err: any) {
    console.error("POST Error:", err);
    // กรณีที่ส่ง Enum category ผิด หรือ Prisma error อื่นๆ
    res.status(500).json({ error: "Failed to update category weight" });
  }
});

router.post("/categoriesWeights/bulk", authenticateToken, async (req, res) => {
  const { section_id, weights } = req.body; // weights: [{category: 'quiz', maxWeight: 20}, ...]

  try {
    const results = await prisma.$transaction(
      weights.map((w: any) =>
        prisma.assignmentCategoryWeight.upsert({
          where: {
            section_id_category: {
              section_id: Number(section_id),
              category: w.category,
            },
          },
          update: { maxWeight: parseFloat(w.maxWeight) },
          create: {
            section_id: Number(section_id),
            category: w.category,
            maxWeight: parseFloat(w.maxWeight),
          },
        }),
      ),
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Bulk update failed" });
  }
});

// ลบโดยใช้ ID ของ Record นั้นๆ โดยตรง
router.delete("/categoriesWeights/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.assignmentCategoryWeight.delete({
      where: {
        id: Number(id), // ลบด้วย Unique ID
      },
    });
    res.json({ message: "Category weight deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Failed to delete category weight" });
  }
});

export default router;
