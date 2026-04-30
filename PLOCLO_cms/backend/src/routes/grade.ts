import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// GET /api/grade/settings/:course
router.get("/settings/:courseId", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid Course ID" });
    }

    const settings = await prisma.gradeSetting.findMany({
      where: { course_id: courseId },
      orderBy: { score: "desc" }, // Sort A -> F by default
    });

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch grade settings" });
  }
});

// POST /api/grade/settings
router.post("/settings", authenticateToken, async (req, res) => {
  try {
    const { courseId , settings } = req.body;

    // 1. Validation
    if (!courseId || !Array.isArray(settings)) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    // 2. TRANSACTION: Delete old settings, then insert new ones
    await prisma.$transaction(async (tx) => {
      // A. Delete existing settings for this course
      await tx.gradeSetting.deleteMany({
        where: { course_id: courseId },
      });

      // B. Insert the fresh list
      const validSettings = settings.filter(
        (s: any) => s.score !== "" && s.score !== null
      );

      if (validSettings.length > 0) {
        await tx.gradeSetting.createMany({
          data: validSettings.map((item: any) => ({
            course_id: courseId,
            grade: item.grade,
            score: item.score,
          })),
        });
      }
    });

    // 3. Fetch the newly created settings to return to frontend
    const createdSettings = await prisma.gradeSetting.findMany({
      where: { course_id: courseId },
      orderBy: { score: "desc" },
    });

    res.json({
      message: "Grade settings updated successfully",
      createdSettings,
    });
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "Failed to update grade settings" });
  }
});

export default router;
