import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import colors from '../../theme/colors';

export type Module1Section = 'Access' | 'Wallet' | 'Profile' | 'Configuration' | 'Projection_Status';
export type Module1ScreenKey = `${Module1Section}_${number}`;

const SECTION_LABELS: Record<Module1Section, string> = {
  Access: 'Acceso',
  Wallet: 'Billetera',
  Profile: 'Perfil',
  Configuration: 'Configuración',
  Projection_Status: 'Estado de proyección',
};

const SCREEN_COUNT: Record<Module1Section, number> = {
  Access: 3,
  Wallet: 9,
  Profile: 9,
  Configuration: 9,
  Projection_Status: 5,
};

const getNumber = (key: Module1ScreenKey) => Number(key.split('_').pop() ?? 1);
const getSection = (key: Module1ScreenKey): Module1Section => {
  if (key.startsWith('Projection_Status')) return 'Projection_Status';
  if (key.startsWith('Configuration')) return 'Configuration';
  if (key.startsWith('Profile')) return 'Profile';
  if (key.startsWith('Wallet')) return 'Wallet';
  return 'Access';
};

const nextKey = (key: Module1ScreenKey): Module1ScreenKey => {
  const section = getSection(key);
  const number = getNumber(key);
  const next = number >= SCREEN_COUNT[section] ? 1 : number + 1;
  return `${section}_${String(next).padStart(2, '0')}` as Module1ScreenKey;
};

const previousKey = (key: Module1ScreenKey): Module1ScreenKey => {
  const section = getSection(key);
  const number = getNumber(key);
  const previous = number <= 1 ? SCREEN_COUNT[section] : number - 1;
  return `${section}_${String(previous).padStart(2, '0')}` as Module1ScreenKey;
};

const titleFor = (key: Module1ScreenKey) => {
  const section = getSection(key);
  const number = String(getNumber(key)).padStart(2, '0');
  return `${SECTION_LABELS[section]} ${number}`;
};

interface Module1ScreenProps {
  screenKey: Module1ScreenKey;
  onNavigate: (key: Module1ScreenKey) => void;
  onHome?: () => void;
}

