import { createSupabaseServer } from '@/lib/supabase-server'
import CategoriasClient from './CategoriasClient'

export default async function Categorias() {
  const supabase = await createSupabaseServer()
  const [
    { data: categorias },
    { data: convenios },
    { data: tipos },
    { data: plantillas },
  ] = await Promise.all([
    supabase.from('categorias')
      .select('*, empresas(razon_social), convenios(descripcion), tipos_empleado(descripcion)')
      .order('descripcion'),
    supabase.from('convenios')
      .select('id, id_empresa, descripcion').eq('activo', true).order('descripcion'),
    supabase.from('tipos_empleado')
      .select('id, id_empresa, descripcion').eq('activo', true).order('descripcion'),
    supabase.from('plantillas_jornada')
      .select('id, id_empresa, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <CategoriasClient
      categorias={categorias || []}
      convenios={convenios || []}
      tipos={tipos || []}
      plantillas={plantillas || []}
    />
  )
}