import { supabase } from '@/lib/supabase'
import AdicionalesClient from './AdicionalesClient'

export default async function Adicionales() {
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