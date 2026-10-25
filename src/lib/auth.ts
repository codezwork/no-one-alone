import { NextRequest, NextResponse } from 'next/server';
import { getAppService, AppError } from './service';

export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    token = req.nextUrl.searchParams.get('token') || '';
  }

  if (!token) return null;
  const { svc } = getAppService();
  return svc.auth(token);
}

export async function requireUser(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw new AppError(401, 'signed_out', 'Please sign in again.');
  }
  return user;
}

export function handleApiError(err: any) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }
  console.error('Unhandled API Error:', err);
  return NextResponse.json(
    { error: { code: 'server_error', message: err?.message || 'Something went wrong on our side. Please try again.' } },
    { status: 500 }
  );
}
