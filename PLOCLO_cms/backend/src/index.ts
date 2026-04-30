// server.ts (หรือ index.ts ของ express)

import dotenv from "dotenv";
dotenv.config(); // ต้องอยู่บรรทัดบนสุด

import express from "express";
import morgan from "morgan";
import cors from "cors";
import usersRouter from "./routes/users";
import programRoutes from "./routes/program";
import facultyRoutes from "./routes/faculty";
import ploRoutes from "./routes/plo";
import courseRoutes from "./routes/course";
import univisityRoutes from "./routes/university";
import cloRoutes from "./routes/clo";
import studentRoutes from "./routes/student";
import { seedAdminUser } from "./routes/seed";
import mappingRoutes from "./routes/mapping";
import assignmentRoutes from "./routes/assignment";
import studentOnCoureseRoutes from "./routes/studentOnCourse";
import authRoutes from "./routes/auth";
import scoreRoutes from "./routes/score";
import gradeSettingRoutes from "./routes/grade";
import Calculate from "./routes/calculation";
import Instructor from "./routes/instuctor";
import instructorOnCOurseRoutes from "./routes/InstructorOnCourse";
import scoreCalculate from "./routes/reports";
import programOnCourseRoutes from "./routes/programOnCourse";

import passport from "passport";
import "./config/passport"; // Import ไฟล์ตั้งค่าที่เราสร้างไว้

const app = express();
app.use(morgan("dev"));
app.use(express.json());

// ✅ อนุญาต CORS จาก frontend
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(passport.initialize());

app.use("/api/users", usersRouter);
app.use("/api/program", programRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/plo", ploRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/university", univisityRoutes);
app.use("/api/clo", cloRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/mapping", mappingRoutes);
app.use("/api/assignment", assignmentRoutes);
app.use("/api/studentOnCourse", studentOnCoureseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/score", scoreRoutes);
app.use("/api/grade", gradeSettingRoutes);
app.use("/api/calculation", Calculate);
app.use("/api/instructor", Instructor);
app.use("/api/instructorOnCourse", instructorOnCOurseRoutes);
app.use("/api/reports", scoreCalculate);
app.use("/api/programOnCourse", programOnCourseRoutes);

app.listen(3001, async () => {
  await seedAdminUser();
  console.log("API on " + process.env.NEXT_PUBLIC_API_URL);
});
