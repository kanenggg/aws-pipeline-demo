import { Router } from "express";
//import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

import {
  getCloScorePerStudentPerCourse,
  getCloScorePerCourse,
  getCloScoreAllStudentPerCourse,
  getCloPercentageAllStudentPerCourse,
  getCloStatsPerCourse,
  getCloStatsPercentagePerCourse,
  getCloGradeSummaryPerCourse,
  getRealScorePerStudentPerCourse,
  getRealScoreAllStudentPerCourse,
  getRealScorePercentageAllStudentPerCourse,
  getTotalScoreAndGradePerStudentPerCourse,
  getTotalScoreAndGradeAllStudentPerCourse,
  getRealScoreStatsPerCourse,
  getRealScoreStatsPercentagePerCourse,
  getGradeSummaryPerCourse,
  getPloScorePerStudentPerCourse,
  getPloScorePerCourse,
  getPloScoreAllStudentPerCourse,
  getPloPercentageAllStudentPerCourse,
  getPloScorePerProgram,
  getPloScorePerStudentFromAllCourse,
  getPloProgramWhereScoreComeFrom,
  getPloStatsPerCourse,
  getPloStatsPercentagePerCourse,
  getPloStatsPerProgram,
  getCloBestWorstPerStudentPerCourse,
  getCloBestWorstPerCourse,
  getCloBestWorstPerCoursePercentage,
  getPloBestWorstPerStudentPerCourse,
  getPloBestWorstPerCourse,
  getPloBestWorstPerProgram,
} from "../service/calculation.service";

const prisma = new PrismaClient();
const router = Router();

//---------------------------------------------------------------------------------------------------------------------------------------------------------------
// น่าจะได้ใช้
//---------------------------------------------------------------------------------------------------------------------------------------------------------------

