import { supabase } from '@/lib/supabase'
import EppClient from './EppClient'

export default async function Epp() {
  const [
    { data: catalogo },
    { data: talles },
    { data: stock },
    { data: entregas },
    { data: obras },
    { data: legajos },
    { data: movimientos },
    { data: detalleEntregas },
    { data: habitualTodos },
  ] = await Promise.all([
    supabase.from('epp_catalogo')
      .select('*')
      .order('descripcion'),
    supabase.from('epp_talles')
      .select('*')
      .eq('activo', true)
      .order('talle'),
    supabase.from('epp_stock')
      .select('*, epp_catalogo(descripcion), obras(nombre)')
      .order('updated_at', { ascending: false }),
    supabase.from('epp_entregas')
      .select('*, epp_catalogo(descripcion), legajos(apellido, nombre, nro_legajo), obras(nombre)')
      .order('fecha_entrega', { ascending: false }),
    supabase.from('obras')
      .select('id, id_empresa, nombre')
      .eq('estado', 'Activa')
      .order('nombre'),
    supabase.from('legajos')
      .select('id, id_empresa, apellido, nombre, nro_legajo')
      .eq('estado', 'Activo')
      .order('apellido'),
    supabase.from('epp_movimientos')
      .select('*, epp_movimientos_items(*, epp_catalogo(descripcion)), legajos(apellido, nombre, nro_legajo)')
      .order('fecha', { ascending: false }),
    supabase.from('epp_detalle_entregas')
      .select('*, epp_detalle_entregas_items(*, epp_catalogo(descripcion, tiene_vencimiento, meses_renovacion)), legajos(id, apellido, nombre, nro_legajo)')
      .order('fecha', { ascending: false }),
    supabase.from('legajo_epp_habitual')
      .select('*, epp_catalogo(id, descripcion, tiene_vencimiento, meses_renovacion), legajos(id, apellido, nombre, nro_legajo, id_empresa)'),
  ])

  return (
    <EppClient
      catalogo={catalogo || []}
      talles={talles || []}
      stock={stock || []}
      entregas={entregas || []}
      obras={obras || []}
      legajos={legajos || []}
      movimientos={movimientos || []}
      detalleEntregas={detalleEntregas || []}
      habitualTodos={habitualTodos || []}
    />
  )
}
