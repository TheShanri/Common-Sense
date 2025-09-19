import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { attemptMatchWithPeer, getActiveMatch, saveOpinionResponses } from '@/lib/storage';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.number().min(-10).max(10)
      })
    )
    .min(1, 'Answer at least one question to generate a match.')
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in before saving preferences.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Unable to save your responses.' },
      { status: 400 }
    );
  }

  const orientationScore = await saveOpinionResponses(user.id, parsed.data.responses);
  await attemptMatchWithPeer(user.id, orientationScore);
  const match = await getActiveMatch(user.id);

  return NextResponse.json({ orientationScore, match });
}
