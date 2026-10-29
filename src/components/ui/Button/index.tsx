import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './styles.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isPending?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, IButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isPending = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...restProps
    },
    ref,
  ) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      isPending ? styles.pending : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={restProps.type || 'button'}
        className={classNames}
        disabled={disabled || isPending}
        aria-busy={isPending}
        {...restProps}
      >
        {isPending ? (
          <Loader2 className={styles.spinner} aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!isPending && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
