import { supabase } from '@/lib/supabase'
import UsuariosClient from './UsuariosClient'

export default async function Usuarios() {
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nombre')

  if (error) {
    return <p style={{ color: '#f85149' }}>Error: {error.message}</p>
  }

  return <UsuariosClient usuarios={usuarios} />
}