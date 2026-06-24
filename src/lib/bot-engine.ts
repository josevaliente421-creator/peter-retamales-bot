import { prisma } from "./prisma";
import { sendText, sendButtons } from "./whatsapp";
import { createCalendarEvent, getAvailableSlots } from "./calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ProcedureType } from "@prisma/client";

type BotState = "initial" | "awaiting_name" | "awaiting_afp" | "awaiting_funds" | "awaiting_procedure_type" | "awaiting_region" | "awaiting_appointment_type" | "awaiting_datetime" | "confirming" | "completed" | "follow_up" | "human_handoff";

function title(name: string | null): string {
  if (!name) return "Señor/Señora";
  const first = name.split(" ")[0]!;
  return `Don ${first}`;
}

function formatDateCL(date: Date): string {
  return format(date, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
}

const AFP_LIST = ["Provida", "Habitat", "Cuprum", "Capital", "Modelo", "Uno", "PlanVital"];

const PROCEDURE_TYPES: { id: ProcedureType; label: string }[] = [
  { id: "vejez_legal", label: "Vejez legal" },
  { id: "vejez_anticipada", label: "Vejez anticipada" },
  { id: "sobrevivencia", label: "Pensión de sobrevivencia" },
  { id: "invalidez", label: "Pensión de invalidez" },
  { id: "trabajo_pesado", label: "Trabajo pesado" },
  { id: "no_sabe", label: "No estoy seguro" },
];

function findAFP(input: string): string | null {
  return AFP_LIST.find((a) => input.includes(a.toLowerCase())) ?? null;
}

function findProcedureType(input: string): ProcedureType | null {
  for (const pt of PROCEDURE_TYPES) {
    if (input.includes(pt.id.replace("_", " ")) || input.includes(pt.label.toLowerCase())) {
      return pt.id;
    }
  }
  if (input.includes("vejez") || input.includes("edad")) return "vejez_legal";
  if (input.includes("anticip") || input.includes("anticipada")) return "vejez_anticipada";
  if (input.includes("sobrevivencia") || input.includes("muerte") || input.includes("falleció")) return "sobrevivencia";
  if (input.includes("invalidez") || input.includes("discapacidad")) return "invalidez";
  if (input.includes("trabajo pesado") || input.includes("pesado")) return "trabajo_pesado";
  if (input.includes("no sé") || input.includes("no se") || input.includes("sabe") || input.includes("seguro")) return "no_sabe";
  return null;
}

function extractDateFromText(text: string): Date | null {
  const days: Record<string, number> = {
    lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
    jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
  };
  const now = new Date();
  const input = text.toLowerCase().trim();

  for (const [name, dayIndex] of Object.entries(days)) {
    if (input.includes(name)) {
      const target = new Date(now);
      let diff = dayIndex - target.getDay();
      if (diff <= 0) diff += 7;
      target.setDate(target.getDate() + diff);
      const hourMatch = input.match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(?:hrs|horas|am|pm)?/);
      if (hourMatch) {
        let hour = Number.parseInt(hourMatch[1]!, 10);
        const minute = Number.parseInt(hourMatch[2] ?? "0", 10);
        if (input.includes("pm") && hour < 12) hour += 12;
        if (input.includes("am") && hour === 12) hour = 0;
        target.setHours(hour, minute, 0, 0);
      } else {
        target.setHours(11, 0, 0, 0);
      }
      return target;
    }
  }
  if (input.includes("mañana") || input.includes("manana")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    target.setHours(11, 0, 0, 0);
    return target;
  }
  return null;
}

export interface ProcessMessageResult {
  state: BotState;
  responseMessage: string;
  appointmentCreated?: boolean;
  appointmentId?: string;
}

// ─── Helpers per state ───────────────────────────────────────────

function sendAndSave(phone: string, leadId: string, msg: string, dir: "inbound" | "outbound" = "outbound") {
  return Promise.all([
    sendText(phone, msg),
    saveMessages(leadId, [{ direction: dir, content: msg }]),
  ]);
}

function sendButtonsAndSave(phone: string, leadId: string, msg: string, buttons: { id: string; title: string }[]) {
  return Promise.all([
    sendButtons(phone, msg, buttons),
    saveMessages(leadId, [{ direction: "outbound", content: msg }]),
  ]);
}

// ─── Main handler ────────────────────────────────────────────────

