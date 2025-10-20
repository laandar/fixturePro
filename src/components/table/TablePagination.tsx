'use client'
import clsx from 'clsx'
import { Col, Row } from 'react-bootstrap'
import { TbChevronLeft, TbChevronRight, TbDots } from 'react-icons/tb'

export type TablePaginationProps = {
  totalItems: number
  start: number
  end: number
  itemsName?: string
  showInfo?: boolean
  // Pagination control props
  previousPage: () => void
  canPreviousPage: boolean
  pageCount: number
  pageIndex: number
  setPageIndex: (index: number) => void
  nextPage: () => void
  canNextPage: boolean
}

const TablePagination = ({
  totalItems,
  start,
  end,
  itemsName = 'items',
  showInfo,
  previousPage,
  canPreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  nextPage,
  canNextPage,
}: TablePaginationProps) => {
  // Función para generar números de página inteligentes
  const generatePageNumbers = () => {
    const delta = 2 // Número de páginas a mostrar a cada lado de la página actual
    const range = []
    const rangeWithDots = []

    // Si hay pocas páginas, mostrar todas
    if (pageCount <= 7) {
      for (let i = 0; i < pageCount; i++) {
        range.push(i)
      }
      return range
    }

    // Siempre mostrar la primera página
    range.push(0)

    // Calcular el rango alrededor de la página actual
    const startPage = Math.max(1, pageIndex - delta)
    const endPage = Math.min(pageCount - 2, pageIndex + delta)

    // Si hay un gap después de la primera página, agregar puntos suspensivos
    if (startPage > 1) {
      rangeWithDots.push(0, 'start-ellipsis')
    } else {
      rangeWithDots.push(0)
    }

    // Agregar páginas en el rango calculado
    for (let i = startPage; i <= endPage; i++) {
      rangeWithDots.push(i)
    }

    // Si hay un gap antes de la última página, agregar puntos suspensivos
    if (endPage < pageCount - 2) {
      rangeWithDots.push('end-ellipsis', pageCount - 1)
    } else {
      rangeWithDots.push(pageCount - 1)
    }

    return rangeWithDots
  }

  const pageNumbers = generatePageNumbers()

  return (
    <Row className={clsx('align-items-center text-center text-sm-start', showInfo ? 'justify-content-between' : 'justify-content-end')}>
      {showInfo && (
        <Col sm>
          <div className="text-muted">
            Showing <span className="fw-semibold">{start}</span> to <span className="fw-semibold">{end}</span> of{' '}
            <span className="fw-semibold">{totalItems}</span> {itemsName}
          </div>
        </Col>
      )}
      <Col sm="auto" className="mt-3 mt-sm-0">
        <div>
          <ul className="pagination pagination-boxed mb-0 justify-content-center">
            <li className="page-item">
              <button className="page-link" onClick={() => previousPage()} disabled={!canPreviousPage}>
                <TbChevronLeft />
              </button>
            </li>

            {pageNumbers.map((pageNumber, index) => {
              if (pageNumber === 'start-ellipsis' || pageNumber === 'end-ellipsis') {
                return (
                  <li key={`ellipsis-${index}`} className="page-item disabled">
                    <span className="page-link">
                      <TbDots />
                    </span>
                  </li>
                )
              }

              return (
                <li key={pageNumber} className={`page-item ${pageIndex === pageNumber ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPageIndex(pageNumber as number)}>
                    {(pageNumber as number) + 1}
                  </button>
                </li>
              )
            })}

            <li className="page-item">
              <button className="page-link" onClick={() => nextPage()} disabled={!canNextPage}>
                <TbChevronRight />
              </button>
            </li>
          </ul>
        </div>
      </Col>
    </Row>
  )
}

export default TablePagination
