import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { nombre, activo, password } = await request.json()

  const { error: errorUsuario } = await supabaseAdmin
    .from('usuarios')
    .update({ nombre, activo })
    .eq('id', id)

  if (errorUsuario) {
    return NextResponse.json({ error: errorUsuario.message }, { status: 400 })
  }

  if (password) {
    const { error: errorAuth } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { password }
    )
    if (errorAuth) {
      return NextResponse.json({ error: errorAuth.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}