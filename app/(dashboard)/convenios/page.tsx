import { createSupabaseServer } from '@/lib/supabase-server'
import ConveniosClient from './ConveniosClient'

export default async function Convenios() {
  const supabase = await createSupabaseServer()
  const [{ data: convenios, error }, { data: metodos }] = await Promise.all([
    supabase.from('convenios').select('*, empresas(razon_social)').order('descripcion'),
    supabase.from('metodos_vacaciones').select('id, nombre').eq('activo', true).order('id'),
  ])

  if (error) {
    return <p style={{ color: 'var(--c-red)' }}>Error: {error.message}</p>
  }

  return <ConveniosClient convenios={convenios || []} metodos={metodos || []} />
}