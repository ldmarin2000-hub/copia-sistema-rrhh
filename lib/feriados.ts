/**
 * Utilidades unificadas para consulta de feriados efectivos.
 * Esta es la única forma de consultar feriados en todo el sistema.
 */

export type FeriadoEfectivo = {
  id: number | string
  fecha: string
  descripcion: string
}

/**
 * Devuelve los feriados efectivos para una empresa en un rango de fechas.
 * Incluye:
 *  - Feriados nacionales donde la empresa NO tiene registro trabaja=true
 *  - Feriados propios de la empresa donde trabaja=false
 */
export async function getFeriadosEfectivos(
  supabase: any,
  desde: string,
  hasta: string,
  empresaId: number
): Promise<FeriadoEfectivo[]> {
  const [{ data: nacionales }, { data: propios }] = await Promise.all([
    supabase
      .from('feriados')
      .select('id, fecha, descripcion')
      .eq('activo', true)
      .gte('fecha', desde)
      .lte('fecha', hasta),
    supabase
      .from('feriados_empresa')
      .select('id, fecha, descripcion')
      .eq('id_empresa', empresaId)
      .eq('tipo', 'propio')
      .eq('trabaja', false)
      .gte('fecha', desde)
      .lte('fecha', hasta),
  ])

  const nacArray: FeriadoEfectivo[] = nacionales || []
  let efectivosNacionales = nacArray

  if (nacArray.length > 0) {
    const { data: excepciones } = await supabase
      .from('feriados_empresa')
      .select('id_feriado, trabaja')
      .eq('id_empresa', empresaId)
      .eq('tipo', 'heredado')
      .in('id_feriado', nacArray.map((f) => f.id))

    const trabajaIds = new Set(
      ((excepciones || []) as any[]).filter((e) => e.trabaja).map((e) => e.id_feriado)
    )
    efectivosNacionales = nacArray.filter((f) => !trabajaIds.has(f.id))
  }

  const propiosArr: FeriadoEfectivo[] = (propios || []).map((p: any) => ({
    id: `propio_${p.id}`,
    fecha: p.fecha,
    descripcion: p.descripcion,
  }))

  return [...efectivosNacionales, ...propiosArr]
}

/**
 * Verifica si una fecha específica es feriado efectivo para la empresa.
 * Retorna info del feriado o null si no lo es.
 */
export async function getFeriadoDelDia(
  supabase: any,
  fecha: string,
  empresaId: number
): Promise<{ descripcion: string; tipo: string } | null> {
  // Verificar nacional
  const { data: nacional } = await supabase
    .from('feriados')
    .select('id, descripcion, tipo')
    .eq('fecha', fecha)
    .eq('activo', true)
    .maybeSingle()

  if (nacional) {
    const { data: excepcion } = await supabase
      .from('feriados_empresa')
      .select('trabaja')
      .eq('id_empresa', empresaId)
      .eq('id_feriado', nacional.id)
      .maybeSingle()
    if (!excepcion?.trabaja) {
      return { descripcion: nacional.descripcion, tipo: nacional.tipo }
    }
  }

  // Verificar propio
  const { data: propio } = await supabase
    .from('feriados_empresa')
    .select('descripcion')
    .eq('id_empresa', empresaId)
    .eq('tipo', 'propio')
    .eq('fecha', fecha)
    .eq('trabaja', false)
    .maybeSingle()

  if (propio) {
    return { descripcion: propio.descripcion, tipo: 'propio' }
  }

  return null
}
