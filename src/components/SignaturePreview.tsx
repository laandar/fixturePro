'use client'
import Image from 'next/image'
import { FaSignature } from 'react-icons/fa'

interface SignaturePreviewProps {
    signature: string | null
    label?: string
    className?: string
}

const SignaturePreview = ({ signature, label = "Firma", className = "" }: SignaturePreviewProps) => {
    if (!signature) {
        return (
            <div className={`signature-preview ${className}`}>
                <div className="signature-image-container">
                    <div className="no-signature">
                        <FaSignature className="text-muted" size={24} />
                        <small className="text-muted d-block mt-1">Sin firma</small>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`signature-preview ${className}`}>
            <div className="signature-image-container">
                <div className="signature-image-wrapper">
                    <Image
                        src={signature}
                        alt={`${label} digital`}
                        width={180}
                        height={70}
                        className="signature-image"
                    />
                </div>
            </div>
            
            <style jsx>{`
                .signature-preview {
                    flex: 1;
                    max-width: 100%;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .signature-image-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                }
                
                .signature-image-wrapper {
                    width: 180px;
                    height: 70px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-shrink: 0;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                    background: white;
                }
                
                .signature-image {
                    width: 180px !important;
                    height: 70px !important;
                    object-fit: contain !important;
                    image-rendering: -webkit-optimize-contrast;
                    image-rendering: crisp-edges;
                }
                
                .no-signature {
                    padding: 0.5rem;
                    border: 1px dashed #dee2e6;
                    border-radius: 4px;
                    text-align: center;
                    min-width: 80px;
                    height: 70px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                
                @media (max-width: 768px) {
                    .signature-image-wrapper {
                        width: 100%;
                        max-width: 250px;
                        height: 70px;
                    }
                    
                    .signature-image {
                        width: 100% !important;
                        max-width: 250px !important;
                        height: 70px !important;
                    }
                }
            `}</style>
        </div>
    )
}

export default SignaturePreview
