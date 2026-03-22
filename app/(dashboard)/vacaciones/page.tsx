import { supabase } from '@/lib/supabase'
import VacacionesGeneralClient from './VacacionesGeneralClient'

export default async function VacacionesGeneral() {
  const [
    { data: vacaciones },
    { data: legajos },
  ] = await Promise.all([
    supabase.from('vacaciones_periodo')
      .select('*, legajos(apellido, nombre, nro_legajo, id_empresa)')
      .order('fecha_desde', { ascending: false }),
    supabase.from('legajos')
      .select('id, id_empresa, apellido, nombre, nro_legajo')
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