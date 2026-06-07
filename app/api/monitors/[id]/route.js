import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req, { params }) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('monitors')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_, { params }) {
  const { error } = await supabase
    .from('monitors')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
