import { NextRequest, NextResponse } from 'next/server';
import { airtableClient } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await airtableClient.createGiftCard(data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating gift card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create gift card' },
      { status: 500 }
    );
  }
}
