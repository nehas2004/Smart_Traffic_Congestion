import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${FASTAPI_URL}/admin/decisions`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data.data?.decisions || data)
    }
  } catch (error) {
    // Fallback if FastAPI is not reachable
  }

  return NextResponse.json([])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${FASTAPI_URL}/admin/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch (error) {
    // Return fallback
  }

  return NextResponse.json({ success: true })
}
