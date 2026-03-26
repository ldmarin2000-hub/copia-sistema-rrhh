import { createSupabaseServer } from '@/lib/supabase-server'
import ObrasClient from './ObrasClient'

export default async function Obras() {
  const supabase = await createSupabaseServer()
  const { data: obras, error } = await supabase
    .from('obras')
    .select('*, empresas(razon_social)')
    .order('nombre')

  if (error) {
    return <p style={{ color: 'var(--c-red)' }}>Error: {error.message}</p>
  }

  return <ObrasClient obras={obras || []} />
}