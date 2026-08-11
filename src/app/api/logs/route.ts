import { NextRequest, NextResponse } from "next/server";
import { getUrlLogs } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    
    const logs = await getUrlLogs(limit);

    return NextResponse.json(
      {
        total: logs.length,
        logs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Logs API Error]", error);
    return NextResponse.json(
      { status: 500, error: "Error fetching logs" },
      { status: 500 }
    );
  }
}
