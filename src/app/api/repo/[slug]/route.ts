import { NextResponse } from "next/server";
import { getRepoData, getBranches } from "@/lib/github";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const VALID_SLUG = /^[a-zA-Z0-9._-]{1,100}$/;

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;

  if (!VALID_SLUG.test(slug)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const [data, branches] = await Promise.all([
      getRepoData(slug),
      getBranches(slug).catch(() => []),
    ]);
    return NextResponse.json({ data, branches }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
