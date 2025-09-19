import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, savePasswordResetToken } from '@/lib/storage';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email('Enter the email address associated with your account.')
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Enter the email address associated with your account.' },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const user = await getUserByEmail(email);

  const genericMessage =
    'If an account exists for that email, we just sent the instructions to reset your password.';

  if (!user) {
    return NextResponse.json({ message: genericMessage });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await savePasswordResetToken(user.id, token, expiresAt);

  const resetUrl = new URL(`/reset-password?token=${token}`, request.url).toString();

  return NextResponse.json({ message: genericMessage, resetUrl });
}
