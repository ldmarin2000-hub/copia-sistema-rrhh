import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import FichaClient from './FichaClient'

export default async function FichaLegajo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [
    { data: legajo },
    { data: historico_laboral },
    { data: historico_categorias },
    { data: historico_obras },
    { data: categorias },
    { data: obras },
    { data: ausencias },
    { data: tiposAusencia },
    { data: vacaciones } = await supabase
      .from('vacaciones_periodo')
      .select('*')
      .eq('id_legajo', id)
      .order('fecha_desde', { ascending: false }),
  ] = await Promise.all([
    supabase.from('legajos')
      .select('*, categorias(descripcion), obras(nombre)')
      .eq('id', id).single(),
    supabase.from('legajos_historial_laboral')
      .select('*').eq('id_legajo', id)
      .order('fecha_ingreso', { ascending: false }),
    supabase.from('legajos_historico_categorias')
      .select('*, categorias(descripcion)').eq('id_legajo', id)
      .order('fecha_desde', { ascending: false }),
    supabase.from('legajos_historico_obras')
      .select('*, obras(nombre)').eq('id_legajo', id)
      .order('fecha_desde', { ascending: false }),
    supabase.from('categorias')
      .select('id, id_empresa, descripcion').eq('activo', true).order('descripcion'),
    supabase.from('obras')
      .select('id, id_empresa, nombre').eq('estado', 'Activa').order('nombre'),
    supabase.from('ausencias_periodo')
      .select('*, tipos_ausencia(descripcion)')
      .eq('id_legajo', id)
      .order('fecha_desde', { ascending: false }),
    supabase.from('tipos_ausencia')
      .select('id, descripcion').eq('activo', true).order('descripcion'),
    supabase.from('plantillas_jornada')
      .select('id, id_empresa, nombre')
      .eq('activo', true)
      .order('nombre'),
  ])
  

  if (!legajo) notFound()

  return (
    <FichaClient
      legajo={legajo}
      historico_laboral={historico_laboral || []}
      historico_categorias={historico_categorias || []}
      historico_obras={historico_obras || []}
      categorias={categorias || []}
      obras={obras || []}
      ausencias={ausencias || []}
      tiposAusencia={tiposAusencia || []}
      vacaciones={vacaciones || []}
    />
  )
}