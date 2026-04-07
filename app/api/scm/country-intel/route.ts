import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildCountryIntel } from "@/lib/country-intel";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  country: z.string().trim().min(2).max(80)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.parse(body);
    const payload = await buildCountryIntel(parsed.country);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to build the country market picture right now."
      },
      {
        status: 400
      }
    );
  }
}
