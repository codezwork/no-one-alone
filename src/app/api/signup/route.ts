import { NextRequest, NextResponse } from 'next/server';
import { getAppService } from '@/lib/service';
import { handleApiError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { svc } = getAppService();
    const res = await svc.signup(body);
    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}
