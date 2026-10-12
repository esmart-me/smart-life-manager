// src/app/api/utilities/exchange-rates/route.ts
// Live currency rates endpoint with force-refresh and truthful status reporting

import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/currency/exchange-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    const data = await getExchangeRates(force);

    return NextResponse.json({
      success: true,
      rates: data.rates,
      lastUpdated: data.lastUpdated,
      source: data.source,
      provider: data.provider,
      timestamp: data.timestamp,
      isStaleFallback: data.isStaleFallback || false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}
