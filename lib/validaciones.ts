export function validarCuit(cuit: string): boolean {
  const limpio = cuit.replace(/[^0-9]/g, '')
  
  if (limpio.length !== 11) return false
  
  const prefijos = ['20','23','24','27','30','33','34']
  if (!prefijos.includes(limpio.substring(0, 2))) return false
  
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0
  
  for (let i = 0; i < 10; i++) {
    suma += parseInt(limpio[i]) * multiplicadores[i]
  }
  
  const resto = suma % 11
  
  if (resto === 1) return false
  
  const digitoVerificador = resto === 0 ? 0 : 11 - resto
  
  return digitoVerificador === parseInt(limpio[10])
}

export function formatearCuit(cuit: string): string {
  const limpio = cuit.replace(/[^0-9]/g, '')
  if (limpio.length !== 11) return cuit
  return `${limpio.substring(0,2)}-${limpio.substring(2,10)}-${limpio[10]}`
}