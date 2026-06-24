import { NextRequest, NextResponse } from "next/server";
import { parseWebhookPayload } from "@/lib/whatsapp";
import { processIncomingMessage } from "@/lib/bot-engine";

// Webhook verification (Meta sends a GET request to verify)
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

// Incoming messages from WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseWebhookPayload(body);

    if (!parsed) {
      return NextResponse.json({ status: "ok" }); // Acknowledge receipt, even if no message
    }

    const { phone, text, messageId, name } = parsed;

    await processIncomingMessage(phone, text, name);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}
