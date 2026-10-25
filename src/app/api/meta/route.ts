import { NextResponse } from 'next/server';
import * as R from '@/lib/rules';
import { getAppService } from '@/lib/service';
import { handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    const { notifier } = getAppService();
    const vapidPublicKey = await notifier.publicKey();
    return NextResponse.json({
      professions: R.PROFESSIONS,
      generalHelp: R.GENERAL_HELP,
      tradeCategories: R.TRADE_CATEGORIES,
      rules: {
        minSignupAge: R.MIN_SIGNUP_AGE,
        helperMinAge: R.HELPER_MIN_AGE,
        generalHelpMinAge: R.GENERAL_HELP_MIN_AGE,
        sensitiveMinViewerAge: R.SENSITIVE_MIN_VIEWER_AGE,
        minRadiusKm: R.MIN_RADIUS_KM,
        maxRadiusKm: R.MAX_RADIUS_KM,
        defaultRadiusKm: R.DEFAULT_RADIUS_KM,
      },
      vapidPublicKey,
      live: 'poll',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
