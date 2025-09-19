import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, setSessionCookie, verifyPassword } from '@/lib/auth';
import { getUserByEmail } from '@/lib/storage';
export const runtime = 'nodejs';


const schema = z.object({
  email: z.string().email('Enter the email you used to sign up.'),
  password: z.string().min(1, 'Enter your password to continue.')
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid credentials provided.' },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const user = await getUserByEmail(email);

  if (!user) {
    return NextResponse.json({ error: 'We could not find an account for that email.' }, { status: 401 });
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
  }

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username } });
}
