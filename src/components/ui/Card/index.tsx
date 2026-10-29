import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import styles from './styles.module.css';

export interface ICardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export interface ICardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export interface ICardBodyProps extends HTMLAttributes<HTMLDivElement> {}
export interface ICardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, ICardHeaderProps>(
  ({ className, children, ...restProps }, ref) => {
    const classNames = [styles.header, className || ''].filter(Boolean).join(' ');
    return (
      <div ref={ref} className={classNames} {...restProps}>
        {children}
      </div>
    );
  },
);
CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, ICardBodyProps>(
  ({ className, children, ...restProps }, ref) => {
    const classNames = [styles.body, className || ''].filter(Boolean).join(' ');
    return (
      <div ref={ref} className={classNames} {...restProps}>
        {children}
      </div>
    );
  },
);
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, ICardFooterProps>(
  ({ className, children, ...restProps }, ref) => {
    const classNames = [styles.footer, className || ''].filter(Boolean).join(' ');
    return (
      <div ref={ref} className={classNames} {...restProps}>
        {children}
      </div>
    );
  },
);
CardFooter.displayName = 'CardFooter';

export const Card = forwardRef<HTMLDivElement, ICardProps>(
  ({ className, children, ...restProps }, ref) => {
    const classNames = [styles.card, className || ''].filter(Boolean).join(' ');
    return (
      <div ref={ref} className={classNames} {...restProps}>
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';
