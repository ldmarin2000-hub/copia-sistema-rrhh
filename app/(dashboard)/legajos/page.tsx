import { supabase } from '@/lib/supabase'
import LegajosClient from './LegajosClient'

export default async function Legajos() {
  const [
    { data: legajos },
    { data: categorias },
    { data: obras },
    { data: plantillas },
  ] = await Promise.all([
    supabase.from('legajos')
      .select('*, categorias(descripcion), obras(nombre)')
      .order('apellido'),
    supabase.from('categorias')
      .select('id, id_empresa, descripcion, id_plantilla')
      .eq('activo', true)
      .order('descripcion'),
    supabase.from('obras')
      .select('id, id_empresa, nombre')
      .eq('estado', 'Activa')
      .order('nombre'),
    supabase.from('plantillas_jornada')
      .select('id, id_empresa, nombre')
      .eq('activo', true)
      .order('nombre'),
  ])

  return (
    <LegajosClient
      legajos={legajos || []}
      categorias={categorias || []}
      obras={obras || []}
      plantillas={plantillas || []}
    />
  )
}