import { NextRequest, NextResponse } from 'next/server';
import { airtableClient } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await airtableClient.createParticipant(data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating participant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create participant' },
      { status: 500 }
    );
  }
}
