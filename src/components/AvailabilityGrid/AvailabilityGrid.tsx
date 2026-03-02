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

  const allParticipantNames = useMemo(() => {
    const uniqueNames = new Set<string>();
    slots.forEach((slot) => {
      slot.participantNames.forEach((name) => {
        uniqueNames.add(name);
      });
    });

    return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b));
  }, [slots]);

  // Find best time slot
  const bestSlot = useMemo<
    { day: number; time: string; count: number; availableNames: string[] } | null
  >(() => {
    let best: { day: number; time: string; count: number; availableNames: string[] } | null =
      null;

    activeDays.forEach((dayObj) => {
      timeSlots.forEach((time) => {
        const key = `${dayObj.value}:${time}`;
        const slot = slotsByKey.get(key);
        const count = slot?.participantCount ?? 0;

        if (!best || count > best.count) {
          const availableNames = Array.from(new Set(slot?.participantNames ?? [])).sort((a, b) =>
            a.localeCompare(b),
          );

          best = {
            day: dayObj.value,
            time,
            count,
            availableNames,
          };
        }
      });
    });

    return best;
  }, [activeDays, timeSlots, slotsByKey]);

  const unavailableAtBestSlot = useMemo(() => {
    if (!bestSlot) return [];

    const availableNamesSet = new Set(bestSlot.availableNames);
    return allParticipantNames.filter((name) => !availableNamesSet.has(name));
  }, [bestSlot, allParticipantNames]);

  // Get color intensity (0 = no availability, 1 = high availability)
  const getIntensity = (participantCount: number) => {
    if (participantCount === 0) return 0;
    // Assuming max ~10 participants
    return Math.min(1, participantCount / 10);
  };

  const getCellBackground = (participantCount: number, isMySlot: boolean) => {
    const intensity = getIntensity(participantCount);
    if (intensity === 0) {
      return 'transparent';
    }

    // User-provided gradient baseline:
    // linear-gradient(135deg, rgba(0,255,190,0.122) 0%, rgba(45,255,179,0.243) 50%, rgba(0,255,190,0.192) 100%)
    // Scale alpha by availability to increase vibrancy/glow with participant count.
    const baseStartAlpha = 0.122;
    const baseMidAlpha = 0.243;
    const baseEndAlpha = 0.192;

    const intensityBoost = 1 + intensity * 2.4;
    const markedBoost = isMySlot ? 1.45 : 1;
    const alphaScale = intensityBoost * markedBoost;

    const startAlpha = Math.min(0.82, baseStartAlpha * alphaScale).toFixed(3);
    const midAlpha = Math.min(0.94, baseMidAlpha * alphaScale).toFixed(3);
    const endAlpha = Math.min(0.88, baseEndAlpha * alphaScale).toFixed(3);

    return `
      linear-gradient(135deg,
        rgba(0, 255, 190, ${startAlpha}) 0%,
        rgba(45, 255, 179, ${midAlpha}) 50%,
        rgba(0, 255, 190, ${endAlpha}) 100%)
    `;
  };

  const getCellGlow = (participantCount: number, isMySlot: boolean) => {
    const intensity = getIntensity(participantCount);
    if (intensity === 0 && !isMySlot) {
      return undefined;
    }

    const glowBoost = isMySlot ? 1.35 : 1;
    const innerAlpha = Math.min(0.95, (0.28 + intensity * 0.62) * glowBoost);
    const outerAlpha = Math.min(0.72, (0.14 + intensity * 0.5) * glowBoost);
    const bloomAlpha = Math.min(0.55, (0.08 + intensity * 0.36) * glowBoost);
    const ringSize = isMySlot ? 2.2 : 1.8;
    const outerSize = 8 + intensity * 20;
    const bloomSize = 18 + intensity * 34;

    return `
      inset 0 0 0 ${ringSize}px rgba(45, 255, 179, ${innerAlpha.toFixed(3)}),
      0 0 ${outerSize.toFixed(1)}px rgba(0, 255, 190, ${outerAlpha.toFixed(3)}),
      0 0 ${bloomSize.toFixed(1)}px rgba(58, 217, 255, ${bloomAlpha.toFixed(3)})
    `;
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
            <strong>Best time:</strong>{' '}
            {DAYS_OF_WEEK.find((day) => day.value === bestSlot.day)?.longLabel ?? 'Unknown day'} at{' '}
            {formatTimeForUser(bestSlot.time)}
            {bestSlot.count > 0 && ` (${bestSlot.count} available)`}
          </p>
          <div className={styles.bestSlotPeople}>
            <p className={styles.bestSlotPeopleText}>
              <strong>Available:</strong>{' '}
              {bestSlot.availableNames.length > 0
                ? bestSlot.availableNames.join(', ')
                : 'No one'}
            </p>
            <p className={styles.bestSlotPeopleText}>
              <strong>Not available:</strong>{' '}
              {unavailableAtBestSlot.length > 0
                ? unavailableAtBestSlot.join(', ')
                : 'None'}
            </p>
          </div>
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
                      background: getCellBackground(
                        participantCount,
                        isMarked,
                      ),
                      boxShadow: getCellGlow(
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
                        : 'No participants available'
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
