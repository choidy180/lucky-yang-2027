import { handleEvent, methodNotAllowed } from "@/lib/event";

// The answer depends on the current time and EVENT_MODE, so never prerender or cache it.
export const dynamic = "force-dynamic";

export function GET(): Response {
  return handleEvent();
}

const notAllowed = (): Response => methodNotAllowed("GET");
export { notAllowed as POST, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
