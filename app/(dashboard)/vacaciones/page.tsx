import { createSupabaseServer } from '@/lib/supabase-server'
import VacacionesGeneralClient from './VacacionesGeneralClient'

export default async function VacacionesGeneral() {
  const supabase = await createSupabaseServer()
  const [
    { data: vacaciones },
    { data: legajos },
  ] = await Promise.all([
    supabase.from('vacaciones_periodo')
      .select('*, legajos(apellido, nombre, nro_legajo, id_empresa, id_obra)')
      .order('fecha_desde', { ascending: false }),
    supabase.from('legajos')
      .select('id, id_empresa, apellido, nombre, nro_legajo, id_obra')
      .eq('estado', 'Activo')
      .order('apellido'),
  ])

  return (
    <VacacionesGeneralClient
      vacaciones={vacaciones || []}
      legajos={legajos || []}
    />
  )
}