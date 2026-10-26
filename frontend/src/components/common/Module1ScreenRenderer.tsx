import React from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import AccessForm from '../access/AccessForm';
import WalletBalanceCard from '../wallet/WalletBalanceCard';
import ProfileForm from '../profile/ProfileForm';
import ConfigurationPreferences from '../configuration/ConfigurationPreferences';
import ProjectionReferenceForm from '../projection-status/ProjectionReferenceForm';
import { MODULE1_SCREEN_COUNTS, MODULE1_SECTION_LABELS, MODULE1_STATUS_LABELS, getModule1Number, getModule1Section, getNextModule1Screen, getPreviousModule1Screen } from '../../data/demoModule1';
import { Module1ScreenKey, Module1ScreenProps } from '../../types/module1';
import { useModule1Demo } from '../../hooks/useModule1Demo';

export type { Module1ScreenKey } from '../../types/module1';

export interface Module1ScreenRendererProps extends Module1ScreenProps {
  readonly screenKey: Module1ScreenKey;
}

export default function Module1ScreenRenderer({ screenKey, onNavigate, onHome }: Module1ScreenRendererProps) {
  const section = getModule1Section(screenKey);
  const number = getModule1Number(screenKey);
  const demo = useModule1Demo(screenKey, onNavigate);
  const status = MODULE1_STATUS_LABELS[section][number - 1];
  const isError = [3, 5, 6, 7, 8, 9].includes(number) && section !== 'Projection_Status';
  const isSuccess = (section === 'Profile' || section === 'Configuration' || section === 'Projection_Status') && number === 4;

  return <View style={styles.root}>
    <View style={styles.topBar}><Pressable onPress={() => (onHome ? onHome() : onNavigate(getPreviousModule1Screen(screenKey)))} style={styles.iconButton}><Text style={styles.icon}>‹</Text></Pressable><Text style={styles.brand}>nequi</Text><Pressable onPress={demo.openModal} style={styles.iconButton}><Text style={styles.icon}>•••</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.demoPill}><Text style={styles.demoText}>STITCH · MODO DEMO</Text></View>
      <Text style={styles.eyebrow}>{MODULE1_SECTION_LABELS[section].toUpperCase()}</Text><Text style={styles.title}>{status}</Text><Text style={styles.subtitle}>Pantalla oficial {screenKey.replace('_', ' · ')} · datos locales de demostración</Text>
      {section === 'Access' && number === 1 ? <AccessForm {...demo} /> : null}
      {section === 'Profile' && number === 3 ? <ProfileForm {...demo} /> : null}
      {section === 'Configuration' && number <= 5 ? <ConfigurationPreferences enabled={demo.enabled} setEnabled={demo.setEnabled} /> : null}
      {section === 'Wallet' && number === 1 ? <WalletBalanceCard onDetail={() => onNavigate('Wallet_06')} onOptions={demo.openModal} /> : null}
      {section === 'Projection_Status' && number === 5 ? <ProjectionReferenceForm value={demo.value} setValue={demo.setValue} /> : null}
      {((section !== 'Access' || number !== 1) && (section !== 'Profile' || number !== 3) && (section !== 'Configuration' || number > 5) && (section !== 'Wallet' || number !== 1) && (section !== 'Projection_Status' || number !== 5)) ? <View style={[styles.statusCard, isError && styles.statusError, isSuccess && styles.statusSuccess]}><Text style={styles.statusIcon}>{isSuccess ? '✓' : isError ? '!' : section === 'Projection_Status' && number === 1 ? '…' : '◉'}</Text><Text style={styles.cardTitle}>{isSuccess ? 'Listo en modo DEMO' : isError ? 'Estado simulado' : 'Información de la pantalla'}</Text><Text style={styles.muted}>{isError ? 'Este estado reproduce la variante oficial sin realizar solicitudes de red.' : 'Puedes recorrer esta variante y probar los controles disponibles.'}</Text></View> : null}
      <View style={styles.actions}><Pressable onPress={demo.submit} style={styles.primary}><Text style={styles.primaryText}>{section === 'Access' && number === 1 ? 'Entrar en DEMO' : section === 'Projection_Status' && number === 1 ? 'Consultar DEMO' : 'Continuar'}</Text></Pressable><Pressable onPress={() => onNavigate(getNextModule1Screen(screenKey))} style={styles.secondary}><Text style={styles.secondaryText}>Siguiente pantalla</Text></Pressable></View>
      <View style={styles.pager}><Text style={styles.pagerText}>{number} / {MODULE1_SCREEN_COUNTS[section]}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dots}>{Array.from({ length: MODULE1_SCREEN_COUNTS[section] }).map((_, index) => <Pressable key={index} onPress={() => onNavigate(`${section}_${String(index + 1).padStart(2, '0')}` as Module1ScreenKey)} style={[styles.dot, index + 1 === number && styles.dotActive]} />)}</ScrollView></View>
    </ScrollView>
    <Modal visible={demo.modalOpen} transparent animationType="fade" onRequestClose={demo.closeModal}><Pressable style={styles.backdrop} onPress={demo.closeModal}><View style={styles.modal}><Text style={styles.cardTitle}>Opciones DEMO</Text><Text style={styles.muted}>Ninguna acción cambia datos reales ni llama al backend.</Text><Pressable onPress={() => { demo.closeModal(); Alert.alert('Simulación', 'La acción quedó aplicada solo en memoria.'); }} style={styles.primary}><Text style={styles.primaryText}>Aplicar localmente</Text></Pressable><Pressable onPress={demo.closeModal} style={styles.secondary}><Text style={styles.secondaryText}>Cerrar</Text></Pressable></View></Pressable></Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, topBar: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white }, brand: { color: colors.navy, fontSize: 26, fontWeight: '900', letterSpacing: -1 }, iconButton: { minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, icon: { color: colors.navy, fontSize: 28, fontWeight: '700' }, content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, paddingBottom: 40 }, demoPill: { alignSelf: 'flex-start', backgroundColor: colors.magentaLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 28 }, demoText: { color: colors.magentaText, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, eyebrow: { color: colors.magenta, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 }, title: { color: colors.navy, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 }, subtitle: { color: colors.graySub, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 28 }, statusCard: { backgroundColor: colors.white, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.grayBorder }, statusError: { backgroundColor: colors.status404Bg, borderColor: '#F3D998' }, statusSuccess: { backgroundColor: colors.greenBadge, borderColor: '#B1E8CC' }, statusIcon: { color: colors.magenta, fontSize: 30, fontWeight: '900', marginBottom: 12 }, cardTitle: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 16 }, muted: { color: colors.graySub, fontSize: 14, lineHeight: 21 }, actions: { gap: 10, marginTop: 24 }, primary: { minHeight: 54, borderRadius: 15, backgroundColor: colors.magenta, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, primaryText: { color: colors.white, fontSize: 15, fontWeight: '900' }, secondary: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.magenta, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, secondaryText: { color: colors.magenta, fontSize: 14, fontWeight: '800' }, pager: { alignItems: 'center', marginTop: 28 }, pagerText: { color: colors.graySub, fontSize: 12, fontWeight: '800' }, dots: { gap: 7, paddingVertical: 12 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D5D1E0' }, dotActive: { width: 24, backgroundColor: colors.magenta }, backdrop: { flex: 1, backgroundColor: 'rgba(17, 17, 34, 0.35)', justifyContent: 'flex-end' }, modal: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, gap: 12 },
});
