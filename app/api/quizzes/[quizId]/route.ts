import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { getQuizById } from '@/lib/storage';

const paramsSchema = z.object({
  quizId: z.string().min(1)
});

export async function GET(
  _request: Request,
  context: { params: { quizId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You need to sign in to view quizzes.' }, { status: 401 });
  }

  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid quiz identifier.' }, { status: 400 });
  }

  const quiz = await getQuizById(parsed.data.quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
  }

  return NextResponse.json({ quiz });
}
