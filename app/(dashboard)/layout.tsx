import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import { EmpresaProvider } from './context/EmpresaContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabaseServer.auth.getUser()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, es_superadmin')
    .eq('id', user?.id)
    .single()

  let empresas: { id: number, razon_social: string, permite_editar_epp: boolean }[] = []
  let rol: 'SUPERADMIN' | 'ADMIN' | 'RRHH_ADMIN' | 'JEFE_OBRA' | null = null
  let obrasJefe: number[] = []

  if (usuario?.es_superadmin) {
    const { data } = await supabase
      .from('empresas')
      .select('id, razon_social, permite_editar_epp')
      .eq('activo', true)
      .order('razon_social')
    empresas = data || []
    rol = 'SUPERADMIN'
  } else {
    const { data } = await supabase
      .from('permisos_empresas')
      .select('empresas(id, razon_social, permite_editar_epp), roles(codigo)')
      .eq('id_usuario', user?.id)
    empresas = data?.map((p: any) => p.empresas) || []
    // Tomar el rol de mayor jerarquía
    const roles = data?.map((p: any) => p.roles?.codigo) || []
    if (roles.includes('ADMIN')) rol = 'ADMIN'
    else if (roles.includes('RRHH_ADMIN')) rol = 'RRHH_ADMIN'
    else if (roles.includes('JEFE_OBRA')) rol = 'JEFE_OBRA'

    // Cargar obras asignadas si es jefe de obra
    if (rol === 'JEFE_OBRA') {
      const { data: obrasData } = await supabase
        .from('usuario_obras')
        .select('id_obra')
        .eq('id_usuario', user?.id)
      obrasJefe = (obrasData || []).map((o: any) => o.id_obra)
    }
  }

  const inicial = empresas.length > 0 ? empresas[0] : null

  return (
    <EmpresaProvider
      empresas={empresas}
      inicial={inicial}
      rol={rol}
      esSuperadmin={usuario?.es_superadmin || false}
      obrasJefe={obrasJefe}
    >
      <div style={{ minHeight: '100vh', background: 'var(--c-base)' }}>
        <Header
          nombreUsuario={usuario?.nombre || ''}
          empresas={empresas}
        />
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main style={{
            flex: 1, padding: '24px',
            maxWidth: '1280px', color: 'var(--c-text-primary)',
          }}>
            {children}
          </main>
        </div>
      </div>
    </EmpresaProvider>
  )
}