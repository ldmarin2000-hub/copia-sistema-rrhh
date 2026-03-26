import { createSupabaseServer } from '@/lib/supabase-server'
import TiposEmpleadoClient from './TiposEmpleadoClient'

export default async function TiposEmpleado() {
  const supabase = await createSupabaseServer()
  const { data: tipos, error } = await supabase
    .from('tipos_empleado')
    .select('*, empresas(razon_social)')
    .order('descripcion')

  if (error) {
    return <p style={{ color: 'var(--c-red)' }}>Error: {error.message}</p>
  }

  return <TiposEmpleadoClient tipos={tipos || []} />
}