import { supabase } from '@/lib/supabase'
import CategoriasClient from './CategoriasClient'

export default async function Categorias() {
  const [
    { data: categorias },
    { data: convenios },
    { data: tipos },
  ] = await Promise.all([
    supabase.from('categorias').select('*, empresas(razon_social), convenios(descripcion), tipos_empleado(descripcion)').order('descripcion'),
    supabase.from('convenios').select('id, id_empresa, descripcion').order('descripcion'),
    supabase.from('tipos_empleado').select('id, id_empresa, descripcion').order('descripcion'),
  ])

  return (
    <CategoriasClient
      categorias={categorias || []}
      convenios={convenios || []}
      tipos={tipos || []}
    />
  )
}