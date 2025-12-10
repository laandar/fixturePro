'use client'
import { useEffect, useState } from 'react'
import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import { useLayoutContext } from '@/context/useLayoutContext'
import DynamicAppMenu from '@/layouts/components/sidenav/components/DynamicAppMenu'
import UserProfile from '@/layouts/components/sidenav/components/UserProfile'
import Image from 'next/image'
import Link from 'next/link'
import { TbMenu4, TbX } from 'react-icons/tb'

const Sidenav = () => {
  const { sidenav, hideBackdrop, changeSideNavSize } = useLayoutContext()
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false)

  const toggleSidebar = () => {
    changeSideNavSize(sidenav.size === 'on-hover-active' ? 'on-hover' : 'on-hover-active')
  }

  const closeSidebar = () => {
    const html = document.documentElement
    html.classList.toggle('sidebar-enable')
    hideBackdrop()
  }

  // Determinar si el sidebar está expandido (abierto) - ocultar imagen cuando está expandido
  const isSidebarExpanded = sidenav.size === 'on-hover-active' || 
                            sidenav.size === 'default' || 
                            sidenav.size === 'compact'
  
  // Para offcanvas, verificar si está abierto mediante la clase del DOM
  useEffect(() => {
    if (sidenav.size === 'offcanvas') {
      const checkOffcanvas = () => {
        setIsOffcanvasOpen(document.documentElement.classList.contains('sidebar-enable'))
      }
      
      checkOffcanvas()
      const observer = new MutationObserver(checkOffcanvas)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
      
      return () => observer.disconnect()
    } else {
      setIsOffcanvasOpen(false)
    }
  }, [sidenav.size])
  
  const shouldHideLogo = isSidebarExpanded || isOffcanvasOpen

  return (
    <div className="sidenav-menu">
      {!shouldHideLogo && (
        <Link href="/" className="logo">
          <span className="logo logo-light">
            <span className="logo-lg">
              <Image src="/uploads/campeonato-de-futbol.png" alt="logo" width={92.3} height={26} />
            </span>
            <span className="logo-sm">
              <Image src="/uploads/campeonato-de-futbol.png" alt="small logo" width={30.55} height={26} />
            </span>
          </span>

          <span className="logo logo-dark">
            <span className="logo-lg">
              <Image src="/uploads/campeonato-de-futbol.png" alt="dark logo" width={92.3} height={26} />
            </span>
            <span className="logo-sm">
              <Image src="/uploads/campeonato-de-futbol.png" alt="small logo" width={30.55} height={26} />
            </span>
          </span>
        </Link>
      )}

      <button className="button-on-hover">
        <TbMenu4 onClick={toggleSidebar} className="ti ti-menu-4 fs-22 align-middle" />
      </button>

      <button className="button-close-offcanvas">
        <TbX onClick={closeSidebar} className="align-middle" />
      </button>

      <SimplebarClient id="sidenav" className="scrollbar">
        {sidenav.user && <UserProfile />}
        <DynamicAppMenu />
      </SimplebarClient>
    </div>
  )
}

export default Sidenav
