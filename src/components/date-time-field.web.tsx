import { Field } from '@/components/ui';

type Props = { label: string; mode: 'date' | 'time'; value: Date; minimumDate?: Date; onChange: (value: Date) => void; error?: string };

function toLocalDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function toLocalTimeString(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function DateTimeField({ label, mode, value, minimumDate, onChange, error }: Props) {
  const text = mode === 'date' ? toLocalDateString(value) : toLocalTimeString(value);
  const minDateStr = minimumDate ? toLocalDateString(minimumDate) : undefined;
  return (
    <Field
      label={label}
      value={text}
      error={error}
      onChangeText={(next) => {
        if (mode === 'date') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
          const parsed = new Date(`${next}T12:00:00`);
          if (Number.isNaN(parsed.valueOf())) return;
          if (minimumDate) {
            const minMid = new Date(minimumDate);
            minMid.setHours(0, 0, 0, 0);
            if (parsed < minMid) return;
          }
          onChange(parsed);
        } else {
          if (!/^\d{1,2}:\d{2}$/.test(next)) return;
          const [h, m] = next.split(':').map(Number);
          if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return;
          const parsed = new Date(value);
          parsed.setHours(h, m, 0, 0);
          onChange(parsed);
        }
      }}
      placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
      // hint for native pickers via aria
      {...(mode === 'date' && minDateStr ? { accessibilityHint: `Earliest ${minDateStr}` } : {})}
    />
  );
}
