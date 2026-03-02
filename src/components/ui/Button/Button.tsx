import type { PropsWithChildren } from 'react';
import { Link } from '@tanstack/react-router';
import styles from './Button.module.css';

type BaseButtonProps = PropsWithChildren<{
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  onClick?: () => void;
  className?: string;
  title?: string;
}>;

type NativeButtonProps = BaseButtonProps & {
  type?: 'button' | 'submit' | 'reset';
  to?: undefined;
};

type LinkButtonProps = BaseButtonProps & {
  to: string;
  type?: never;
};

type ButtonProps = NativeButtonProps | LinkButtonProps;

const getClassName = (variant: 'primary' | 'secondary' | 'success', disabled: boolean, className?: string) =>
  `${styles.button} ${styles[`button-${variant}`]} ${disabled ? styles.disabled : ''} ${className ?? ''}`;

export const Button = ({ children, type = 'button', disabled = false, variant = 'primary', onClick, to, className, title }: ButtonProps) => {
  const combinedClassName = getClassName(variant, disabled, className);

  if (to) {
    return (
      <Link
        to={to}
        onClick={disabled ? (event) => event.preventDefault() : onClick}
        className={combinedClassName}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        title={title}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={combinedClassName}
      title={title}
    >
      {children}
    </button>
  );
};
