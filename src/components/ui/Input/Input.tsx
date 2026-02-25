import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export const Input = ({ error, className = '', ...props }: InputProps) => (
  <div className={styles.container}>
    <input
      {...props}
      className={`${styles.input} ${error ? styles.error : ''} ${className}`}
    />
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
);
