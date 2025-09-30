'use client'

import { useState } from 'react'
import ProfileCard from './ProfileCard'
import { tempPlayerImages } from './TempPlayerImages'

const ImageSharpnessTest: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState(0)

  return (
    <div className="p-4">
      <h3>Prueba de Nitidez de Imágenes</h3>
      <p className="text-muted mb-4">
        Selecciona una imagen para probar la nitidez en la tarjeta
      </p>
      
      {/* Selector de imágenes */}
      <div className="row g-2 mb-4">
        {tempPlayerImages.map((url, index) => (
          <div key={index} className="col-md-2 col-sm-3 col-4">
            <button
              className={`btn w-100 ${selectedImage === index ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSelectedImage(index)}
            >
              <img
                src={url}
                alt={`Jugador ${index + 1}`}
                className="img-fluid rounded mb-1"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              />
              <br />
              <small>Jugador {index + 1}</small>
            </button>
          </div>
        ))}
      </div>
      
      {/* Tarjeta de prueba */}
      <div className="row justify-content-center">
        <div className="col-md-4">
          <ProfileCard
            avatarUrl={tempPlayerImages[selectedImage]}
            name={`Jugador ${selectedImage + 1}`}
            title="Categoría de Prueba"
            handle="Equipo de Prueba"
            status="Activo"
            showUserInfo={true}
            enableTilt={true}
            enableMobileTilt={false}
            onContactClick={() => console.log('Contact clicked')}
            contactText="Ver Perfil"
          />
        </div>
      </div>
      
      {/* Información de la imagen actual */}
      <div className="mt-4">
        <div className="card">
          <div className="card-body">
            <h5>Información de la Imagen Actual</h5>
            <p><strong>URL:</strong> <code>{tempPlayerImages[selectedImage]}</code></p>
            <p><strong>Jugador:</strong> Jugador {selectedImage + 1}</p>
            <p className="text-muted">
              <small>
                Esta imagen debería verse nítida y con colores originales en la tarjeta de arriba.
                Si se ve borrosa, revisa los estilos CSS aplicados.
              </small>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageSharpnessTest
