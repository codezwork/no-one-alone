import { NextRequest, NextResponse } from 'next/server';
import { getAppService } from '@/lib/service';
import { requireUser, handleApiError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { svc } = getAppService();
    return NextResponse.json({ user: svc.me(user) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const { svc } = getAppService();
    const updated = await svc.updateProfile(user, body);
    return NextResponse.json({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { svc } = getAppService();
    const res = await svc.deleteAccount(user);
    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}
