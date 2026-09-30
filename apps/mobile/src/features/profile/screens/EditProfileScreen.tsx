import { ApiClientError } from '@saraya/api-client';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { Button, Screen, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { ProfileAvatar } from '../components/ProfileAvatar';

export function EditProfileScreen() {
  const router = useRouter();
  const { user, isDevelopmentPreview, saveProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile');

  const choosePhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo library access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0] ?? null);
  };

  const submit = async () => {
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setError('Enter a name with at least 2 characters.');
      return;
    }
    if (!user) {
      setError('Sign in before editing your profile.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveProfile({ displayName: trimmedName, ...(photo ? { photo } : {}) });
      goBack();
    } catch (caught) {
      if (caught instanceof ApiClientError) console.error('Profile save failed:', caught);
      setError('Your profile could not be saved. Check your internet connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = photo?.uri ?? user?.avatarUrl ?? null;

  return (
    <Screen backAction={{ accessibilityLabel: 'Back to profile', onPress: goBack }}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>Choose how your name and photo appear in Saraya.</Text>
      </View>

      <View style={styles.photoSection}>
        <View style={styles.avatarWrap}>
          <ProfileAvatar avatarUrl={previewUrl} label="Profile picture preview" size={112} />
          <View accessibilityElementsHidden style={styles.cameraBadge}>
            <Camera color={colors.white} size={18} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose profile picture"
          disabled={saving}
          onPress={() => void choosePhoto()}
          style={({ pressed }) => [styles.photoButton, pressed && styles.pressed, saving && styles.disabled]}
        >
          <Text style={styles.photoButtonText}>{photo ? 'Choose a different photo' : 'Choose a photo'}</Text>
        </Pressable>
        <Text style={styles.photoHint}>JPEG, PNG, or WebP · up to 5 MB</Text>
      </View>

      <View style={styles.field}>
        <Text nativeID="display-name-label" style={styles.label}>Display name</Text>
        <TextInput
          accessibilityLabel="Display name"
          accessibilityLabelledBy="display-name-label"
          autoCapitalize="words"
          editable={!saving}
          maxLength={60}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={styles.input}
          value={displayName}
        />
        <Text style={styles.count}>{displayName.length}/60</Text>
      </View>

      {isDevelopmentPreview ? (
        <StatusPanel
          message="This preview account is local, so these changes reset when the app reloads. Sign in with Google to save them to an account."
          title="Development preview"
        />
      ) : null}
      {error ? <StatusPanel message={error} title="Unable to save" tone="error" /> : null}
      <Button
        disabled={!user || displayName.trim().length < 2}
        icon={Check}
        label="Save profile"
        loading={saving}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22 },
  photoSection: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  avatarWrap: { position: 'relative' },
  cameraBadge: { position: 'absolute', right: 0, bottom: 2, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderWidth: 3, borderColor: colors.background },
  photoButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.blueSoft },
  photoButtonText: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  photoHint: { color: colors.muted, fontFamily: type.medium, fontSize: 12 },
  field: { gap: spacing.sm },
  label: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  input: { minHeight: 52, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, color: colors.navy, fontFamily: type.medium, fontSize: 16 },
  count: { alignSelf: 'flex-end', color: colors.muted, fontFamily: type.medium, fontSize: 11 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.48 },
});
