import { createSupabaseServer } from '@/lib/supabase-server'
import PlantillasClient from './PlantillasClient'

export default async function PlantillasJornada() {
  const supabase = await createSupabaseServer()
  const [
    { data: plantillas },
    { data: convenios },
  ] = await Promise.all([
    supabase.from('plantillas_jornada')
      .select('*, convenios(descripcion)')
      .order('nombre'),
    supabase.from('convenios')
      .select('id, id_empresa, descripcion')
      .eq('activo', true)
      .order('descripcion'),
  ])

  return (
    <PlantillasClient
      plantillas={plantillas || []}
      convenios={convenios || []}
    />
  )
}