import { NextResponse } from 'next/server';
import ENV_CONFIG from '@/lib/config';

export async function GET() {
  // Only allow in development or with specific auth
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    STORAGE_TYPE: process.env.STORAGE_TYPE,
    AUTO_SAVE_ENABLED: process.env.AUTO_SAVE_ENABLED,
    AUTO_ENHANCE_ENABLED: process.env.AUTO_ENHANCE_ENABLED,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT_SET',
    ENV_CONFIG: {
      NODE_ENV: ENV_CONFIG.NODE_ENV,
      STORAGE_TYPE: ENV_CONFIG.STORAGE_TYPE,
      isProduction: ENV_CONFIG.isProduction(),
      isDevelopment: ENV_CONFIG.isDevelopment(),
      isServerless: ENV_CONFIG.isServerless(),
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: ENV_CONFIG.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }
  });
}
