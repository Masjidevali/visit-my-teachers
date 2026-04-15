import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { pin } = await request.json();
  const correctPin = process.env.KIOSK_PIN || '2023';

  if (pin === correctPin) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
}
