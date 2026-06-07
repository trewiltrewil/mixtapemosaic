import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = request.headers.get("x-sanity-secret") || new URL(request.url).searchParams.get("secret");
  if (!process.env.SANITY_REVALIDATE_SECRET || secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid revalidation secret." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { _type?: string; slug?: { current?: string } } | null;
  const type = body?._type;
  const slug = body?.slug?.current;

  revalidateTag("sanity", "max");
  revalidatePath("/");
  revalidatePath("/customize");
  revalidatePath("/gallery");
  revalidatePath("/journal");
  revalidatePath("/faq");
  revalidatePath("/process");
  revalidatePath("/contact");

  if (type === "journalPost" && slug) {
    revalidatePath(`/journal/${slug}`);
  }
  if (type === "page" && slug) {
    revalidatePath(slug === "home" ? "/" : `/${slug}`);
  }

  return NextResponse.json({ revalidated: true, type, slug });
}
