import { Alert, Text } from 'react-native';

import { Button, Card, ui } from '@/components/ui';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

export function AccountCard() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile) return null;

  return (
    <Card>
      <Text style={ui.h2}>{profile.full_name}</Text>
      <Text style={ui.body}>
        {profile.role.replace('_', ' ')} · {profile.status}
      </Text>
      {profile.phone ? <Text style={ui.caption}>{profile.phone}</Text> : null}
      <Button
        variant="secondary"
        onPress={() =>
          Alert.alert('Sign out?', 'You will need to sign in again to continue.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
          ])
        }
      >
        Sign out
      </Button>
    </Card>
  );
}
