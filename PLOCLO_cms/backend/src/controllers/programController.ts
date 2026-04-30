import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const duplicateProgram = async (req: Request, res: Response) => {
  const {
    program_code,
    program_year,
    program_name_en,
    program_name_th,
    program_shortname_en,
    program_shortname_th,
    faculty_id,
    copy_from_id, // The ID of the old program to copy data from
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the new Program Variant
      const newProgram = await tx.program.create({
        data: {
          program_code,
          program_year: Number(program_year),
          program_name_en,
          program_name_th,
          program_shortname_en,
          program_shortname_th,
          faculty_id: Number(faculty_id),
        },
      });

      // 2. If copy_from_id is provided, clone the PLOs and Course Mappings
      if (copy_from_id) {
        // Fetch all PLOs from the old program
        const oldPlos = await tx.plo.findMany({
          where: { program_id: Number(copy_from_id) },
        });

        // Create new PLOs for the new program
        for (const plo of oldPlos) {
          await tx.plo.create({
            data: {
              code: plo.code,
              engname: plo.engname,
              name: plo.name,
              program_id: newProgram.id, // Link to the NEW program
              // If you have a many-to-many relationship with courses:
            },
          });
        }
      }

      return newProgram;
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Duplication Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to duplicate program data" });
  }
};
