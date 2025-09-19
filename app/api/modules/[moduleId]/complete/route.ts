import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { markModuleAsCompleted } from '@/lib/storage';

export const runtime = 'nodejs';


const paramsSchema = z.object({
  moduleId: z.string().min(1, 'Module id is required.')
});

export async function POST(
  _request: Request,
  context: { params: { moduleId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to update module progress.' }, { status: 401 });
  }

  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid module identifier provided.' }, { status: 400 });
  }

  const { moduleId } = parsed.data;
  await markModuleAsCompleted(user.id, moduleId);

  return NextResponse.json({ success: true });
}
