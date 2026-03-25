import { supabase } from '@/lib/supabase'
import ConveniosClient from './ConveniosClient'

export default async function Convenios() {
  const { data: convenios, error } = await supabase
    .from('convenios')
    .select('*, empresas(razon_social)')
    .order('descripcion')

  if (error) {
    return <p style={{ color: 'var(--c-red)' }}>Error: {error.message}</p>
  }

  return <ConveniosClient convenios={convenios || []} />
}