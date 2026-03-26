import { createSupabaseServer } from '@/lib/supabase-server'
import AdicionalesClient from './AdicionalesClient'

export default async function Adicionales() {
  const supabase = await createSupabaseServer()
  const [
    { data: adicionales },
    { data: convenios },
  ] = await Promise.all([
    supabase.from('adicionales')
      .select('*, empresas(razon_social), convenios(descripcion)')
      .order('descripcion'),
    supabase.from('convenios')
      .select('id, id_empresa, descripcion')
      .eq('activo', true)
      .order('descripcion'),
  ])

  return (
    <AdicionalesClient
      adicionales={adicionales || []}
      convenios={convenios || []}
    />
  )
}