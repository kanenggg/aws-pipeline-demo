import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST: Assign instructor to course
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { courseId, instructorId } = req.body;

    if (!courseId || !instructorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if assignment already exists to prevent duplicates
    const existing = await prisma.courseInstructor.findUnique({
      where: {
        courseId_instructorId: {
          courseId: Number(courseId),
          instructorId: Number(instructorId),
        },
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Instructor already assigned to this course" });
    }

    const newAssignment = await prisma.courseInstructor.create({
      data: {
        courseId: Number(courseId),
        instructorId: Number(instructorId),
      },
    });

    res.status(201).json(newAssignment);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign instructor to course" });
  }
});

// ✅ FIX: Changed path to "/:courseId" to match frontend
// GET /instructorOnCourse/123
router.get("/:courseId", authenticateToken, async (req, res) => {
  try {
    // 1. Read from params (not query)
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const assignments = await prisma.courseInstructor.findMany({
      where: { courseId: parseInt(courseId as string) },
      include: { instructor: true }, // Include the instructor details
    });

    // 2. Flatten the data
    // The frontend expects a list of Instructors: [{ id: 1, name: "..." }]
    // Prisma returns Join Objects: [{ courseId: 5, instructorId: 1, instructor: { ... } }]
    const instructors = assignments.map((a) => a.instructor);

    res.json(instructors);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch instructor assignments" });
  }
});

router.delete("/:courseId/:instructorId", authenticateToken, async (req, res) => {
  try {
    const { courseId, instructorId } = req.params;

    if (!courseId || !instructorId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    await prisma.courseInstructor.delete({
      where: {
        courseId_instructorId: {
          courseId: Number(courseId),
          instructorId: Number(instructorId),
        },
      },
    });

    res.json({ message: "Instructor removed from course successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove instructor from course" });
  }
});

export default router;
