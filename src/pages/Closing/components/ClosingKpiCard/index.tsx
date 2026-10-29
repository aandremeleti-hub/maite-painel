import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import styles from './styles.module.css';

export type ClosingKpiVariant = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning';

export interface IClosingKpiCardProps extends HTMLAttributes<HTMLElement> {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  description?: string;
  badge?: ReactNode;
  variant?: ClosingKpiVariant;
  isLoading?: boolean;
}

export const ClosingKpiCard = forwardRef<HTMLElement, IClosingKpiCardProps>(
  (
    {
      title,
      value,
      icon,
      description,
      badge,
      variant = 'neutral',
      isLoading = false,
      className,
      ...restProps
    },
    ref,
  ) => {
    const cardClasses = [
      styles.card,
      styles[`variant_${variant}`],
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <article
        ref={ref}
        className={cardClasses}
        aria-label={title}
        aria-busy={isLoading}
        {...restProps}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <div className={styles.iconWrapper} aria-hidden="true">
            {icon}
          </div>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.skeletonValue} aria-label="Carregando métrica" />
          ) : (
            <div className={styles.valueRow}>
              <span className={styles.value}>{value}</span>
              {badge && <div className={styles.badgeWrapper}>{badge}</div>}
            </div>
          )}

          {description && (
            <p className={styles.description}>
              {description}
            </p>
          )}
        </div>
      </article>
    );
  },
);

ClosingKpiCard.displayName = 'ClosingKpiCard';
