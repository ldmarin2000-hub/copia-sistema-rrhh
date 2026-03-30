import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import FichaClient from './FichaClient'

export default async function FichaLegajo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createSupabaseServer()
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
    { data: feriadosData },
    { data: bancoHoras },
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
    supabase.from('feriados')
      .select('fecha'),
    supabase.from('banco_horas_movimientos')
      .select('id, fecha, tipo, horas, concepto')
      .eq('id_legajo', id)
      .order('fecha', { ascending: false }),
  ])

  if (!legajo) notFound()

  const feriados = (feriadosData || []).map((f: any) => f.fecha as string)
  const fechaReconocida: string | undefined = (legajo as any).fecha_reconocida ?? undefined

  // Baja date from historial laboral
  const fechaBaja: string | undefined = legajo.estado === 'Baja'
    ? (historico_laboral || []).find((h: any) => h.fecha_egreso)?.fecha_egreso ?? undefined
    : undefined

  // Resolve método de vacaciones: legajo override → convenio de la categoría → null
  const idMetodoLegajo = (legajo as any).id_metodo_vacaciones as number | null
  let idMetodo = idMetodoLegajo

  if (!idMetodo && legajo.id_categoria) {
    const { data: cat } = await supabase
      .from('categorias')
      .select('convenios(id_metodo_vacaciones)')
      .eq('id', legajo.id_categoria)
      .single()
    idMetodo = (cat?.convenios as any)?.id_metodo_vacaciones ?? null
  }

  let tramosVacaciones: { id: number; anios_desde: number; anios_hasta: number | null; dias: number }[] = []
  let metodoNombre = ''
  let saldoInicial: { fecha_corte: string; saldo_dias: number; observacion?: string } | null = null

  if (idMetodo) {
    const [{ data: metodo }, { data: tramos }, { data: saldo }] = await Promise.all([
      supabase.from('metodos_vacaciones').select('nombre').eq('id', idMetodo).single(),
      supabase.from('metodos_vacaciones_tramos')
        .select('id, anios_desde, anios_hasta, dias')
        .eq('id_metodo', idMetodo)
        .order('anios_desde'),
      supabase.from('vacaciones_saldo_inicial')
        .select('fecha_corte, saldo_dias, observacion')
        .eq('id_legajo', id)
        .single(),
    ])
    tramosVacaciones = tramos || []
    metodoNombre = metodo?.nombre || ''
    saldoInicial = saldo ?? null
  }

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
      tramosVacaciones={tramosVacaciones}
      metodoNombre={metodoNombre}
      saldoInicial={saldoInicial}
      fechaBaja={fechaBaja}
      fechaReconocida={fechaReconocida}
      feriados={feriados}
      bancoHoras={bancoHoras || []}
    />
  )
}
