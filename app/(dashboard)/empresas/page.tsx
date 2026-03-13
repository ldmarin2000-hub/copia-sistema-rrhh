import { supabase } from '@/lib/supabase'
import FormEmpresa from './FormEmpresa'
import BtnLogout from './BtnLogout'

export default async function Empresas() {
  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('*')

  if (error) {
    return <p>Error al cargar empresas: {error.message}</p>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Empresas</h1>
        <BtnLogout />
      </div>
      
      git add .<FormEmpresa />

      {empresas.length === 0 ? (
        <p className="text-gray-500">No hay empresas cargadas todavía.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left border">Código</th>
              <th className="p-2 text-left border">Razón Social</th>
              <th className="p-2 text-left border">CUIT</th>
              <th className="p-2 text-left border">Localidad</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((empresa) => (
              <tr key={empresa.id} className="hover:bg-gray-50">
                <td className="p-2 border">{empresa.codigo}</td>
                <td className="p-2 border">{empresa.razon_social}</td>
                <td className="p-2 border">{empresa.cuit}</td>
                <td className="p-2 border">{empresa.localidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}