// CLO
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student 1 คน ใน 1 course
// GET http://localhost:9771/api/calculation/ass-clo/studentCourse?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/studentCourse", authenticateToken, async (req, res) => {
  const { studentId, courseId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getCloScorePerStudentPerCourse(
        tx,
        Number(studentId),
        Number(courseId),
      );
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ใน 1 course (รวมคะแนนของนักศึกษาทุกคนใน course)
// GET http://localhost:9771/api/calculation/ass-clo/course?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/course", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    // TRANSACTION
    const resultCloCourse = await prisma.$transaction(async (tx) => {
      return await getCloScorePerCourse(tx, Number(courseId));
    });

    res.json(resultCloCourse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student แต่ละคน ใน 1 course (ส่งกลับค่า clo ของนักเรียนแต่ละคนทุกคนทีเดียว)
// GET http://localhost:9771/api/calculation/ass-clo/allStudentCourse?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/allStudentCourse", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloScoreAllStudentPerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo ของนักเรียนแต่ละคนออกมาเป็น percentage
// GET http://localhost:9771/api/calculation/ass-clo/allStudentCourse/percentage?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/allStudentCourse/percentage", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloPercentageAllStudentPerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ min, max, mean, median, highestPossible ของ clo แต่ละตัว ใน 1 course
// GET http://localhost:9771/api/calculation/ass-clo/course/stats?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/course/stats", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloStatsPerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// แปลง cloStats ให้เป็นเปอร์เซ็นต์
// GET http://localhost:9771/api/calculation/ass-clo/course/stats/percentage?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/course/stats/percentage", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloStatsPercentagePerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// สรุปจำนวน student ต่อเกรด, ค่าเฉลี่ยคะแนน clo ต่อเกรด, ผลรวมของค่าเฉลี่ย
// ตารางฟ้าใน TABEE
// GET http://localhost:9771/api/calculation/ass-clo/gradeSummary?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/gradeSummary", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloGradeSummaryPerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// realScore
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณคะแนนรวม และเกรดของ 1 นักเรียนใน 1 course
// GET http://localhost:9771/api/calculation/realScoreAndGrade/studentCourse?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/realScoreAndGrade/studentCourse",
  authenticateToken,
  async (req, res) => {
    const { studentId, courseId } = req.query;
    try {
      const resultCloPerStudent = await prisma.$transaction(async (tx) => {
        return await getTotalScoreAndGradePerStudentPerCourse(
          tx,
          Number(studentId),
          Number(courseId),
        );
      });

      res.json(resultCloPerStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// คำนวณคะแนนรวม และเกรดของนักเรียนทุกคนใน 1 course และ mean ของทั้ง course
// GET http://localhost:9771/api/calculation/realScoreAndGrade/allStudentCourse?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/realScoreAndGrade/allStudentCourse",
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.query;
    try {
      const resultCloPerStudent = await prisma.$transaction(async (tx) => {
        return await getTotalScoreAndGradeAllStudentPerCourse(
          tx,
          Number(courseId),
        );
      });

      res.json(resultCloPerStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore ของนักเรียนแต่ละคนออกมาเป็น percentage
// GET http://localhost:9771/api/calculation/realScoreAndGrade/allStudentCourse/percentage?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/realScoreAndGrade/allStudentCourse/percentage", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getRealScorePercentageAllStudentPerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ min, max, mean, median, highestPossible ของแต่ละ category ใน 1 course
// GET http://localhost:9771/api/calculation/realScoreAndGrade/stats?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/realScoreAndGrade/stats", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getRealScoreStatsPerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// แปลง realScoreStats ให้เป็นเปอร์เซ็นต์
// GET http://localhost:9771/api/calculation/realScoreAndGrade/stats/percentage?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/realScoreAndGrade/stats/percentage", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getRealScoreStatsPercentagePerCourse(tx, Number(courseId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// สรุปจำนวน student ต่อเกรด, ค่าเฉลี่ยคะแนน category ต่อเกรด, ผลรวมของค่าเฉลี่ย
// ตารางเหลืองใน TABEE
// GET http://localhost:9771/api/calculation/realScoreAndGrade/gradSummary?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/realScoreAndGrade/gradSummary",
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.query;
    try {
      const resultCloPerStudent = await prisma.$transaction(async (tx) => {
        return await getGradeSummaryPerCourse(tx, Number(courseId));
      });

      res.json(resultCloPerStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

// PLO
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student 1 คนใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/studentCourse?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/studentCourse", authenticateToken, async (req, res) => {
  const { studentId, courseId } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScorePerStudentPerCourse(
        tx,
        Number(studentId),
        Number(courseId),
      );
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/course?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/course", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultPloCourse = await prisma.$transaction(async (tx) => {
      return await getPloScorePerCourse(tx, Number(courseId));
    });

    res.json(resultPloCourse);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/allStudentCourse?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentCourse", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScoreAllStudentPerCourse(tx, Number(courseId));
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ PLO ของนักเรียนแต่ละคนออกมาเป็น percentage
// GET http://localhost:9771/api/calculation/clo-plo/allStudentCourse/percentage?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentCourse/percentage", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloPercentageAllStudentPerCourse(tx, Number(courseId));
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 program
// GET http://localhost:9771/api/calculation/clo-plo/program?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/program", authenticateToken, async (req, res) => {
  const { programId } = req.query;
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await getPloScorePerProgram(tx, Number(programId));
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// คำนวณ PLO แต่ละตัว ของ student 1 คน (รวมทุก course ที่เรียน)
// GET http://localhost:9771/api/calculation/clo-plo/studentAllCourse?studentId=ไอดีนักศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/studentAllCourse", authenticateToken, async (req, res) => {
  const { studentId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScorePerStudentFromAllCourse(tx, Number(studentId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// หาว่า PLO แต่ละตัวได้คะแนนมาจาก course ไหนบ้าง และ course ละเท่าไหร่
// GET http://localhost:9771/api/calculation/clo-plo/wherePloComeFrom?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/wherePloComeFrom", authenticateToken, async (req, res) => {
  const { programId } = req.query;
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await getPloProgramWhereScoreComeFrom(tx, Number(programId));
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/course/stats?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/course/stats", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerCourse(tx, Number(courseId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// แปลง ploStats ให้เป็นเปอร์เซ็นต์ 
// GET http://localhost:9771/api/calculation/clo-plo/course/stats/percentage?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/course/stats/percentage", authenticateToken, async (req, res) => {
  const { courseId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPercentagePerCourse(tx, Number(courseId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean ของ PLO แต่ละตัว ใน 1 program
// GET http://localhost:9771/api/calculation/clo-plo/program/stats?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/program/stats", authenticateToken, async (req, res) => {
  const { programId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerProgram(tx, Number(programId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//---------------------------------------------------------------------------------------------------------------------------------------------------------------
// น่าจะไม่ได้ใช้
//---------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 student 1 course
// GET http://localhost:9771/api/calculation/ass-clo/studentCourse/bestWorstMean?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/ass-clo/studentCourse/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { studentId, courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getCloBestWorstPerStudentPerCourse(
          tx,
          Number(studentId),
          Number(courseId),
        );
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course
// GET http://localhost:9771/api/calculation/ass-clo/course/bestWorstMean?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/ass-clo/course/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getCloBestWorstPerCourse(tx, Number(courseId));
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course แบบ percentage
// GET http://localhost:9771/api/calculation/ass-clo/course/bestWorstMean/percentage?courseId=ไอดีวิชา
//
/////////////////////////////////////////////////////////////////////////
/*router.get("/ass-clo/course/bestWorstMean/percentage", authenticateToken, async (req, res) => {
  
  const {courseId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getCloBestWorstPerCoursePercentage(tx, Number(courseId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});*/

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ plo ตัวไหน และ Mean จาก plo ทุกตัวคือเท่าไหร่ ใน 1 student 1 course
// GET http://localhost:9771/api/calculation/clo-plo/studentCourse/bestWorstMean?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/clo-plo/studentCourse/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { studentId, courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getPloBestWorstPerStudentPerCourse(
          tx,
          Number(studentId),
          Number(courseId),
        );
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/course/bestWorstMean?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/clo-plo/course/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getPloBestWorstPerCourse(tx, Number(courseId));
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 program
// GET http://localhost:9771/api/calculation/clo-plo/program/bestWorstMean?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////////////////

router.get(
  "/clo-plo/program/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { programId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getPloBestWorstPerProgram(tx, Number(programId));
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

export default router;
