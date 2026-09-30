import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/currency/exchange-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getExchangeRates();
    return NextResponse.json({
      success: true,
      rates: data.rates,
      lastUpdated: data.lastUpdated,
      source: data.source,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}
