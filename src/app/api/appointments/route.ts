import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AppointmentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);

  const where: Record<string, unknown> = {};

  if (status) where.status = status;

  if (dateFrom || dateTo) {
    where.startTime = {};
    if (dateFrom) (where.startTime as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.startTime as Record<string, unknown>).lte = new Date(dateTo);
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { lead: { select: { name: true, phone: true, email: true } } },
      orderBy: { startTime: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json({
    data: appointments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id: string;
      status?: AppointmentStatus;
      notes?: string;
    };

    const appointment = await prisma.appointment.update({
      where: { id: body.id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ data: appointment });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}
