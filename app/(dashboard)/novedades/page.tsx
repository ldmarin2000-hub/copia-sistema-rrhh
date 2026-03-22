import { supabase } from '@/lib/supabase'
import NovedadesClient from './NovedadesClient'

export default async function Novedades() {
  const [
    { data: legajos },
    { data: obras },
    { data: adicionales },
    { data: plantillas },
    { data: categorias },
  ] = await Promise.all([
    supabase.from('legajos')
      .select('id, id_empresa, nro_legajo, apellido, nombre, id_obra, id_categoria, id_plantilla')
      .eq('estado', 'Activo')
      .order('apellido'),
    supabase.from('obras')
      .select('id, id_empresa, nombre')
      .eq('estado', 'Activa')
      .order('nombre'),
    supabase.from('adicionales')
      .select('id, id_empresa, codigo, descripcion, aplica_por')
      .eq('activo', true)
      .order('descripcion'),
    supabase.from('plantillas_jornada')
      .select('id, lunes, martes, miercoles, jueves, viernes, sabado, domingo')
      .eq('activo', true),
    supabase.from('categorias')
      .select('id, id_plantilla')
      .eq('activo', true),
  ])

  return (
    <NovedadesClient
      legajos={legajos || []}
      obras={obras || []}
      adicionales={adicionales || []}
      plantillas={plantillas || []}
      categorias={categorias || []}
    />
  )
}