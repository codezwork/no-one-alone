import { NextRequest, NextResponse } from 'next/server';
import { getAppService } from '@/lib/service';
import { requireUser, handleApiError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const since = req.nextUrl.searchParams.get('since');
    const { svc } = getAppService();
    const res = await svc.listNotifications(user, since);
    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}
