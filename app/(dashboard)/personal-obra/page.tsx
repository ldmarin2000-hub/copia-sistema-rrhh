import { supabase } from '@/lib/supabase'
import PersonalObraClient from './PersonalObraClient'

export default async function PersonalObraPage() {
  const [
    { data: categorias },
    { data: obras },
  ] = await Promise.all([
    supabase.from('categorias').select('id, id_empresa, descripcion').eq('activo', true).order('descripcion'),
    supabase.from('obras').select('id, id_empresa, nombre').eq('estado', 'Activa').order('nombre'),
  ])

  return (
    <PersonalObraClient
      categorias={categorias || []}
      obras={obras || []}
    />
  )
}
