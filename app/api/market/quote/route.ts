import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/market-data";

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const quote = await getQuote(symbol);

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch quote"
      },
      { status: 500 }
    );
  }
}
