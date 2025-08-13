'use client'
import { useEffect, useRef, useState } from 'react'
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from 'react-bootstrap'
import { TbCamera, TbRotate, TbX } from 'react-icons/tb'

interface CameraCaptureProps {
  show: boolean
  onHide: () => void
  onCapture: (blob: Blob) => void
  title?: string
}

const CameraCapture = ({ show, onHide, onCapture, title = "Tomar Foto" }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)

  const startCamera = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })
      
      setStream(mediaStream)
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      console.error('Error accessing camera:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    console.log('Capturando foto...')
    console.log('Video ref:', videoRef.current)
    console.log('Canvas ref:', canvasRef.current)
    
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video o canvas no están disponibles')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.error('No se pudo obtener el contexto del canvas')
      return
    }

    console.log('Dimensiones del video:', video.videoWidth, 'x', video.videoHeight)

    // Configurar el canvas con las dimensiones del video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    console.log('Imagen dibujada en canvas, convirtiendo a blob...')

    // Convertir a blob
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('Blob creado:', blob.size, 'bytes')
        // Crear URL para previsualización
        const imageUrl = URL.createObjectURL(blob)
        setCapturedImage(imageUrl)
        
        // Llamar al callback con el blob
        onCapture(blob)
        console.log('Foto capturada exitosamente')
      } else {
        console.error('No se pudo crear el blob')
      }
    }, 'image/jpeg', 0.8)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage)
    }
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    setError(null)
    setVideoReady(false)
    onHide()
  }

  // Efecto para asignar el stream al video cuando esté disponible
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      setVideoReady(false) // Reset video ready state when stream changes
    }
  }, [stream])

  useEffect(() => {
    if (show) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage)
      }
    }
  }, [show])

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody className="text-center">
        {isLoading && (
          <div className="py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Iniciando cámara...</span>
            </div>
            <p className="mt-2">Iniciando cámara...</p>
          </div>
        )}

        {error && (
          <div className="py-5">
            <div className="text-danger mb-3">
              <TbX size={48} />
            </div>
            <p className="text-danger">{error}</p>
            <Button variant="outline-primary" onClick={startCamera}>
              <TbRotate className="me-2" />
              Reintentar
            </Button>
          </div>
        )}

                 {!isLoading && !error && !capturedImage && stream && (
           <div>
             {!videoReady && (
               <div className="py-3">
                 <div className="spinner-border spinner-border-sm me-2" role="status">
                   <span className="visually-hidden">Cargando video...</span>
                 </div>
                 <span className="text-muted">Iniciando video...</span>
               </div>
             )}
             <video
               ref={videoRef}
               autoPlay
               playsInline
               muted
               className={`img-fluid rounded border ${!videoReady ? 'd-none' : ''}`}
               style={{ maxHeight: '400px', width: '100%' }}
               onLoadedMetadata={() => {
                 setVideoReady(true)
                 // Asegurar que el video se reproduzca cuando esté listo
                 if (videoRef.current) {
                   videoRef.current.play().catch(console.error)
                 }
               }}
               onCanPlay={() => {
                 setVideoReady(true)
               }}
             />
             {videoReady && (
               <div className="mt-3">
                 <Button 
                   variant="primary" 
                   onClick={() => {
                     console.log('Botón de captura clickeado')
                     capturePhoto()
                   }} 
                   size="lg"
                 >
                   <TbCamera className="me-2" />
                   Capturar Foto
                 </Button>
               </div>
             )}
           </div>
         )}

        {capturedImage && (
          <div>
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="img-fluid rounded border"
              style={{ maxHeight: '400px' }}
            />
            <div className="mt-3">
              <Button variant="outline-secondary" onClick={retakePhoto} className="me-2">
                <TbRotate className="me-2" />
                Tomar Otra
              </Button>
              <Button variant="success" onClick={handleClose}>
                Usar Esta Foto
              </Button>
            </div>
          </div>
                 )}
       </ModalBody>
       <ModalFooter>
         <Button variant="light" onClick={handleClose}>
           Cancelar
         </Button>
       </ModalFooter>
       
       {/* Canvas oculto para procesamiento de imágenes */}
       <canvas ref={canvasRef} style={{ display: 'none' }} />
     </Modal>
   )
 }

export default CameraCapture
