"use client"

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, User, Clock, FileText, Calendar, Pencil, Umbrella, HardHat, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatFecha } from '@/lib/fecha'
import FormLegajo from '../FormLegajo'
import AusenciasTab from './AusenciasTab'
import VacacionesTab from './VacacionesTab'
import EppTab from './EppTab'
import DocumentosLegajoTab from './DocumentosLegajoTab'
import NovedadesTab from './NovedadesTab'
import { createClient } from '@/lib/supabase-browser'





type Legajo = {
  id: number
  id_empresa: number
  nro_legajo: number
  apellido: string
  nombre: string
  cuil: string
  fecha_nacimiento?: string
  sexo?: string
  nacionalidad?: string
  tipo_documento?: string
  nro_documento?: string
  direccion?: string
  cp?: string
  localidad?: string
  provincia?: string
  telefono?: string
  fecha_ingreso: string
  id_categoria?: number
  id_obra?: number
  estado: string
  cbu?: string
  codigo_externo?: string
  activo: boolean
  categorias?: { descripcion: string }
  obras?: { nombre: string }
  
}

type HistoricoLaboral = {
  id: number
  fecha_ingreso: string
  fecha_egreso?: string
  motivo: string
  observacion?: string
}

type HistoricoCategoria = {
  id: number
  id_categoria: number
  fecha_desde: string
  fecha_hasta?: string
  categorias: { descripcion: string }
}

type HistoricoObra = {
  id: number
  id_obra: number
  fecha_desde: string
  fecha_hasta?: string
  obras: { nombre: string }
}

type Categoria = {
  id: number
  id_empresa: number
  descripcion: string
}

type Obra = {
  id: number
  id_empresa: number
  nombre: string
}

const badgeEstado = (estado: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    Activo: { bg: '#1a3a2a', color: '#3fb950' },
    Baja:   { bg: '#3a1a1a', color: '#f85149' },
  }
  const c = colores[estado] || { bg: '#21262d', color: '#8b949e' }
  
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '12px', padding: '3px 10px', borderRadius: '4px',
    }}>{estado}</span>
  )
}

const tabs = [
  { id: 'datos',     label: 'Datos',      icon: User },
  { id: 'ausencias', label: 'Ausencias',  icon: Calendar },
  { id: 'vacaciones', label: 'Vacaciones', icon: Umbrella },
  { id: 'historial', label: 'Historial',  icon: Clock },
  { id: 'documentos',label: 'Documentos', icon: FileText },
  { id: 'novedades', label: 'Novedades',  icon: Calendar },
  { id: 'epp', label: 'EPP', icon: HardHat },
]

const MOTIVOS_BAJA = ['Renuncia', 'Despido', 'Abandono', 'Fallecimiento', 'Jubilación', 'Otro']

