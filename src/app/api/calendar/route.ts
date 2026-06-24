import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const durationParam = request.nextUrl.searchParams.get("duration");

    if (!dateParam) {
      return NextResponse.json({ error: "date parameter is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const date = new Date(dateParam);
    const duration = Number.parseInt(durationParam ?? "45", 10);

    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const slots = await getAvailableSlots(date, duration);

    return NextResponse.json({
      data: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Calendar availability error:", error);
    return NextResponse.json({ error: "Failed to get availability" }, { status: 500 });
  }
}
