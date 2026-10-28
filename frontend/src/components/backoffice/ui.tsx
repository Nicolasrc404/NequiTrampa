import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { ApiError } from '../../api/http';
import { Tone } from '../../utils/format';

// ───────── Estructura de pantalla ─────────

interface ScreenProps {
  title: string;
  subtitle?: string;
  badge?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const BoScreen: React.FC<ScreenProps> = ({ title, subtitle, badge, onBack, children, footer }) => (
  <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.headerRow}>
        {onBack && (
          <Pressable accessibilityLabel="Volver" onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.boInk} />
          </Pressable>
        )}
        <Text style={s.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
      {(subtitle || badge) && (
        <View style={s.subRow}>
          <Text style={s.subtitle}>{subtitle}</Text>
          {badge && <Badge label={badge} tone="brand" uppercase />}
        </View>
      )}
      {children}
    </ScrollView>
    {footer}
  </KeyboardAvoidingView>
);

export const Card: React.FC<{ children: React.ReactNode; onPress?: () => void }> = ({ children, onPress }) =>
  onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      {children}
    </Pressable>
  ) : (
    <View style={s.card}>{children}</View>
  );

export const SectionTitle: React.FC<{ children: string; right?: string }> = ({ children, right }) => (
  <View style={s.sectionRow}>
    <Text style={s.sectionTitle}>{children}</Text>
    {right && <Text style={s.sectionRight}>{right}</Text>}
  </View>
);

export const KeyValue: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => (
  <View style={s.kv}>
    <Text style={s.kvLabel}>{label}</Text>
    <Text style={[s.kvValue, mono && s.mono]} selectable>
      {value || '—'}
    </Text>
  </View>
);

export const ReadOnlyNote: React.FC<{ children: string }> = ({ children }) => (
  <Text style={s.note}>{children}</Text>
);

// ───────── Badges y botones ─────────

const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: colors.boOkBg, fg: colors.boOkText },
  warn: { bg: colors.boWarnBg, fg: colors.boWarnText },
  danger: { bg: colors.boDangerBg, fg: colors.boDangerText },
  info: { bg: colors.boInfoBg, fg: colors.boInfoText },
  brand: { bg: colors.boPinkSoft, fg: colors.boPink },
  neutral: { bg: '#F1F5F9', fg: colors.boMuted },
};

export const Badge: React.FC<{ label: string; tone?: Tone; uppercase?: boolean }> = ({
  label,
  tone = 'neutral',
  uppercase,
}) => (
  <View style={[s.badge, { backgroundColor: TONES[tone].bg }]}>
    <Text style={[s.badgeText, { color: TONES[tone].fg }, uppercase && s.upper]}>{label}</Text>
  </View>
);

interface ButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const BoButton: React.FC<ButtonProps> = ({ label, onPress, busy, disabled, variant = 'primary' }) => {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        variant === 'primary' && { backgroundColor: pressed ? colors.boPinkPressed : colors.boPink },
        variant === 'danger' && { backgroundColor: pressed ? '#9F1239' : '#BE123C' },
        variant === 'secondary' && s.btnSecondary,
        off && s.btnOff,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.boPink : colors.white} />
      ) : (
        <Text style={[s.btnText, variant === 'secondary' && { color: colors.boPink }]}>{label}</Text>
      )}
    </Pressable>
  );
};

export const BoInput: React.FC<TextInputProps & { label: string }> = ({ label, style, ...rest }) => (
  <View style={s.inputWrap}>
    <Text style={s.inputLabel}>{label}</Text>
    <TextInput
      placeholderTextColor={colors.boFaint}
      autoCapitalize="none"
      autoCorrect={false}
      style={[s.input, rest.multiline && s.inputMulti, style]}
      {...rest}
    />
  </View>
);

export const Segmented: React.FC<{
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.segRow}>
    {options.map((o) => {
      const on = o.value === value;
      return (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.chip, on && s.chipOn]}>
          <Text style={[s.chipText, on && s.chipTextOn]}>{o.label}</Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

// ───────── Estados: Loading / Error / Empty / Éxito ─────────

export const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <View style={{ gap: 12 }} accessibilityLabel="Cargando">
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={s.card}>
        <View style={[s.skel, { width: '35%' }]} />
        <View style={[s.skel, { width: '70%', height: 16, marginTop: 10 }]} />
        <View style={[s.skel, { width: '50%', marginTop: 10 }]} />
      </View>
    ))}
  </View>
);

