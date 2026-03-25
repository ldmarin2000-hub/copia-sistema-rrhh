export function traducirError(mensaje: string): string {
  if (mensaje.includes('foreign key') || mensaje.includes('violates foreign key'))
    return 'No se puede eliminar: tiene registros asociados.'
  if (mensaje.includes('unique') || mensaje.includes('duplicate key') || mensaje.includes('already exists'))
    return 'Ya existe un registro con esos datos.'
  if (mensaje.includes('not null') || mensaje.includes('null value'))
    return 'Faltan datos obligatorios.'
  if (mensaje.includes('check constraint') || mensaje.includes('violates check'))
    return 'Algún valor ingresado no es válido.'
  if (mensaje.includes('permission denied') || mensaje.includes('row-level security'))
    return 'No tenés permisos para realizar esta acción.'
  return 'Ocurrió un error. Intentá de nuevo.'
}
