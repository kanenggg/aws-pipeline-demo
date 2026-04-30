import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";
import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

router.post("/auth/google/verify", async (req, res) => {
  const { token } = req.body;
  try {
    // 1. ตรวจสอบ Token กับ Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email)
      return res.status(400).json({ error: "Invalid Google Token" });

    const email = payload.email;
    const googleName = payload.name; // Full name from Google (e.g. "John Doe")

    // 2. หา User ในระบบ
    let result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    let user = result.rows[0];

    // 3. ถ้ายังไม่มี User ให้สร้างใหม่ (พร้อมเช็ค Role)
    if (!user) {
      const nameCheck = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [googleName],
      );
      if (nameCheck.rows.length > 0) {
        // หากซ้ำ ให้ส่ง 409 Conflict กลับไปเพื่อให้ Frontend แจ้งเตือน
        return res.status(409).json({
          error: "Username already exists",
          message: `The name "${googleName}" is already taken in our system. Please contact admin.`,
        });
      }
      let role = "guest"; // Default role

      // --- NEW LOGIC: Check if Google Name matches a Student ---
      // We assume Google Name is "FirstName LastName"
      // We compare it against the concatenation of first_name and last_name in DB
      const studentCheck = await pool.query(
        `SELECT id FROM student 
         WHERE LOWER(email) = $1 
         LIMIT 1`,
        [email.toLowerCase()],
      );

      const instructorCheck = await pool.query(
        `SELECT id FROM instructor 
         WHERE LOWER(email) = $1 
         LIMIT 1`,
        [email.toLowerCase()],
      );

      if (instructorCheck.rows.length > 0) {
        role = "instructor"; // Found a match!
      }

      if (studentCheck.rows.length > 0) {
        role = "student"; // Found a match!
      }
      // ---------------------------------------------------------

      const newUser = await pool.query(
        "INSERT INTO users (username, email, role) VALUES ($1, $2, $3) RETURNING *",
        [googleName, email, role],
      );
      user = newUser.rows[0];
    }

    // 4. สร้าง JWT ของระบบเราส่งกลับไป
    const jwtToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!, // Don't forget to handle undefined in TS usually
      { expiresIn: "2hr" },
    );

    res.json({ token: jwtToken, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Google verification failed" });
  }
});

// ===== REGISTER (Fixed for consistency with Google Verify) =====
router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // 1. ตรวจสอบข้อมูลบังคับ (Username และ Email ห้ามว่าง)
    if (!email || !username) {
      return res.status(400).json({ error: "Username and email are required" });
    }

    // 2. จัดการรหัสผ่าน: ถ้าเป็น null หรือไม่มีค่ามา จะบันทึกเป็น null
    let hashedPassword = null;
    if (password !== null && password !== undefined && password !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 3. ใช้ SQL Upsert เพื่อเพิ่มหรืออัปเดตข้อมูลผู้ใช้
    // หมายเหตุ: Schema ของคุณกำหนด username เป็น @unique ดังนั้นถ้า username ซ้ำจะเกิด conflict เช่นกัน
    const query = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET 
        username = EXCLUDED.username, 
        role = EXCLUDED.role,
        password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash)
      RETURNING id, username, email, role, created_at;
    `;

    const result = await pool.query(query, [
      username,
      email,
      hashedPassword, // ส่งค่า null ได้เพราะ Prisma Schema ของคุณเป็น String?
      role || "guest", // ใช้ค่าเริ่มต้นจาก Schema คือ "guest" หากไม่ได้ส่งมา
    ]);

    const user = result.rows[0];

    // 4. สร้าง JWT Token
    const jwtToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1hr" },
    );

    res.status(201).json({
      token: jwtToken,
      user: user,
    });
  } catch (err: any) {
    // กรณี Error 500 ส่วนใหญ่มักเกิดจาก Username ซ้ำ (เนื่องจากตั้งเป็น @unique)
    console.error("REGISTER ERROR:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ===== LOGIN =====
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid Username" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid Password" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "1hr" },
    );

    // ✅ ส่งทั้ง token และ user ข้อมูลหลัก
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== CURRENT USER (/me) =====
// 🟢 ต้องมาก่อน /:id ไม่งั้นจะ conflict
router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const result = await pool.query(
    "SELECT id, username, email, role, created_at FROM users WHERE id=$1",
    [userId],
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: "User not found" });

  res.json(result.rows[0]);
});

// ===== USERS CRUD (PROTECTED) =====

// Get all users
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    let query: string;

    // ✅ Fix: Explicitly type the array
    let values: (string | number | boolean | null)[] = [];

    if (role) {
      // TypeScript now knows 'role' (string) is allowed in this array
      query =
        "SELECT id, username, email, role, created_at FROM users WHERE role = $1 ORDER BY id";
      values = [role as string];
    } else {
      query =
        "SELECT id, username, email, role, created_at FROM users ORDER BY id";
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get user by ID
router.get("/:id", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.params.id;
  const result = await pool.query(
    "SELECT id, username, email, role, created_at FROM users WHERE id=$1",
    [userId],
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: "User not found" });
  res.json(result.rows[0]);
});

// instructor และ admin ใช้ได้
router.get(
  "/users",
  authenticateToken,
  authorizeRoles("Super_admin", "system_admin", "instructor"),
  (req, res) => {
    res.json({ message: "Welcome instructor/admin" });
  },
);

// Delete user
router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.params.id;
  const result = await pool.query(
    "DELETE FROM users WHERE id=$1 RETURNING id, username",
    [userId],
  );
  if (result.rows.length === 0)
    return res.status(404).json({ error: "User not found" });
  res.json({ message: `User deleted: ${result.rows[0].username}` });
});

// Update user by ID
router.patch("/:id", authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { username, email, role, password } = req.body;
  const requester = req.user;
  const allowedRoles = ["Super_admin", "system_admin"];

  try {
    // 1. 🔒 Permission Check: เฉพาะ Admin เท่านั้นที่เข้าถึงได้
    if (!allowedRoles.includes(requester?.role)) {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    // 2. 🔍 ค้นหาข้อมูลเดิมจาก Database
    const userQuery = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const current = userQuery.rows[0];

    // 3. 🔐 จัดการรหัสผ่าน (ถ้ามีการส่ง password มาให้ทำการ Hash ใหม่)
    let hashedPassword = current.password_hash;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 4. ✅ อัปเดตข้อมูลแบบ Dynamic
    // ใช้ค่าใหม่ถ้าส่งมา (||) ถ้าไม่ส่งมาให้ใช้ค่าเดิมจาก 'current'
    const result = await pool.query(
      `UPDATE users 
       SET username=$1, email=$2, password_hash=$3, role=$4 
       WHERE id=$5 
       RETURNING id, username, email, role, created_at`,
      [
        username || current.username,
        email || current.email,
        hashedPassword,
        role || current.role,
        id,
      ],
    );

    res.json({
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error at PATCH /users/:id:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
