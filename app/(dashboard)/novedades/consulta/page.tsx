import { createSupabaseServer } from '@/lib/supabase-server'
import ConsultaClient from './ConsultaClient'

export default async function ConsultaNovedades() {
  const supabase = await createSupabaseServer()
  const [
    { data: obras },
    { data: adicionales },
  ] = await Promise.all([
    supabase.from('obras')
      .select('id, id_empresa, nombre')
      .order('nombre'),
    supabase.from('adicionales')
      .select('id, id_empresa, descripcion')
      .eq('activo', true)
      .order('descripcion'),
  ])

  return (
    <ConsultaClient
      obras={obras || []}
      adicionales={adicionales || []}
    />
  )
}