import { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { convertTo12Hour } from '../../../features/meetings/lib/time';
import styles from './TimeCombobox.module.css';

type TimeComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
};

export const TimeCombobox = ({ value, onChange, options, placeholder = 'HH:mm', disabled = false }: TimeComboboxProps) => {
  const [query, setQuery] = useState('');

  const filtered =
    query === ''
      ? options
      : options.filter((option) => {
          const display12Hour = convertTo12Hour(option);
          return display12Hour.toLowerCase().includes(query.toLowerCase());
        });

  const handleChange = (val: string | null) => {
    if (val !== null) {
      onChange(val);
    }
  };

  return (
    <Combobox
      value={value}
      onChange={handleChange}
      disabled={disabled}
    >
      <div className={styles.container}>
        <div className={styles.inputWrapper}>
          <Combobox.Input
            className={styles.input}
            placeholder={placeholder}
            onChange={(e) => setQuery(e.target.value)}
            displayValue={(val: string) => (val ? convertTo12Hour(val) : '')}
          />
          <Combobox.Button className={styles.button}>
            <svg
              className={styles.chevron}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </Combobox.Button>
        </div>

        <Combobox.Options className={styles.options}>
          {filtered.length === 0 ? (
            <div className={styles.noOptions}>No times found</div>
          ) : (
            filtered.map((option) => (
              <Combobox.Option
                key={option}
                value={option}
                className={({ active, selected }) => `
                  ${styles.option}
                  ${active ? styles.active : ''}
                  ${selected ? styles.selected : ''}
                `}
              >
                {convertTo12Hour(option)}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};