export default function FichaClient({
  legajo, historico_laboral, historico_categorias,
  historico_obras, categorias, obras, ausencias, tiposAusencia,
  vacaciones, plantillas, eppEntregas, eppCatalogo, eppTalles, eppHabitual, documentos
}: {
  legajo: Legajo
  historico_laboral: HistoricoLaboral[]
  historico_categorias: HistoricoCategoria[]
  historico_obras: HistoricoObra[]
  categorias: Categoria[]
  obras: Obra[]
  ausencias: any[]
  tiposAusencia: any[]
  vacaciones: any[]
  plantillas: any[]
  eppEntregas: any[]
  eppCatalogo: any[]
  eppTalles: any[]
  eppHabitual: any[]
  documentos: any[]
}){
  const searchParams = useSearchParams()
  const tabInicial = searchParams.get('tab') || 'datos'
  const [tabActiva, setTabActiva] = useState(tabInicial)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Historial laboral state
  const [historicoList, setHistoricoList] = useState<HistoricoLaboral[]>(historico_laboral)
  const [legajoEstado, setLegajoEstado] = useState(legajo.estado)
  const [legajoFechaIngreso, setLegajoFechaIngreso] = useState(legajo.fecha_ingreso)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ fecha_ingreso: string; fecha_egreso: string; motivo_baja: string; observacion: string }>({ fecha_ingreso: '', fecha_egreso: '', motivo_baja: '', observacion: '' })
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')
  const [mostrarNuevaAlta, setMostrarNuevaAlta] = useState(false)
  const [nuevaAltaFecha, setNuevaAltaFecha] = useState('')
  const [nuevaAltaCatId, setNuevaAltaCatId] = useState('')
  const [nuevaAltaObraId, setNuevaAltaObraId] = useState('')
  const [nuevaAltaObs, setNuevaAltaObs] = useState('')
  const [loadingAlta, setLoadingAlta] = useState(false)
  const [errorAlta, setErrorAlta] = useState('')

  const supabase = createClient()

  const hoyLocal = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  const iniciarEdicion = (h: HistoricoLaboral) => {
    setEditandoId(h.id)
    setEditForm({
      fecha_ingreso: h.fecha_ingreso,
      fecha_egreso: h.fecha_egreso || '',
      motivo_baja: h.fecha_egreso ? h.motivo : '',
      observacion: h.observacion || '',
    })
    setErrorEdit('')
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setErrorEdit('')
  }

  const guardarEdicion = async (original: HistoricoLaboral) => {
    if (!editForm.fecha_ingreso) { setErrorEdit('La fecha de ingreso es requerida'); return }
    // Check: can't remove fecha_egreso if there's a subsequent Alta record
    if (original.fecha_egreso && !editForm.fecha_egreso) {
      const idx = historicoList.findIndex(h => h.id === original.id)
      const hasSubsequent = historicoList.slice(0, idx).some(h => !h.fecha_egreso || h.fecha_ingreso > original.fecha_ingreso)
      // historicoList is ordered DESC, so idx 0 is newest
      if (idx > 0) {
        setErrorEdit('No se puede quitar la fecha de egreso porque hay un reingreso posterior')
        return
      }
    }
    if (editForm.fecha_egreso && !editForm.motivo_baja) {
      setErrorEdit('Debe indicar el motivo de la baja')
      return
    }

    setLoadingEdit(true)
    setErrorEdit('')

    const fechaIngresoChanged = editForm.fecha_ingreso !== original.fecha_ingreso
    const egresoAdded = !original.fecha_egreso && editForm.fecha_egreso
    const egresoRemoved = original.fecha_egreso && !editForm.fecha_egreso

    // 1. Update historial_laboral record
    const motivoFinal = editForm.fecha_egreso
      ? editForm.motivo_baja
      : egresoRemoved
        ? 'Alta'
        : original.motivo
    const { error: errHL } = await supabase
      .from('legajos_historial_laboral')
      .update({
        fecha_ingreso: editForm.fecha_ingreso,
        fecha_egreso: editForm.fecha_egreso || null,
        motivo: motivoFinal,
        observacion: editForm.observacion || null,
      })
      .eq('id', original.id)
    if (errHL) { setErrorEdit('Error al guardar: ' + errHL.message); setLoadingEdit(false); return }

    // 2. If fecha_ingreso changed: update legajos + first historico_categorias + first historico_obras for this period
    if (fechaIngresoChanged) {
      await supabase.from('legajos').update({ fecha_ingreso: editForm.fecha_ingreso }).eq('id', legajo.id)
      // Find the historico_categorias record that matches this period (fecha_desde = original.fecha_ingreso)
      await supabase.from('legajos_historico_categorias')
        .update({ fecha_desde: editForm.fecha_ingreso })
        .eq('id_legajo', legajo.id)
        .eq('fecha_desde', original.fecha_ingreso)
      await supabase.from('legajos_historico_obras')
        .update({ fecha_desde: editForm.fecha_ingreso })
        .eq('id_legajo', legajo.id)
        .eq('fecha_desde', original.fecha_ingreso)
      setLegajoFechaIngreso(editForm.fecha_ingreso)
    }

    // 3. If fecha_egreso added: set legajo to Baja, close last open categoria and obra
    if (egresoAdded) {
      await supabase.from('legajos').update({ estado: 'Baja' }).eq('id', legajo.id)
      // Close last open historico_categorias
      const { data: lastCat } = await supabase
        .from('legajos_historico_categorias')
        .select('id')
        .eq('id_legajo', legajo.id)
        .is('fecha_hasta', null)
        .order('id', { ascending: false })
        .limit(1)
      if (lastCat && lastCat.length > 0) {
        await supabase.from('legajos_historico_categorias').update({ fecha_hasta: editForm.fecha_egreso }).eq('id', lastCat[0].id)
      }
      // Close last open historico_obras
      const { data: lastObra } = await supabase
        .from('legajos_historico_obras')
        .select('id')
        .eq('id_legajo', legajo.id)
        .is('fecha_hasta', null)
        .order('id', { ascending: false })
        .limit(1)
      if (lastObra && lastObra.length > 0) {
        await supabase.from('legajos_historico_obras').update({ fecha_hasta: editForm.fecha_egreso }).eq('id', lastObra[0].id)
      }
      setLegajoEstado('Baja')
    }

    // 4. If fecha_egreso removed: set legajo to Activo, clear fecha_hasta on last categoria and obra
    if (egresoRemoved) {
      await supabase.from('legajos').update({ estado: 'Activo' }).eq('id', legajo.id)
      const { data: lastCat } = await supabase
        .from('legajos_historico_categorias')
        .select('id')
        .eq('id_legajo', legajo.id)
        .order('id', { ascending: false })
        .limit(1)
      if (lastCat && lastCat.length > 0) {
        await supabase.from('legajos_historico_categorias').update({ fecha_hasta: null }).eq('id', lastCat[0].id)
      }
      const { data: lastObra } = await supabase
        .from('legajos_historico_obras')
        .select('id')
        .eq('id_legajo', legajo.id)
        .order('id', { ascending: false })
        .limit(1)
      if (lastObra && lastObra.length > 0) {
        await supabase.from('legajos_historico_obras').update({ fecha_hasta: null }).eq('id', lastObra[0].id)
      }
      setLegajoEstado('Activo')
    }

    // Update local state
    setHistoricoList(prev => prev.map(h => h.id === original.id ? {
      ...h,
      fecha_ingreso: editForm.fecha_ingreso,
      fecha_egreso: editForm.fecha_egreso || undefined,
      motivo: motivoFinal,
      observacion: editForm.observacion || undefined,
    } : h))
    if (fechaIngresoChanged || egresoAdded || egresoRemoved) await refrescarHistoricos()
    setEditandoId(null)
    setLoadingEdit(false)
  }

  const guardarNuevaAlta = async () => {
    if (!nuevaAltaFecha || !nuevaAltaCatId || !nuevaAltaObraId) {
      setErrorAlta('Completá fecha, categoría y obra')
      return
    }
    const ultimoEgreso = historicoList[0]?.fecha_egreso
    if (ultimoEgreso && nuevaAltaFecha <= ultimoEgreso) {
      setErrorAlta(`La fecha de alta debe ser posterior al egreso (${formatFecha(ultimoEgreso)})`)
      return
    }
    setLoadingAlta(true)
    setErrorAlta('')

    // 1. Insertar historial laboral
    const { data: nuevo, error } = await supabase
      .from('legajos_historial_laboral')
      .insert({ id_legajo: legajo.id, id_empresa: legajo.id_empresa, fecha_ingreso: nuevaAltaFecha, motivo: 'Alta', observacion: nuevaAltaObs || null })
      .select().single()
    if (error) { setErrorAlta(error.message); setLoadingAlta(false); return }

    // 2. Actualizar legajo estado + fecha_ingreso
    await supabase.from('legajos').update({ estado: 'Activo', fecha_ingreso: nuevaAltaFecha }).eq('id', legajo.id)

    // 3 & 4. Nueva categoría y obra (con insert directo, sin depender del trigger)
    await agregarHistoricoCat(parseInt(nuevaAltaCatId), nuevaAltaFecha)
    await agregarHistoricoObra(parseInt(nuevaAltaObraId), nuevaAltaFecha)

    // 5. Actualizar estado local
    const nuevaCatDesc = categoriasFiltradas.find(c => c.id === parseInt(nuevaAltaCatId))?.descripcion || ''
    const nuevaObraNombre = obrasFiltradas.find(o => o.id === parseInt(nuevaAltaObraId))?.nombre || ''
    setHistoricoList(prev => [nuevo, ...prev])
    setLegajoEstado('Activo')
    setLegajoFechaIngreso(nuevaAltaFecha)
    setLegajoCatDesc(nuevaCatDesc)
    setLegajoObraDesc(nuevaObraNombre)
    await refrescarHistoricos()
    setMostrarNuevaAlta(false)
    setNuevaAltaFecha(''); setNuevaAltaCatId(''); setNuevaAltaObraId(''); setNuevaAltaObs('')
    setLoadingAlta(false)
  }

  const eliminarUltimoHistorico = async () => {
    if (historicoList.length <= 1) return
    if (!confirm('¿Eliminar el último registro del historial laboral?')) return
    const ultimo = historicoList[0]
    const { error } = await supabase.from('legajos_historial_laboral').delete().eq('id', ultimo.id)
    if (error) return

    const newList = historicoList.slice(1)
    const ahoraUltimo = newList[0]
    const nuevoEstado = ahoraUltimo.fecha_egreso ? 'Baja' : 'Activo'
    await supabase.from('legajos').update({ estado: nuevoEstado, fecha_ingreso: ahoraUltimo.fecha_ingreso }).eq('id', legajo.id)

    // Borrar el registro abierto (sin fecha_hasta) de categoría y re-abrir el anterior
    const catActual = catList.find(c => !c.fecha_hasta)
    const catAnterior = catList.find(c => c.fecha_hasta)
    if (catActual) {
      const maxCatId = catActual.id
      await supabase.from('legajos_historico_categorias').delete().eq('id', catActual.id)
      if (catAnterior) {
        await supabase.from('legajos_historico_categorias').update({ fecha_hasta: null }).eq('id', catAnterior.id)
        if (catAnterior.id_categoria !== catActual.id_categoria) {
          await supabase.from('legajos').update({ id_categoria: catAnterior.id_categoria }).eq('id', legajo.id)
          const { data: arts } = await supabase.from('legajos_historico_categorias')
            .select('id').eq('id_legajo', legajo.id).gt('id', maxCatId)
          for (const a of arts || []) await supabase.from('legajos_historico_categorias').delete().eq('id', a.id)
        }
      }
    }

    // Borrar el registro abierto de obra y re-abrir el anterior
    const obraActual = obraList.find(o => !o.fecha_hasta)
    const obraAnterior = obraList.find(o => o.fecha_hasta)
    if (obraActual) {
      const maxObraId = obraActual.id
      await supabase.from('legajos_historico_obras').delete().eq('id', obraActual.id)
      if (obraAnterior) {
        await supabase.from('legajos_historico_obras').update({ fecha_hasta: null }).eq('id', obraAnterior.id)
        if (obraAnterior.id_obra !== obraActual.id_obra) {
          await supabase.from('legajos').update({ id_obra: obraAnterior.id_obra }).eq('id', legajo.id)
          const { data: arts } = await supabase.from('legajos_historico_obras')
            .select('id').eq('id_legajo', legajo.id).gt('id', maxObraId)
          for (const a of arts || []) await supabase.from('legajos_historico_obras').delete().eq('id', a.id)
        }
      }
    }

    setHistoricoList(newList)
    setLegajoEstado(nuevoEstado)
    setLegajoFechaIngreso(ahoraUltimo.fecha_ingreso)
    await refrescarHistoricos()
  }

  const ultimoHistorico = historicoList[0] // ordered DESC, first = most recent

  const diaAntes = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const agregarHistoricoCat = async (idCat: number, fechaDesde: string) => {
    const { data: antes } = await supabase.from('legajos_historico_categorias')
      .select('id').eq('id_legajo', legajo.id).order('id', { ascending: false }).limit(1)
    const maxId = antes?.[0]?.id ?? 0
    await supabase.from('legajos').update({ id_categoria: idCat }).eq('id', legajo.id)
    const { data: artefactos } = await supabase.from('legajos_historico_categorias')
      .select('id').eq('id_legajo', legajo.id).gt('id', maxId)
    for (const a of artefactos || [])
      await supabase.from('legajos_historico_categorias').delete().eq('id', a.id)
    await supabase.from('legajos_historico_categorias')
      .update({ fecha_hasta: diaAntes(fechaDesde) }).eq('id_legajo', legajo.id).is('fecha_hasta', null)
    await supabase.from('legajos_historico_categorias')
      .insert({ id_legajo: legajo.id, id_empresa: legajo.id_empresa, id_categoria: idCat, fecha_desde: fechaDesde })
  }

  const agregarHistoricoObra = async (idObra: number, fechaDesde: string) => {
    const { data: antes } = await supabase.from('legajos_historico_obras')
      .select('id').eq('id_legajo', legajo.id).order('id', { ascending: false }).limit(1)
    const maxId = antes?.[0]?.id ?? 0
    await supabase.from('legajos').update({ id_obra: idObra }).eq('id', legajo.id)
    const { data: artefactos } = await supabase.from('legajos_historico_obras')
      .select('id').eq('id_legajo', legajo.id).gt('id', maxId)
    for (const a of artefactos || [])
      await supabase.from('legajos_historico_obras').delete().eq('id', a.id)
    await supabase.from('legajos_historico_obras')
      .update({ fecha_hasta: diaAntes(fechaDesde) }).eq('id_legajo', legajo.id).is('fecha_hasta', null)
    await supabase.from('legajos_historico_obras')
      .insert({ id_legajo: legajo.id, id_empresa: legajo.id_empresa, id_obra: idObra, fecha_desde: fechaDesde })
  }

  const refrescarHistoricos = async () => {
    const [{ data: cats }, { data: obrasDatos }] = await Promise.all([
      supabase.from('legajos_historico_categorias')
        .select('*, categorias(descripcion)').eq('id_legajo', legajo.id)
        .order('fecha_desde', { ascending: false }),
      supabase.from('legajos_historico_obras')
        .select('*, obras(nombre)').eq('id_legajo', legajo.id)
        .order('fecha_desde', { ascending: false }),
    ])
    if (cats) {
      setCatList(cats)
      const actual = cats.find((c: any) => !c.fecha_hasta)
      if (actual) setLegajoCatDesc(actual.categorias?.descripcion || '')
    }
    if (obrasDatos) {
      setObraList(obrasDatos)
      const actual = obrasDatos.find((o: any) => !o.fecha_hasta)
      if (actual) setLegajoObraDesc(actual.obras?.nombre || '')
    }
  }

  // ── Historico Categorias ─────────────────────────────────────────────────────
  const [catList, setCatList] = useState<HistoricoCategoria[]>(historico_categorias)
  const [catEditandoId, setCatEditandoId] = useState<number | null>(null)
  const [catEditFecha, setCatEditFecha] = useState('')
  const [catEditCatId, setCatEditCatId] = useState('')
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState('')
  const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false)
  const [nuevaCatFecha, setNuevaCatFecha] = useState(hoyLocal)
  const [nuevaCatId, setNuevaCatId] = useState('')
  const [legajoCatDesc, setLegajoCatDesc] = useState(legajo.categorias?.descripcion || '')

  const categoriasFiltradas = categorias.filter(c => c.id_empresa === legajo.id_empresa)

  const guardarCatEdicion = async (original: HistoricoCategoria, esPrimero: boolean) => {
    setCatLoading(true); setCatError('')
    if (esPrimero) {
      // Primer registro: cambiar la categoría
      if (!catEditCatId) { setCatError('Seleccioná una categoría'); setCatLoading(false); return }
      const newCatId = parseInt(catEditCatId)
      await supabase.from('legajos_historico_categorias').update({ id_categoria: newCatId }).eq('id', original.id)
      // Si es el registro activo (sin fecha_hasta), también actualizar legajos
      if (!original.fecha_hasta) {
        const maxId = original.id
        await supabase.from('legajos').update({ id_categoria: newCatId }).eq('id', legajo.id)
        const { data: arts } = await supabase.from('legajos_historico_categorias')
          .select('id').eq('id_legajo', legajo.id).gt('id', maxId)
        for (const a of arts || []) await supabase.from('legajos_historico_categorias').delete().eq('id', a.id)
      }
    } else {
      // Registros siguientes: cambiar la fecha_desde
      if (!catEditFecha) { setCatError('La fecha es requerida'); setCatLoading(false); return }
      await supabase.from('legajos_historico_categorias').update({ fecha_desde: catEditFecha }).eq('id', original.id)
    }
    await refrescarHistoricos()
    setCatEditandoId(null); setCatLoading(false)
  }

  const eliminarCat = async (h: HistoricoCategoria, idx: number) => {
    if (!confirm('¿Eliminar este registro de categoría?')) return
    setCatLoading(true)
    await supabase.from('legajos_historico_categorias').delete().eq('id', h.id)
    if (idx === 0 && catList.length > 1) {
      const prev = catList[1]
      await supabase.from('legajos_historico_categorias').update({ fecha_hasta: null }).eq('id', prev.id)
      if (prev.id_categoria !== h.id_categoria) {
        await supabase.from('legajos').update({ id_categoria: prev.id_categoria }).eq('id', legajo.id)
        const { data: art } = await supabase.from('legajos_historico_categorias')
          .select('id').eq('id_legajo', legajo.id).order('id', { ascending: false }).limit(1)
        if (art && art.length > 0 && art[0].id > prev.id)
          await supabase.from('legajos_historico_categorias').delete().eq('id', art[0].id)
      }
    }
    await refrescarHistoricos()
    setCatLoading(false)
  }

  const guardarNuevaCat = async () => {
    if (!nuevaCatFecha || !nuevaCatId) return
    setCatLoading(true); setCatError('')
    await agregarHistoricoCat(parseInt(nuevaCatId), nuevaCatFecha)
    await refrescarHistoricos()
    setMostrarNuevaCat(false); setNuevaCatFecha(hoyLocal); setNuevaCatId('')
    setCatLoading(false)
  }

  // ── Historico Obras ──────────────────────────────────────────────────────────
  const [obraList, setObraList] = useState<HistoricoObra[]>(historico_obras)
  const [obraEditandoId, setObraEditandoId] = useState<number | null>(null)
  const [obraEditFecha, setObraEditFecha] = useState('')
  const [obraEditObraId, setObraEditObraId] = useState('')
  const [obraLoading, setObraLoading] = useState(false)
  const [obraError, setObraError] = useState('')
  const [mostrarNuevaObra, setMostrarNuevaObra] = useState(false)
  const [nuevaObraFecha, setNuevaObraFecha] = useState(hoyLocal)
  const [nuevaObraId, setNuevaObraId] = useState('')
  const [legajoObraDesc, setLegajoObraDesc] = useState(legajo.obras?.nombre || '')

  const obrasFiltradas = obras.filter(o => o.id_empresa === legajo.id_empresa)

  const guardarObraEdicion = async (original: HistoricoObra, esPrimero: boolean) => {
    setObraLoading(true); setObraError('')
    if (esPrimero) {
      if (!obraEditObraId) { setObraError('Seleccioná una obra'); setObraLoading(false); return }
      const newObraId = parseInt(obraEditObraId)
      await supabase.from('legajos_historico_obras').update({ id_obra: newObraId }).eq('id', original.id)
      if (!original.fecha_hasta) {
        const maxId = original.id
        await supabase.from('legajos').update({ id_obra: newObraId }).eq('id', legajo.id)
        const { data: arts } = await supabase.from('legajos_historico_obras')
          .select('id').eq('id_legajo', legajo.id).gt('id', maxId)
        for (const a of arts || []) await supabase.from('legajos_historico_obras').delete().eq('id', a.id)
      }
    } else {
      if (!obraEditFecha) { setObraError('La fecha es requerida'); setObraLoading(false); return }
      await supabase.from('legajos_historico_obras').update({ fecha_desde: obraEditFecha }).eq('id', original.id)
    }
    await refrescarHistoricos()
    setObraEditandoId(null); setObraLoading(false)
  }

  const eliminarObra = async (h: HistoricoObra, idx: number) => {
    if (!confirm('¿Eliminar este registro de obra?')) return
    setObraLoading(true)
    await supabase.from('legajos_historico_obras').delete().eq('id', h.id)
    if (idx === 0 && obraList.length > 1) {
      const prev = obraList[1]
      await supabase.from('legajos_historico_obras').update({ fecha_hasta: null }).eq('id', prev.id)
      if (prev.id_obra !== h.id_obra) {
        await supabase.from('legajos').update({ id_obra: prev.id_obra }).eq('id', legajo.id)
        const { data: art } = await supabase.from('legajos_historico_obras')
          .select('id').eq('id_legajo', legajo.id).order('id', { ascending: false }).limit(1)
        if (art && art.length > 0 && art[0].id > prev.id)
          await supabase.from('legajos_historico_obras').delete().eq('id', art[0].id)
      }
    }
    await refrescarHistoricos()
    setObraLoading(false)
  }

  const guardarNuevaObra = async () => {
    if (!nuevaObraFecha || !nuevaObraId) return
    setObraLoading(true); setObraError('')
    await agregarHistoricoObra(parseInt(nuevaObraId), nuevaObraFecha)
    await refrescarHistoricos()
    setMostrarNuevaObra(false); setNuevaObraFecha(hoyLocal); setNuevaObraId('')
    setObraLoading(false)
  }

  const dato = (label: string, valor?: string | null) => (
    <div>
      <p style={{ fontSize: '11px', color: '#484f58', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ fontSize: '13px', color: valor ? '#e6edf3' : '#484f58', margin: 0 }}>
        {valor || '—'}
      </p>
    </div>
  )

  return (
    <div>
      {/* Header ficha */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/legajos" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#8b949e', fontSize: '13px', marginBottom: '16px' }}>
          <ArrowLeft size={14} />
          Volver a legajos
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: '#1a2a3a', border: '0.5px solid #30363d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '18px', color: '#58a6ff', fontWeight: 500 }}>
                {legajo.apellido.charAt(0)}
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#e6edf3', margin: '0 0 4px' }}>
                {legajo.apellido}, {legajo.nombre}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>
                  Legajo {String(legajo.nro_legajo).padStart(4, '0')}
                </span>
                {legajo.codigo_externo && (
                  <span style={{ fontSize: '12px', color: '#8b949e' }}>
                    · Ext: {legajo.codigo_externo}
                  </span>
                )}
                <span style={{ fontSize: '12px', color: '#8b949e' }}>· {legajo.cuil}</span>
                {badgeEstado(legajoEstado)}
              </div>
            </div>
          </div>
        </div>
        {/* Botón editar */}
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#21262d', border: '0.5px solid #30363d',
            color: '#e6edf3', borderRadius: '6px', padding: '7px 14px',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          <Pencil size={14} />
          Editar legajo
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '0.5px solid #30363d', paddingBottom: '0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: 'transparent', border: 'none',
              borderBottom: tabActiva === tab.id ? '2px solid #58a6ff' : '2px solid transparent',
              color: tabActiva === tab.id ? '#58a6ff' : '#8b949e',
              fontSize: '13px', cursor: 'pointer', marginBottom: '-1px',
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Datos */}
      {tabActiva === 'datos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Datos laborales */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Datos laborales</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {dato('Fecha ingreso', legajoFechaIngreso ? formatFecha(legajoFechaIngreso) : null)}
              {dato('Categoría', legajoCatDesc || undefined)}
              {dato('Obra actual', legajoObraDesc || undefined)}
              {dato('CBU', legajo.cbu)}
            </div>
          </div>

          {/* Datos personales */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Datos personales</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {dato('Fecha nacimiento', legajo.fecha_nacimiento ? formatFecha(legajo.fecha_nacimiento) : null)}


              {dato('Sexo', legajo.sexo)}
              {dato('Nacionalidad', legajo.nacionalidad)}
              {dato('Tipo documento', legajo.tipo_documento)}
              {dato('Nro documento', legajo.nro_documento)}
              {dato('Teléfono', legajo.telefono)}
            </div>
          </div>

          {/* Domicilio */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Domicilio</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {dato('Dirección', legajo.direccion)}
              {dato('CP', legajo.cp)}
              {dato('Localidad', legajo.localidad)}
              {dato('Provincia', legajo.provincia)}
            </div>
          </div>
        </div>
      )}

      {tabActiva === 'ausencias' && (
        <AusenciasTab
          idLegajo={legajo.id}
          idEmpresa={legajo.id_empresa}
          ausencias={ausencias}
          tiposAusencia={tiposAusencia}
        />
      )}
      
      {tabActiva === 'vacaciones' && (
        <VacacionesTab
          idLegajo={legajo.id}
          idEmpresa={legajo.id_empresa}
          vacaciones={vacaciones}
        />
      )}

      {/* Tab: Historial */}
      {tabActiva === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Historial laboral */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Historial laboral</p>
              {ultimoHistorico?.fecha_egreso && !mostrarNuevaAlta && (
                <button
                  onClick={() => { setMostrarNuevaAlta(true); setNuevaAltaFecha(hoyLocal) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1a3a2a', border: '0.5px solid #3fb950', color: '#3fb950', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Plus size={12} />
                  Nueva Alta
                </button>
              )}
            </div>

            {/* Modal Nueva Alta */}
            {mostrarNuevaAlta && (
              <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #30363d', background: '#0d1117' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Fecha de ingreso *</p>
                    <input type="date" value={nuevaAltaFecha} onChange={e => setNuevaAltaFecha(e.target.value)}
                      style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '6px 10px', fontSize: '13px' }} />
                  </div>
                  <div style={{ minWidth: '180px' }}>
                    <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Categoría *</p>
                    <select value={nuevaAltaCatId} onChange={e => setNuevaAltaCatId(e.target.value)}
                      style={{ width: '100%', background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '6px 8px', fontSize: '13px' }}>
                      <option value="">Seleccionar...</option>
                      {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                    </select>
                  </div>
                  <div style={{ minWidth: '180px' }}>
                    <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Obra *</p>
                    <select value={nuevaAltaObraId} onChange={e => setNuevaAltaObraId(e.target.value)}
                      style={{ width: '100%', background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '6px 8px', fontSize: '13px' }}>
                      <option value="">Seleccionar...</option>
                      {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Observación</p>
                    <input type="text" value={nuevaAltaObs} onChange={e => setNuevaAltaObs(e.target.value)} placeholder="Opcional"
                      style={{ width: '100%', background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <button onClick={guardarNuevaAlta} disabled={loadingAlta}
                    style={{ background: '#238636', border: 'none', color: '#fff', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
                    {loadingAlta ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => { setMostrarNuevaAlta(false); setErrorAlta('') }}
                    style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {errorAlta && <div style={{ padding: '8px 20px', background: '#3a1a1a', color: '#f85149', fontSize: '12px' }}>{errorAlta}</div>}

            {errorEdit && editandoId === null && (
              <div style={{ padding: '8px 20px', background: '#3a1a1a', color: '#f85149', fontSize: '12px' }}>{errorEdit}</div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '18%' }}>Ingreso</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '18%' }}>Egreso</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '14%' }}>Motivo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '38%' }}>Observación</th>
                  <th style={{ width: '12%' }}></th>
                </tr>
              </thead>
              <tbody>
                {historicoList.map((h, i) => {
                  const motivoColor: Record<string, { bg: string; color: string }> = {
                    'Alta':       { bg: '#1a3a2a', color: '#3fb950' },
                    'Reingreso':  { bg: '#1a2a3a', color: '#58a6ff' },
                    'Renuncia':   { bg: '#3a1a1a', color: '#f85149' },
                    'Despido':    { bg: '#3a1a1a', color: '#f85149' },
                    'Abandono':   { bg: '#3a1a1a', color: '#f85149' },
                    'Fallecimiento': { bg: '#3a1a1a', color: '#f85149' },
                    'Jubilación': { bg: '#3a2a1a', color: '#e3b341' },
                    'Otro':       { bg: '#21262d', color: '#8b949e' },
                    'Baja':       { bg: '#3a1a1a', color: '#f85149' },
                    'Traslado':   { bg: '#21262d', color: '#8b949e' },
                  }
                  const isEditing = editandoId === h.id
                  return (
                    <tr key={h.id} style={{ borderBottom: i < historicoList.length - 1 ? '0.5px solid #21262d' : 'none', background: isEditing ? '#0d1117' : 'transparent' }}>
                      {isEditing ? (
                        <>
                          <td style={{ padding: '10px 16px' }}>
                            <input type="date" value={editForm.fecha_ingreso} onChange={e => setEditForm(f => ({ ...f, fecha_ingreso: e.target.value }))}
                              style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', width: '100%' }} />
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type="date" value={editForm.fecha_egreso} onChange={e => setEditForm(f => ({ ...f, fecha_egreso: e.target.value }))}
                                style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', flex: 1 }} />
                              {editForm.fecha_egreso && (
                                <button onClick={() => setEditForm(f => ({ ...f, fecha_egreso: '', motivo_baja: '' }))}
                                  style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px', lineHeight: 1, flexShrink: 0 }}
                                  title="Quitar fecha de egreso">
                                  <span style={{ fontSize: '14px' }}>✕</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            {editForm.fecha_egreso ? (
                              <select value={editForm.motivo_baja} onChange={e => setEditForm(f => ({ ...f, motivo_baja: e.target.value }))}
                                style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', width: '100%' }}>
                                <option value="">Motivo...</option>
                                {MOTIVOS_BAJA.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#484f58' }}>{h.motivo}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <input type="text" value={editForm.observacion} onChange={e => setEditForm(f => ({ ...f, observacion: e.target.value }))} placeholder="Observación"
                              style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
                            {errorEdit && <p style={{ fontSize: '11px', color: '#f85149', margin: '4px 0 0' }}>{errorEdit}</p>}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => guardarEdicion(h)} disabled={loadingEdit}
                                style={{ background: '#238636', border: 'none', color: '#fff', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                                {loadingEdit ? '...' : 'OK'}
                              </button>
                              <button onClick={cancelarEdicion}
                                style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                                ✕
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 16px', color: '#e6edf3' }}>{formatFecha(h.fecha_ingreso)}</td>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>{h.fecha_egreso ? formatFecha(h.fecha_egreso) : '—'}</td>
                          <td style={{ padding: '10px 16px' }}>
                            {(() => {
                              const c = motivoColor[h.motivo] || { bg: '#21262d', color: '#8b949e' }
                              return <span style={{ background: c.bg, color: c.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{h.motivo}</span>
                            })()}
                          </td>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>{h.observacion || '—'}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            {editandoId === null && (
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                <button onClick={() => iniciarEdicion(h)}
                                  style={{ background: 'none', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                                  <Pencil size={11} />
                                </button>
                                {i === 0 && historicoList.length > 1 && (
                                  <button onClick={eliminarUltimoHistorico}
                                    style={{ background: 'none', border: '0.5px solid #3a1a1a', color: '#f85149', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Histórico categorías */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Histórico de categorías</p>
              {legajoEstado === 'Activo' && !mostrarNuevaCat && catEditandoId === null && (
                <button onClick={() => { setMostrarNuevaCat(true); setNuevaCatFecha(hoyLocal); setNuevaCatId('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1a2a3a', border: '0.5px solid #58a6ff', color: '#58a6ff', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>
                  <Plus size={12} />Nueva Categoría
                </button>
              )}
            </div>
            {mostrarNuevaCat && (
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #30363d', background: '#0d1117', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Desde</p>
                  <input type="date" value={nuevaCatFecha} onChange={e => setNuevaCatFecha(e.target.value)}
                    style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '13px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Categoría</p>
                  <select value={nuevaCatId} onChange={e => setNuevaCatId(e.target.value)}
                    style={{ width: '100%', background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '13px' }}>
                    <option value="">Seleccionar...</option>
                    {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                  </select>
                </div>
                <button onClick={guardarNuevaCat} disabled={!nuevaCatFecha || !nuevaCatId || catLoading}
                  style={{ background: '#238636', border: 'none', color: '#fff', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
                  {catLoading ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setMostrarNuevaCat(false)}
                  style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            )}
            {catError && <div style={{ padding: '8px 16px', background: '#3a1a1a', color: '#f85149', fontSize: '12px' }}>{catError}</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '45%' }}>Categoría</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '22%' }}>Desde</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '22%' }}>Hasta</th>
                  <th style={{ width: '11%' }}></th>
                </tr>
              </thead>
              <tbody>
                {catList.map((h, i) => {
                  const isEditing = catEditandoId === h.id
                  const canDelete = i < catList.length - 1
                  const esPrimero = i === catList.length - 1
                  return (
                    <tr key={h.id} style={{ borderBottom: i < catList.length - 1 ? '0.5px solid #21262d' : 'none', background: isEditing ? '#0d1117' : 'transparent' }}>
                      {isEditing ? (
                        <td style={{ padding: '10px 16px' }}>
                          {esPrimero
                            ? <select value={catEditCatId} onChange={e => setCatEditCatId(e.target.value)}
                                style={{ width: '100%', background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                                <option value="">Seleccionar...</option>
                                {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                              </select>
                            : <span style={{ color: '#e6edf3', fontWeight: 500 }}>{h.categorias.descripcion}</span>
                          }
                        </td>
                      ) : (
                        <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{h.categorias.descripcion}</td>
                      )}
                      {isEditing ? (
                        <>
                          <td style={{ padding: '10px 16px' }}>
                            {esPrimero
                              ? <span style={{ color: '#8b949e', fontSize: '12px' }}>{formatFecha(h.fecha_desde)}</span>
                              : <input type="date" value={catEditFecha} onChange={e => setCatEditFecha(e.target.value)}
                                  style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', width: '100%' }} />
                            }
                          </td>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                            {h.fecha_hasta ? formatFecha(h.fecha_hasta) : <span style={{ color: '#3fb950', fontSize: '11px' }}>Actual</span>}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                              <button onClick={() => guardarCatEdicion(h, esPrimero)} disabled={catLoading}
                                style={{ background: '#238636', border: 'none', color: '#fff', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                                {catLoading ? '...' : 'OK'}
                              </button>
                              <button onClick={() => setCatEditandoId(null)}
                                style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(h.fecha_desde)}</td>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                            {h.fecha_hasta ? formatFecha(h.fecha_hasta) : <span style={{ color: '#3fb950', fontSize: '11px' }}>Actual</span>}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            {catEditandoId === null && (
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setCatEditandoId(h.id); setCatEditFecha(h.fecha_desde); setCatEditCatId(String(h.id_categoria)); setCatError('') }}
                                  style={{ background: 'none', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                                  <Pencil size={11} />
                                </button>
                                {canDelete && (
                                  <button onClick={() => eliminarCat(h, i)} disabled={catLoading}
                                    style={{ background: 'none', border: '0.5px solid #3a1a1a', color: '#f85149', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Histórico obras */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Histórico de obras</p>
              {legajoEstado === 'Activo' && !mostrarNuevaObra && obraEditandoId === null && (
                <button onClick={() => { setMostrarNuevaObra(true); setNuevaObraFecha(hoyLocal); setNuevaObraId('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1a2a3a', border: '0.5px solid #58a6ff', color: '#58a6ff', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>
                  <Plus size={12} />Nueva Obra
                </button>
              )}
            </div>
            {mostrarNuevaObra && (
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #30363d', background: '#0d1117', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Desde</p>
                  <input type="date" value={nuevaObraFecha} onChange={e => setNuevaObraFecha(e.target.value)}
                    style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '13px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: '#8b949e', margin: '0 0 4px' }}>Obra</p>
                  <select value={nuevaObraId} onChange={e => setNuevaObraId(e.target.value)}
                    style={{ width: '100%', background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '5px 8px', fontSize: '13px' }}>
                    <option value="">Seleccionar...</option>
                    {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
                <button onClick={guardarNuevaObra} disabled={!nuevaObraFecha || !nuevaObraId || obraLoading}
                  style={{ background: '#238636', border: 'none', color: '#fff', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
                  {obraLoading ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setMostrarNuevaObra(false)}
                  style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            )}
            {obraError && <div style={{ padding: '8px 16px', background: '#3a1a1a', color: '#f85149', fontSize: '12px' }}>{obraError}</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '45%' }}>Obra</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '22%' }}>Desde</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '22%' }}>Hasta</th>
                  <th style={{ width: '11%' }}></th>
                </tr>
              </thead>
              <tbody>
                {obraList.map((h, i) => {
                  const isEditing = obraEditandoId === h.id
                  const canDelete = i < obraList.length - 1
                  const esPrimero = i === obraList.length - 1
                  return (
                    <tr key={h.id} style={{ borderBottom: i < obraList.length - 1 ? '0.5px solid #21262d' : 'none', background: isEditing ? '#0d1117' : 'transparent' }}>
                      {isEditing ? (
                        <td style={{ padding: '10px 16px' }}>
                          {esPrimero
                            ? <select value={obraEditObraId} onChange={e => setObraEditObraId(e.target.value)}
                                style={{ width: '100%', background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                                <option value="">Seleccionar...</option>
                                {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                              </select>
                            : <span style={{ color: '#e6edf3', fontWeight: 500 }}>{h.obras.nombre}</span>
                          }
                        </td>
                      ) : (
                        <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{h.obras.nombre}</td>
                      )}
                      {isEditing ? (
                        <>
                          <td style={{ padding: '10px 16px' }}>
                            {esPrimero
                              ? <span style={{ color: '#8b949e', fontSize: '12px' }}>{formatFecha(h.fecha_desde)}</span>
                              : <input type="date" value={obraEditFecha} onChange={e => setObraEditFecha(e.target.value)}
                                  style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', width: '100%' }} />
                            }
                          </td>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                            {h.fecha_hasta ? formatFecha(h.fecha_hasta) : <span style={{ color: '#3fb950', fontSize: '11px' }}>Actual</span>}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                              <button onClick={() => guardarObraEdicion(h, esPrimero)} disabled={obraLoading}
                                style={{ background: '#238636', border: 'none', color: '#fff', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                                {obraLoading ? '...' : 'OK'}
                              </button>
                              <button onClick={() => setObraEditandoId(null)}
                                style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(h.fecha_desde)}</td>
                          <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                            {h.fecha_hasta ? formatFecha(h.fecha_hasta) : <span style={{ color: '#3fb950', fontSize: '11px' }}>Actual</span>}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            {obraEditandoId === null && (
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setObraEditandoId(h.id); setObraEditFecha(h.fecha_desde); setObraEditObraId(String(h.id_obra)); setObraError('') }}
                                  style={{ background: 'none', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                                  <Pencil size={11} />
                                </button>
                                {canDelete && (
                                  <button onClick={() => eliminarObra(h, i)} disabled={obraLoading}
                                    style={{ background: 'none', border: '0.5px solid #3a1a1a', color: '#f85149', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Documentos */}
      {tabActiva === 'documentos' && (
        <DocumentosLegajoTab
          idLegajo={legajo.id}
          documentosIniciales={documentos}
        />
      )}

      {/* Tab: Novedades */}
      {tabActiva === 'novedades' && (
        <NovedadesTab
          idLegajo={legajo.id}
          idEmpresa={legajo.id_empresa}
        />
      )}

      {tabActiva === 'epp' && (
        <EppTab
          idLegajo={legajo.id}
          idEmpresa={legajo.id_empresa}
          entregas={eppEntregas}
          catalogo={eppCatalogo}
          talles={eppTalles}
          habitual={eppHabitual}
          obras={obras}
        />
      )}

      {mostrarForm && (
        <FormLegajo
          legajoEditar={legajo}
          categorias={categorias}
          obras={obras}
          plantillas={plantillas}
          onCerrar={() => setMostrarForm(false)}
        />
      )}

    </div>
  )
}