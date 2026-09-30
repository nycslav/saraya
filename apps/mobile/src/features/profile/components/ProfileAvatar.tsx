import { UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { resolveAvatarUrl } from '@/features/auth/gateway';
import { colors } from '@/ui/theme';

export function ProfileAvatar({
  avatarUrl,
  label,
  size = 76,
}: {
  avatarUrl: string | null;
  label: string;
  size?: number;
}) {
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const frameStyle = { width: size, height: size, borderRadius: size / 2 };
  if (resolvedUrl && failedUrl !== resolvedUrl) {
    return (
      <Image
        accessibilityLabel={label}
        onError={() => setFailedUrl(resolvedUrl)}
        resizeMode="cover"
        source={{ uri: resolvedUrl }}
        style={[styles.frame, frameStyle]}
      />
    );
  }

  return (
    <View accessible accessibilityLabel={label} style={[styles.frame, styles.fallback, frameStyle]}>
      <UserRound color={colors.blue} size={Math.round(size * 0.54)} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.blueSoft },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
