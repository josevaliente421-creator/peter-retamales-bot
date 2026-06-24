"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, CalendarDays, MessageSquare, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardData {
  totalLeads: number;
  newLeadsToday: number;
  scheduledAppointments: number;
  totalAppointments: number;
  activeConversations: number;
  followUpLeads: number;
  leadsByStatus: { status: string; count: number }[];
  appointmentsByStatus: { status: string; count: number }[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 flex items-start gap-4">
      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

const statusLabels: Record<string, string> = {
  new: "Nuevos",
  contacted: "Contactados",
  engaged: "En conversación",
  scheduled: "Agendados",
  completed: "Completados",
  no_show: "No asistieron",
  lost: "Perdidos",
  follow_up: "Seguimiento",
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery<{ data: DashboardData }>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    );
  }

  const d = data?.data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Panel de Control</h2>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={d?.totalLeads ?? 0}
          icon={Users}
          subtitle={`${d?.newLeadsToday ?? 0} nuevos hoy`}
        />
        <StatCard
          title="Citas Hoy"
          value={d?.scheduledAppointments ?? 0}
          icon={CalendarDays}
          subtitle={`${d?.totalAppointments ?? 0} totales`}
        />
        <StatCard
          title="Conversaciones Activas"
          value={d?.activeConversations ?? 0}
          icon={MessageSquare}
        />
        <StatCard
          title="Seguimiento Pendiente"
          value={d?.followUpLeads ?? 0}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Leads por Estado</h3>
          <div className="space-y-3">
            {d?.leadsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {statusLabels[item.status] ?? item.status}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${d.totalLeads > 0 ? (item.count / d.totalLeads) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
            {(!d?.leadsByStatus || d.leadsByStatus.length === 0) && (
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Citas por Estado</h3>
          <div className="space-y-3">
            {d?.appointmentsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {statusLabels[item.status] ?? item.status}
                </span>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
            {(!d?.appointmentsByStatus || d.appointmentsByStatus.length === 0) && (
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
