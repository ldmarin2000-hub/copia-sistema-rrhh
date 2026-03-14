import { supabase } from '@/lib/supabase'
import UsuariosClient from './UsuariosClient'

export default async function Usuarios() {
  const [
    { data: usuarios },
    { data: empresas },
    { data: roles },
    { data: permisos },
  ] = await Promise.all([
    supabase.from('usuarios').select('*').order('nombre'),
    supabase.from('empresas').select('id, razon_social').order('razon_social'),
    supabase.from('roles').select('*'),
    supabase.from('permisos_empresas').select('*, empresas(razon_social), roles(descripcion)'),
  ])

  return (
    <UsuariosClient
      usuarios={usuarios || []}
      empresas={empresas || []}
      roles={roles || []}
      permisos={permisos || []}
    />
  )
}