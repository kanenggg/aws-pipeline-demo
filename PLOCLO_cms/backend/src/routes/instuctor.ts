import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.query;

    // Build the filter
    const whereClause = facultyId
      ? { faculty_id: parseInt(facultyId as string) }
      : {};

    const instructors = await prisma.instructor.findMany({
      where: whereClause,
      orderBy: { id: "desc" },
    });

    res.json(instructors);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch instructors" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { full_thai_name, full_eng_name, email, phoneNum, faculty_id } =
      req.body;

    if (!full_thai_name || !full_eng_name || !email || !faculty_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newInstructor = await prisma.instructor.create({
      data: {
        full_thai_name,
        full_eng_name,
        email,
        phoneNum,
        faculty_id,
      },
    });

    res.status(201).json(newInstructor);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create instructor" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const instructorId = parseInt(req.params.id as string);
    const { full_thai_name, full_eng_name, email, phoneNum, faculty_id } =
      req.body;

    const updatedInstructor = await prisma.instructor.update({
      where: { id: instructorId },
      data: {
        full_thai_name,
        full_eng_name,
        email,
        phoneNum,
        faculty_id,
      },
    });

    res.json(updatedInstructor);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update instructor" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const instructorId = parseInt(req.params.id as string);

    await prisma.instructor.delete({
      where: { id: instructorId },
    });

    res.status(204).send();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete instructor" });
  }
});

router.get("/email/:email", authenticateToken, async (req, res) => {
  try {
    // Force email to be a string
    const email = req.params.email as string;

    const instructor = await prisma.instructor.findFirst({
      where: { email }, // Prisma now sees this as a single string
    });

    if (!instructor) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    res.json(instructor);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch instructor by email" });
  }
});

export default router;
