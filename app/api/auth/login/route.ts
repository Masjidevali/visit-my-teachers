import { NextResponse } from 'next/server';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!password || !(await verifyPassword(password))) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await createToken();
  await setAuthCookie(token);

  return NextResponse.json({ success: true });
}
