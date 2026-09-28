import type { GenerationQuota, PremiumAccess } from '@saraya/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Crown, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, LoadingState, Mascot, Screen, StatusPanel } from '@/ui/components';
import { colors, radius, shadows, spacing, type } from '@/ui/theme';

import { PurchaseCancelledError, type PremiumProduct, type PremiumProductKind } from '../gateways/subscription.gateway';
import { premiumGateway } from '../gateways/revenuecat-subscription.gateway';
import { generationQuotaGateway } from '../services/generation-quota';

type PaywallState = 'loading' | 'ready' | 'purchasing' | 'restoring' | 'success' | 'error';

async function loadPaywallData() {
  const [access, products] = await Promise.all([
    premiumGateway.getAccess(),
    premiumGateway.getProducts(),
  ]);
  return { access, products, quota: await generationQuotaGateway.getQuota(access) };
}

export function PaywallScreen() {
  const { destinationId = 'south-cebu' } = useLocalSearchParams<{ destinationId?: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [access, setAccess] = useState<PremiumAccess>('free');
  const [quota, setQuota] = useState<GenerationQuota>();
  const [state, setState] = useState<PaywallState>('loading');
  const [purchasingKind, setPurchasingKind] = useState<PremiumProductKind>();
  const [message, setMessage] = useState<string>();

  const lifetimeProduct = useMemo(
    () => products.find((product) => product.kind === 'lifetime-premium'),
    [products],
  );
  const topUpProduct = useMemo(
    () => products.find((product) => product.kind === 'generation-top-up'),
    [products],
  );
  const busy = state === 'purchasing' || state === 'restoring';

  const continueToItinerary = useCallback(() => {
    router.replace({
      pathname: '/premium/itinerary',
      params: { destinationId, resumeAfterPurchase: 'true' },
    });
  }, [destinationId, router]);

  const applyPaywallData = useCallback((data: Awaited<ReturnType<typeof loadPaywallData>>) => {
    setAccess(data.access);
    setProducts(data.products);
    setQuota(data.quota);
    setMessage(undefined);
    setState('ready');
  }, []);

  const handleLoadError = useCallback(() => {
    setMessage('Purchase options could not be loaded. Check your connection and RevenueCat configuration.');
    setState('error');
  }, []);

  useEffect(() => {
    let active = true;
    void loadPaywallData().then(
      (data) => { if (active) applyPaywallData(data); },
      () => { if (active) handleLoadError(); },
    );
    return () => { active = false; };
  }, [applyPaywallData, handleLoadError]);

  const reload = () => {
    setState('loading');
    setMessage(undefined);
    void loadPaywallData().then(applyPaywallData, handleLoadError);
  };

  const purchase = async (product: PremiumProduct) => {
    setState('purchasing');
    setPurchasingKind(product.kind);
    setMessage(undefined);
    try {
      const result = await premiumGateway.purchase(product.id);
      if (result.kind === 'lifetime-premium') {
        if (result.access !== 'premium') {
          setMessage('The purchase finished, but lifetime Premium is not active yet. Try restoring it.');
          setState('error');
          return;
        }
        const refreshedQuota = await generationQuotaGateway.getQuota('premium');
        setAccess('premium');
        setQuota(refreshedQuota);
        setMessage('Lifetime Premium is active. You have 10 included generations this calendar month.');
      } else {
        const credited = await generationQuotaGateway.creditTopUp(result.access, result.transactionId);
        setAccess(result.access);
        setQuota(credited.quota);
        setMessage(credited.credited
          ? '10 itinerary generations were added to your purchased balance.'
          : 'This purchase was already credited. Your balance was not changed again.');
      }
      setState('success');
    } catch (error) {
      if (error instanceof PurchaseCancelledError) {
        setMessage('Purchase cancelled. Your trip choices are still saved.');
        setState('ready');
      } else {
        setMessage('The purchase could not be completed. Try again when you are ready.');
        setState('error');
      }
    } finally {
      setPurchasingKind(undefined);
    }
  };

  const restore = async () => {
    setState('restoring');
    setMessage(undefined);
    try {
      const restoredAccess = await premiumGateway.restore();
      if (restoredAccess === 'premium') {
        setAccess('premium');
        setQuota(await generationQuotaGateway.getQuota('premium'));
        setMessage('Your lifetime Premium purchase was restored.');
        setState('success');
      } else {
        setMessage('No lifetime Premium purchase was found for this store account.');
        setState('ready');
      }
    } catch {
      setMessage('Lifetime Premium could not be restored. Check your connection and try again.');
      setState('error');
    }
  };

  if (state === 'loading') {
    return <Screen><LoadingState label="Loading purchase options…" /></Screen>;
  }

  if (state === 'success') {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Mascot mood="star" size={156} />
        <View style={styles.successIcon}><Check color={colors.white} size={30} strokeWidth={3} /></View>
        <Text accessibilityRole="header" style={styles.title}>Your itinerary is ready to continue</Text>
        <Text style={styles.subtitle}>{message}</Text>
        {quota ? <QuotaSummary quota={quota} /> : null}
        <Button icon={Sparkles} label="Continue to my itinerary" onPress={continueToItinerary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable accessibilityLabel="Back to trip preferences" accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color={colors.navy} size={24} />
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrow}><Crown color={colors.yellow} size={18} /><Text style={styles.eyebrowText}>SARAYA PREMIUM</Text></View>
          <Text accessibilityRole="header" style={styles.title}>Keep planning your trip</Text>
          <Text style={styles.subtitle}>Choose lifetime Premium or add more itinerary generations. Prices come directly from the store.</Text>
        </View>
        <Mascot mood="star" size={116} />
      </View>

      <View style={styles.comparison}>
        <PlanSummary
          title="Free"
          benefits={['3 lifetime itinerary generations', 'No refresh or regeneration', 'Limited Premium feature access']}
        />
        <PlanSummary
          featured
          title="Premium — Lifetime"
          benefits={['One-time purchase', 'Permanent Premium feature access', '10 generations every calendar month']}
        />
      </View>

      {quota ? <QuotaSummary quota={quota} /> : null}

      {access === 'free' ? (
        <PurchaseCard
          buttonLabel={lifetimeProduct ? `Unlock Lifetime Premium — ${lifetimeProduct.price}` : 'Lifetime Premium unavailable'}
          description="Permanent Premium access and 10 included itinerary generations each calendar month."
          disabled={!lifetimeProduct || busy}
          loading={purchasingKind === 'lifetime-premium'}
          onPress={() => { if (lifetimeProduct) void purchase(lifetimeProduct); }}
          title="Premium — Lifetime"
        />
      ) : (
        <StatusPanel message="Lifetime Premium is permanently active for this account." title="Premium owned" tone="success" />
      )}

      <PurchaseCard
        buttonLabel={topUpProduct ? `Add 10 generations — ${topUpProduct.price}` : 'Generation pack unavailable'}
        description="A one-time consumable purchase. Credits remain available across monthly Premium resets and do not grant Premium."
        disabled={!topUpProduct || busy}
        loading={purchasingKind === 'generation-top-up'}
        onPress={() => { if (topUpProduct) void purchase(topUpProduct); }}
        title="10 More Itinerary Generations"
      />

      {products.length === 0 ? (
        <StatusPanel
          action={<Button icon={RefreshCw} label="Try again" onPress={reload} variant="secondary" />}
          message="RevenueCat returned neither configured package from the default offering."
          title="No purchase options available"
          tone="warning"
        />
      ) : null}

      {message ? (
        <StatusPanel
          message={message}
          title={state === 'error' ? 'Purchase not completed' : 'Purchase update'}
          tone={state === 'error' ? 'error' : 'warning'}
        />
      ) : null}

      <Button
        icon={RefreshCw}
        label="Restore Lifetime Premium"
        disabled={busy}
        loading={state === 'restoring'}
        onPress={() => void restore()}
        variant="secondary"
      />
      {state === 'error' ? <Button label="Reload purchase options" onPress={reload} variant="quiet" /> : null}
      <Text style={styles.legal}>Payment is handled by the configured store. Lifetime Premium is non-consumable; generation packs are consumable and cannot be restored by the Restore button.</Text>
    </Screen>
  );
}

function PlanSummary({ benefits, featured = false, title }: { benefits: string[]; featured?: boolean; title: string }) {
  return (
    <View style={[styles.summaryCard, featured && styles.summaryCardFeatured]}>
      <Text style={styles.summaryTitle}>{title}</Text>
      {benefits.map((benefit) => <Text key={benefit} style={styles.summaryText}>• {benefit}</Text>)}
    </View>
  );
}

function QuotaSummary({ quota }: { quota: GenerationQuota }) {
  return (
    <StatusPanel
      message={`${quota.includedRemaining} included · ${quota.topUpRemaining} purchased`}
      title="Generation balance"
      tone={quota.canGenerate ? 'success' : 'warning'}
    />
  );
}

function PurchaseCard({ buttonLabel, description, disabled, loading, onPress, title }: {
  buttonLabel: string;
  description: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <View style={styles.purchaseCard}>
      <Text style={styles.purchaseTitle}>{title}</Text>
      <Text style={styles.purchaseDescription}>{description}</Text>
      <Button icon={ShieldCheck} label={buttonLabel} disabled={disabled} loading={loading} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { minHeight: '100%', justifyContent: 'center', alignItems: 'center', paddingBottom: spacing.xxxl },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: radius.lg, padding: spacing.xl, overflow: 'hidden' },
  heroCopy: { flex: 1, gap: spacing.sm },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrowText: { color: colors.violet, fontFamily: type.black, fontSize: 11, letterSpacing: 0.8 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  comparison: { gap: spacing.md },
  summaryCard: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  summaryCardFeatured: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  summaryTitle: { color: colors.navy, fontFamily: type.black, fontSize: 17 },
  summaryText: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
  purchaseCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.card },
  purchaseTitle: { color: colors.navy, fontFamily: type.black, fontSize: 18 },
  purchaseDescription: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
  successIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  legal: { color: colors.muted, fontFamily: type.medium, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
