import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useState, useCallback, useMemo } from 'react';
import { useUserProfile, useUpdateUserProfile } from '../features/meetings/lib/profile-storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { useStore } from '@livestore/react';
import { events } from '../livestore/schema';
import { availabilityByMeet$, meetById$, participantsByMeet$ } from '../livestore/queries';
import { DAYS_OF_WEEK, pad2, toMinutes, convertTimeToTimezone, getUserTimezone, convertTo12Hour } from '../features/meetings/lib/time';
import styles from './meet.module.css';

export const Route = createFileRoute('/meet/$meetId')({
  component: MeetingPage,
});

interface ParticipantFormData {
  name: string;
  email: string;
}

function MeetingPage() {
  const navigate = useNavigate();
  const { meetId } = Route.useParams();
  const profile = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const { store } = useStore();
  const [copied, setCopied] = useState(false);

  const meetRows = store.useQuery(meetById$(meetId));
  const participants = store.useQuery(participantsByMeet$(meetId));
  const availability = store.useQuery(availabilityByMeet$(meetId));

  const meetConfig = useMemo(() => {
    const meet = meetRows[0];
    return {
      id: meet?.id,
      title: meet?.title ?? 'Meeting',
      createdByParticipantId: meet?.createdByParticipantId,
      timezone: meet?.timezone ?? 'UTC',
      windowStartTime: meet?.windowStartTime ?? '09:00',
      windowEndTime: meet?.windowEndTime ?? '18:00',
      slotMinutes: meet?.slotMinutes ?? 30,
      disabledDaysOfWeek: meet?.disabledDaysOfWeek ?? [6],
    };
  }, [meetRows]);

  const userTimezone = useMemo(() => getUserTimezone(), []);

  const formatTimeForUser = useCallback((time24: string) => {
    const convertedTime = convertTimeToTimezone(time24, meetConfig.timezone, userTimezone);
    return convertTo12Hour(convertedTime);
  }, [meetConfig.timezone, userTimezone]);

  const isJoined = useMemo(
    () => participants.some((participant) => participant.id === profile.userId),
    [participants, profile.userId],
  );

  const markedSlots = useMemo(() => {
    const set = new Set<string>();
    availability.forEach((slot) => {
      if (slot.participantId === profile.userId) {
        set.add(slot.id);
      }
    });
    return set;
  }, [availability, profile.userId]);

  const { timeSlots, activeDays } = useMemo(() => {
    const start = toMinutes(meetConfig.windowStartTime);
    const end = toMinutes(meetConfig.windowEndTime);
    const times: string[] = [];
    for (let minutes = start; minutes < end; minutes += meetConfig.slotMinutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      times.push(`${pad2(hours)}:${pad2(mins)}`);
    }

    return {
      timeSlots: times,
      activeDays: DAYS_OF_WEEK.filter(
        (day) => !meetConfig.disabledDaysOfWeek.includes(day.value),
      ),
    };
  }, [meetConfig.windowEndTime, meetConfig.windowStartTime, meetConfig.slotMinutes, meetConfig.disabledDaysOfWeek]);

  const { availabilityData, slotInfoById } = useMemo(() => {
    const participantsById = new Map(
      participants.map((participant) => [participant.id, participant]),
    );

    const availabilityByKey = new Map<string, string[]>();
    availability.forEach((slot) => {
      const key = `${Number(slot.dayOfWeek)}:${slot.startTime}`;
      const list = availabilityByKey.get(key) ?? [];
      list.push(slot.participantId);
      availabilityByKey.set(key, list);
    });

    const data: { id: string; dayOfWeek: number; startTime: string; participantCount: number; participantNames: string[] }[] = [];
    const info = new Map<string, { dayOfWeek: number; startTime: string; endTime: string }>();

    activeDays.forEach((day) => {
      timeSlots.forEach((time) => {
        const key = `${day.value}:${time}`;
        const participantIds = availabilityByKey.get(key) ?? [];
        const participantNames = participantIds
          .map((id) => participantsById.get(id)?.name)
          .filter((name): name is string => Boolean(name));

        const endMinutes = toMinutes(time) + meetConfig.slotMinutes;
        const endTime = `${pad2(Math.floor(endMinutes / 60))}:${pad2(endMinutes % 60)}`;

        const id = `${profile.userId}:${day.value}:${time}`;
        info.set(id, {
          dayOfWeek: day.value,
          startTime: time,
          endTime,
        });

        data.push({
          id,
          dayOfWeek: day.value,
          startTime: time,
          participantCount: participantIds.length,
          participantNames,
        });
      });
    });

    return { availabilityData: data, slotInfoById: info };
  }, [availability, participants, activeDays, timeSlots, profile.userId, meetConfig.slotMinutes]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ParticipantFormData>({
    defaultValues: {
      name: profile.name || '',
      email: profile.email || '',
    },
  });

  const handleToggleSlot = useCallback(async (slotId: string, marked: boolean) => {
    try {
      if (marked) {
        const slotInfo = slotInfoById.get(slotId);
        if (!slotInfo) {
          return;
        }

        store.commit(
          events.availabilityMarked({
            id: slotId,
            meetId,
            participantId: profile.userId,
            dayOfWeek: slotInfo.dayOfWeek,
            startTime: slotInfo.startTime,
            endTime: slotInfo.endTime,
            createdAt: new Date(),
          }),
        );
      } else {
        // Remove availability entry
        store.commit(events.availabilityUnmarked({ id: slotId }));
      }

      console.log('Availability marked:', { slotId, marked });
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  }, [meetId, profile.userId, slotInfoById, store]);

  const onSubmit = async (data: ParticipantFormData) => {
    const participantId = profile.userId;
    try {
      // Save profile locally
      updateProfile({
        userId: participantId,
        ...data,
      });

      if (isJoined) {
        // Update existing participant name
        store.commit(
          events.participantRenamed({
            id: participantId,
            name: data.name,
          }),
        );
        console.log('Participant name updated:', { meetId, participantId, name: data.name });
      } else {
        // Emit ParticipantJoined event via LiveStore
        store.commit(
          events.participantJoined({
            id: participantId,
            meetId,
            name: data.name,
            timezone: 'UTC',
            joinedAt: new Date(),
          }),
        );
        console.log('Participant joined:', { meetId, participantId, ...data });
      }
    } catch (error) {
      console.error('Failed to join meeting:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('Meeting link copied:', url);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isCreator = useMemo(
    () => meetConfig.createdByParticipantId === profile.userId,
    [meetConfig.createdByParticipantId, profile.userId],
  );

  // Check if meeting data has loaded
  const meet = meetRows[0];
  if (!meet) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Loading meeting data...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className="flex justify-between items-center">
          <div className="flex-fill">
            <h1 className={styles.title}>Find Time for {meetConfig.title}</h1>
            <p className={styles.meetId}>Meeting ID: {meetId.slice(0, 8)}...</p>
          </div>
          {isCreator && (
            <button
              type="button"
              onClick={() => navigate({ to: '/meet/$meetId/edit', params: { meetId } })}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
              title="Edit meeting settings"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="ml-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
            title="Copy meeting link"
          >
            {copied ? '✓ Copied' : 'Share'}
          </button>
          
        </div>
      </header>

      <div className={styles.layout}>
        {/* Left Column: Participant Form */}
        <aside className="flex flex-col min-w-0 overflow-hidden">
          <div>
            <h2 className={styles.sectionTitle}>Your Information</h2>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <Field label="Name" hint="Enter your name">
                <Input
                  {...register('name', { required: 'Name is required' })}
                  placeholder="Your name"
                  type="text"
                />
              </Field>

              <Field label="Email (optional)">
                <Input
                  {...register('email')}
                  placeholder="your.email@example.com"
                  type="email"
                />
              </Field>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isJoined ? 'Update Name' : 'Join Meeting'}
              </Button>
            </form>

            {isJoined && (
              <p className={styles.successMessage}>
                You've successfully joined. Mark your availability on the right!
              </p>
            )}
          </div>
        </aside>

        {/* Right Column: Availability Grid */}
        <main className="flex flex-col min-w-0 overflow-hidden">
          <div>
            <h2 className={styles.sectionTitle}>Availability Overview</h2>

          <AvailabilityGrid
            meetId={meetId}
            windowStartTime={meetConfig.windowStartTime}
            windowEndTime={meetConfig.windowEndTime}
            slotMinutes={meetConfig.slotMinutes}
            disabledDaysOfWeek={[...meetConfig.disabledDaysOfWeek]}
            slots={availabilityData}
            myMarkedSlots={markedSlots}
            isJoined={isJoined}
            formatTimeForUser={formatTimeForUser}
            onToggleSlot={handleToggleSlot}
          />
          
          {!isJoined && (
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#9ca3af', 
              marginTop: '1rem',
              fontStyle: 'italic'
            }}>
              Join the meeting above to mark your availability
            </p>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
