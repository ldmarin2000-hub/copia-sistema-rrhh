import { createSupabaseServer } from '@/lib/supabase-server'
import TiposAusenciaClient from './TiposAusenciaClient'

export default async function TiposAusencia() {
  const supabase = await createSupabaseServer()
  const { data: tipos } = await supabase
    .from('tipos_ausencia')
    .select('*')
    .order('descripcion')

  return <TiposAusenciaClient tipos={tipos || []} />
}