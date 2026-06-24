import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.lead.deleteMany();

    const leads = await Promise.all([
      prisma.lead.create({
        data: {
          name: "Juan Pérez",
          phone: "+56971234567",
          email: "juan.perez@gmail.com",
          source: "meta_ads",
          afp: "Provida",
          estimatedFunds: "50 millones",
          procedureType: "vejez_anticipada",
          region: "Metropolitana, Ñuñoa",
          status: "scheduled",
          botState: "completed",
          notes: "prefiere videollamada | propuesto: 2026-06-24T11:00:00.000Z",
        },
      }),
      prisma.lead.create({
        data: {
          name: "María González",
          phone: "+56998765432",
          email: "maria.gonzalez@outlook.com",
          source: "meta_ads",
          afp: "Habitat",
          estimatedFunds: "32 millones",
          procedureType: "vejez_legal",
          region: "Valparaíso, Viña del Mar",
          status: "engaged",
          botState: "awaiting_datetime",
          notes: "prefiere presencial",
        },
      }),
      prisma.lead.create({
        data: {
          name: "Pedro Soto",
          phone: "+56976543210",
          source: "whatsapp_direct",
          status: "new",
          botState: "initial",
        },
      }),
      prisma.lead.create({
        data: {
          name: "Ana Muñoz",
          phone: "+56955443322",
          email: "ana.munoz@yahoo.com",
          source: "meta_ads",
          afp: "Cuprum",
          estimatedFunds: "75 millones",
          procedureType: "sobrevivencia",
          region: "Biobío, Concepción",
          status: "follow_up",
          botState: "follow_up",
          notes: "No respondió aún",
        },
      }),
      prisma.lead.create({
        data: {
          name: "Luis Contreras",
          phone: "+56911223344",
          email: "luis.contreras@gmail.com",
          source: "referral",
          afp: "Capital",
          estimatedFunds: "120 millones",
          procedureType: "trabajo_pesado",
          region: "Antofagasta",
          status: "completed",
          botState: "completed",
          notes: "prefiere presencial | Atención presencial realizada",
        },
      }),
    ]);

    const conversationData = [
      { leadId: leads[0]!.id, isActive: false, msgs: [
        { c: "¡Don Juan, qué gusto saludarlo! ¿En qué AFP está?", d: "outbound" as const },
        { c: "Estoy en Provida", d: "inbound" as const },
        { c: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", d: "outbound" as const },
        { c: "Unos 50 millones", d: "inbound" as const },
        { c: "Perfecto. ¿Qué tipo de trámite necesita?", d: "outbound" as const },
        { c: "Vejez anticipada", d: "inbound" as const },
        { c: "Entendido. ¿De qué región es?", d: "outbound" as const },
        { c: "Ñuñoa, Región Metropolitana", d: "inbound" as const },
        { c: "¿Le acomoda videollamada o venir a la oficina?", d: "outbound" as const },
        { c: "Videollamada", d: "inbound" as const },
        { c: "¿Qué día y horario le acomoda?", d: "outbound" as const },
        { c: "El jueves a las 11", d: "inbound" as const },
        { c: "Perfecto, le confirmo el jueves a las 11:00. ¿Le parece bien?", d: "outbound" as const },
        { c: "Sí, confirmado", d: "inbound" as const },
        { c: "¡Don Juan, queda agendada su videollamada! Nos vemos pronto.", d: "outbound" as const },
      ]},
      { leadId: leads[1]!.id, isActive: true, msgs: [
        { c: "¡Doña María, qué gusto saludarla! ¿En qué AFP está?", d: "outbound" as const },
        { c: "Habitat", d: "inbound" as const },
        { c: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", d: "outbound" as const },
        { c: "Como 32 millones", d: "inbound" as const },
        { c: "Perfecto. ¿Qué tipo de trámite necesita?", d: "outbound" as const },
        { c: "Vejez legal", d: "inbound" as const },
        { c: "Entendido. ¿De qué región es?", d: "outbound" as const },
        { c: "Viña del Mar", d: "inbound" as const },
        { c: "¿Le acomoda videollamada o venir a la oficina?", d: "outbound" as const },
        { c: "Presencial", d: "inbound" as const },
      ]},
      { leadId: leads[2]!.id, isActive: false, msgs: [
        { c: "¡Don Pedro, qué gusto saludarlo! ¿En qué AFP está?", d: "outbound" as const },
      ]},
      { leadId: leads[3]!.id, isActive: false, msgs: [
        { c: "¡Doña Ana, qué gusto saludarla! ¿En qué AFP está?", d: "outbound" as const },
        { c: "Cuprum", d: "inbound" as const },
        { c: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", d: "outbound" as const },
        { c: "75 millones aproximadamente", d: "inbound" as const },
        { c: "Perfecto. ¿Qué tipo de trámite necesita?", d: "outbound" as const },
        { c: "Pensión de sobrevivencia", d: "inbound" as const },
        { c: "Entendido. ¿De qué región es?", d: "outbound" as const },
        { c: "Concepción", d: "inbound" as const },
        { c: "¿Le acomoda videollamada o venir a la oficina?", d: "outbound" as const },
      ]},
      { leadId: leads[4]!.id, isActive: false, msgs: [
        { c: "¡Don Luis, qué gusto saludarlo! ¿En qué AFP está?", d: "outbound" as const },
        { c: "Capital", d: "inbound" as const },
        { c: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", d: "outbound" as const },
        { c: "Unos 120 millones", d: "inbound" as const },
        { c: "Perfecto. ¿Qué tipo de trámite necesita?", d: "outbound" as const },
        { c: "Trabajo pesado", d: "inbound" as const },
        { c: "Entendido. ¿De qué región es?", d: "outbound" as const },
        { c: "Antofagasta", d: "inbound" as const },
        { c: "¿Le acomoda videollamada o venir a la oficina?", d: "outbound" as const },
        { c: "Presencial", d: "inbound" as const },
        { c: "¿Qué día y horario le acomoda?", d: "outbound" as const },
        { c: "Martes a las 3", d: "inbound" as const },
        { c: "Perfecto, le confirmo el martes a las 15:00. ¿Le parece bien?", d: "outbound" as const },
        { c: "Sí", d: "inbound" as const },
        { c: "¡Don Luis, queda agendada su reunión! Nos vemos pronto.", d: "outbound" as const },
      ]},
    ];

    for (const c of conversationData) {
      const conv = await prisma.conversation.create({ data: { leadId: c.leadId, isActive: c.isActive } });
      await prisma.message.createMany({
        data: c.msgs.map((m) => ({ conversationId: conv.id, direction: m.d, content: m.c })),
      });
    }

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    startTime.setHours(11, 0, 0, 0);

    await prisma.appointment.create({
      data: { leadId: leads[0]!.id, type: "video_call", startTime, endTime: new Date(startTime.getTime() + 45 * 60000), googleMeetLink: "https://meet.google.com/abc-defg-hij", status: "scheduled" },
    });

    const pastTime = new Date();
    pastTime.setDate(pastTime.getDate() - 3);
    pastTime.setHours(15, 0, 0, 0);

    await prisma.appointment.create({
      data: { leadId: leads[4]!.id, type: "in_person", startTime: pastTime, endTime: new Date(pastTime.getTime() + 60 * 60000), location: "Av. Apoquindo 1234, Las Condes, Santiago", status: "completed" },
    });

    return NextResponse.json({ status: "ok", message: "Seed completado: 5 leads, conversaciones y 2 citas" });
  } catch (error) {
    return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
  }
}
