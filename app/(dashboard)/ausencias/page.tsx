import { supabase } from '@/lib/supabase'
import AusenciasClient from './AusenciasClient'

export default async function Ausencias() {
  const [
    { data: ausencias },
    { data: tiposAusencia },
    { data: legajos },
  ] = await Promise.all([
    supabase.from('ausencias_periodo')
      .select('*, tipos_ausencia(descripcion, requiere_certificado), legajos(apellido, nombre, nro_legajo, id_empresa, id_obra)')
      .order('fecha_desde', { ascending: false }),
    supabase.from('tipos_ausencia')
      .select('id, descripcion, requiere_certificado').eq('activo', true).order('descripcion'),
    supabase.from('legajos')
      .select('id, id_empresa, apellido, nombre, nro_legajo, id_obra')
      .eq('estado', 'Activo').order('apellido'),
  ])

  return (
    <AusenciasClient
      ausencias={ausencias || []}
      tiposAusencia={tiposAusencia || []}
      legajos={legajos || []}
    />
  )
}