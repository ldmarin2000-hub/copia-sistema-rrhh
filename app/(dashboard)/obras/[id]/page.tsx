import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import FichaObraClient from './FichaObraClient'

export default async function FichaObra({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createSupabaseServer()
  const { id } = await params

  const [
    { data: obra },
    { data: documentos },
  ] = await Promise.all([
    supabase.from('obras').select('*').eq('id', id).single(),
    supabase.from('obra_documentos').select('*').eq('id_obra', id).order('created_at', { ascending: false }),
  ])

  if (!obra) notFound()

  return (
    <FichaObraClient
      obra={obra}
      documentos={documentos || []}
    />
  )
}
