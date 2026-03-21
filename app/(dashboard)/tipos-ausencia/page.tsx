import { supabase } from '@/lib/supabase'
import TiposAusenciaClient from './TiposAusenciaClient'

export default async function TiposAusencia() {
  const { data: tipos } = await supabase
    .from('tipos_ausencia')
    .select('*')
    .order('descripcion')

  return <TiposAusenciaClient tipos={tipos || []} />
}