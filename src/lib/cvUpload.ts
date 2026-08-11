import "server-only";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a CV, small enough to store as a DB column

export type CvFile = { name: string; mimeType: string; data: Uint8Array<ArrayBuffer> };

// Reads and validates the "cvFile" entry from a submitted FormData. Returns
// an error string on failure, or the file ready to persist on success.
export async function readCvFile(formData: FormData): Promise<{ file?: CvFile; error?: string }> {
  const entry = formData.get("cvFile");
  if (!(entry instanceof File) || entry.size === 0) {
    return { error: "Attach your CV as a PDF or Word document." };
  }
  if (!ALLOWED_MIME_TYPES.has(entry.type)) {
    return { error: "CV must be a PDF or Word document (.pdf, .doc, .docx)." };
  }
  if (entry.size > MAX_SIZE_BYTES) {
    return { error: "CV file is too large — 5MB maximum." };
  }
  const data = new Uint8Array(await entry.arrayBuffer());
  return { file: { name: entry.name, mimeType: entry.type, data } };
}
