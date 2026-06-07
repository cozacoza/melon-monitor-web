import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractProdId, getConcertInfo } from '@/lib/melon'

export async function GET() {
  const { data, error } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  const body = await req.json()
  const { concert_url, discord_webhook, price_threshold, target_datetime } = body

  if (!concert_url || !discord_webhook || !price_threshold) {
    return NextResponse.json({ error: '필수 항목이 누락됐습니다.' }, { status: 400 })
  }

  const prodId = extractProdId(concert_url)
  if (!prodId) {
    return NextResponse.json({ error: '올바른 멜론티켓 URL이 아니에요.' }, { status: 400 })
  }

  const concert_title = await getConcertInfo(prodId)

  const { data, error } = await supabase
    .from('monitors')
    .insert([{
      concert_url,
      concert_title,
      prod_id: prodId,
      discord_webhook,
      price_threshold: parseInt(price_threshold),
      target_datetime: target_datetime || null,
      status: 'active',
      last_checked_at: null,
      last_alerted_at: null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
