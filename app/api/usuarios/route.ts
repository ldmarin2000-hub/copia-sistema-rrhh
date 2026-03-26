import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSuperadmin() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('es_superadmin')
    .eq('id', user.id)
    .single()
  return data?.es_superadmin ? user : null
}

export async function POST(request: Request) {
  if (!await getSuperadmin()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
