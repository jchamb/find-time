import { useForm, Controller } from 'react-hook-form';
import { Fragment } from 'react';
import { RadioGroup } from '@headlessui/react';
import { createMeetingSchema } from '../features/meetings/lib/create-form-schema';
import type { CreateMeetingFormValues } from '../features/meetings/lib/create-form-schema';
import { makeTimeOptions } from '../features/meetings/lib/time';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Field } from './ui/Field';
import { TimeCombobox } from './ui/TimeCombobox';
import { DayToggleGrid } from './DayToggleGrid';
import styles from '../routes/create.module.css';

interface MeetingFormProps {
  defaultValues: CreateMeetingFormValues;
  onSubmit: (data: CreateMeetingFormValues) => void | Promise<void>;
  submitButtonText?: string;
  cancelButtonText?: string;
  onCancel?: () => void;
}

export function MeetingForm({
  defaultValues,
  onSubmit,
  submitButtonText = 'Submit',
  cancelButtonText = 'Cancel',
  onCancel,
}: MeetingFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<CreateMeetingFormValues>({
    defaultValues,
  });

  const slotMinutes = watch('slotMinutes');
  const timeOptions = makeTimeOptions(slotMinutes);

  const handleFormSubmit = async (data: CreateMeetingFormValues) => {
    // Validate using Zod schema
    try {
      createMeetingSchema.parse(data);
    } catch (error: any) {
      error.errors?.forEach((err: any) => {
        const path = err.path[0];
        if (path) {
          setError(path as any, { message: err.message });
        }
      });
      return;
    }

    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      setError('title' as any, { message: 'An error occurred' });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.form}>
      {/* Meeting Title */}
      <Field label="Meeting Title" error={errors.title?.message}>
        <Input
          {...register('title')}
          placeholder="e.g., Q1 Planning Session"
          type="text"
        />
      </Field>

      {/* Timezone */}
      <Field label="Timezone" error={errors.timezone?.message}>
        <select
          {...register('timezone')}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontFamily: 'inherit',
          }}
        >
          <option value="UTC">UTC</option>
          <option value="EST">EST</option>
          <option value="CST">CST</option>
          <option value="MST">MST</option>
          <option value="PST">PST</option>
        </select>
      </Field>

      {/* Slot Duration */}
      <Field label="Slot Duration" error={errors.slotMinutes?.message}>
        <Controller
          name="slotMinutes"
          control={control}
          render={({ field }) => (
            <RadioGroup value={field.value} onChange={field.onChange}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[15, 30, 60].map((minutes) => (
                  <RadioGroup.Option key={minutes} value={minutes} as={Fragment}>
                    {({ checked }) => (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="slotMinutes"
                          checked={checked}
                          readOnly
                          style={{ cursor: 'pointer' }}
                        />
                        {minutes} min
                      </label>
                    )}
                  </RadioGroup.Option>
                ))}
              </div>
            </RadioGroup>
          )}
        />
      </Field>

      {/* Availability Window */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Start Time" error={errors.windowStartTime?.message}>
          <Controller
            name="windowStartTime"
            control={control}
            render={({ field }) => (
              <TimeCombobox
                value={field.value}
                onChange={field.onChange}
                options={timeOptions}
              />
            )}
          />
        </Field>

        <Field label="End Time" error={errors.windowEndTime?.message}>
          <Controller
            name="windowEndTime"
            control={control}
            render={({ field }) => (
              <TimeCombobox
                value={field.value}
                onChange={field.onChange}
                options={timeOptions}
              />
            )}
          />
        </Field>
      </div>

      {/* Disabled Days */}
      <Field
        label="Exclude Days "
        hint="Click days to exclude them from availability"
        error={errors.disabledDaysOfWeek?.message}
      >
        <Controller
          name="disabledDaysOfWeek"
          control={control}
          render={({ field }) => (
            <DayToggleGrid value={field.value} onChange={field.onChange} />
          )}
        />
      </Field>

      {/* Submit Buttons */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : submitButtonText}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            {cancelButtonText}
          </button>
        )}
      </div>
    </form>
  );
}
