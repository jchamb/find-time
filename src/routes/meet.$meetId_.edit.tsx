import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateMeetingFormValues } from '../features/meetings/lib/create-form-schema';
import { MeetingForm } from '../components/MeetingForm';
import { useUserProfile } from '../features/meetings/lib/profile-storage';
import { useStore } from '@livestore/react';
import { events } from '../livestore/schema';
import { meetById$ } from '../livestore/queries';
import { useMemo } from 'react';
import styles from './create.module.css';

export const Route = createFileRoute('/meet/$meetId_/edit')({
  component: EditMeetingPage,
});

function EditMeetingPage() {
  const navigate = useNavigate();
  const { meetId } = Route.useParams();
  const profile = useUserProfile();
  const { store } = useStore();

  const meetRows = store.useQuery(meetById$(meetId));
  const meet = meetRows[0];

  // Check if user is the creator
  const isCreator = useMemo(() => {
    return meet && meet.createdByParticipantId === profile.userId;
  }, [meet, profile.userId]);

  // Redirect if not creator
  if (meet && !isCreator) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>Only the meeting creator can edit this meeting.</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/meet/$meetId', params: { meetId } })}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Back to Meeting
        </button>
      </div>
    );
  }

  if (!meet) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Loading meeting data...</p>
      </div>
    );
  }

  const handleSubmit = (data: CreateMeetingFormValues) => {
    store.commit(
      events.meetScheduleConfigUpdated({
        id: meetId,
        title: data.title,
        timezone: data.timezone,
        windowStartTime: data.windowStartTime,
        windowEndTime: data.windowEndTime,
        slotMinutes: data.slotMinutes,
        disabledDaysOfWeek: data.disabledDaysOfWeek,
      }),
    );

    console.log('Meeting updated:', { meetId, ...data });
    navigate({ to: '/meet/$meetId', params: { meetId } });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Edit Meeting</h1>
        <p className={styles.subtitle}>Update meeting settings</p>

        <MeetingForm
          defaultValues={{
            title: meet.title,
            timezone: meet.timezone,
            slotMinutes: meet.slotMinutes,
            windowStartTime: meet.windowStartTime,
            windowEndTime: meet.windowEndTime,
            disabledDaysOfWeek: (meet.disabledDaysOfWeek || []) as number[],
          }}
          onSubmit={handleSubmit}
          submitButtonText="Save Changes"
          cancelButtonText="Cancel"
          onCancel={() => navigate({ to: '/meet/$meetId', params: { meetId } })}
        />
      </div>
    </div>
  );
}
