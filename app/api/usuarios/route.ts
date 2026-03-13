import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { email, password, nombre, es_superadmin } = await request.json()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombre }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (es_superadmin && data.user) {
    await supabaseAdmin
      .from('usuarios')
      .update({ es_superadmin: true })
      .eq('id', data.user.id)
  }

  return NextResponse.json({ ok: true })
}