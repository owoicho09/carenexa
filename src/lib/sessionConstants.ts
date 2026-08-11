// Kept dependency-free (no Prisma import) so middleware — which runs on the
// Edge runtime — can use it without pulling in the Node-only Prisma client.
export const SESSION_COOKIE = "carenexa_session";
