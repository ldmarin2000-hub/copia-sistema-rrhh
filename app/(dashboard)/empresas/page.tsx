import { supabase } from '@/lib/supabase'
import EmpresasClient from './EmpresasClient'

export default async function Empresas() {
  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('*')
    .order('razon_social')

  if (error) {
    return <p style={{ color: 'var(--c-red)' }}>Error: {error.message}</p>
  }

  return <EmpresasClient empresas={empresas} />
}