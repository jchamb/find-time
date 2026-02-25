import { queryDb } from '@livestore/livestore';
import { tables } from './schema';

export const meetById$ = (meetId: string) =>
  queryDb(() => tables.meets.where({ id: meetId }), {
    label: `meet:${meetId}`,
  });

export const participantsByMeet$ = (meetId: string) =>
  queryDb(() => tables.participants.where({ meetId, deletedAt: null }), {
    label: `participants:${meetId}`,
  });

export const availabilityByMeet$ = (meetId: string) =>
  queryDb(() => tables.availabilitySlots.where({ meetId }), {
    label: `availability:${meetId}`,
  });
