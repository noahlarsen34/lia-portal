import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const oldTutoringEditMatch = request.nextUrl.pathname.match(
    /^\/teacher\/classes\/([^/]+)\/tutoring\/([^/]+)\/edit$/,
  );

  if (oldTutoringEditMatch) {
    const [, classId, logId] = oldTutoringEditMatch;
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = `/teacher/classes/${classId}/tutoring`;
    redirectUrl.searchParams.set("editLogId", logId);

    return NextResponse.redirect(redirectUrl);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
