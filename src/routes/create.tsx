import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateMeetingFormValues } from '../features/meetings/lib/create-form-schema';
import { MeetingForm } from '../components/MeetingForm';
import { useUserProfile } from '../features/meetings/lib/profile-storage';
import { useStore } from '@livestore/react';
import { events } from '../livestore/schema';
import styles from './create.module.css';

export const Route = createFileRoute('/create')({
  component: CreateMeetingPage,
});

function CreateMeetingPage() {
  const navigate = useNavigate();
  const profile = useUserProfile();
  const { store } = useStore();

  const handleSubmit = async (data: CreateMeetingFormValues) => {
    const meetId = crypto.randomUUID();
    store.commit(
      events.meetCreated({
        id: meetId,
        title: data.title,
        createdAt: new Date(),
        createdByParticipantId: profile.userId,
        timezone: data.timezone,
        windowStartTime: data.windowStartTime,
        windowEndTime: data.windowEndTime,
        slotMinutes: data.slotMinutes,
        disabledDaysOfWeek: data.disabledDaysOfWeek,
      }),
    );

    console.log('Meeting created:', { meetId, ...data, createdBy: profile.userId });
    navigate({ to: '/meet/$meetId', params: { meetId } });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create a New Meeting</h1>
        <p className={styles.subtitle}>Set your availability window and time preferences</p>

        <MeetingForm
          defaultValues={{
            title: '',
            timezone: 'UTC',
            slotMinutes: 30,
            windowStartTime: '09:00',
            windowEndTime: '17:00',
            disabledDaysOfWeek: [],
          }}
          onSubmit={handleSubmit}
          submitButtonText="Create Meeting"
        />
      </div>
    </div>
  );
}
