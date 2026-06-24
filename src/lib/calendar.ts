import { google } from "googleapis";

function getAuth() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return auth;
}

function getCalendar() {
  const auth = getAuth();
  return google.calendar({ version: "v3", auth });
}

export interface CreateEventParams {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
  addMeetLink?: boolean;
}

export async function createCalendarEvent(
  params: CreateEventParams
): Promise<{ id: string; hangoutLink?: string; htmlLink: string }> {
  const calendar = getCalendar();

  const event: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: { email: string }[];
    conferenceData?: { createRequest: { requestId: string } };
  } = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: "America/Santiago",
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: "America/Santiago",
    },
  };

  if (params.attendeeEmail) {
    event.attendees = [{ email: params.attendeeEmail }];
  }

  if (params.addMeetLink) {
    event.conferenceData = {
      createRequest: { requestId: `${Date.now()}` },
    };
  }

  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: event,
    conferenceDataVersion: params.addMeetLink ? 1 : 0,
  });

  return {
    id: res.data.id!,
    hangoutLink: res.data.hangoutLink ?? undefined,
    htmlLink: res.data.htmlLink!,
  };
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export async function getAvailableSlots(
  date: Date,
  durationMinutes: number = 30
): Promise<TimeSlot[]> {
  const calendar = getCalendar();

  const dayStart = new Date(date);
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(18, 0, 0, 0);

  const busyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
    },
  });

  const busySlots =
    busyRes.data.calendars?.[process.env.GOOGLE_CALENDAR_ID!]?.busy ?? [];

  const slots: TimeSlot[] = [];
  let cursor = new Date(dayStart);

  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60000);
    const isBusy = busySlots.some((b) => {
      const bStart = new Date(b.start!);
      const bEnd = new Date(b.end!);
      return cursor < bEnd && slotEnd > bStart;
    });

    if (!isBusy) {
      slots.push({ start: new Date(cursor), end: slotEnd });
    }

    cursor = slotEnd;
  }

  return slots;
}
