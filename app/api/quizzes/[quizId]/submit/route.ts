import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { recordQuizSubmission } from '@/lib/storage';

const paramsSchema = z.object({
  quizId: z.string().min(1)
});

const payloadSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOption: z.string().min(1)
      })
    )
    .min(1, 'Provide at least one answer before submitting the quiz.')
});

export async function POST(
  request: Request,
  context: { params: { quizId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to submit a quiz.' }, { status: 401 });
  }

  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ error: 'Invalid quiz identifier.' }, { status: 400 });
  }

  const body = await request.json();
  const parsedBody = payloadSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? 'Could not process your quiz submission.' },
      { status: 400 }
    );
  }

  const result = await recordQuizSubmission(user.id, params.data.quizId, parsedBody.data.answers);
  return NextResponse.json({ result });
}
