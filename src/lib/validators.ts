export function cleanRut(rut: string): string {
  return rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();
}

export function formatRut(raw: string): string {
  const cleaned = cleanRut(raw);
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  const formatted = Number.parseInt(body, 10).toLocaleString("es-CL");
  return `${formatted}-${dv}`;
}

export function validateRut(rut: string): boolean {
  const cleaned = cleanRut(rut);
  if (!/^[0-9]+[0-9Kk]$/.test(cleaned)) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number.parseInt(body[i]!, 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDv = 11 - (sum % 11);
  const expectedChar =
    expectedDv === 11 ? "0" : expectedDv === 10 ? "K" : String(expectedDv);

  return dv === expectedChar;
}

export function isValidPhone(phone: string): boolean {
  // Chile: +56 9 XXXX XXXX
  return /^\+569[0-9]{8}$/.test(phone.replace(/\s/g, ""));
}
