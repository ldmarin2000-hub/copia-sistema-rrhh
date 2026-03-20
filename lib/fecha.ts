export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  // Tomar solo la parte de fecha sin convertir timezone
  const [anio, mes, dia] = fecha.split('T')[0].split('-')
  return `${dia}/${mes}/${anio}`
}