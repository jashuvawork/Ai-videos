import { NextResponse } from "next/server";
import { getProviderStatus } from "@/providers";

export async function GET() {
  return NextResponse.json(await getProviderStatus());
}
