import { NextRequest, NextResponse } from "next/server";
import { saveUrlLog } from "@/lib/db";

export const dynamic = "force-dynamic";

async function handleRecordRequest(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const paramsObj: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      paramsObj[key] = value;
    });

    // Extract request details
    const queryString = url.search || "";
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const timestamp = new Date().toISOString();

    // 🌟 REGISTRO DIRECTO EN VERCEL LOGS (Console Output)
    console.log("[URL_PARAM_RECORDER]", JSON.stringify({
      timestamp,
      queryString,
      params: paramsObj,
      ip,
      userAgent,
    }, null, 2));

    // Intenta guardar en BD si existe configuración, pero no es obligatoria
    const savedLog = await saveUrlLog({
      params: paramsObj,
      queryString,
      ip,
      userAgent,
    });

    // Return HTTP 200 OK status
    return NextResponse.json(
      {
        status: 200,
        message: "OK",
        id: savedLog.id,
        receivedParams: paramsObj,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Route Error]", error);
    return NextResponse.json(
      { status: 500, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRecordRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRecordRequest(req);
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
