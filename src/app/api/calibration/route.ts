import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

const calibrationFiles: Record<string, string> = {
  square: "prototype-wall-unit-calibration.json",
  landscape: "landscape-wall-unit-calibration.json"
};

function getLayout(request: Request) {
  const url = new URL(request.url);
  return (url.searchParams.get("layout") || "square").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "square";
}

function getCalibrationPath(layout: string) {
  const filename = calibrationFiles[layout];
  return filename ? path.join(process.cwd(), "public", "calibration", filename) : null;
}

function getSettingsKey(layout: string) {
  return layout === "landscape"
    ? "landscape_wall_unit_calibration"
    : layout === "square"
      ? "prototype_wall_unit_calibration"
      : `${layout}_wall_unit_calibration`;
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || Boolean(error?.message?.toLowerCase().includes("does not exist"));
}

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

export async function GET(request: Request) {
  const layout = getLayout(request);
  const calibrationPath = getCalibrationPath(layout);
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data: calibrationData, error: calibrationError } = await supabase
      .from("product_calibrations")
      .select("calibration")
      .eq("layout", layout)
      .maybeSingle();

    if (calibrationData?.calibration && isCalibrationPayload(calibrationData.calibration)) {
      return NextResponse.json(calibrationData.calibration, {
        headers: {
          "cache-control": "no-store"
        }
      });
    }

    if (calibrationError && !isMissingTableError(calibrationError)) {
      return NextResponse.json({ error: calibrationError.message }, { status: 500 });
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", getSettingsKey(layout))
      .maybeSingle();

    if (legacyData?.value && isCalibrationPayload(legacyData.value)) {
      return NextResponse.json(legacyData.value, {
        headers: {
          "cache-control": "no-store"
        }
      });
    }

    if (legacyError && !isMissingTableError(legacyError)) {
      return NextResponse.json({ error: legacyError.message }, { status: 500 });
    }
  }

  if (calibrationPath) {
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

  return NextResponse.json({ error: "No saved calibration found." }, { status: 404 });
}

export async function POST(request: Request) {
  const layout = getLayout(request);
  const calibrationPath = getCalibrationPath(layout);
  const body = (await request.json()) as unknown;

  if (!isCalibrationPayload(body)) {
    return NextResponse.json({ error: "Invalid calibration payload." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("product_calibrations")
      .upsert({
        layout,
        calibration: body,
        source: "admin",
        updated_at: updatedAt
      })
      .select("updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Supabase calibration save failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      source: "supabase",
      path: `supabase:product_calibrations/${layout}`,
      updated_at: data?.updated_at ?? updatedAt
    });
  }

  try {
    if (calibrationPath) {
      await mkdir(path.dirname(calibrationPath), { recursive: true });
      await writeFile(calibrationPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
    }
  } catch {
    // Vercel deployments are read-only at runtime; Supabase is the durable path there.
  }

  return NextResponse.json({
    ok: true,
    source: "filesystem",
    path: calibrationPath ? `/calibration/${calibrationFiles[layout]}` : `memory:${layout}`
  });
}
