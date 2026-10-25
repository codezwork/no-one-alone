import { NextRequest, NextResponse } from 'next/server';
import { getAppService, AppError } from '@/lib/service';
import { requireUser, handleApiError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const { notifier } = getAppService();
    const ok = await notifier.subscribe(user.id, body.subscription);
    if (!ok) {
      throw new AppError(400, 'bad_subscription', 'This browser’s push subscription could not be saved.');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
