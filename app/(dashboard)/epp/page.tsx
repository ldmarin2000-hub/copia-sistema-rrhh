import { supabase } from '@/lib/supabase'
import EppClient from './EppClient'

export default async function Epp() {
  const [
    { data: catalogo },
    { data: stock },
    { data: entregas },
    { data: obras },
    { data: legajos },
  ] = await Promise.all([
    supabase.from('epp_catalogo')
      .select('*')
      .order('descripcion'),
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
  ])

  return (
    <EppClient
      catalogo={catalogo || []}
      stock={stock || []}
      entregas={entregas || []}
      obras={obras || []}
      legajos={legajos || []}
    />
  )
}