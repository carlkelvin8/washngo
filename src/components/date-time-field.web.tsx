import { Field } from '@/components/ui';

type Props = { label: string; mode: 'date' | 'time'; value: Date; minimumDate?: Date; onChange: (value: Date) => void; error?: string };

export function DateTimeField({ label, mode, value, onChange, error }: Props) {
  const text = mode === 'date' ? value.toISOString().slice(0, 10) : value.toTimeString().slice(0, 5);
  return <Field label={label} value={text} error={error} onChangeText={(next) => {
    if (mode === 'date') {
      const parsed = new Date(`${next}T12:00:00`); if (!Number.isNaN(parsed.valueOf())) onChange(parsed);
    } else {
      const [hours, minutes] = next.split(':').map(Number); if (Number.isFinite(hours) && Number.isFinite(minutes)) { const parsed = new Date(value); parsed.setHours(hours, minutes, 0, 0); onChange(parsed); }
    }
  }} placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'} />;
}
