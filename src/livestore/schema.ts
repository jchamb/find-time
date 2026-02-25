import { Events, SessionIdSymbol, makeSchema, Schema, State } from '@livestore/livestore';

/**
 * Clock time format `HH:mm` in 24-hour format.
 * We validate deeper constraints (alignment and range) in app-level logic.
 */
export const ClockTime = Schema.String;

export const tables = {
  meets: State.SQLite.table({
    name: 'meets',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      title: State.SQLite.text(),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      createdByParticipantId: State.SQLite.text(),
      timezone: State.SQLite.text(),
      disabledDaysOfWeek: State.SQLite.json({ schema: Schema.Array(Schema.Number), default: [] }),
      windowStartTime: State.SQLite.text(),
      windowEndTime: State.SQLite.text(),
      slotMinutes: State.SQLite.integer(),
      deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    },
  }),
  participants: State.SQLite.table({
    name: 'participants',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      meetId: State.SQLite.text(),
      name: State.SQLite.text({ default: '' }),
      timezone: State.SQLite.text({ default: 'UTC' }),
      joinedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    },
  }),
  availabilitySlots: State.SQLite.table({
    name: 'availability_slots',
    columns: {
      /** deterministic `${participantId}:${dayOfWeek}:${startTime}` */
      id: State.SQLite.text({ primaryKey: true }),
      meetId: State.SQLite.text(),
      participantId: State.SQLite.text(),
      /**
       * Day of week as a number, matching JS Date.getDay() and dayjs format:
       * 0 = Sunday, 1 = Monday, 2 = Tuesday, ..., 6 = Saturday
       */
      dayOfWeek: State.SQLite.text(),
      startTime: State.SQLite.text(),
      endTime: State.SQLite.text(),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),
  /** local/session-only state, never synced */
  uiState: State.SQLite.clientDocument({
    name: 'uiState',
    schema: Schema.Struct({
      meetId: Schema.String,
      selfParticipantId: Schema.String,
      selfNameInput: Schema.String,
      timezone: Schema.String,
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        meetId: '',
        selfParticipantId: '',
        selfNameInput: '',
        timezone: 'UTC',
      },
    },
  }),
} as const;

export const events = {
  meetCreated: Events.synced({
    name: 'v1.MeetCreated',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      createdAt: Schema.Date,
      createdByParticipantId: Schema.String,
      timezone: Schema.String,
      windowStartTime: ClockTime,
      windowEndTime: ClockTime,
      slotMinutes: Schema.Number,
      disabledDaysOfWeek: Schema.Array(Schema.Number),
    }),
  }),
  meetScheduleConfigUpdated: Events.synced({
    name: 'v1.MeetScheduleConfigUpdated',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.optional(Schema.String),
      timezone: Schema.String,
      windowStartTime: ClockTime,
      windowEndTime: ClockTime,
      slotMinutes: Schema.Number,
      disabledDaysOfWeek: Schema.Array(Schema.Number),
    }),
  }),
  participantJoined: Events.synced({
    name: 'v1.ParticipantJoined',
    schema: Schema.Struct({
      id: Schema.String,
      meetId: Schema.String,
      name: Schema.String,
      timezone: Schema.String,
      joinedAt: Schema.Date,
    }),
  }),
  participantRenamed: Events.synced({
    name: 'v1.ParticipantRenamed',
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }),
  }),
  // participantLeft: Events.synced({
  //   name: 'v1.ParticipantLeft',
  //   schema: Schema.Struct({
  //     id: Schema.String,
  //     deletedAt: Schema.Date,
  //   }),
  // }),
  availabilityMarked: Events.synced({
    name: 'v1.AvailabilityMarked',
    schema: Schema.Struct({
      id: Schema.String,
      meetId: Schema.String,
      participantId: Schema.String,
      dayOfWeek: Schema.Number,
      startTime: ClockTime,
      endTime: ClockTime,
      createdAt: Schema.Date,
    }),
  }),
  availabilityUnmarked: Events.synced({
    name: 'v1.AvailabilityUnmarked',
    schema: Schema.Struct({
      id: Schema.String,
    }),
  }),
  participantAvailabilityCleared: Events.synced({
    name: 'v1.ParticipantAvailabilityCleared',
    schema: Schema.Struct({
      participantId: Schema.String,
    }),
  }),
  uiStateSet: tables.uiState.set,
} as const;

const materializers = State.SQLite.materializers(events, {
  'v1.MeetCreated': ({
    id,
    title,
    createdAt,
    createdByParticipantId,
    timezone,
    windowStartTime,
    windowEndTime,
    slotMinutes,
    disabledDaysOfWeek,
  }) =>
    tables.meets.insert({
      id,
      title,
      createdAt,
      createdByParticipantId,
      timezone,
      windowStartTime,
      windowEndTime,
      slotMinutes,
      disabledDaysOfWeek,
      deletedAt: null,
    }),
  'v1.MeetScheduleConfigUpdated': ({
    id,
    title,
    timezone,
    windowStartTime,
    windowEndTime,
    slotMinutes,
    disabledDaysOfWeek,
  }) =>
    tables.meets
      .update({ ...(title && { title }), timezone, windowStartTime, windowEndTime, slotMinutes, disabledDaysOfWeek })
      .where({ id }),
  'v1.ParticipantJoined': ({ id, meetId, name, timezone, joinedAt }) =>
    tables.participants.insert({
      id,
      meetId,
      name,
      timezone,
      joinedAt,
      deletedAt: null,
    }),
  'v1.ParticipantRenamed': ({ id, name }) => tables.participants.update({ name }).where({ id }),
  // 'v1.ParticipantLeft': ({ id, deletedAt }) => tables.participants.update({ deletedAt }).where({ id }),
  'v1.AvailabilityMarked': ({ id, meetId, participantId, dayOfWeek, startTime, endTime, createdAt }) =>
    tables.availabilitySlots.insert({
      id,
      meetId,
      participantId,
      dayOfWeek: String(dayOfWeek),
      startTime,
      endTime,
      createdAt,
    }),
  'v1.AvailabilityUnmarked': ({ id }) => tables.availabilitySlots.delete().where({ id }),
  'v1.ParticipantAvailabilityCleared': ({ participantId }) =>
    tables.availabilitySlots.delete().where({ participantId }),
});

const state = State.SQLite.makeState({ tables, materializers });

export const schema = makeSchema({ events, state });

// Shared sync payload schema for Cloudflare sync backend auth.
export const SyncPayload = Schema.Struct({ authToken: Schema.String });
