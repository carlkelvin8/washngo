import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/design';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

export function Screen({ children, scroll = true, refreshing, onRefresh }: ScreenProps) {
  const content = <View style={styles.screenContent}>{children}</View>;

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.select({ ios: 'on-drag', default: 'interactive' }) as unknown as 'on-drag'}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={colors.blue}
                colors={[colors.blue]}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children, eyebrow }: PropsWithChildren<{ eyebrow?: string }>) {
  return (
    <View style={styles.titleWrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

export function Card({ children, onPress }: PropsWithChildren<{ onPress?: () => void }>) {
  if (!onPress) {
    return <View style={styles.card}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      android_ripple={{ color: '#E6F4FE' }}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  children,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.disabled,
        pressed && !(disabled || loading) && styles.pressed,
      ]}
      android_ripple={{ color: variant === 'secondary' ? '#B8D7FF' : 'rgba(255,255,255,0.2)' }}
    >
      {loading ? (
        <ActivityIndicator accessibilityLabel="Working" accessibilityLiveRegion="polite" color={variant === 'secondary' ? colors.blue : colors.white} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonSecondaryText]}>{children}</Text>
      )}
    </Pressable>
  );
}

let _fieldId = 0;
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const nativeId = `field-${++_fieldId}`;
  return (
    <View style={styles.field}>
      <Text nativeID={`${nativeId}-label`} style={styles.label}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-errormessage={error ? `${nativeId}-error` : undefined}
        style={[styles.input, error && styles.inputError]}
        {...props}
      />
      {error ? (
        <Text nativeID={`${nativeId}-error`} accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Badge({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'success' | 'warning' | 'danger' }>) {
  return (
    <View style={[styles.badge, tone === 'success' && styles.success, tone === 'warning' && styles.warning, tone === 'danger' && styles.danger]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>◎</Text>
      </View>
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Skeleton({ height = 80 }: { height?: number }) {
  return <View style={[styles.skeleton, { height }]} />;
}
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={84} />
      ))}
    </View>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.blue} size="large" />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <EmptyState title="We hit a snag" message={message} action={retry ? <Button onPress={retry}>Try again</Button> : undefined} />;
}

export function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <Text style={styles.metric}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.caption}>{hint}</Text> : null}
    </Card>
  );
}

export function Divider() {
  return <View style={ui.divider} />;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={ui.h2}>{children}</Text>;
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  flex: { flex: 1 },
  h2: { fontSize: 20, fontWeight: '800', color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted },
  caption: { fontSize: 12, color: colors.muted },
  price: { fontSize: 18, color: colors.navy, fontWeight: '800' },
  link: { color: colors.blue, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.md },
  section: { gap: space.md, marginTop: space.xl },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1 },
  screenContent: { flex: 1, padding: space.xl, gap: space.lg },
  titleWrap: { gap: space.xs, marginBottom: space.sm },
  eyebrow: { color: colors.blue, fontWeight: '800', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.navy, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: '#EBF0F5',
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue,
  },
  buttonSecondary: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#B8D7FF' },
  buttonDanger: { backgroundColor: colors.red },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  buttonSecondaryText: { color: colors.blue },
  disabled: { opacity: 0.45 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink },
  input: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 16,
  },
  inputError: { borderColor: colors.red },
  error: { color: colors.red, fontSize: 12 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.blueSoft,
  },
  success: { backgroundColor: colors.greenSoft },
  warning: { backgroundColor: '#FFF5E6' },
  danger: { backgroundColor: '#FFEBEB' },
  badgeText: { fontSize: 11, color: colors.navy, fontWeight: '800', textTransform: 'capitalize' },
  empty: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B8D7FF' },
  emptyIcon: { fontSize: 32, color: colors.blue, fontWeight: '800' },
  emptyAction: { marginTop: space.sm },
  skeleton: { backgroundColor: '#EAF0F7', borderRadius: radius.md, borderWidth: 1, borderColor: '#EBF0F5' },
  skeletonList: { gap: space.md },
  h2: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center' },
  center: { flex: 1, minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: space.md },
  metric: { fontSize: 26, fontWeight: '900', color: colors.navy },
  caption: { color: colors.muted, fontSize: 12 },
});
