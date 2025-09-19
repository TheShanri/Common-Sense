import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, setSessionCookie, hashPassword } from '@/lib/auth';
import { createUser, getUserByEmail, getUserByUsername } from '@/lib/storage';
export const runtime = 'nodejs';


const schema = z.object({
  email: z.string().email('Please provide a valid email.'),
  username: z
    .string()
    .min(3, 'Your display name must be at least 3 characters long.')
    .max(40, 'Your display name must be 40 characters or fewer.'),
  password: z.string().min(8, 'Use a password that is at least 8 characters long.')
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input provided.' },
      { status: 400 }
    );
  }

  const { email, username, password } = parsed.data;

  const existingEmail = await getUserByEmail(email);
  if (existingEmail) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const existingUsername = await getUserByUsername(username);
  if (existingUsername) {
    return NextResponse.json({ error: 'That display name is already taken.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, username, passwordHash });
  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username } }, { status: 201 });
}
