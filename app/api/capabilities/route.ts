import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllAdapters } from "@/lib/runtimes/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  bootstrapAdapters();
  const capabilities = getAllAdapters().map((a) => a.capabilities);
  return NextResponse.json(capabilities);
}
