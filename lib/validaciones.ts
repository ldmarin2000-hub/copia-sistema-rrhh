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

export function validarCbu(cbu: string): boolean {
  const limpio = cbu.replace(/[^0-9]/g, '')
  if (limpio.length !== 22) return false

  const verificarBloque = (digits: string, pesos: number[]): boolean => {
    const suma = digits.slice(0, -1).split('').reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0)
    const verificador = parseInt(digits[digits.length - 1])
    const esperado = (10 - (suma % 10)) % 10
    return verificador === esperado
  }

  const bloque1 = limpio.substring(0, 8)
  const bloque2 = limpio.substring(8, 22)

  return (
    verificarBloque(bloque1, [7, 1, 3, 9, 7, 1, 3]) &&
    verificarBloque(bloque2, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3])
  )
}