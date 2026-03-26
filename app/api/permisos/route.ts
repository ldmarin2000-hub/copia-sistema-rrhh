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

  const { id_usuario, id_empresa, id_rol } = await request.json()

  const { error } = await supabaseAdmin
    .from('permisos_empresas')
    .insert({ id_usuario, id_empresa, id_rol })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  if (!await getSuperadmin()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await request.json()

  const { error } = await supabaseAdmin
    .from('permisos_empresas')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
