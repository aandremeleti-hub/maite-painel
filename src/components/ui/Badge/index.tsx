import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import styles from './styles.module.css';

export type BadgeVariant =
  | 'active'
  | 'inactive'
  | 'open'
  | 'closed'
  | 'standard'
  | 'extended'
  | 'absence'
  | 'cancelled'
  | 'courtesy'
  | 'NF';

export type BadgeSize = 'sm' | 'md';

export interface IBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  withDot?: boolean;
  icon?: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, IBadgeProps>(
  (
    {
      variant = 'active',
      size = 'md',
      withDot = false,
      icon,
      children,
      className,
      ...restProps
    },
    ref,
  ) => {
    const classNames = [
      styles.badge,
      styles[variant],
      styles[size],
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classNames} {...restProps}>
        {withDot && <span className={styles.dot} aria-hidden="true" />}
        {icon}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
