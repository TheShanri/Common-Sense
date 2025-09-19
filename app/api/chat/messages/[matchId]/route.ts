import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { addMessage, listMessages, userIsInMatch } from '@/lib/storage';

const paramsSchema = z.object({
  matchId: z.string().min(1)
});

const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty.')
    .max(1000, 'Messages must be under 1000 characters.')
});

export async function GET(request: Request, context: { params: { matchId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to view chat history.' }, { status: 401 });
  }

  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid chat identifier supplied.' }, { status: 400 });
  }

  const matchId = params.data.matchId;
  const authorized = await userIsInMatch(matchId, user.id);
  if (!authorized) {
    return NextResponse.json({ error: 'You do not have access to this chat.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : 50;
  const messages = await listMessages(matchId, limit);

  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: { params: { matchId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to participate in the chat.' }, { status: 401 });
  }

  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid chat identifier supplied.' }, { status: 400 });
  }

  const matchId = params.data.matchId;
  const authorized = await userIsInMatch(matchId, user.id);
  if (!authorized) {
    return NextResponse.json({ error: 'You do not have access to this chat.' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid message.' }, { status: 400 });
  }

  const message = await addMessage(matchId, user.id, parsed.data.content.trim());
  return NextResponse.json({ message });
}
