import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const calibrationPath = path.join(
  process.cwd(),
  "public",
  "calibration",
  "prototype-wall-unit-calibration.json"
);

function isCalibrationPayload(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    photo?: unknown;
    layout?: unknown;
    masks?: unknown;
    tapes?: unknown;
  };

  return Boolean(
    candidate.photo &&
      candidate.layout &&
      candidate.masks &&
      Array.isArray(candidate.tapes) &&
      candidate.tapes.length > 0
  );
}

export async function GET() {
  try {
    const text = await readFile(calibrationPath, "utf8");
    return new NextResponse(text, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "No saved calibration found." }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;

  if (!isCalibrationPayload(body)) {
    return NextResponse.json({ error: "Invalid calibration payload." }, { status: 400 });
  }

  await mkdir(path.dirname(calibrationPath), { recursive: true });
  await writeFile(calibrationPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");

  return NextResponse.json({
    ok: true,
    path: "/calibration/prototype-wall-unit-calibration.json"
  });
}
