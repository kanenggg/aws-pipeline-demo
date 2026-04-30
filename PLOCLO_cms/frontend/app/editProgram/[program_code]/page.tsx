// app/editProgram/[program_code]/page.tsx (Server Component by default)
import ProtectedRoute from "@/components/ProtectedRoute";
import EditProgramClient from "./EditProgramClient";

// This is the default Server Component structure
export default function EditProgramPage({
  params,
}: {
  params: { program_code: string };
}) {
  const program_code = params.program_code;
  return (
    <ProtectedRoute roles={["system_admin", "Super_admin"]}>
      <div className="max-w-[1400px] h-full flex flex-col mx-auto">
        <EditProgramClient programCode={program_code} />
      </div>
    </ProtectedRoute>
  );
}
