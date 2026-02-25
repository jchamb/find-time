import { useMemo, useState, useRef } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { DAYS_OF_WEEK, toMinutes, pad2 } from '../../features/meetings/lib/time';
import styles from './AvailabilityGrid.module.css';

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  participantCount: number;
  participantNames: string[];
}

interface AvailabilityGridProps {
  meetId: string;
  windowStartTime: string;
  windowEndTime: string;
  slotMinutes: number;
  disabledDaysOfWeek: number[];
  slots: AvailabilitySlot[];
  myMarkedSlots: Set<string>;
  isJoined: boolean;
  formatTimeForUser: (time24: string) => string;
  onToggleSlot: (slotId: string, marked: boolean) => void;
}

export const AvailabilityGrid = ({
  windowStartTime,
  windowEndTime,
  slotMinutes,
  disabledDaysOfWeek,
  slots,
  myMarkedSlots,
  isJoined,
  formatTimeForUser,
  onToggleSlot,
}: AvailabilityGridProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'mark' | 'unmark' | null>(null);
  const dragStart = useRef<{ day: number; time: string } | null>(null);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const result: string[] = [];
    const start = toMinutes(windowStartTime);
    const end = toMinutes(windowEndTime);

    for (let minutes = start; minutes <= end; minutes += slotMinutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      result.push(`${pad2(hours)}:${pad2(mins)}`);
    }

    return result;
  }, [windowStartTime, windowEndTime, slotMinutes]);

  // Generate active days (excluding disabled)
  const activeDays = useMemo(
    () => DAYS_OF_WEEK.filter((day) => !disabledDaysOfWeek.includes(day.value)),
    [disabledDaysOfWeek],
  );

  // Map slots by day:time key
  const slotsByKey = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    slots.forEach((slot) => {
      const key = `${slot.dayOfWeek}:${slot.startTime}`;
      map.set(key, slot);
    });
    return map;
  }, [slots]);

  // Find best time slot
  const bestSlot = useMemo<{ day: number; time: string; count: number } | null>(() => {
    let best: { day: number; time: string; count: number } | null = null;

    activeDays.forEach((dayObj) => {
      timeSlots.forEach((time) => {
        const key = `${dayObj.value}:${time}`;
        const slot = slotsByKey.get(key);
        const count = slot?.participantCount ?? 0;

        if (!best || count > best.count) {
          best = { day: dayObj.value, time, count };
        }
      });
    });

    return best;
  }, [activeDays, timeSlots, slotsByKey]);

  // Get color intensity (0 = white, 1 = green)
  const getIntensity = (participantCount: number) => {
    if (participantCount === 0) return 0;
    // Assuming max ~10 participants
    return Math.min(1, participantCount / 10);
  };

  const getBackgroundColor = (participantCount: number, isMySlot: boolean) => {
    if (isMySlot) {
      // Blue tint for my marked slots
      return '#dbeafe';
    }

    const intensity = getIntensity(participantCount);
    if (intensity === 0) return 'white';

    // Interpolate from white to green
    const r = Math.round(255 * (1 - intensity * 0.5));
    const g = Math.round(200 + 55 * intensity);
    const b = Math.round(255 * (1 - intensity * 0.8));

    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleMouseDown = (day: number, time: string, isMarked: boolean) => {
    if (!isJoined) {
      alert('Please join the meeting first to mark your availability');
      return;
    }

    setIsDragging(true);
    setDragMode(isMarked ? 'unmark' : 'mark');
    dragStart.current = { day, time };

    // Toggle on initial click
    const key = `${day}:${time}`;
    const slot = slotsByKey.get(key);
    if (slot) {
      onToggleSlot(slot.id, !isMarked);
    }
  };

  const handleMouseEnter = (day: number, time: string, isMarked: boolean) => {
    if (!isDragging || !isJoined) return;

    const shouldMark =
      (dragMode === 'mark' && !isMarked) || (dragMode === 'unmark' && isMarked);
    if (!shouldMark) return;

    const key = `${day}:${time}`;
    const slot = slotsByKey.get(key);
    if (slot) {
      onToggleSlot(slot.id, dragMode === 'mark');
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
    dragStart.current = null;
  };

  return (
    <div
      className={styles.container}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Best Slot Summary */}
      {bestSlot && (
        <div className={styles.bestSlotSummary}>
          <p className={styles.bestSlotText}>
            <strong>Best time:</strong> {DAYS_OF_WEEK[bestSlot.day].longLabel} at{' '}
            {formatTimeForUser(bestSlot.time)}
            {bestSlot.count > 0 && ` (${bestSlot.count} available)`}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className={styles.gridWrapper}>
        <div className={styles.grid}>
          {/* Header: Day names */}
          <div className={styles.headerRow}>
            <div className={styles.timeColumnHeader} />
            {activeDays.map((day) => (
              <div key={day.value} className={styles.dayHeader}>
                {day.shortLabel}
              </div>
            ))}
          </div>

          {/* Rows: Time slots */}
          {timeSlots.map((time) => (
            <div key={time} className={styles.row}>
              <div className={styles.timeCell}>{formatTimeForUser(time)}</div>
              {activeDays.map((day) => {
                const key = `${day.value}:${time}`;
                const slot = slotsByKey.get(key);
                const isMarked = slot ? myMarkedSlots.has(slot.id) : false;
                const participantCount = slot?.participantCount ?? 0;

                return (
                  <div
                    key={key}
                    className={`${styles.availabilityCell} ${isMarked ? styles.marked : ''}`}
                    style={{
                      backgroundColor: getBackgroundColor(
                        participantCount,
                        isMarked,
                      ),
                    }}
                    onMouseDown={() => handleMouseDown(day.value, time, isMarked)}
                    onMouseEnter={() => handleMouseEnter(day.value, time, isMarked)}
                    data-tooltip-id="availability-tooltip"
                    data-tooltip-content={
                      slot && slot.participantNames.length > 0
                        ? slot.participantNames.join(', ')
                        : 'No availability'
                    }
                  >
                    {participantCount > 0 && (
                      <span className={styles.count}>{participantCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Tooltip id="availability-tooltip" place="top" />
    </div>
  );
};
