import { NextRequest, NextResponse } from 'next/server';
import { getAppService } from '@/lib/service';
import { requireUser, handleApiError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const { notifier } = getAppService();
    await notifier.unsubscribe(user.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
