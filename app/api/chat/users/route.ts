import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { listCommunityMembers } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to view the community.' }, { status: 401 });
  }

  const members = await listCommunityMembers(user.id);
  return NextResponse.json({ members });
}
