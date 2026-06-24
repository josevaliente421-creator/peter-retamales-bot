import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalLeads,
    newLeadsToday,
    scheduledAppointments,
    totalAppointments,
    activeConversations,
    followUpLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: today } } }),
    prisma.appointment.count({
      where: {
        startTime: { gte: today, lt: tomorrow },
        status: { in: ["scheduled", "confirmed"] },
      },
    }),
    prisma.appointment.count(),
    prisma.conversation.count({ where: { isActive: true } }),
    prisma.lead.count({ where: { status: "follow_up" } }),
  ]);

  const [
    leadsByStatus,
    appointmentsByStatus,
    afpDistribution,
    procedureTypeDistribution,
    leadsWithData,
    leadsWithoutAFP,
  ] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.appointment.groupBy({ by: ["status"], _count: true }),
    prisma.lead.groupBy({ by: ["afp"], _count: true, where: { afp: { not: null } } }),
    prisma.lead.groupBy({ by: ["procedureType"], _count: true, where: { procedureType: { not: null } } }),
    prisma.lead.count({ where: { afp: { not: null } } }),
    prisma.lead.count({ where: { afp: null } }),
  ]);

  return NextResponse.json({
    data: {
      totalLeads,
      newLeadsToday,
      scheduledAppointments,
      totalAppointments,
      activeConversations,
      followUpLeads,
      leadsWithData,
      leadsWithoutAFP,
      leadsByStatus: leadsByStatus.map((l) => ({ status: l.status, count: l._count })),
      appointmentsByStatus: appointmentsByStatus.map((a) => ({ status: a.status, count: a._count })),
      afpDistribution: afpDistribution.map((a) => ({ afp: a.afp, count: a._count })),
      procedureTypeDistribution: procedureTypeDistribution.map((p) => ({ type: p.procedureType, count: p._count })),
    },
  });
}
