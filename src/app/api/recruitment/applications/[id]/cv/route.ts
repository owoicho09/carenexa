import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "RECRUITER") {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;
  const application = await db.application.findFirst({
    where: { id, hospitalId: session.hospitalId },
    select: { cvFileData: true, cvFileName: true, cvFileMimeType: true },
  });
  if (!application?.cvFileData) return NextResponse.json({ error: "No CV file on this application." }, { status: 404 });

  return new NextResponse(new Uint8Array(application.cvFileData), {
    headers: {
      "Content-Type": application.cvFileMimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${application.cvFileName ?? "cv"}"`,
    },
  });
}
