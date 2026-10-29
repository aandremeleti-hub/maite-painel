import type { HTMLAttributes } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  FileText,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';
import styles from './styles.module.css';

export interface ISidebarProps extends HTMLAttributes<HTMLElement> {
  isOpen?: boolean;
  onClose?: () => void;
}

interface INavItem {
  to: string;
  label: string;
  icon: typeof Users;
}

const NAV_ITEMS: INavItem[] = [
  { to: '/alunos', label: 'Alunos', icon: Users },
  { to: '/fechamento', label: 'Fechamento', icon: CalendarCheck },
  { to: '/timesheet', label: 'Time Sheet', icon: FileText },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({
  isOpen = false,
  onClose,
  className,
  ...restProps
}: ISidebarProps) {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const displayEmail = user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  const sidebarClasses = [
    styles.sidebar,
    isOpen ? styles.sidebarOpen : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={sidebarClasses} {...restProps}>
        <div className={styles.brandHeader}>
          <div className={styles.brandContent}>
            <div className={styles.brandBadge} aria-hidden="true">
              M
            </div>
            <span className={styles.brandTitle}>Maite — Atendimento</span>
          </div>

          {onClose && (
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X className={styles.closeIcon} aria-hidden="true" />
            </button>
          )}
        </div>

        <nav className={styles.navContainer} aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navItem} ${styles.navItemActive}`
                    : styles.navItem
                }
              >
                <Icon className={styles.navIcon} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar} aria-hidden="true">
              {initial}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName} title={displayName}>
                {displayName}
              </span>
              {displayEmail && (
                <span className={styles.userEmail} title={displayEmail}>
                  {displayEmail}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut className={styles.logoutIcon} aria-hidden="true" />}
            className={styles.logoutButton}
          >
            Sair
          </Button>
        </div>
      </aside>
    </>
  );
}
