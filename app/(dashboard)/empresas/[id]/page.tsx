import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import FichaEmpresaClient from './FichaEmpresaClient'

export default async function FichaEmpresa({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createSupabaseServer()
  const { id } = await params

  const [
    { data: empresa },
    { data: documentos },
    { data: presentaciones },
    { data: configBH },
  ] = await Promise.all([
    supabase.from('empresas').select('*').eq('id', id).single(),
    supabase.from('empresa_documentos').select('*').eq('id_empresa', id).order('created_at', { ascending: false }),
    supabase.from('empresa_presentaciones').select('*').eq('id_empresa', id).order('periodo', { ascending: false }),
    supabase.from('banco_horas_config_empresa')
      .select('id, modalidad, tope_mensual_horas, tope_anual_horas, tope_acumulado_banco')
      .eq('empresa_id', id)
      .maybeSingle(),
  ])

  if (!empresa) notFound()

  return (
    <FichaEmpresaClient
      empresa={empresa}
      documentos={documentos || []}
      presentaciones={presentaciones || []}
      configBH={configBH ?? null}
    />
  )
}
