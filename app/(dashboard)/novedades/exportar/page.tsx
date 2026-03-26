import { createSupabaseServer } from '@/lib/supabase-server'
import ExportarClient from './ExportarClient'

export default async function ExportarNovedades() {
  const supabase = await createSupabaseServer()
  const [
    { data: obras },
    { data: adicionales },
    { data: tiposAusencia },
    { data: plantillas },
    { data: categorias },
  ] = await Promise.all([
    supabase.from('obras').select('id, id_empresa, nombre').eq('estado', 'Activa').order('nombre'),
    supabase.from('adicionales').select('id, id_empresa, codigo, descripcion').eq('activo', true).order('descripcion'),
    supabase.from('tipos_ausencia').select('id, codigo, descripcion, cuenta_dias_corridos').eq('activo', true).order('descripcion'),
    supabase.from('plantillas_jornada').select('id, lunes, martes, miercoles, jueves, viernes, sabado, domingo').eq('activo', true),
    supabase.from('categorias').select('id, id_plantilla').eq('activo', true),
  ])

  return (
    <ExportarClient
      obras={obras || []}
      adicionales={adicionales || []}
      tiposAusencia={tiposAusencia || []}
      plantillas={plantillas || []}
      categorias={categorias || []}
    />
  )
}
