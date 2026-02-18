'use client'

import { useEffect, useState, useCallback } from 'react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import Loader from '@/components/Loader'
import { getEquipos } from '../equipos/actions'
import type { EquipoWithRelations } from '@/db/types'
import { Button, Card, CardHeader, CardBody, Col, Container, Form, FormCheck, FormControl, FormGroup, FormLabel, Row } from 'react-bootstrap'
import { TbArrowsShuffle, TbCheck, TbUsers } from 'react-icons/tb'
import Image from 'next/image'

/** Fisher-Yates shuffle para orden aleatorio */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Reparte equipos en N grupos lo más equilibrados posible (ej: 21 equipos, 2 grupos → 10 y 11) */
function repartirEnGrupos<T>(items: T[], numGrupos: number): T[][] {
  if (numGrupos < 1 || items.length === 0) return []
  if (numGrupos >= items.length) return items.map((e) => [e])

  const base = Math.floor(items.length / numGrupos)
  const resto = items.length % numGrupos
  const grupos: T[][] = []
  let idx = 0

  for (let g = 0; g < numGrupos; g++) {
    const tam = base + (g < resto ? 1 : 0)
    grupos.push(items.slice(idx, idx + tam))
    idx += tam
  }
  return grupos
}

const Page = () => {
  const [equipos, setEquipos] = useState<EquipoWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [equiposActivos, setEquiposActivos] = useState<EquipoWithRelations[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [numGrupos, setNumGrupos] = useState<string>('2')
  const [grupos, setGrupos] = useState<EquipoWithRelations[][]>([])

  const cargarEquipos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEquipos()
      setEquipos(data)
      const activos = (data as EquipoWithRelations[]).filter((e) => e.estado === true)
      setEquiposActivos(activos)
      setSeleccionados(new Set(activos.map((e) => e.id)))
    } catch (e) {
      console.error('Error al cargar equipos', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarEquipos()
  }, [cargarEquipos])

  const toggleEquipo = (id: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seleccionarTodos = () => {
    setSeleccionados(new Set(equiposActivos.map((e) => e.id)))
  }

  const deseleccionarTodos = () => {
    setSeleccionados(new Set())
  }

  const realizarSorteo = () => {
    const n = parseInt(numGrupos, 10)
    if (isNaN(n) || n < 1) {
      return
    }
    const lista = equiposActivos.filter((e) => seleccionados.has(e.id))
    if (lista.length === 0) return
    const mezclados = shuffleArray(lista)
    const resultado = repartirEnGrupos(mezclados, Math.min(n, mezclados.length))
    setGrupos(resultado)
  }

  const cantidadSeleccionados = equiposActivos.filter((e) => seleccionados.has(e.id)).length
  const numGruposValido = (() => {
    const n = parseInt(numGrupos, 10)
    return !isNaN(n) && n >= 1
  })()

  if (loading) {
    return (
      <Container>
        <Loader />
      </Container>
    )
  }

  return (
    <Container className="py-3">
      <PageBreadcrumb title="Sorteo de Grupos" subtitle="Gestión Deportiva" />

      <Row>
        <Col xxl={5} className="mb-4">
          <Card>
            <CardHeader className="d-flex align-items-center gap-2">
              <TbUsers className="fs-4" />
              <span>Equipos activos</span>
            </CardHeader>
            <CardBody>
              <p className="text-muted small mb-2">
                Selecciona los equipos que participarán en el sorteo. Por defecto están todos los activos.
              </p>
              <div className="d-flex gap-2 mb-3">
                <Button variant="outline-primary" size="sm" onClick={seleccionarTodos}>
                  Seleccionar todos
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={deseleccionarTodos}>
                  Deseleccionar todos
                </Button>
              </div>
              <div className="border rounded p-2" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {equiposActivos.length === 0 ? (
                  <p className="text-muted mb-0">No hay equipos activos.</p>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {equiposActivos.map((eq) => (
                      <FormCheck
                        key={eq.id}
                        type="checkbox"
                        id={`eq-${eq.id}`}
                        checked={seleccionados.has(eq.id)}
                        onChange={() => toggleEquipo(eq.id)}
                        label={
                          <span className="d-flex align-items-center gap-2">
                            <Image
                              src={eq.imagen_equipo || 'https://via.placeholder.com/24x24/6c757d/ffffff?text=⚽'}
                              width={24}
                              height={24}
                              alt=""
                              className="rounded-circle"
                            />
                            {eq.nombre}
                          </span>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 mb-0 small text-muted">
                <strong>{cantidadSeleccionados}</strong> equipo(s) seleccionado(s).
              </p>
            </CardBody>
          </Card>
        </Col>

        <Col xxl={4} className="mb-4">
          <Card>
            <CardHeader>Número de grupos</CardHeader>
            <CardBody>
              <FormGroup>
                <FormLabel>Cantidad de grupos a crear</FormLabel>
                <FormControl
                  type="number"
                  min={1}
                  value={numGrupos}
                  onChange={(e) => setNumGrupos(e.target.value)}
                  placeholder="Ej: 2"
                />
              </FormGroup>
              <Button
                className="w-100 mt-2"
                variant="primary"
                onClick={realizarSorteo}
                disabled={cantidadSeleccionados === 0 || !numGruposValido}
              >
                <TbArrowsShuffle className="me-2" />
                Realizar sorteo
              </Button>
              {cantidadSeleccionados > 0 && numGruposValido && (
                <p className="small text-muted mt-2 mb-0">
                  Se crearán {Math.min(parseInt(numGrupos, 10), cantidadSeleccionados)} grupos repartiendo los{' '}
                  {cantidadSeleccionados} equipos de forma equilibrada (p. ej. 21 equipos en 2 grupos → 10 y 11).
                </p>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {grupos.length > 0 && (
        <Card>
          <CardHeader className="d-flex align-items-center gap-2">
            <TbCheck className="fs-4 text-success" />
            <span>Resultado del sorteo</span>
          </CardHeader>
          <CardBody>
            <Row>
              {grupos.map((grupo, i) => (
                <Col key={i} md={6} lg={4} xxl={3} className="mb-4">
                  <Card className="border-primary h-100">
                    <CardHeader className="bg-primary bg-opacity-10 py-2">
                      <strong>Grupo {i + 1}</strong> ({grupo.length} equipos)
                    </CardHeader>
                    <CardBody className="py-2">
                      <ol className="mb-0 ps-3">
                        {grupo.map((eq) => (
                          <li key={eq.id} className="d-flex align-items-center gap-2 py-1">
                            <Image
                              src={eq.imagen_equipo || 'https://via.placeholder.com/20x20/6c757d/ffffff?text=⚽'}
                              width={20}
                              height={20}
                              alt=""
                              className="rounded-circle"
                            />
                            {eq.nombre}
                          </li>
                        ))}
                      </ol>
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>
          </CardBody>
        </Card>
      )}
    </Container>
  )
}

export default Page