interface StateCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const StateCard: React.FC<StateCardProps> = ({
  icon,
  iconBg = colors.boErrorCircle,
  iconColor = '#9E2A2B',
  title,
  message,
  actionLabel,
  onAction,
}) => (
  <View style={[s.card, s.stateCard]}>
    <View style={[s.stateCircle, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={38} color={iconColor} />
    </View>
    <Text style={s.stateTitle}>{title}</Text>
    <Text style={s.stateMsg}>{message}</Text>
    {actionLabel && onAction && (
      <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
        <BoButton label={actionLabel} onPress={onAction} />
      </View>
    )}
  </View>
);

export const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <StateCard icon="file-tray-outline" iconBg={colors.boPinkSoft} iconColor={colors.boPink} title={title} message={message} />
);

/** Error por código HTTP: 401, 403, 404, 5xx/red (usa el copy de Stitch). */
export const ErrorState: React.FC<{
  error: ApiError;
  resource: string;
  onRetry?: () => void;
  onBack?: () => void;
}> = ({ error, resource, onRetry, onBack }) => {
  switch (error.status) {
    case 401:
      return (
        <StateCard
          icon="lock-closed-outline"
          iconBg={colors.boInfoBg}
          iconColor="#5B21B6"
          title="Sesión vencida"
          message="Tu sesión expiró. Vuelve a iniciar sesión para continuar."
        />
      );
    case 403:
      return (
        <StateCard
          icon="shield-outline"
          title="No tienes permiso"
          message="Tu cuenta no cuenta con autorización para esta acción."
          actionLabel={onBack ? 'Volver' : undefined}
          onAction={onBack}
        />
      );
    case 404:
      return (
        <StateCard
          icon="search-outline"
          iconBg={colors.boWarnBg}
          iconColor={colors.boWarnText}
          title={`${resource} no encontrado`}
          message="Revisa el identificador e inténtalo de nuevo."
          actionLabel={onBack ? 'Volver' : undefined}
          onAction={onBack}
        />
      );
    case 409:
    case 422:
    case 400:
      return <StateCard icon="alert-circle-outline" title="Solicitud no válida" message={error.message} actionLabel={onBack ? 'Volver' : undefined} onAction={onBack} />;
    default:
      return (
        <StateCard
          icon="cloud-offline-outline"
          title={`No pudimos cargar ${resource.toLowerCase()}`}
          message={error.status === 503 ? 'El servicio no está disponible. Intenta nuevamente en unos minutos.' : 'Es un problema de nuestro lado. Intenta nuevamente en unos minutos.'}
          actionLabel={onRetry ? 'Intentar nuevamente' : undefined}
          onAction={onRetry}
        />
      );
  }
};

export const InlineError: React.FC<{ error: ApiError | null }> = ({ error }) =>
  error ? (
    <View style={s.inlineError} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color="#BE123C" />
      <Text style={s.inlineErrorText}>{messageFor(error)}</Text>
    </View>
  ) : null;

function messageFor(e: ApiError): string {
  if (e.status === 403) return 'Sin permisos para realizar esta acción.';
  if (e.status === 401) return 'Sesión vencida. Inicia sesión de nuevo.';
  if (e.status >= 500) return 'No pudimos completar la acción. Intenta nuevamente.';
  return e.message;
}

export const SuccessBanner: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <View style={s.success}>
    <Ionicons name="checkmark-circle" size={28} color={colors.boOkText} />
    <View style={{ flex: 1 }}>
      <Text style={s.successTitle}>{title}</Text>
      <Text style={s.successMsg}>{message}</Text>
    </View>
  </View>
);

export interface TimelineItem {
  title: string;
  time: string;
  detail?: string;
  meta?: string;
}

export const Timeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => (
  <View>
    {items.map((it, i) => (
      <View key={`${it.time}-${i}`} style={s.tlRow}>
        <View style={s.tlRail}>
          <View style={s.tlDot} />
          {i < items.length - 1 && <View style={s.tlLine} />}
        </View>
        <View style={s.tlBody}>
          <View style={s.tlHead}>
            <Text style={s.tlTitle}>{it.title}</Text>
            <Text style={s.tlTime}>{it.time}</Text>
          </View>
          {it.meta && <Text style={s.tlMeta}>{it.meta}</Text>}
          {it.detail && <Text style={s.tlDetail}>{it.detail}</Text>}
        </View>
      </View>
    ))}
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.boBackground, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8 },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.boInk, letterSpacing: -0.4 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtitle: { fontSize: 15, fontWeight: '600', color: colors.boPink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 6,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.boMuted },
  sectionRight: { fontSize: 14, fontWeight: '700', color: colors.boPink },
  kv: { paddingVertical: 6, gap: 2 },
  kvLabel: { fontSize: 12, color: colors.boFaint },
  kvValue: { fontSize: 15, fontWeight: '600', color: colors.boInk },
  mono: { fontFamily: 'monospace', fontSize: 13 },
  note: { fontSize: 12, color: colors.boMuted, textAlign: 'center', paddingTop: 6 },
  badge: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  upper: { textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.boPink },
  btnOff: { opacity: 0.5 },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  inputWrap: { gap: 6 },
  inputLabel: { fontSize: 13, color: colors.boMuted, fontWeight: '600' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.boBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.boInk,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  segRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.boBorder,
  },
  chipOn: { backgroundColor: colors.boPink, borderColor: colors.boPink },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.boMuted },
  chipTextOn: { color: colors.white },
  skel: { height: 12, borderRadius: 6, backgroundColor: colors.skeletonItem },
  stateCard: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, borderRadius: 28 },
  stateCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stateTitle: { fontSize: 21, fontWeight: '800', color: colors.boInk, textAlign: 'center' },
  stateMsg: { fontSize: 15, color: colors.boMuted, textAlign: 'center', lineHeight: 22 },
  inlineError: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.boDangerBg,
    padding: 12,
    borderRadius: 12,
  },
  inlineErrorText: { flex: 1, color: '#9F1239', fontSize: 14 },
  success: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.boOkBg,
    padding: 14,
    borderRadius: 16,
  },
  successTitle: { fontSize: 16, fontWeight: '800', color: colors.boOkText },
  successMsg: { fontSize: 14, color: colors.boOkText },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { alignItems: 'center', width: 14 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.boPink, marginTop: 4 },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.boBorder, marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: 18, gap: 2 },
  tlHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tlTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.boInk },
  tlTime: { fontSize: 12, color: colors.boFaint },
  tlMeta: { fontSize: 12, color: colors.boMuted },
  tlDetail: { fontSize: 13, color: colors.boMuted },
});
