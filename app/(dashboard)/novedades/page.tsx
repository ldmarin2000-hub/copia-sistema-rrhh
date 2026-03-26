import { createSupabaseServer } from '@/lib/supabase-server'
import NovedadesClient from './NovedadesClient'

export default async function Novedades() {
  const supabase = await createSupabaseServer()
  const [
    { data: legajos },
    { data: obras },
    { data: adicionales },
    { data: plantillas },
    { data: categorias },
    { data: tiposAusencia },
  ] = await Promise.all([
    supabase.from('legajos')
      .select('id, id_empresa, nro_legajo, apellido, nombre, id_obra, id_categoria, id_plantilla, fecha_ingreso')
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
    supabase.from('tipos_ausencia')
      .select('id, codigo, descripcion')
      .eq('activo', true)
      .order('descripcion'),
  ])

  return (
    <NovedadesClient
      legajos={legajos || []}
      obras={obras || []}
      adicionales={adicionales || []}
      plantillas={plantillas || []}
      categorias={categorias || []}
      tiposAusencia={tiposAusencia || []}
    />
  )
}
