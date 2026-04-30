import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getPloReport = async (req: any, res: any) => {
  const { courseId } = req.query;
};