export async function processIncomingMessage(
  phone: string,
  text: string,
  senderName?: string
): Promise<ProcessMessageResult> {
  let lead = await prisma.lead.findUnique({ where: { phone } });

  if (!lead) {
    lead = await prisma.lead.create({
      data: { phone, name: senderName ?? null, status: "new", botState: "initial" },
    });
  }

  const t = text.trim().toLowerCase();
  const name = lead.name ?? senderName ?? null;
  const ti = title(name);

  // ── Human handoff ────────────────────────────────────────────
  if (t.includes("hablar con peter") || t.includes("humano") || t.includes("persona real")) {
    const msg = `${ti}, le comunico con Peter directamente para que pueda atenderlo de forma personalizada. Un momento por favor.`;
    await sendAndSave(phone, lead.id, msg);
    await prisma.lead.update({ where: { id: lead.id }, data: { botState: "human_handoff", status: "engaged" } });
    return { state: "human_handoff", responseMessage: msg };
  }

  // ── "No" en confirming → cambiar horario ──────────────────────
  if (t.includes("no") && lead.botState === "confirming") {
    const msg = "Por supuesto, ¿qué otro día y horario le acomoda?";
    await sendAndSave(phone, lead.id, msg);
    await prisma.lead.update({ where: { id: lead.id }, data: { botState: "awaiting_datetime" } });
    return { state: "awaiting_datetime", responseMessage: msg };
  }

  // ── State machine transitions ─────────────────────────────────
  let nextState: BotState = lead.botState as BotState;

  switch (lead.botState) {
    // ── INITIAL → datos personales ──────────────────────────────
    case "initial":
    case "awaiting_name": {
      const safeName = name ?? t;
      if (safeName && safeName.length > 1 && safeName !== lead.name) {
        await prisma.lead.update({ where: { id: lead.id }, data: { name: safeName } });
      }
      const greet = `¡${title(safeName)}, qué gusto saludarlo! Soy el asistente de Peter Retamales, asesor previsional número 1 de Chile. Para poder preparar su asesoría, ¿me podría decir en qué AFP está?`;
      await sendAndSave(phone, lead.id, greet);
      await prisma.lead.update({ where: { id: lead.id }, data: { name: safeName, botState: "awaiting_afp", status: "engaged" } });
      return { state: "awaiting_afp", responseMessage: greet };
    }

    // ── AFP ──────────────────────────────────────────────────────
    case "awaiting_afp": {
      const found = findAFP(t);
      const afp = found ?? t.charAt(0).toUpperCase() + t.slice(1);
      await prisma.lead.update({ where: { id: lead.id }, data: { afp, botState: "awaiting_funds" } });
      const msg = `Gracias, ${ti}. ¿Y aproximadamente cuánto tiene ahorrado en su cuenta de AFP? No se preocupe por el monto exacto, un aproximado basta para que Peter prepare su caso.`;
      await sendAndSave(phone, lead.id, msg);
      return { state: "awaiting_funds", responseMessage: msg };
    }

    // ── FONDOS ──────────────────────────────────────────────────
    case "awaiting_funds": {
      const funds = t.replace(/^alrededor de |unos |unas |como |aproximadamente /, "").trim();
      await prisma.lead.update({ where: { id: lead.id }, data: { estimatedFunds: funds, botState: "awaiting_procedure_type" } });

      const options = PROCEDURE_TYPES.map((p) => ({ id: p.id, title: p.label }));
      const msg = `Perfecto, ${ti}. Ahora, ¿qué tipo de trámite necesita realizar?`;
      await sendButtonsAndSave(phone, lead.id, msg, options.slice(0, 3));
      // Send remaining options in a second message (WA buttons max 3)
      await sendButtonsAndSave(phone, lead.id, "O estas otras opciones:", options.slice(3));
      return { state: "awaiting_procedure_type", responseMessage: msg };
    }

    // ── TIPO DE TRÁMITE ─────────────────────────────────────────
    case "awaiting_procedure_type": {
      const procType = findProcedureType(t);
      if (!procType) {
        const msg = `${ti}, disculpe, no entendí bien. Las opciones son: vejez legal, vejez anticipada, pensión de sobrevivencia, pensión de invalidez, o trabajo pesado. ¿Cuál le corresponde?`;
        await sendAndSave(phone, lead.id, msg);
        return { state: "awaiting_procedure_type", responseMessage: msg };
      }
      const labels: Record<string, string> = {
        vejez_legal: "Vejez legal", vejez_anticipada: "Vejez anticipada",
        sobrevivencia: "Pensión de sobrevivencia", invalidez: "Pensión de invalidez",
        trabajo_pesado: "Trabajo pesado", no_sabe: "No está seguro",
      };
      await prisma.lead.update({ where: { id: lead.id }, data: { procedureType: procType, botState: "awaiting_region" } });
      const msg = `${labels[procType] ?? procType}, entendido ${ti}. Por último, ¿de qué región y comuna es?`;
      await sendAndSave(phone, lead.id, msg);
      return { state: "awaiting_region", responseMessage: msg };
    }

    // ── REGIÓN ──────────────────────────────────────────────────
    case "awaiting_region": {
      const region = t.charAt(0).toUpperCase() + t.slice(1);
      await prisma.lead.update({ where: { id: lead.id }, data: { region, botState: "awaiting_appointment_type" } });

      const bundle = [
        `Excelente, ya tengo todos sus datos listos para su asesoría:`,
        `• AFP: ${lead.afp ?? "—"}`,
        `• Fondos aprox: ${lead.estimatedFunds ?? "—"}`,
        `• Trámite: ${lead.procedureType?.replace("_", " ") ?? "—"}`,
        `• Región: ${region}`,
        ``,
        `Ahora, ${ti}, ¿le acomoda más una videollamada por Google Meet o venir personalmente a la oficina?`,
      ].join("\n");

      await sendButtonsAndSave(phone, lead.id, bundle, [
        { id: "video_call", title: "📹 Videollamada" },
        { id: "in_person", title: "🏢 Presencial" },
      ]);
      return { state: "awaiting_appointment_type", responseMessage: bundle };
    }

    // ── TIPO DE CITA ────────────────────────────────────────────
    case "awaiting_appointment_type": {
      const isVideo = t.includes("video") || t.includes("meet") || t.includes("video");
      const isInPerson = t.includes("presencial") || t.includes("oficina") || t.includes("ofi");

      if (!isVideo && !isInPerson) {
        const msg = `${ti}, ¿prefiere una videollamada por Google Meet o venir a la oficina?`;
        await sendButtonsAndSave(phone, lead.id, msg, [
          { id: "video_call", title: "📹 Videollamada" },
          { id: "in_person", title: "🏢 Presencial" },
        ]);
        return { state: "awaiting_appointment_type", responseMessage: msg };
      }

      const tipo = isVideo ? "videollamada" : "reunión presencial";
      await prisma.lead.update({ where: { id: lead.id }, data: { notes: isVideo ? "prefiere videollamada" : "prefiere presencial", botState: "awaiting_datetime" } });
      const msg = `Excelente. Una ${tipo} es ideal para que Peter revise su caso en detalle. ¿Qué día y horario le acomoda? Por ejemplo, "martes a las 11" o "jueves en la tarde".`;
      await sendAndSave(phone, lead.id, msg);
      return { state: "awaiting_datetime", responseMessage: msg };
    }

    // ── FECHA Y HORA ────────────────────────────────────────────
    case "awaiting_datetime": {
      const parsed = extractDateFromText(t);
      if (!parsed) {
        const msg = 'Disculpe, no entendí bien el horario. ¿Podría indicarme un día y hora? Por ejemplo: "martes a las 11" o "jueves en la tarde".';
        await sendAndSave(phone, lead.id, msg);
        return { state: "awaiting_datetime", responseMessage: msg };
      }

      try {
        const slots = await getAvailableSlots(parsed, 45);
        if (slots.length === 0) {
          const msg = "Lamento informarle que no tengo disponibilidad para esa fecha. ¿Podría indicarme otro día?";
          await sendAndSave(phone, lead.id, msg);
          return { state: "awaiting_datetime", responseMessage: msg };
        }
        const slot = slots[0]!;
        const formatted = formatDateCL(slot.start);
        const msg = `Perfecto. Le confirmo que el ${formatted} está disponible. ¿Le parece bien?`;
        await sendAndSave(phone, lead.id, msg);
        await prisma.lead.update({ where: { id: lead.id }, data: { notes: `${lead.notes ?? ""} | propuesto: ${slot.start.toISOString()}` } });
        return { state: "confirming", responseMessage: msg };
      } catch {
        const msg = "Disculpe, tuve un problema al revisar la agenda. ¿Podría intentarlo de nuevo más tarde?";
        await sendAndSave(phone, lead.id, msg);
        return { state: "awaiting_datetime", responseMessage: msg };
      }
    }

    // ── CONFIRMAR ───────────────────────────────────────────────
    case "confirming": {
      if (t.includes("sí") || t.includes("si") || t.includes("confirmar") || t.includes("ok") || t.includes("vale") || t.includes("bueno")) {
        const isVideo = lead.notes?.includes("videollamada");
        const proposedStr = lead.notes?.split("propuesto: ")[1];
        const startTime = proposedStr ? new Date(proposedStr) : new Date();
        const endTime = new Date(startTime.getTime() + 45 * 60000);

        try {
          const event = await createCalendarEvent({
            summary: `Asesoría Peter Retamales - ${lead.name ?? "Cliente"}`,
            description: [
              `Cliente: ${lead.name ?? "Sin nombre"}`,
              `Teléfono: ${lead.phone}`,
              `AFP: ${lead.afp ?? "—"}`,
              `Fondos: ${lead.estimatedFunds ?? "—"}`,
              `Trámite: ${lead.procedureType ?? "—"}`,
              `Región: ${lead.region ?? "—"}`,
              `Tipo: ${isVideo ? "Videollamada" : "Presencial"}`,
            ].join("\n"),
            startTime,
            endTime,
            addMeetLink: isVideo ?? false,
          });

          const appointment = await prisma.appointment.create({
            data: {
              leadId: lead.id,
              type: isVideo ? "video_call" : "in_person",
              startTime,
              endTime,
              googleEventId: event.id,
              googleMeetLink: event.hangoutLink ?? null,
              location: isVideo ? null : "Av. Apoquindo 1234, Las Condes, Santiago",
            },
          });

          const msg = isVideo
            ? `${ti}, le confirmo su videollamada para el ${formatDateCL(startTime)}.\n\nLink Google Meet: ${event.hangoutLink}\n\nQuedamos atentos. ¡Gracias por confiar en Peter Retamales!`
            : `${ti}, le confirmo su reunión presencial para el ${formatDateCL(startTime)} en Av. Apoquindo 1234, Las Condes.\n\nQuedamos atentos. ¡Gracias por confiar en Peter Retamales!`;

          await sendAndSave(phone, lead.id, msg);
          await prisma.lead.update({ where: { id: lead.id }, data: { botState: "completed", status: "scheduled" } });

          return { state: "completed", responseMessage: msg, appointmentCreated: true, appointmentId: appointment.id };
        } catch {
          const msg = "Disculpe, tuve un problema al agendar la reunión. Un asesor se comunicará con usted para coordinar.";
          await sendAndSave(phone, lead.id, msg);
          return { state: "human_handoff", responseMessage: msg };
        }
      }
      const msg = "Por supuesto, ¿qué otro día y horario le acomoda?";
      await sendAndSave(phone, lead.id, msg);
      await prisma.lead.update({ where: { id: lead.id }, data: { botState: "awaiting_datetime" } });
      return { state: "awaiting_datetime", responseMessage: msg };
    }

    // ── FOLLOW-UP ───────────────────────────────────────────────
    case "follow_up": {
      const msg = `${ti}, soy nuevamente el asistente de Peter Retamales. Quería recordarle que tenemos una reunión pendiente para revisar su situación previsional. ¿Le gustaría agendar?`;
      await sendButtonsAndSave(phone, lead.id, msg, [
        { id: "video_call", title: "📹 Videollamada" },
        { id: "in_person", title: "🏢 Presencial" },
      ]);
      await prisma.lead.update({ where: { id: lead.id }, data: { botState: "awaiting_appointment_type" } });
      return { state: "awaiting_appointment_type", responseMessage: msg };
    }

    // ── COMPLETED / HUMAN / DEFAULT ─────────────────────────────
    case "completed": {
      const msg = `${ti}, su reunión ya está agendada. Si necesita cambiar algo, puede comunicarse directamente con nosotros. ¡Gracias!`;
      await sendAndSave(phone, lead.id, msg);
      return { state: "completed", responseMessage: msg };
    }

    default: {
      const msg = `${ti}, ¿en qué puedo ayudarle?`;
      await sendAndSave(phone, lead.id, msg);
      return { state: "awaiting_appointment_type", responseMessage: msg };
    }
  }
}

// ─── Save messages to DB ─────────────────────────────────────────

async function saveMessages(leadId: string, messages: { direction: "inbound" | "outbound"; content: string }[]): Promise<void> {
  let conversation = await prisma.conversation.findFirst({
    where: { leadId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { leadId, isActive: true } });
  }

  await prisma.message.createMany({
    data: messages.map((m) => ({
      conversationId: conversation!.id,
      direction: m.direction,
      content: m.content,
    })),
  });
}
