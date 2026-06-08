import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
} from "@/db/schema";
import {
  deleteVisitorConsent,
  getVisitorCookies,
  newVisitorId,
  pickCookiePatch,
  prefsFromAction,
  purgeExpiredConsents,
  upsertVisitorCookies,
} from "@/db/utils/cookies";
import { isConsentExpired } from "@/db/utils/consent-retention";

function visitorCookieOpts(maxAge = VISITOR_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function clearVisitorCookie(res: NextResponse) {
  res.cookies.set(VISITOR_COOKIE, "", { ...visitorCookieOpts(0), maxAge: 0 });
}

export async function GET() {
  try {
    await purgeExpiredConsents();
    const jar = await cookies();
    const visitorId = jar.get(VISITOR_COOKIE)?.value;
    if (!visitorId) {
      return NextResponse.json({ decided: false, cookies: null });
    }
    const prefs = await getVisitorCookies(visitorId);
    if (!prefs?.decided) {
      return NextResponse.json({ decided: false, cookies: null });
    }
    return NextResponse.json({ decided: true, cookies: prefs });
  } catch {
    return NextResponse.json({ decided: false, cookies: null, offline: true });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;
    if (action !== "accept" && action !== "deny" && action !== "modify") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const jar = await cookies();
    let visitorId = jar.get(VISITOR_COOKIE)?.value;
    const created = !visitorId;
    if (!visitorId) visitorId = newVisitorId();

    if (!created && visitorId) {
      const existing = await getVisitorCookies(visitorId);
      if (existing && isConsentExpired(existing)) {
        await deleteVisitorConsent(visitorId);
      }
    }

    const prefs = prefsFromAction(action, pickCookiePatch(body));
    const saved = await upsertVisitorCookies(visitorId, prefs);

    const res = NextResponse.json({ decided: !!saved.decided, cookies: saved });
    res.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOpts());
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save consent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
