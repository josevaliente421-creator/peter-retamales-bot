import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.lead.deleteMany();

  console.log("🌱 Seeding database...");

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

  const conversationData: { leadId: string; isActive: boolean; messages: { content: string; direction: "inbound" | "outbound" }[] }[] = [
    {
      leadId: leads[0]!.id,
      isActive: false,
      messages: [
        { content: "¡Don Juan, qué gusto saludarlo! Soy el asistente de Peter Retamales. ¿En qué AFP está?", direction: "outbound" },
        { content: "Estoy en Provida", direction: "inbound" },
        { content: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", direction: "outbound" },
        { content: "Unos 50 millones", direction: "inbound" },
        { content: "Perfecto. ¿Qué tipo de trámite necesita? ¿Vejez legal, anticipada, sobrevivencia, invalidez o trabajo pesado?", direction: "outbound" },
        { content: "Vejez anticipada", direction: "inbound" },
        { content: "Entendido. ¿De qué región y comuna es?", direction: "outbound" },
        { content: "Ñuñoa, Región Metropolitana", direction: "inbound" },
        { content: "Excelente. ¿Le acomoda más videollamada o venir a la oficina?", direction: "outbound" },
        { content: "Videollamada", direction: "inbound" },
        { content: "¿Qué día y horario le acomoda?", direction: "outbound" },
        { content: "El jueves a las 11", direction: "inbound" },
        { content: "Perfecto, le confirmo el jueves a las 11:00. ¿Le parece bien?", direction: "outbound" },
        { content: "Sí, confirmado", direction: "inbound" },
        { content: "¡Don Juan, queda agendada su videollamada! Nos vemos pronto.", direction: "outbound" },
      ],
    },
    {
      leadId: leads[1]!.id,
      isActive: true,
      messages: [
        { content: "¡Doña María, qué gusto saludarla! ¿En qué AFP está?", direction: "outbound" },
        { content: "Habitat", direction: "inbound" },
        { content: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", direction: "outbound" },
        { content: "Como 32 millones", direction: "inbound" },
        { content: "Perfecto. ¿Qué tipo de trámite necesita?", direction: "outbound" },
        { content: "Vejez legal", direction: "inbound" },
        { content: "Entendido. ¿De qué región es?", direction: "outbound" },
        { content: "Viña del Mar", direction: "inbound" },
        { content: "Excelente. ¿Le acomoda más videollamada o venir a la oficina?", direction: "outbound" },
        { content: "Presencial", direction: "inbound" },
      ],
    },
    {
      leadId: leads[2]!.id,
      isActive: false,
      messages: [
        { content: "¡Don Pedro, qué gusto saludarlo! ¿En qué AFP está?", direction: "outbound" },
      ],
    },
    {
      leadId: leads[3]!.id,
      isActive: false,
      messages: [
        { content: "¡Doña Ana, qué gusto saludarla! ¿En qué AFP está?", direction: "outbound" },
        { content: "Cuprum", direction: "inbound" },
        { content: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", direction: "outbound" },
        { content: "75 millones aproximadamente", direction: "inbound" },
        { content: "Perfecto. ¿Qué tipo de trámite necesita?", direction: "outbound" },
        { content: "Pensión de sobrevivencia", direction: "inbound" },
        { content: "Entendido. ¿De qué región es?", direction: "outbound" },
        { content: "Concepción", direction: "inbound" },
        { content: "Excelente. ¿Le acomoda videollamada o venir a la oficina?", direction: "outbound" },
      ],
    },
    {
      leadId: leads[4]!.id,
      isActive: false,
      messages: [
        { content: "¡Don Luis, qué gusto saludarlo! ¿En qué AFP está?", direction: "outbound" },
        { content: "Capital", direction: "inbound" },
        { content: "Gracias. ¿Aproximadamente cuánto tiene ahorrado?", direction: "outbound" },
        { content: "Unos 120 millones", direction: "inbound" },
        { content: "Perfecto. ¿Qué tipo de trámite necesita?", direction: "outbound" },
        { content: "Trabajo pesado", direction: "inbound" },
        { content: "Entendido. ¿De qué región es?", direction: "outbound" },
        { content: "Antofagasta", direction: "inbound" },
        { content: "Excelente. ¿Le acomoda videollamada o venir a la oficina?", direction: "outbound" },
        { content: "Presencial", direction: "inbound" },
        { content: "¿Qué día y horario le acomoda?", direction: "outbound" },
        { content: "Martes a las 3", direction: "inbound" },
        { content: "Perfecto, le confirmo el martes a las 15:00. ¿Le parece bien?", direction: "outbound" },
        { content: "Sí", direction: "inbound" },
        { content: "¡Don Luis, queda agendada su reunión! Nos vemos pronto.", direction: "outbound" },
      ],
    },
  ];

  for (const c of conversationData) {
    const conv = await prisma.conversation.create({
      data: { leadId: c.leadId, isActive: c.isActive },
    });
    for (const msg of c.messages) {
      await prisma.message.create({
        data: { conversationId: conv.id, direction: msg.direction, content: msg.content },
      });
    }
  }

  const startTime = new Date();
  startTime.setDate(startTime.getDate() + 2);
  startTime.setHours(11, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      leadId: leads[0]!.id,
      type: "video_call",
      startTime,
      endTime: new Date(startTime.getTime() + 45 * 60000),
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      status: "scheduled",
    },
  });

  const pastTime = new Date();
  pastTime.setDate(pastTime.getDate() - 3);
  pastTime.setHours(15, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      leadId: leads[4]!.id,
      type: "in_person",
      startTime: pastTime,
      endTime: new Date(pastTime.getTime() + 60 * 60000),
      location: "Av. Apoquindo 1234, Las Condes, Santiago",
      status: "completed",
    },
  });

  console.log("✅ Seed completado:");
  console.log(`   - ${leads.length} leads creados`);
  leads.forEach((l) => {
    console.log(`     ${l.name}: AFP=${l.afp ?? "—"} | Fondos=${l.estimatedFunds ?? "—"} | Trámite=${l.procedureType ?? "—"} | ${l.region ?? "—"}`);
  });
  console.log(`   - Conversaciones con datos reales`);
  console.log(`   - 2 citas de ejemplo`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
