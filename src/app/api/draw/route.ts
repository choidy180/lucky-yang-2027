import { handleDraw, methodNotAllowed } from "@/lib/event";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleDraw(request);
}

const notAllowed = (): Response => methodNotAllowed("POST");
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
