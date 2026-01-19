import { NextResponse } from 'next/server';
import { AirtableAPI } from '@/lib/airtable';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    console.log('🔍 API: Verifying code:', code);
    const result = await AirtableAPI.verifyCode(code);
    console.log('📋 API: Verification result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ API: Error verifying code:', error);
    return NextResponse.json(
      { error: 'Failed to verify code', details: error.message },
      { status: 500 }
    );
  }
}
