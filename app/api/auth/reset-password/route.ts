import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, hashPassword, setSessionCookie } from '@/lib/auth';
import { resetPasswordWithToken } from '@/lib/storage';

export const runtime = 'nodejs';

const schema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password: z
    .string()
    .min(8, 'Use a password that is at least 8 characters long.')
    .max(128, 'Passwords should be 128 characters or fewer.')
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Provide the details required to reset your password.' },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const user = await resetPasswordWithToken(token, passwordHash);

  if (!user) {
    return NextResponse.json(
      { error: 'That reset link is no longer valid. Request a new link to continue.' },
      { status: 400 }
    );
  }

  const sessionToken = await createSessionToken(user.id);
  await setSessionCookie(sessionToken);

  return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username } });
}
