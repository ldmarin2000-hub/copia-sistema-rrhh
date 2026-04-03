import { createSupabaseServer } from '@/lib/supabase-server'
import MetodosVacacionesClient from './MetodosVacacionesClient'

export default async function MetodosVacaciones() {
  const supabase = await createSupabaseServer()
  const [
    { data: metodos },
    { data: tramos },
  ] = await Promise.all([
    supabase.from('metodos_vacaciones')
      .select('id, id_empresa, nombre, activo')
      .order('id'),
    supabase.from('metodos_vacaciones_tramos')
      .select('id, id_metodo, anios_desde, anios_hasta, dias')
      .order('id_metodo').order('anios_desde'),
  ])

  return <MetodosVacacionesClient metodos={metodos || []} tramos={tramos || []} />
}
