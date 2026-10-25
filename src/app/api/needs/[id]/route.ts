import { NextRequest, NextResponse } from 'next/server';
import { getAppService } from '@/lib/service';
import { requireUser, handleApiError } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const { svc } = getAppService();
    const res = await svc.getNeed(user, id);
    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}
