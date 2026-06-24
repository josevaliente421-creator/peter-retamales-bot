import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta sends lead data in the "entry" field for page hooks
    // or in "field_data" for Lead Ads webhook
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const leadgenId = changes?.value?.leadgen_id;

    if (!leadgenId) {
      return NextResponse.json({ status: "ok" });
    }

    // Fetch lead details from Meta API (requires page access token)
    const leadRes = await fetch(
      `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${process.env.META_ADS_ACCESS_TOKEN}`
    );

    if (!leadRes.ok) {
      console.error("Failed to fetch lead details:", await leadRes.text());
      return NextResponse.json({ status: "error" }, { status: 500 });
    }

    const leadData = (await leadRes.json()) as {
      field_data: { name: string; values: string[] }[];
    };

    const fields = leadData.field_data ?? [];

    const getField = (name: string): string | undefined =>
      fields.find((f) => f.name === name)?.values?.[0];

    const name = getField("full_name") ?? getField("name");
    const phone = getField("phone_number") ?? getField("phone") ?? getField("whatsapp");
    const email = getField("email");
    const rut = getField("rut");

    if (!phone) {
      console.warn("Lead without phone, skipping:", leadgenId);
      return NextResponse.json({ status: "ok" });
    }

    // Format phone: Meta may send without +56 prefix
    let formattedPhone = phone.replace(/[^0-9]/g, "");
    if (formattedPhone.length === 9) {
      formattedPhone = `+569${formattedPhone}`;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith("56")) {
      formattedPhone = `+${formattedPhone}`;
    }

    // Create or update lead
    const lead = await prisma.lead.upsert({
      where: { phone: formattedPhone },
      update: {
        name: name ?? undefined,
        email: email ?? undefined,
        rut: rut ?? undefined,
        source: "meta_ads",
        status: "new",
      },
      create: {
        name: name ?? null,
        phone: formattedPhone,
        email: email ?? null,
        rut: rut ?? null,
        source: "meta_ads",
        status: "new",
        botState: "initial",
      },
    });

    // Send initial WhatsApp message
    const title = name ? `Don ${name.split(" ")[0]}` : "Señor/Señora";
    const welcomeMsg = `${title}, ¡qué gusto saludarlo! Soy el asistente de Peter Retamales, asesor previsional. Recibí su solicitud de información. ¿Le gustaría agendar una videollamada por Google Meet o venir personalmente a la oficina?`;

    try {
      await sendText(formattedPhone, welcomeMsg);

      await prisma.conversation.create({
        data: {
          leadId: lead.id,
          isActive: true,
          messages: {
            create: {
              direction: "outbound",
              content: welcomeMsg,
            },
          },
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "contacted", botState: "awaiting_appointment_type", lastContact: new Date() },
      });
    } catch (err) {
      console.error("Failed to send WhatsApp to lead:", formattedPhone, err);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Meta Ads webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
