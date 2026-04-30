import bcrypt from "bcrypt";
import { pool } from "../db"; // Import your existing db connection

export const seedAdminUser = async () => {
  try {
    const adminEmail = "admin@gmail.com";

    // 1. Check if admin already exists
    const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [
      adminEmail,
    ]);

    if (checkUser.rows.length === 0) {
      console.log("Admin not found. Creating...");

      // 2. Hash the password (just like in your register route)
      const hashedPassword = await bcrypt.hash("admin123", 10);

      // 3. Insert the admin
      await pool.query(
        "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ["Super Admin", adminEmail, hashedPassword, "Super_admin"]
      );

      console.log("✅ Admin user seeded successfully!");
    } else {
      console.log("ℹ️  Admin user already exists.");
    }
  } catch (err) {
    console.error("❌ Seeding error:", err);
  }
};
