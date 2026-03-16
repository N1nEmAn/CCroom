import { NextResponse } from "next/server";
import { bootstrapAdapters } from "@/lib/runtimes/bootstrap";
import { getAllHealthStatuses } from "@/lib/runtimes/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  bootstrapAdapters();
  const statuses = await getAllHealthStatuses();
  return NextResponse.json(statuses);
}
