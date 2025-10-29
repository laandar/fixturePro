import Image from 'next/image'
import Link from 'next/link'

const AppLogo = () => {
  return (
    <>
      <Link href="/" className="logo-dark">
        <Image 
          src="/uploads/logoLdba.jpeg" 
          alt="LDBA logo" 
          width="150" 
          height="40" 
          style={{ 
            objectFit: 'contain',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </Link>
      <Link href="/" className="logo-light">
        <Image 
          src="/uploads/logoLdba.jpeg" 
          alt="LDBA logo" 
          width="150" 
          height="40" 
          style={{ 
            objectFit: 'contain',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </Link>
    </>
  )
}

export default AppLogo
