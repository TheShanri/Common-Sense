import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getActiveMatch, getOrientationScore } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to view your match.' }, { status: 401 });
  }

  const [match, orientationScore] = await Promise.all([
    getActiveMatch(user.id),
    getOrientationScore(user.id)
  ]);

  return NextResponse.json({ match, orientationScore });
}
