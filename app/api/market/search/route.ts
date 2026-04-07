import { NextRequest, NextResponse } from "next/server";
import { MarketSearchResponse } from "@/lib/market-types";
import { searchMarketUniverse } from "@/lib/market-search";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "30");
    const limit = clamp(Number.isFinite(limitParam) ? limitParam : 30, 1, 100);

    if (!query) {
      const emptyResponse: MarketSearchResponse = {
        query: "",
        total: 0,
        results: []
      };

      return NextResponse.json(emptyResponse);
    }

    const results = await searchMarketUniverse(query, limit);
    const payload: MarketSearchResponse = {
      query,
      total: results.length,
      results
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to search market symbols"
      },
      { status: 500 }
    );
  }
}
