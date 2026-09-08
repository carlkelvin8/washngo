import { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/constants/design';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  onChange: (value: Date) => void;
  error?: string;
};

export function DateTimeField({ label, mode, value, minimumDate, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const display = mode === 'date'
    ? value.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    : value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && next) onChange(next);
  };
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${label}`} onPress={() => setOpen(true)} style={[styles.control, error && styles.errorBorder]}>
      <Text style={styles.value}>{display}</Text><Text style={styles.action}>Change</Text>
    </Pressable>
    {open ? <View style={styles.pickerWrap}>
      <DateTimePicker value={value} mode={mode} minimumDate={minimumDate} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleChange} />
      {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={() => setOpen(false)}><Text style={styles.done}>Done</Text></Pressable> : null}
    </View> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 6 }, label: { fontSize: 13, fontWeight: '700', color: colors.ink },
  control: { minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  value: { flex: 1, color: colors.ink, fontSize: 16 }, action: { color: colors.blue, fontWeight: '800' },
  pickerWrap: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.sm },
  done: { color: colors.blue, fontWeight: '800', textAlign: 'right', padding: space.md },
  error: { color: colors.red, fontSize: 12 }, errorBorder: { borderColor: colors.red },
});
