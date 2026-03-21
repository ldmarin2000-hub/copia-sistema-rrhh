import { supabase } from '@/lib/supabase'
import FeriadosClient from './FeriadosClient'

export default async function Feriados() {
  const [
    { data: feriados },
    { data: convenios },
    { data: feriadosEmpresa },
  ] = await Promise.all([
    supabase.from('feriados')
      .select('*, convenios(descripcion)')
      .order('fecha', { ascending: false }),
    supabase.from('convenios')
      .select('id, id_empresa, descripcion')
      .eq('activo', true)
      .order('descripcion'),
    supabase.from('feriados_empresa')
      .select('*'),
  ])

  return (
    <FeriadosClient
      feriados={feriados || []}
      convenios={convenios || []}
      feriadosEmpresa={feriadosEmpresa || []}
    />
  )
}