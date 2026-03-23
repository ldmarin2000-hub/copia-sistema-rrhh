import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'

export default async function Dashboard() {
  const cookieStore = await cookies()
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabaseServer.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('es_superadmin')
    .eq('id', user?.id)
    .single()

  // Traer empresas del usuario
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

  const [
    { count: totalActivos },
    { count: novedadesHoy },
    { count: ausenciasHoy },
    { data: eppPorVencer },
    { data: eppVencidos },
    { data: stockTodos },
    { count: remitosSinFirmar },
    { data: vacacionesHoy },
    { data: ultimasNovedades },
  ] = await Promise.all([
    supabase.from('legajos')
      .select('*', { count: 'exact', head: true })
      .in('id_empresa', idEmpresas)
      .eq('estado', 'Activo'),
    supabase.from('novedades_diarias')
      .select('*', { count: 'exact', head: true })
      .in('id_empresa', idEmpresas)
      .eq('fecha', hoy),
    supabase.from('ausencias_periodo')
      .select('*', { count: 'exact', head: true })
      .in('id_empresa', idEmpresas)
      .lte('fecha_desde', hoy)
      .gte('fecha_hasta', hoy),
    supabase.from('epp_entregas')
      .select('*, epp_catalogo(descripcion), legajos(apellido, nombre, id_empresa)')
      .in('id_empresa', idEmpresas)
      .eq('devuelto', false)
      .lte('fecha_vencimiento', en30dias)
      .gte('fecha_vencimiento', hoy)
      .order('fecha_vencimiento')
      .limit(5),
    supabase.from('epp_entregas')
      .select('*, epp_catalogo(descripcion), legajos(apellido, nombre, nro_legajo, id_empresa)')
      .in('id_empresa', idEmpresas)
      .eq('devuelto', false)
      .lt('fecha_vencimiento', hoy)
      .order('fecha_vencimiento')
      .limit(6),
    supabase.from('epp_stock')
      .select('*, epp_catalogo(descripcion)')
      .in('id_empresa', idEmpresas),
    supabase.from('epp_detalle_entregas')
      .select('*', { count: 'exact', head: true })
      .in('id_empresa', idEmpresas)
      .eq('firmado', false),
    supabase.from('vacaciones_periodo')
      .select('*, legajos(apellido, nombre, id_empresa)')
      .in('id_empresa', idEmpresas)
      .lte('fecha_desde', hoy)
      .gte('fecha_hasta', hoy)
      .limit(5),
    supabase.from('novedades_diarias')
      .select('*, legajos(apellido, nombre), obras(nombre)')
      .in('id_empresa', idEmpresas)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <DashboardClient
      totalActivos={totalActivos || 0}
      novedadesHoy={novedadesHoy || 0}
      ausenciasHoy={ausenciasHoy || 0}
      eppPorVencer={eppPorVencer || []}
      eppVencidos={eppVencidos || []}
      stockTodos={stockTodos || []}
      remitosSinFirmar={remitosSinFirmar || 0}
      vacacionesHoy={vacacionesHoy || []}
      ultimasNovedades={ultimasNovedades || []}
    />
  )
}