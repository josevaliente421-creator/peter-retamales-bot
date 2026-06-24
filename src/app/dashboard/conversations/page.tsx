"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Clock } from "lucide-react";

interface Conversation {
  id: string;
  isActive: boolean;
  createdAt: string;
  leadId: string;
  lead: { name: string | null; phone: string; status: string };
  _count: { messages: number };
  messages: { content: string; direction: string; sentAt: string }[];
}

const statusLabels: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", engaged: "En conversación",
  scheduled: "Agendado", follow_up: "Seguimiento",
};

export default function ConversationsPage() {
  const { data, isLoading } = useQuery<{ data: Conversation[] }>({
    queryKey: ["conversations"],
    queryFn: () => fetch("/api/conversations").then((r) => r.json()),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Conversaciones</h2>
        <p className="text-muted-foreground">Historial de interacciones del bot con los leads</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando conversaciones...</p>
      ) : (
        <div className="space-y-4">
          {data?.data.map((conv) => {
            const lastMsg = conv.messages?.[conv.messages.length - 1];
            return (
              <Link
                key={conv.id}
                href={`/dashboard/leads/${conv.leadId}`}
                className="block bg-card border rounded-xl p-5 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold truncate">
                        {conv.lead.name ?? "Sin nombre"}
                      </h3>
                      <Badge variant={conv.isActive ? "success" : "secondary"}>
                        {conv.isActive ? "Activa" : "Cerrada"}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        {conv._count.messages} mensajes
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {conv.lead.phone}
                    </p>
                    {lastMsg && (
                      <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                        {lastMsg.direction === "outbound" ? "🤖 " : "👤 "}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0 ml-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(conv.createdAt), "d MMM HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {data?.data.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay conversaciones aún</p>
              <p className="text-sm">Cuando el bot interactúe con leads, aparecerán aquí</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
