const WHATSAPP_API = "https://graph.facebook.com/v21.0";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export interface WhatsAppTextMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: { body: string; preview_url?: boolean };
}

export interface WhatsAppInteractiveMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "interactive";
  interactive: {
    type: "button" | "list";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: Record<string, unknown>;
  };
}

export async function sendText(
  to: string,
  body: string
): Promise<{ messageId: string }> {
  const payload: WhatsAppTextMessage = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body, preview_url: false },
  };

  const res = await fetch(
    `${WHATSAPP_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }

  const data = (await res.json()) as { messages: { id: string }[] };
  return { messageId: data.messages?.[0]?.id ?? "unknown" };
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<{ messageId: string }> {
  const payload: WhatsAppInteractiveMessage = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: { buttons: buttons.map((b) => ({ type: "reply", reply: b })) },
    },
  };

  const res = await fetch(
    `${WHATSAPP_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }

  const data = (await res.json()) as { messages: { id: string }[] };
  return { messageId: data.messages?.[0]?.id ?? "unknown" };
}

export function parseWebhookPayload(body: unknown): {
  phone: string;
  text: string;
  messageId: string;
  name?: string;
} | null {
  const entry = (body as any)?.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message) return null;

  const phone = message.from as string;
  const messageId = message.id as string;
  const text =
    message.text?.body ?? message.interactive?.button_reply?.id ?? "";
  const name = change.value?.contacts?.[0]?.profile?.name as string | undefined;

  return { phone, text, messageId, name };
}
