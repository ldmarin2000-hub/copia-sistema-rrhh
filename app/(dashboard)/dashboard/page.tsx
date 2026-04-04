import { createSupabaseServer } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function Dashboard() {
  const supabase = await createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('es_superadmin')
    .eq('id', user?.id)
    .single()

  let idEmpresas: number[] = []
  if (usuario?.es_superadmin) {
    const { data } = await supabase.from('empresas').select('id').eq('activo', true)
    idEmpresas = data?.map(e => e.id) || []
  } else {
    const { data } = await supabase
      .from('permisos_empresas').select('id_empresa').eq('id_usuario', user?.id)
    idEmpresas = data?.map(p => p.id_empresa) || []
  }

  const hoy = new Date().toISOString().split('T')[0]
  const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Round 1 — queries paralelas
  const [
    { count: totalActivos },
    { data: ausenciasHoyList },
    { count: vacacionesHoyCount },
    { data: legajosActivosList },
    { data: novedadesHoyList },
    { data: documentosPorVencer },
    { data: feriadosNacHoy },
    { data: ferEmpresaHoy },
    { data: feriadosNacProx },
    { data: ferEmpresaProx },
  ] = await Promise.all([
    supabase.from('legajos')
      .select('*', { count: 'exact', head: true })
      .in('id_empresa', idEmpresas)
      .eq('estado', 'Activo'),
    supabase.from('ausencias_periodo')
      .select('id, id_legajo, id_empresa, fecha_desde, fecha_hasta, tipos_ausencia(id, descripcion), legajos(apellido, nombre)')
      .in('id_empresa', idEmpresas)
      .lte('fecha_desde', hoy)
      .gte('fecha_hasta', hoy),
    supabase.from('vacaciones_periodo')
      .select('*', { count: 'exact', head: true })
      .in('id_empresa', idEmpresas)
      .lte('fecha_desde', hoy)
      .gte('fecha_hasta', hoy),
    supabase.from('legajos')
      .select('id, id_empresa')
      .in('id_empresa', idEmpresas)
      .eq('estado', 'Activo'),
    supabase.from('novedades_diarias')
      .select('id_legajo, id_empresa')
      .in('id_empresa', idEmpresas)
      .eq('fecha', hoy),
    supabase.from('legajo_documentos')
      .select('id, id_legajo, nombre, fecha_vencimiento, legajos(apellido, nombre, id_empresa)')
      .in('id_empresa', idEmpresas)
      .not('fecha_vencimiento', 'is', null)
      .lte('fecha_vencimiento', en30dias)
      .gte('fecha_vencimiento', hoy)
      .order('fecha_vencimiento'),
    supabase.from('feriados')
      .select('id, fecha, descripcion')
      .eq('activo', true)
      .eq('fecha', hoy),
    supabase.from('feriados_empresa')
      .select('id_empresa, id_feriado, tipo, trabaja, fecha, descripcion')
      .in('id_empresa', idEmpresas)
      .or(`fecha.eq.${hoy},and(tipo.eq.heredado,id_feriado.not.is.null)`),
    supabase.from('feriados')
      .select('id, fecha, descripcion')
      .eq('activo', true)
      .gte('fecha', hoy)
      .lte('fecha', en30dias)
      .order('fecha'),
    supabase.from('feriados_empresa')
      .select('id_empresa, id_feriado, tipo, trabaja, fecha, descripcion, feriados(fecha, descripcion)')
      .in('id_empresa', idEmpresas)
      .gte('fecha', hoy)
      .lte('fecha', en30dias)
      .order('fecha'),
  ])

  // Round 2 — banco de horas (necesita ids de legajos)
  const todosLosIds = (legajosActivosList || []).map(l => l.id)
  let bancoHorasMovs: any[] = []
  if (todosLosIds.length > 0) {
    const { data } = await supabase
      .from('banco_horas_movimientos')
      .select('id_legajo, saldo_resultante')
      .in('id_legajo', todosLosIds)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
      .limit(1000)
    bancoHorasMovs = data || []
  }

  return (
    <DashboardClient
      hoy={hoy}
      sinEmpresas={idEmpresas.length === 0 && !usuario?.es_superadmin}
      totalActivos={totalActivos || 0}
      ausenciasHoyList={ausenciasHoyList || []}
      vacacionesHoyCount={vacacionesHoyCount || 0}
      legajosActivosList={legajosActivosList || []}
      novedadesHoyList={novedadesHoyList || []}
      documentosPorVencer={documentosPorVencer || []}
      feriadosNacHoy={feriadosNacHoy || []}
      ferEmpresaHoy={ferEmpresaHoy || []}
      feriadosNacProx={feriadosNacProx || []}
      ferEmpresaProx={ferEmpresaProx || []}
      bancoHorasMovs={bancoHorasMovs}
    />
  )
}
