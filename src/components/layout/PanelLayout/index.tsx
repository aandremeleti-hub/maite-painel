import { useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DateFilterProvider } from '../../../contexts/DateFilterContext';
import { Sidebar } from '../Sidebar';
import { TopBar } from '../TopBar';
import styles from './styles.module.css';

export interface IPanelLayoutProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function PanelLayout({
  children,
  className,
  ...restProps
}: IPanelLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const layoutClasses = [styles.layoutRoot, className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <DateFilterProvider>
      <div className={layoutClasses} {...restProps}>
        <Sidebar
          isOpen={isMobileSidebarOpen}
          onClose={handleCloseSidebar}
        />

        <div className={styles.contentWrapper}>
          <TopBar onToggleSidebar={handleToggleSidebar} />

          <main className={styles.mainContent}>
            {children || <Outlet />}
          </main>
        </div>

        <Toaster richColors position="top-right" />
      </div>
    </DateFilterProvider>
  );
}
