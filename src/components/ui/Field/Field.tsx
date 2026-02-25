import type { PropsWithChildren } from 'react';
import styles from './Field.module.css';

type FieldProps = PropsWithChildren<{
  label?: string;
  hint?: string;
  error?: string;
}>;

export const Field = ({ children, label, hint, error }: FieldProps) => (
  <div className={styles.field}>
    {label && <label className={styles.label}>{label}</label>}
    {children}
    {hint && !error && <p className={styles.hint}>{hint}</p>}
    {error && <p className={styles.error}>{error}</p>}
  </div>
);
