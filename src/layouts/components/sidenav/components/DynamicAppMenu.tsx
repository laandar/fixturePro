'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Collapse } from 'react-bootstrap';
import { TbChevronDown } from 'react-icons/tb';
import { getMenusParaUsuarioActual, type MenuItemFromDB } from '@/app/(admin)/menu-actions';
import { scrollToElement } from '@/helpers/layout';
import { useLayoutContext } from '@/context/useLayoutContext';
import * as Icons from 'react-icons/tb';

type IconComponent = React.ComponentType<{ className?: string }>;

const MenuItemWithChildren = ({
  item,
  openMenuKey,
  setOpenMenuKey,
  level = 0,
}: {
  item: MenuItemFromDB;
  openMenuKey: string | null;
  setOpenMenuKey: (key: string | null) => void;
  level?: number;
}) => {
  const pathname = usePathname();
  const isTopLevel = level === 0;
  const [localOpen, setLocalOpen] = useState(false);
  const [didAutoOpen, setDidAutoOpen] = useState(false);

  const isChildActive = (children: MenuItemFromDB[]): boolean =>
    children.some((child) => (child.url && pathname.endsWith(child.url)) || (child.children && isChildActive(child.children)));

  const isActive = isChildActive(item.children || []);
  const isOpen = isTopLevel ? openMenuKey === item.key : localOpen;

  useEffect(() => {
    if (isTopLevel && isActive && !didAutoOpen) {
      setOpenMenuKey(item.key);
      setDidAutoOpen(true);
    }
    if (!isTopLevel && isActive && !didAutoOpen) {
      setLocalOpen(true);
      setDidAutoOpen(true);
    }
  }, [isActive, isTopLevel, item.key, setOpenMenuKey, didAutoOpen]);

  const toggleOpen = () => {
    if (isTopLevel) {
      setOpenMenuKey(isOpen ? null : item.key);
    } else {
      setLocalOpen((prev) => !prev);
    }
  };

  const IconComponent = item.icon ? (Icons as any)[item.icon] as IconComponent : null;

  return (
    <li className={`side-nav-item ${isOpen ? 'active' : ''}`}>
      <button onClick={toggleOpen} className="side-nav-link" aria-expanded={isOpen}>
        {IconComponent && (
          <span className="menu-icon">
            <IconComponent />
          </span>
        )}
        <span className="menu-text">{item.label}</span>
        <span className="menu-arrow">
          <TbChevronDown />
        </span>
      </button>
      <Collapse in={isOpen}>
        <div>
          <ul className="sub-menu">
            {(item.children || []).map((child) =>
              child.children && child.children.length > 0 ? (
                <MenuItemWithChildren
                  key={child.key}
                  item={child}
                  openMenuKey={openMenuKey}
                  setOpenMenuKey={setOpenMenuKey}
                  level={level + 1}
                />
              ) : (
                <MenuItem key={child.key} item={child} />
              )
            )}
          </ul>
        </div>
      </Collapse>
    </li>
  );
};

const MenuItem = ({ item }: { item: MenuItemFromDB }) => {
  const pathname = usePathname();
  const isActive = item.url && pathname.endsWith(item.url);
  const { sidenav, hideBackdrop } = useLayoutContext();

  const toggleBackdrop = () => {
    if (sidenav.size === 'offcanvas') {
      hideBackdrop();
    }
  };

  const IconComponent = item.icon ? (Icons as any)[item.icon] as IconComponent : null;

  return (
    <li className={`side-nav-item ${isActive ? 'active' : ''}`}>
      <Link
        href={item.url ?? '/'}
        onClick={toggleBackdrop}
        className={`side-nav-link ${isActive ? 'active' : ''}`}
      >
        {IconComponent && (
          <span className="menu-icon">
            <IconComponent />
          </span>
        )}
        <span className="menu-text">{item.label}</span>
      </Link>
    </li>
  );
};

const DynamicAppMenu = () => {
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemFromDB[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollToActiveLink = () => {
    const activeItem: HTMLAnchorElement | null = document.querySelector('.side-nav-link.active');
    if (activeItem) {
      const simpleBarContent = document.querySelector('#sidenav .simplebar-content-wrapper');
      if (simpleBarContent) {
        const offset = activeItem.offsetTop - window.innerHeight * 0.4;
        scrollToElement(simpleBarContent, offset, 500);
      }
    }
  };

  useEffect(() => {
    const loadMenus = async () => {
      try {
        const menus = await getMenusParaUsuarioActual();
        setMenuItems(menus);
      } catch (error) {
        console.error('Error al cargar menús:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollToActiveLink(), 100);
  }, [menuItems]);

  if (loading) {
    return (
      <ul className="side-nav">
        <li className="side-nav-item">
          <span className="side-nav-link">Cargando menú...</span>
        </li>
      </ul>
    );
  }

  return (
    <ul className="side-nav">
      {menuItems.map((item) =>
        item.esTitle ? (
          <li className="side-nav-title" key={item.key}>
            {item.label}
          </li>
        ) : item.children && item.children.length > 0 ? (
          <MenuItemWithChildren key={item.key} item={item} openMenuKey={openMenuKey} setOpenMenuKey={setOpenMenuKey} />
        ) : (
          <MenuItem key={item.key} item={item} />
        )
      )}
    </ul>
  );
};

export default DynamicAppMenu;

