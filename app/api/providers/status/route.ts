import { NextResponse } from "next/server";
import { getActiveProviderNames } from "@/providers";

export async function GET() {
  return NextResponse.json(getActiveProviderNames());
}
