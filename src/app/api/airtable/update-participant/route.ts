import { NextRequest, NextResponse } from 'next/server';
import { airtableClient } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const { recordId, status } = await request.json();
    
    if (!recordId || !status) {
      return NextResponse.json(
        { error: 'recordId and status are required' },
        { status: 400 }
      );
    }
    
    const result = await airtableClient.updateParticipantStatus(recordId, status);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating participant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update participant' },
      { status: 500 }
    );
  }
}
