import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AuditoriaClient from './AuditoriaClient'

export default async function AuditoriaPage() {
  const supabase = await createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('es_superadmin')
    .eq('id', user.id)
    .single()

  const { data: permisosUsuario } = await supabase
    .from('permisos_empresas')
    .select('id_empresa, roles(descripcion)')
    .eq('id_usuario', user.id)

  const esAdmin = usuario?.es_superadmin ||
    (permisosUsuario || []).some((p: any) => p.roles?.descripcion === 'ADMIN')

  if (!esAdmin) redirect('/dashboard')

  const [
    { data: empresas },
    { data: usuarios },
  ] = await Promise.all([
    supabase.from('empresas').select('id, razon_social').eq('activo', true).order('razon_social'),
    supabase.from('usuarios').select('id, nombre, email').order('nombre'),
  ])

  return (
    <AuditoriaClient
      esSuperadmin={!!usuario?.es_superadmin}
      empresas={empresas || []}
      usuarios={usuarios || []}
    />
  )
}
