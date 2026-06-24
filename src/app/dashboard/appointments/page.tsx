"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink, MapPin } from "lucide-react";

const statusStyles: Record<string, string> = {
  scheduled: "info", confirmed: "success", completed: "secondary",
  cancelled: "danger", no_show: "danger",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendada", confirmed: "Confirmada", completed: "Realizada",
  cancelled: "Cancelada", no_show: "No asistió",
};

interface Appointment {
  id: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  googleMeetLink: string | null;
  location: string | null;
  lead: { name: string | null; phone: string; email: string | null };
}

export default function AppointmentsPage() {
  const { data, isLoading } = useQuery<{ data: Appointment[] }>({
    queryKey: ["appointments"],
    queryFn: () => fetch("/api/appointments").then((r) => r.json()),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Citas</h2>
        <p className="text-muted-foreground">Todas las reuniones agendadas por el bot</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando citas...</p>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Enlace</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((apt) => (
                  <tr key={apt.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium">{apt.lead.name ?? "Sin nombre"}</p>
                      <p className="text-sm text-muted-foreground">{apt.lead.phone}</p>
                    </td>
                    <td className="p-4 text-sm">
                      {apt.type === "video_call" ? "Videollamada" : "Presencial"}
                    </td>
                    <td className="p-4 text-sm">
                      {format(new Date(apt.startTime), "EEE d MMM yyyy", { locale: es })}
                      <br />
                      <span className="text-muted-foreground">
                        {format(new Date(apt.startTime), "HH:mm")} hrs
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={(statusStyles[apt.status] ?? "default") as any}>
                        {statusLabels[apt.status] ?? apt.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {apt.googleMeetLink ? (
                        <a href={apt.googleMeetLink} target="_blank" className="text-sm text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3.5 w-3.5" /> Meet
                        </a>
                      ) : apt.location ? (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> Oficina
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay citas agendadas aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
