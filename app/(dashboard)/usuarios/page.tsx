import { createSupabaseServer } from '@/lib/supabase-server'
import UsuariosClient from './UsuariosClient'

export default async function Usuarios() {
  const supabase = await createSupabaseServer()
  const [
    { data: usuarios },
    { data: empresas },
    { data: roles },
    { data: permisos },
    { data: obras },
    { data: usuarioObras },
  ] = await Promise.all([
    supabase.from('usuarios').select('*').order('nombre'),
    supabase.from('empresas').select('id, razon_social').order('razon_social'),
    supabase.from('roles').select('*'),
    supabase.from('permisos_empresas').select('*, empresas(razon_social), roles(descripcion)'),
    supabase.from('obras').select('id, id_empresa, nombre').eq('estado', 'Activa').order('nombre'),
    supabase.from('usuario_obras').select('id, id_usuario, id_obra, obras(nombre)'),
  ])

  return (
    <UsuariosClient
      usuarios={usuarios || []}
      empresas={empresas || []}
      roles={roles || []}
      permisos={permisos || []}
      obras={obras || []}
      usuarioObras={usuarioObras || []}
    />
  )
}