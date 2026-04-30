import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST: Batch save/update scores
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { updates, sectionId } = req.body; // 🟢 แนะนำให้ส่ง sectionId มาใน body ด้วย

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: "Invalid updates format" });
    }

    const results = await prisma.$transaction(
      updates.map((item) => {
        const scoreValue =
          item.score === null || item.score === undefined || item.score === ""
            ? 0
            : Number(item.score);

        // ดึง sectionId จากตัว item เอง หรือจากตัวแปรกลางที่ส่งมา
        const currentSectionId = Number(item.section_id || sectionId);

        if (isNaN(currentSectionId)) {
          throw new Error("Missing section_id for one or more entries");
        }

        return prisma.studentScore.upsert({
          where: {
            // 🟢 อ้างอิงตาม Unique Constraint ที่คุณตั้งไว้
            student_id_assignment_id: {
              student_id: Number(item.student_id),
              assignment_id: Number(item.assignment_id),
            },
          },
          update: {
            score: scoreValue,
            section_id: currentSectionId, // 🟢 อัปเดตเพื่อให้แน่ใจว่าข้อมูลถูกต้อง
            updatedAt: new Date(),
          },
          create: {
            student_id: Number(item.student_id),
            assignment_id: Number(item.assignment_id),
            section_id: currentSectionId, // 🟢 บันทึก ID ของ Section ลงไป
            score: scoreValue,
          },
        });
      }),
    );

    res.json({ message: "Scores updated successfully", count: results.length });
  } catch (err: any) {
    console.error("Error saving scores:", err);
    res.status(500).json({ error: "Failed to save scores: " + err.message });
  }
});

// GET: Fetch scores for a specific SECTION
router.get("/", authenticateToken, async (req, res) => {
  try {
    const sectionId = Number(req.query.sectionId);

    if (isNaN(sectionId)) {
      return res.status(400).json({ error: "Invalid or missing sectionId" });
    }

    // 🟢 ตอนนี้เรากรองจาก section_id ในตาราง StudentScore ได้โดยตรงแล้ว
    // เพราะเราได้ย้ายความสัมพันธ์มาเก็บไว้ที่นี่แล้ว
    const result = await prisma.studentScore.findMany({
      where: {
        section_id: sectionId,
      },
      select: {
        id: true,
        student_id: true,
        assignment_id: true,
        section_id: true, // เพิ่มกลับเข้าไปในชุดข้อมูลที่ส่งออก
        score: true,
        student: {
          select: {
            student_code: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { student_id: "asc" },
    });

    res.status(200).json(result);
  } catch (err: any) {
    console.error("Error fetching scores:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// PATCH: Update a single score
router.patch("/:id", authenticateToken, async (req, res) => {
  const scoreId = Number(req.params.id);
  const { score } = req.body;

  if (isNaN(scoreId)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const updatedScore = await prisma.studentScore.update({
      where: { id: scoreId },
      data: {
        score: Number(score),
        updatedAt: new Date(),
      },
    });

    res.json(updatedScore);
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Score not found" });
    }
    console.error("Error updating score:", err);
    res.status(500).json({ error: "Failed to update score" });
  }
});

export default router;
