"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, CalendarDays, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusStyles: Record<string, string> = {
  new: "info", contacted: "default", engaged: "warning",
  scheduled: "success", completed: "secondary", no_show: "danger",
  lost: "danger", follow_up: "warning",
};

const statusLabels: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", engaged: "En conversación",
  scheduled: "Agendado", completed: "Completado", no_show: "No asistió",
  lost: "Perdido", follow_up: "Seguimiento",
};

const procedureLabels: Record<string, string> = {
  vejez_legal: "Vejez legal", vejez_anticipada: "Vejez anticipada",
  sobrevivencia: "Sobrevivencia", invalidez: "Invalidez",
  trabajo_pesado: "Trabajo pesado", no_sabe: "No sabe",
};

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  afp: string | null;
  estimatedFunds: string | null;
  procedureType: string | null;
  region: string | null;
  status: string;
  source: string | null;
  createdAt: string;
  _count: { conversations: number; appointments: number };
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ data: Lead[] }>({
    queryKey: ["leads", search],
    queryFn: () =>
      fetch(`/api/leads?${search ? `q=${encodeURIComponent(search)}` : ""}`).then((r) => r.json()),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-muted-foreground">Gestiona los clientes que han contactado</p>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Buscar por nombre, teléfono, AFP, región..."
          className="pl-10 h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando leads...</p>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">AFP / Fondos</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Trámite</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Región</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <Link href={`/dashboard/leads/${lead.id}`} className="font-medium hover:text-primary">
                        {lead.name ?? "Sin nombre"}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.source === "meta_ads" ? "Meta Ads" : lead.source ?? "Directo"}
                      </p>
                    </td>
                    <td className="p-4">
                      {lead.afp ? (
                        <div>
                          <span className="text-sm font-medium">{lead.afp}</span>
                          {lead.estimatedFunds && (
                            <p className="text-xs text-muted-foreground">{lead.estimatedFunds}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {lead.procedureType ? (
                        <span className="text-sm">{procedureLabels[lead.procedureType] ?? lead.procedureType}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {lead.region ? (
                        <span className="text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {lead.region}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={(statusStyles[lead.status] ?? "default") as any}>
                        {statusLabels[lead.status] ?? lead.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs">{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{lead._count.conversations} msgs</span>
                        {lead._count.appointments > 0 && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {lead._count.appointments}
                          </span>
                        )}
                        <span>{format(new Date(lead.createdAt), "d MMM", { locale: es })}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No hay leads aún. Cuando lleguen leads de Meta Ads o WhatsApp, aparecerán aquí.
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
