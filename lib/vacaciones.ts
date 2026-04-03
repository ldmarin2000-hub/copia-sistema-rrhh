export type TramoVacaciones = {
  anios_desde: number
  anios_hasta: number | null
  dias: number
}

// Calcula años efectivos aplicando la regla de ≥ 6 meses = año completo
export function calcularAniosEfectivos(fechaIngreso: string, fechaRef: string): number {
  const ingreso = new Date(fechaIngreso + 'T00:00:00')
  const ref = new Date(fechaRef + 'T00:00:00')

  let meses =
    (ref.getFullYear() - ingreso.getFullYear()) * 12 +
    (ref.getMonth() - ingreso.getMonth())
  if (ref.getDate() < ingreso.getDate()) meses--
  if (meses < 0) meses = 0

  const aniosCompletos = Math.floor(meses / 12)
  const mesesParciales = meses % 12

  return mesesParciales >= 6 ? aniosCompletos + 1 : aniosCompletos
}

export function getDiasTramo(anios: number, tramos: TramoVacaciones[]): number {
  if (!tramos || tramos.length === 0) return 0
  const sorted = [...tramos].sort((a, b) => a.anios_desde - b.anios_desde)
  for (const t of sorted) {
    if (anios >= t.anios_desde && (t.anios_hasta === null || anios <= t.anios_hasta)) {
      return t.dias
    }
  }
  return sorted[sorted.length - 1]?.dias || 0
}

// Cuenta días hábiles (lunes a viernes, excluyendo feriados) entre dos fechas, inclusive
export function calcularDiasHabiles(desde: string, hasta: string, feriados: string[] = []): number {
  const d = new Date(desde + 'T00:00:00')
  const h = new Date(hasta + 'T00:00:00')
  const setFeriados = new Set(feriados)
  let count = 0
  const cur = new Date(d)
  while (cur <= h) {
    const dow = cur.getDay() // 0=domingo, 6=sábado
    const iso = cur.toISOString().split('T')[0]
    if (dow !== 0 && dow !== 6 && !setFeriados.has(iso)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Calcula días de vacaciones para un año dado
// fechaBaja con mismo año que ingreso → 1 día cada 20 hábiles (no completó un período)
// fechaBaja con año posterior al ingreso → proporcional (días del año / 365)
export function calcularDiasVacaciones(
  fechaIngreso: string,
  fechaRef: string,
  tramos: TramoVacaciones[],
  fechaBaja?: string,
  feriados: string[] = []
): number {
  const aniosEfectivos = calcularAniosEfectivos(fechaIngreso, fechaRef)
  const diasBase1erAnio = getDiasTramo(1, tramos)

  if (aniosEfectivos === 0 && !fechaBaja) {
    // < 6 meses sin baja: proporcional por meses trabajados
    const ingreso = new Date(fechaIngreso + 'T00:00:00')
    const ref = new Date(fechaRef + 'T00:00:00')
    let meses = (ref.getFullYear() - ingreso.getFullYear()) * 12 + (ref.getMonth() - ingreso.getMonth())
    if (ref.getDate() < ingreso.getDate()) meses--
    return Math.round(diasBase1erAnio / 12 * Math.max(0, meses))
  }

  if (fechaBaja) {
    const anioIngreso = new Date(fechaIngreso + 'T00:00:00').getFullYear()
    const anioBaja = new Date(fechaBaja + 'T00:00:00').getFullYear()

    if (anioIngreso === anioBaja) {
      // Nunca completó un período vacacional: 1 día cada 20 días hábiles
      const habilesTotal = calcularDiasHabiles(fechaIngreso, fechaBaja, feriados)
      return Math.floor(habilesTotal / 20)
    }

    // Proporcional baja: dias_tramo / 365 * días trabajados en el año de baja
    const diasTramo = getDiasTramo(aniosEfectivos, tramos)
    const baja = new Date(fechaBaja + 'T00:00:00')
    const iniAnio = new Date(`${baja.getFullYear()}-01-01T00:00:00`)
    const diasEnAnio = Math.floor((baja.getTime() - iniAnio.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return Math.round(diasTramo / 365 * diasEnAnio * 10) / 10
  }

  return getDiasTramo(aniosEfectivos, tramos)
}

// Suma días ganados desde año(fechaCorte) hasta año actual (o baja)
// Un año solo se acredita cuando el 31/10 de ese año ya pasó (cierre del período vacacional)
// Excepción: el año de baja siempre se cuenta (proporcional o 1/20 hábiles según corresponda)
export function calcularGanadoDesdeCorte(
  fechaIngreso: string,
  fechaCorte: string,
  tramos: TramoVacaciones[],
  fechaBaja?: string,
  feriados: string[] = []
): number {
  const añoInicio = new Date(fechaCorte + 'T00:00:00').getFullYear()
  const hoy = new Date()
  const fechaLimite = fechaBaja ? new Date(fechaBaja + 'T00:00:00') : hoy
  const añoFin = fechaLimite.getFullYear()

  let total = 0
  for (let año = añoInicio; año <= añoFin; año++) {
    const esBajaEsteAño = !!fechaBaja && new Date(fechaBaja + 'T00:00:00').getFullYear() === año

    // Si no es año de baja, solo contar si el 31/10 ya pasó
    if (!esBajaEsteAño) {
      const cierreAnio = new Date(`${año}-10-31T00:00:00`)
      if (fechaLimite < cierreAnio) continue
    }

    total += calcularDiasVacaciones(
      fechaIngreso,
      `${año}-12-31`,
      tramos,
      esBajaEsteAño ? fechaBaja : undefined,
      feriados
    )
  }

  return Math.round(total * 10) / 10
}

export function calcularTomadosDesdeCorte(
  vacaciones: { fecha_desde: string; fecha_hasta: string }[],
  fechaCorte: string
): number {
  return vacaciones
    .filter(v => v.fecha_desde >= fechaCorte)
    .reduce((sum, v) => {
      const d = new Date(v.fecha_desde + 'T00:00:00')
      const h = new Date(v.fecha_hasta + 'T00:00:00')
      return sum + Math.max(0, Math.floor((h.getTime() - d.getTime()) / 86400000) + 1)
    }, 0)
}

export function formatAntigüedad(fechaIngreso: string, fechaRef: string): string {
  const ingreso = new Date(fechaIngreso + 'T00:00:00')
  const ref = new Date(fechaRef + 'T00:00:00')
  let meses =
    (ref.getFullYear() - ingreso.getFullYear()) * 12 + (ref.getMonth() - ingreso.getMonth())
  if (ref.getDate() < ingreso.getDate()) meses--
  meses = Math.max(0, meses)

  const años = Math.floor(meses / 12)
  const m = meses % 12

  if (años === 0 && m === 0) return 'menos de 1 mes'
  if (años === 0) return `${m} mes${m !== 1 ? 'es' : ''}`
  if (m === 0) return `${años} año${años !== 1 ? 's' : ''}`
  return `${años} año${años !== 1 ? 's' : ''} y ${m} mes${m !== 1 ? 'es' : ''}`
}
