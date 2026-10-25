import { NextRequest, NextResponse } from 'next/server';
import { getAppService } from '@/lib/service';
import { requireUser, handleApiError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const { svc } = getAppService();
    const res = await svc.markRead(user, body);
    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}
