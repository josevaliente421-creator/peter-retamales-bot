"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, Mail, CalendarDays, MessageSquare, Clock, MapPin, Landmark, DollarSign, FileText } from "lucide-react";

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

const typeLabels: Record<string, string> = { video_call: "Videollamada", in_person: "Presencial" };
const appointmentStatusLabels: Record<string, string> = {
  scheduled: "Agendada", confirmed: "Confirmada", completed: "Realizada",
  cancelled: "Cancelada", no_show: "No asistió",
};

interface LeadDetail {
  id: string; name: string | null; phone: string; email: string | null;
  rut: string | null; afp: string | null; estimatedFunds: string | null;
  procedureType: string | null; region: string | null;
  status: string; botState: string; source: string | null; notes: string | null;
  createdAt: string;
  conversations: { id: string; isActive: boolean; createdAt: string; messages: { id: string; direction: string; content: string; sentAt: string }[] }[];
  appointments: { id: string; type: string; status: string; startTime: string; googleMeetLink: string | null; location: string | null }[];
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useQuery<{ data: LeadDetail }>({
    queryKey: ["lead", id],
    queryFn: () => fetch(`/api/leads/${id}`).then((r) => r.json()),
    refetchInterval: 10_000,
  });

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;

  const lead = data?.data;
  if (!lead) return <p className="text-muted-foreground">Lead no encontrado</p>;

  const lastConversation = lead.conversations[0];
  const lastAppointment = lead.appointments[0];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{lead.name ?? "Sin nombre"}</h2>
            <Badge variant={(statusStyles[lead.status] ?? "default") as any}>
              {statusLabels[lead.status] ?? lead.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Desde {format(new Date(lead.createdAt), "d 'de' MMMM yyyy", { locale: es })} &middot; Estado bot: {lead.botState}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Datos personales */}
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Datos del Cliente</h3>
            <div className="space-y-3">
              <InfoRow icon={Phone} label="Teléfono" value={
                <a href={`https://wa.me/${lead.phone.replace("+", "")}`} target="_blank" className="hover:text-primary">
                  {lead.phone}
                </a>
              } />
              {lead.email && <InfoRow icon={Mail} label="Email" value={lead.email} />}
              {lead.rut && <InfoRow icon={FileText} label="RUT" value={lead.rut} />}
              <InfoRow icon={Landmark} label="AFP" value={lead.afp ?? "—"} />
              <InfoRow icon={DollarSign} label="Fondos aprox." value={lead.estimatedFunds ?? "—"} />
              <InfoRow icon={MapPin} label="Región" value={lead.region ?? "—"} />
              {lead.procedureType && (
                <InfoRow icon={FileText} label="Trámite" value={
                  <Badge variant="info">
                    {procedureLabels[lead.procedureType] ?? lead.procedureType}
                  </Badge>
                } />
              )}
            </div>
            {lead.notes && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">Notas internas:</p>
                <p className="text-sm mt-1">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Próxima cita */}
          {lastAppointment && (
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {lastAppointment.status === "scheduled" ? "Próxima Cita" : "Última Cita"}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(lastAppointment.startTime), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}</span>
                </div>
                <Badge variant={(statusStyles[lastAppointment.status] ?? "default") as any}>
                  {appointmentStatusLabels[lastAppointment.status] ?? lastAppointment.status}
                </Badge>
                <p className="text-sm text-muted-foreground">{typeLabels[lastAppointment.type] ?? lastAppointment.type}</p>
                {lastAppointment.googleMeetLink && (
                  <a href={lastAppointment.googleMeetLink} target="_blank" className="text-sm text-primary hover:underline block">
                    Abrir Google Meet
                  </a>
                )}
                {lastAppointment.location && (
                  <p className="text-sm text-muted-foreground">{lastAppointment.location}</p>
                )}
              </div>
            </div>
          )}

          {/* Resumen de conversación */}
          <div className="bg-card border rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-sm">Datos recopilados por el bot</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">AFP</span><span>{lead.afp ?? "⏳ Pendiente"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fondos</span><span>{lead.estimatedFunds ?? "⏳ Pendiente"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Trámite</span><span>{lead.procedureType ? (procedureLabels[lead.procedureType] ?? lead.procedureType) : "⏳ Pendiente"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Región</span><span>{lead.region ?? "⏳ Pendiente"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cita</span><span>{lastAppointment ? "✅ Agendada" : "⏳ Pendiente"}</span></div>
            </div>
          </div>
        </div>

        {/* Conversación */}
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-xl">
            <div className="p-6 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Historial de Conversación
                {lastConversation && (
                  <Badge variant={lastConversation.isActive ? "success" : "secondary"} className="ml-2">
                    {lastConversation.isActive ? "Activa" : "Cerrada"}
                  </Badge>
                )}
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {lastConversation?.messages.length ? (
                [...lastConversation.messages].map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.direction === "outbound"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.direction === "outbound" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                        {format(new Date(msg.sentAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay mensajes aún</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
