import { createSupabaseServer } from '@/lib/supabase-server'
import EppCatalogoClient from './EppCatalogoClient'

export default async function EppCatalogoPage() {
  const supabase = await createSupabaseServer()
  const [
    { data: catalogo },
    { data: talles },
  ] = await Promise.all([
    supabase.from('epp_catalogo').select('*').order('descripcion'),
    supabase.from('epp_talles').select('*').order('talle'),
  ])

  return (
    <EppCatalogoClient
      catalogo={catalogo || []}
      talles={talles || []}
    />
  )
}