export default function Module1Screen({ screenKey, onNavigate, onHome }: Module1ScreenProps) {
  const { width } = useWindowDimensions();
  const section = getSection(screenKey);
  const number = getNumber(screenKey);
  const [value, setValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [enabled, setEnabled] = useState(number % 2 === 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const compact = width < 420;

  const status = useMemo(() => {
    if (section === 'Access') {
      return ['Inicio de sesión', 'Sesión expirada', 'Acceso denegado'][number - 1];
    }
    if (section === 'Wallet') {
      return ['Saldo disponible', 'Billetera vacía', 'Cargando saldo…', 'Opciones de billetera', 'Servicio no disponible', 'Detalle de billetera', 'Acceso requerido', 'Billetera no encontrada', 'Error temporal'][number - 1];
    }
    if (section === 'Profile') {
      return ['Mi perfil', 'Cargando perfil…', 'Editar información', 'Cambios guardados', 'Revisa los campos', 'Acceso requerido', 'No se pudo guardar', 'Seguridad de acceso', 'Sesión expirada'][number - 1];
    }
    if (section === 'Configuration') {
      return ['Preferencias', 'Notificaciones', 'Apariencia', 'Seguridad', 'Idioma', 'No se pudo actualizar', 'Preferencias guardadas', 'Sin preferencias', 'Acceso requerido'][number - 1];
    }
    return ['Procesando proyección…', 'Proyección disponible', 'No se pudo cargar', 'Sin datos para mostrar', 'Detalle de proyección'][number - 1];
  }, [number, section]);

  const isError = [3, 5, 6, 7, 8, 9].includes(number) && section !== 'Projection_Status';
  const isSuccess = (section === 'Profile' || section === 'Configuration' || section === 'Projection_Status') && number === 4;

  const handlePrimary = () => {
    if (section === 'Access' && number === 1 && !value.trim()) {
      setSubmitted(true);
      return;
    }
    if (section === 'Profile' && number === 3 && !value.trim()) {
      setSubmitted(true);
      return;
    }
    if (section === 'Configuration' && number === 4) {
      setModalOpen(true);
      return;
    }
    if (section === 'Projection_Status' && number === 1) {
      onNavigate('Projection_Status_02');
      return;
    }
    setSubmitted(true);
    onNavigate(nextKey(screenKey));
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={() => (onHome ? onHome() : onNavigate(previousKey(screenKey)))} style={styles.iconButton} accessibilityLabel="Regresar">
          <Text style={styles.icon}>‹</Text>
        </Pressable>
        <Text style={styles.brand}>nequi</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.iconButton} accessibilityLabel="Abrir opciones">
          <Text style={styles.icon}>•••</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]} keyboardShouldPersistTaps="handled">
        <View style={styles.demoPill}><Text style={styles.demoPillText}>STITCH · MODO DEMO</Text></View>
        <Text style={styles.eyebrow}>{SECTION_LABELS[section].toUpperCase()}</Text>
        <Text style={styles.title}>{status}</Text>
        <Text style={styles.subtitle}>Pantalla oficial {screenKey.replace('_', ' · ')} · datos locales de demostración</Text>

        {section === 'Access' && number === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ingresa a tu cuenta</Text>
            <Text style={styles.label}>Correo o celular</Text>
            <TextInput value={value} onChangeText={setValue} placeholder="ejemplo@correo.com" placeholderTextColor={colors.grayPlaceholder} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.secretRow}>
              <TextInput value={showSecret ? value : '••••••••'} onChangeText={setValue} style={[styles.input, styles.secretInput]} secureTextEntry={!showSecret} />
              <Pressable onPress={() => setShowSecret((current) => !current)} style={styles.showButton}><Text style={styles.link}>{showSecret ? 'Ocultar' : 'Ver'}</Text></Pressable>
            </View>
            {submitted && !value.trim() ? <Text style={styles.errorText}>Ingresa un dato para continuar.</Text> : null}
          </View>
        ) : section === 'Profile' && number === 3 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Actualiza tu información</Text>
            <Text style={styles.label}>Nombre visible</Text>
            <TextInput value={value} onChangeText={setValue} placeholder="Nicolás Ramírez" placeholderTextColor={colors.grayPlaceholder} style={styles.input} />
            {submitted && !value.trim() ? <Text style={styles.errorText}>El nombre es obligatorio.</Text> : null}
          </View>
        ) : section === 'Configuration' && number <= 5 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Controles locales</Text>
            {[['Notificaciones', 'Avisos de actividad'], ['Biometría simulada', 'No modifica tu seguridad real'], ['Tema automático', 'Preferencia de apariencia']].map(([label, hint]) => (
              <View key={label} style={styles.settingRow}>
                <View style={styles.settingCopy}><Text style={styles.settingLabel}>{label}</Text><Text style={styles.settingHint}>{hint}</Text></View>
                <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: colors.grayBorder, true: colors.magentaLight }} thumbColor={enabled ? colors.magenta : colors.graySub} />
              </View>
            ))}
          </View>
        ) : section === 'Wallet' && number === 1 ? (
          <View style={styles.balanceCard}><Text style={styles.balanceLabel}>SALDO DEMO</Text><Text style={styles.balance}>$ 1.250.000</Text><Text style={styles.balanceHint}>COP · no corresponde a dinero real</Text><View style={styles.balanceActions}><Pressable onPress={() => onNavigate('Wallet_06')} style={styles.lightButton}><Text style={styles.lightButtonText}>Ver detalle</Text></Pressable><Pressable onPress={() => setModalOpen(true)} style={styles.lightButton}><Text style={styles.lightButtonText}>Opciones</Text></Pressable></View></View>
        ) : section === 'Projection_Status' && number === 5 ? (
          <View style={styles.card}><Text style={styles.cardTitle}>Referencia de prueba</Text><TextInput value={value} onChangeText={setValue} placeholder="SIM-0001" placeholderTextColor={colors.grayPlaceholder} style={styles.input} /><Text style={styles.muted}>La referencia solo se conserva en memoria.</Text></View>
        ) : (
          <View style={[styles.statusCard, isError && styles.statusError, isSuccess && styles.statusSuccess]}>
            <Text style={styles.statusIcon}>{isSuccess ? '✓' : isError ? '!' : section === 'Projection_Status' && number === 1 ? '…' : '◉'}</Text>
            <Text style={styles.cardTitle}>{isSuccess ? 'Listo en modo DEMO' : isError ? 'Estado simulado' : 'Información de la pantalla'}</Text>
            <Text style={styles.muted}>{isError ? 'Este estado reproduce la variante oficial sin realizar solicitudes de red.' : 'Puedes recorrer esta variante y probar los controles disponibles.'}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable onPress={handlePrimary} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{section === 'Access' && number === 1 ? 'Entrar en DEMO' : section === 'Projection_Status' && number === 1 ? 'Consultar DEMO' : 'Continuar'}</Text></Pressable>
          <Pressable onPress={() => onNavigate(nextKey(screenKey))} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Siguiente pantalla</Text></Pressable>
        </View>

        <View style={styles.pager}><Text style={styles.pagerText}>{number} / {SCREEN_COUNT[section]}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dots}>{Array.from({ length: SCREEN_COUNT[section] }).map((_, index) => <Pressable key={index} onPress={() => onNavigate(`${section}_${String(index + 1).padStart(2, '0')}` as Module1ScreenKey)} style={[styles.dot, index + 1 === number && styles.dotActive]} accessibilityLabel={`Abrir pantalla ${index + 1}`} />)}</ScrollView></View>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <View style={styles.modalCard}><Text style={styles.cardTitle}>Opciones DEMO</Text><Text style={styles.muted}>Ninguna acción cambia datos reales ni llama al backend.</Text><Pressable onPress={() => { setModalOpen(false); Alert.alert('Simulación', 'La acción quedó aplicada solo en memoria.'); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Aplicar localmente</Text></Pressable><Pressable onPress={() => setModalOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cerrar</Text></Pressable></View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white },
  brand: { color: colors.navy, fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  iconButton: { minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.navy, fontSize: 28, fontWeight: '700' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, paddingBottom: 40 },
  contentCompact: { paddingHorizontal: 18 },
  demoPill: { alignSelf: 'flex-start', backgroundColor: colors.magentaLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 28 },
  demoPillText: { color: colors.magentaText, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: colors.magenta, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.navy, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.graySub, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 28 },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardTitle: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label: { color: colors.graySub, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 13, paddingHorizontal: 14, color: colors.navy, backgroundColor: colors.white, fontSize: 15 },
  secretRow: { flexDirection: 'row', alignItems: 'center' },
  secretInput: { flex: 1 },
  showButton: { marginLeft: -64, padding: 12 },
  link: { color: colors.magenta, fontWeight: '800', fontSize: 12 },
  errorText: { color: '#C83232', fontSize: 12, fontWeight: '700', marginTop: 8 },
  balanceCard: { backgroundColor: colors.navyCard, borderRadius: 26, padding: 24, minHeight: 190 },
  balanceLabel: { color: colors.magentaLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  balance: { color: colors.white, fontSize: 38, fontWeight: '900', marginTop: 14 },
  balanceHint: { color: '#B9B4D0', fontSize: 12, marginTop: 4 },
  balanceActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  lightButton: { backgroundColor: colors.white, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  lightButtonText: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  statusCard: { backgroundColor: colors.white, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.grayBorder },
  statusError: { backgroundColor: colors.status404Bg, borderColor: '#F3D998' },
  statusSuccess: { backgroundColor: colors.greenBadge, borderColor: '#B1E8CC' },
  statusIcon: { color: colors.magenta, fontSize: 30, fontWeight: '900', marginBottom: 12 },
  muted: { color: colors.graySub, fontSize: 14, lineHeight: 21 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.grayBorder },
  settingCopy: { flex: 1, paddingRight: 12 },
  settingLabel: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  settingHint: { color: colors.graySub, fontSize: 12, marginTop: 4 },
  actions: { gap: 10, marginTop: 24 },
  primaryButton: { minHeight: 54, borderRadius: 15, backgroundColor: colors.magenta, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  secondaryButton: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.magenta, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryButtonText: { color: colors.magenta, fontSize: 14, fontWeight: '800' },
  pager: { alignItems: 'center', marginTop: 28 },
  pagerText: { color: colors.graySub, fontSize: 12, fontWeight: '800' },
  dots: { gap: 7, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D5D1E0' },
  dotActive: { width: 24, backgroundColor: colors.magenta },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17, 17, 34, 0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, gap: 12 },
});
