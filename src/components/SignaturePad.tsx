'use client'
import { useRef, useState, useEffect } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { FaPen, FaEraser, FaCheck, FaTimes } from 'react-icons/fa'

interface SignaturePadProps {
    onSave: (signature: string) => void
    onClose: () => void
    show: boolean
    title: string
    initialSignature?: string
}

const SignaturePad = ({ onSave, onClose, show, title, initialSignature }: SignaturePadProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
    const [hasDrawn, setHasDrawn] = useState(false)

    useEffect(() => {
        if (show && canvasRef.current) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            
            if (ctx) {
                // Configurar el canvas con el tamaño correcto
                const rect = canvas.getBoundingClientRect()
                canvas.width = rect.width
                canvas.height = rect.height
                
                // Configurar el contexto
                ctx.strokeStyle = '#000000'
                ctx.lineWidth = 2
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
                
                setContext(ctx)
                
                // Limpiar el canvas
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                
                // Si hay una firma inicial, cargarla
                if (initialSignature) {
                    const img = new Image()
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                        setHasDrawn(true)
                    }
                    img.src = initialSignature
                }
            }
        }
    }, [show, initialSignature])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!context || !canvasRef.current) return
        
        setIsDrawing(true)
        setHasDrawn(true)
        
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        
        let x, y
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left
            y = e.touches[0].clientY - rect.top
        } else {
            x = e.clientX - rect.left
            y = e.clientY - rect.top
        }
        
        context.beginPath()
        context.moveTo(x, y)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !context || !canvasRef.current) return
        
        e.preventDefault()
        
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        
        let x, y
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left
            y = e.touches[0].clientY - rect.top
        } else {
            x = e.clientX - rect.left
            y = e.clientY - rect.top
        }
        
        context.lineTo(x, y)
        context.stroke()
    }

    const stopDrawing = () => {
        if (!context) return
        setIsDrawing(false)
        context.closePath()
    }

    const clearCanvas = () => {
        if (!context || !canvasRef.current) return
        const canvas = canvasRef.current
        context.fillStyle = '#FFFFFF'
        context.fillRect(0, 0, canvas.width, canvas.height)
        setHasDrawn(false)
    }

    const saveSignature = () => {
        if (!canvasRef.current || !hasDrawn) {
            alert('Por favor, firme antes de guardar')
            return
        }
        
        // Crear un nuevo canvas con tamaño estándar para normalizar las firmas
        const originalCanvas = canvasRef.current
        const standardCanvas = document.createElement('canvas')
        const standardCtx = standardCanvas.getContext('2d')
        
        if (!standardCtx) return
        
        // Tamaño estándar para todas las firmas
        standardCanvas.width = 360  // Doble resolución para mejor calidad
        standardCanvas.height = 140
        
        // Fondo blanco
        standardCtx.fillStyle = '#FFFFFF'
        standardCtx.fillRect(0, 0, standardCanvas.width, standardCanvas.height)
        
        // Dibujar la firma original escalada al tamaño estándar
        standardCtx.drawImage(originalCanvas, 0, 0, standardCanvas.width, standardCanvas.height)
        
        const signatureData = standardCanvas.toDataURL('image/png')
        onSave(signatureData)
    }

    return (
        <Modal show={show} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="signature-pad-container">
                    <div className="signature-canvas-wrapper">
                        <canvas
                            ref={canvasRef}
                            className="signature-canvas"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>
                    <div className="signature-instructions text-muted text-center mt-2">
                        <small>
                            <FaPen className="me-1" />
                            Firme con el mouse o con el dedo en dispositivos táctiles
                        </small>
                    </div>
                </div>
                
                <style jsx>{`
                    .signature-pad-container {
                        width: 100%;
                    }
                    
                    .signature-canvas-wrapper {
                        width: 100%;
                        height: 300px;
                        border: 2px dashed #ccc;
                        border-radius: 8px;
                        overflow: hidden;
                        background: white;
                        position: relative;
                    }
                    
                    .signature-canvas {
                        width: 100%;
                        height: 100%;
                        cursor: crosshair;
                        touch-action: none;
                    }
                    
                    .signature-instructions {
                        font-size: 0.875rem;
                    }
                    
                    @media (max-width: 768px) {
                        .signature-canvas-wrapper {
                            height: 250px;
                        }
                    }
                `}</style>
            </Modal.Body>
            <Modal.Footer className="d-flex justify-content-between">
                <Button 
                    variant="outline-danger" 
                    onClick={clearCanvas}
                    disabled={!hasDrawn}
                >
                    <FaEraser className="me-2" />
                    Limpiar
                </Button>
                <div>
                    <Button 
                        variant="secondary" 
                        onClick={onClose}
                        className="me-2"
                    >
                        <FaTimes className="me-2" />
                        Cancelar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={saveSignature}
                        disabled={!hasDrawn}
                    >
                        <FaCheck className="me-2" />
                        Guardar Firma
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    )
}

export default SignaturePad

