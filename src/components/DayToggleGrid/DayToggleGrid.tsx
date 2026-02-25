import { DAYS_OF_WEEK } from '../../features/meetings/lib/time';
import styles from './DayToggleGrid.module.css';

type DayToggleGridProps = {
  value: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
};

export const DayToggleGrid = ({ value, onChange, disabled = false }: DayToggleGridProps) => {
  const handleToggle = (day: number) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day].sort());
    }
  };

  return (
    <div className={styles.grid}>
      {DAYS_OF_WEEK.map((day) => (
        <button
          key={day.value}
          type="button"
          disabled={disabled}
          onClick={() => handleToggle(day.value)}
          className={`${styles.dayButton} ${value.includes(day.value) ? styles.disabled : styles.enabled}`}
          title={`${value.includes(day.value) ? 'Disable' : 'Enable'} ${day.longLabel}`}
        >
          {day.shortLabel}
        </button>
      ))}
    </div>
  );
};
