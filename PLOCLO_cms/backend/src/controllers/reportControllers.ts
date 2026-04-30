import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getGradeSummary = async (req: any, res: any) => {
  const { courseId } = req.query;

  if (!courseId) {
    return res.status(400).json({ message: "Missing courseId" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [assignments, gradeSettings, courseSections] = await Promise.all([
        tx.assignment.findMany({ where: { section: { course_id: Number(courseId) } } }),
        tx.gradeSetting.findMany({
          where: { course_id: Number(courseId) },
          orderBy: { score: "desc" },
        }),
        tx.courseSection.findMany({
          where: { course_id: Number(courseId) },
          include: {
            students: {
              include: {
                student: {
                  include: {
                    scores: {
                      where: { assignment: { section: { course_id: Number(courseId) } } },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      // 1. Calculate Full Scores per Category with 4-digit rounding
      const categoryFullScores: Record<string, number> = {};
      assignments.forEach((assign) => {
        const cat = assign.category;
        const weight = Number(assign.weight) || 0;
        const currentTotal = categoryFullScores[cat] || 0;
        // Rounding to 4 digits to prevent floating point drift
        categoryFullScores[cat] = Number((currentTotal + weight).toFixed(4));
      });

      const studentMap = new Map();
      courseSections.forEach((section) => {
        section.students.forEach((record) => {
          if (!studentMap.has(record.student.id))
            studentMap.set(record.student.id, record.student);
        });
      });

      const studentSummaries = Array.from(studentMap.values()).map(
        (student) => {
          let totalWeightedScore = 0;
          const categoryEarnedScores: Record<string, number> = {};

          assignments.forEach((assign) => {
            const scoreRecord = student.scores.find(
              (s: any) => s.assignment_id === assign.id,
            );

            const rawScore = scoreRecord ? Number(scoreRecord.score) : 0;
            const max = Number(assign.maxScore) || 100;
            const weight = Number(assign.weight) || 0;

            const weighted = (rawScore / max) * weight;
            totalWeightedScore += weighted;

            const cat = assign.category;
            const currentEarned = categoryEarnedScores[cat] || 0;
            // 🟢 ROUNDING EARNED SCORE TO 4 DIGITS
            categoryEarnedScores[cat] = Number(
              (currentEarned + weighted).toFixed(4),
            );
          });

          const assignedGrade =
            gradeSettings.find((g) => totalWeightedScore >= Number(g.score))
              ?.grade || "F";

          return {
            student_id: student.id,
            student_code: student.student_code,
            first_name: student.first_name,
            last_name: student.last_name,
            categoryEarnedScores,
            totalScore: Number(totalWeightedScore.toFixed(4)), // Capped at 4 digits
            grade: assignedGrade,
          };
        },
      );

      return {
        categoryFullScores,
        students: studentSummaries,
      };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getSectionGradeSummary = async (req: any, res: any) => {
  const { sectionId, masterCourseId } = req.query;

  if (!sectionId || !masterCourseId) {
    return res
      .status(400)
      .json({ message: "Missing sectionId or masterCourseId" });
  }

  try {
    // ใช้ Transaction ภายใน Controller (ถ้าต้องการ)
    const result = await prisma.$transaction(async (tx) => {
      const [sectionData, assignments, gradeSettings] = await Promise.all([
        tx.courseSection.findUnique({
          where: { id: Number(sectionId) },
          include: {
            students: {
              include: {
                student: {
                  include: {
                    scores: {
                      where: {
                        assignment: { section: { course_id: Number(masterCourseId) } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        tx.assignment.findMany({
          where: { section: { course_id: Number(masterCourseId) } },
        }),
        tx.gradeSetting.findMany({
          where: { course_id: Number(masterCourseId) },
          orderBy: { score: "desc" },
        }),
      ]);

      if (!sectionData) throw new Error("SECTION_NOT_FOUND");

      return sectionData.students.map((record) => {
        const student = record.student;
        let totalWeightedScore = 0;
        const categoryScores: Record<string, number> = {};

        assignments.forEach((assign) => {
          const scoreRecord = student.scores.find(
            (s) => s.assignment_id === assign.id,
          );
          const rawScore = scoreRecord ? Number(scoreRecord.score) : 0;
          const max = Number(assign.maxScore) || 100;
          const weight = Number(assign.weight) || 0;

          const weighted = (rawScore / max) * weight;
          categoryScores[assign.category] =
            (categoryScores[assign.category] || 0) + weighted;
          totalWeightedScore += weighted;
        });

        const assignedGrade =
          gradeSettings.find((g) => totalWeightedScore >= Number(g.score))
            ?.grade || "F";

        return {
          student_id: student.id,
          student_code: student.student_code,
          first_name: student.first_name,
          last_name: student.last_name,
          categoryScores,
          totalScore: Number(totalWeightedScore.toFixed(2)),
          grade: assignedGrade,
        };
      });
    });

    // ส่ง Response ออกไปที่นี่ที่เดียว
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Report Error:", error);
    if (error.message === "SECTION_NOT_FOUND") {
      return res.status(404).json({ message: "Section not found" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getIndividualStudentSummary = async (req: any, res: any) => {
  const { studentId, masterCourseId } = req.query;

  if (!studentId || !masterCourseId) {
    return res
      .status(400)
      .json({ message: "Missing studentId or masterCourseId" });
  }

  try {
    const [student, assignments, gradeSettings] = await Promise.all([
      // 1. ดึงข้อมูลนักเรียนและคะแนนเฉพาะวิชานี้
      prisma.student.findUnique({
        where: { id: Number(studentId) },
        include: {
          scores: {
            where: { assignment: { section: { course_id: Number(masterCourseId) } } },
            include: { assignment: true },
          },
        },
      }),
      // 2. ดึงรายการงานทั้งหมดในวิชานี้ (เพื่อหาตัวหาร)
      prisma.assignment.findMany({
        where: { section: { course_id: Number(masterCourseId) } },
      }),
      // 3. ดึงเกณฑ์การตัดเกรด
      prisma.gradeSetting.findMany({
        where: { course_id: Number(masterCourseId) },
        orderBy: { score: "desc" },
      }),
    ]);

    if (!student) return res.status(404).json({ message: "Student not found" });

    let totalWeightedScore = 0;
    const categoryBreakdown: Record<
      string,
      { earned: number; possible: number }
    > = {};

    // 4. คำนวณคะแนนถ่วงน้ำหนัก
    assignments.forEach((assign) => {
      const scoreRecord = student.scores.find(
        (s) => s.assignment_id === assign.id,
      );
      const rawScore = scoreRecord ? Number(scoreRecord.score) : 0;
      const max = Number(assign.maxScore) || 100;
      const weight = Number(assign.weight) || 0;

      const weighted = (rawScore / max) * weight;

      // เก็บประวัติคะแนนแยกตามหมวดหมู่
      if (!categoryBreakdown[assign.category]) {
        categoryBreakdown[assign.category] = { earned: 0, possible: 0 };
      }
      categoryBreakdown[assign.category].earned += weighted;
      categoryBreakdown[assign.category].possible += weight;

      totalWeightedScore += weighted;
    });

    // 5. ตัดเกรด
    const finalGrade =
      gradeSettings.find((g) => totalWeightedScore >= Number(g.score))?.grade ||
      "F";

    res.json({
      info: {
        id: student.id,
        code: student.student_code,
        name: `${student.first_name} ${student.last_name}`,
      },
      summary: {
        totalScore: Number(totalWeightedScore.toFixed(2)),
        grade: finalGrade,
      },
      categories: categoryBreakdown, // เพื่อเอาไปทำกราฟ Radar หรือ Bar รายบุคคล
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
