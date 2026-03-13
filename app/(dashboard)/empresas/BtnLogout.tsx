"use client"

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function BtnLogout() {
  const router = useRouter()

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={cerrarSesion}
      className="text-sm text-red-500 hover:text-red-700"
    >
      Cerrar sesión
    </button>
  )
}