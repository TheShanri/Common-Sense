import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { getUserById, listDirectMessagesBetween, sendDirectMessage } from '@/lib/storage';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  userId: z.string().min(1, 'Provide a user to chat with.')
});

const bodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write a message before sending.')
    .max(2000, 'Messages must be shorter than 2,000 characters.')
});

export async function GET(
  _request: Request,
  context: { params: { userId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to read messages.' }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid user selected.' }, { status: 400 });
  }

  const partner = await getUserById(parsedParams.data.userId);
  if (!partner) {
    return NextResponse.json({ error: 'We could not find that member.' }, { status: 404 });
  }

  if (partner.id === user.id) {
    return NextResponse.json({ messages: [], partner: { id: partner.id, username: partner.username } });
  }

  const messages = await listDirectMessagesBetween(user.id, partner.id);
  return NextResponse.json({ messages, partner: { id: partner.id, username: partner.username } });
}

export async function POST(
  request: Request,
  context: { params: { userId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to send messages.' }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid user selected.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? 'Write a message before sending.' },
      { status: 400 }
    );
  }

  const partner = await getUserById(parsedParams.data.userId);
  if (!partner) {
    return NextResponse.json({ error: 'We could not find that member.' }, { status: 404 });
  }

  if (partner.id === user.id) {
    return NextResponse.json({ error: 'Start a conversation with someone else to continue.' }, { status: 400 });
  }

  const message = await sendDirectMessage(user.id, partner.id, parsedBody.data.content);
  return NextResponse.json({ message, partner: { id: partner.id, username: partner.username } }, { status: 201 });
}
