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
    { data: vacaciones },
    { data: plantillas },
    { data: eppEntregas },
    { data: eppCatalogo },
    { data: eppTalles },
    { data: eppHabitual },
    { data: documentos },
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
      .select('*, tipos_ausencia(descripcion, requiere_certificado)')
      .eq('id_legajo', id)
      .order('fecha_desde', { ascending: false }),
    supabase.from('tipos_ausencia')
      .select('id, descripcion, requiere_certificado').eq('activo', true).order('descripcion'),
    supabase.from('vacaciones_periodo')
      .select('*')
      .eq('id_legajo', id)
      .order('fecha_desde', { ascending: false }),
    supabase.from('plantillas_jornada')
      .select('id, id_empresa, nombre')
      .eq('activo', true)
      .order('nombre'),
    supabase.from('epp_entregas')
      .select('*, epp_catalogo(descripcion, tiene_vencimiento), obras(nombre)')
      .eq('id_legajo', id)
      .order('fecha_entrega', { ascending: false }),
    supabase.from('epp_catalogo')
      .select('id, descripcion, tiene_vencimiento, meses_renovacion, requiere_talle, controla_stock')
      .eq('activo', true)
      .order('descripcion'),
    supabase.from('epp_talles')
      .select('*')
      .eq('activo', true)
      .order('talle'),
    supabase.from('legajo_epp_habitual')
      .select('*, epp_catalogo(descripcion, requiere_talle)')
      .eq('id_legajo', id)
      .order('created_at'),
    supabase.from('legajo_documentos')
      .select('*')
      .eq('id_legajo', id)
      .order('created_at', { ascending: false }),
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
      plantillas={plantillas || []}
      eppEntregas={eppEntregas || []}
      eppCatalogo={eppCatalogo || []}
      eppTalles={eppTalles || []}
      eppHabitual={eppHabitual || []}
      documentos={documentos || []}
    />
  )
}
