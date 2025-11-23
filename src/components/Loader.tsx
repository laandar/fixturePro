import { Spinner } from 'react-bootstrap'

type PropsType = {
  height?: string
  width?: string
  overlay?: boolean
  useFootball?: boolean
}

const Loader = ({ height = '100%', width = '100%', overlay = false, useFootball = true }: PropsType) => {
  return (
    <div className="position-relative d-flex justify-content-center align-items-center p-3" style={{ height: height, width: width }}>
      {useFootball ? (
        <>
          <style>{`
            @keyframes football-bounce {
              0%, 100% {
                transform: translateY(0) rotate(0deg);
              }
              25% {
                transform: translateY(-20px) rotate(90deg);
              }
              50% {
                transform: translateY(0) rotate(180deg);
              }
              75% {
                transform: translateY(-20px) rotate(270deg);
              }
            }
            .football-loader {
              animation: football-bounce 1.5s ease-in-out infinite;
              font-size: 48px;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
            }
          `}</style>
          <div className="football-loader position-absolute" style={{ zIndex: 2 }}>
            ⚽
          </div>
        </>
      ) : (
        <Spinner animation="border" variant="primary" className="position-absolute" style={{ zIndex: 2 }} />
      )}
      {overlay && <div className="card-overlay" style={{ zIndex: 1 }} />}
    </div>
  )
}

export default Loader
