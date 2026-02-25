import type { PropsWithChildren } from 'react';
import styles from './Button.module.css';

type ButtonProps = PropsWithChildren<{
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}>;

export const Button = ({ children, type = 'button', disabled = false, variant = 'primary', onClick }: ButtonProps) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`${styles.button} ${styles[`button-${variant}`]} ${disabled ? styles.disabled : ''}`}
  >
    {children}
  </button>
);
