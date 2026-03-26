import { createSupabaseServer } from '@/lib/supabase-server'
import EmpresasClient from './EmpresasClient'

export default async function Empresas() {
  const supabase = await createSupabaseServer()
  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('*')
    .order('razon_social')

  if (error) {
    return <p style={{ color: 'var(--c-red)' }}>Error: {error.message}</p>
  }

  return <EmpresasClient empresas={empresas} />
}