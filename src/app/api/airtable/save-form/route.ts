import { NextRequest, NextResponse } from 'next/server';
import { airtableClient } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await airtableClient.saveFormResponse(data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saving form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save form' },
      { status: 500 }
    );
  }
}
