// OwnerDashboard.js — PROFESSIONAL EDITION
// ✅ Enhanced UI/UX, Animations, Mobile Responsiveness
// ✅ No feature removed — Logic preserved exactly as original

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
  Animated,
  Easing,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
  useColorScheme,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';
import { ref as sRef, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase'; // אותו קובץ שאתה משתמש בו במסכים אחרים
import 'firebase/compat/storage';
import { useRoute } from '@react-navigation/native'; // למעלה בקובץ

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==== Firebase init ====
const firebaseConfig = {
  apiKey: 'AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag',
  authDomain: 'final-project-d6ce7.firebaseapp.com',
  projectId: 'final-project-d6ce7',
  storageBucket: 'final-project-d6ce7.appspot.com',
  messagingSenderId: '1056060530572',
  appId: '1:1056060530572:web:d08d859ca2d25c46d340a9',
  measurementId: 'G-LD61QH3VVP',
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// ==== Hashing ====
let ExpoCrypto = null;
try {
  ExpoCrypto = require('expo-crypto');
} catch {}
async function sha256(text) {
  const str = String(text ?? '');
  if (ExpoCrypto?.digestStringAsync && ExpoCrypto?.CryptoDigestAlgorithm) {
    return await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      str,
      { encoding: ExpoCrypto.CryptoEncoding?.HEX || 'hex' }
    );
  }
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const enc = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  throw new Error('SHA-256 לא זמין. התקן expo-crypto או הרץ בדפדפן מודרני.');
}

// ==== Utils ====
const n = (x) => Number(x || 0);
const mb = (bytes) => n(bytes) / 1e6;
const fmtMB = (x) => `${Number(x || 0).toFixed(2)} MB`;

const safeDate = (v) => {
  if (!v) return 0;
  const t = Number(v);
  if (Number.isFinite(t) && t > 1e10) return t;
  const p = Date.parse(String(v));
  return Number.isFinite(p) ? p : 0;
};

const withinDays = (ts, days) => ts && Date.now() - ts <= days * 86400000;

const isToday = (ts) => {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
};

const fmtHebDateTime = (ts) =>
  ts
    ? new Date(ts).toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const useDebounced = (value, delay = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

const getInitials = (name, email) => {
  const base = String(name || email || '').trim();
  if (!base) return '—';
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map((p) => (p[0] || '').toUpperCase()).join('') || '—';
};

async function copyToClipboard(text) {
  try {
    if (Platform.OS === 'web' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text ?? ''));
      Alert?.alert?.('הועתק', 'הטקסט הועתק ללוח.');
      return;
    }
  } catch {}
  try {
    const Clipboard = require('@react-native-clipboard/clipboard').default;
    Clipboard.setString(String(text ?? ''));
    Alert.alert('הועתק', 'הטקסט הועתק ללוח.');
  } catch {}
}

// ==== UI Helpers (Grid) ====
function useGridLayout(width, { minW = 280, maxW = 480, gap = 12, padH = 16, maxCols = 4 } = {}) {
  const usable = Math.max(0, width - padH * 2);
  let numCols = Math.max(1, Math.min(maxCols, Math.floor((usable + gap) / (minW + gap))));
  while (numCols < maxCols) {
    const w = Math.floor((usable - (numCols - 1) * gap) / numCols);
    if (w <= maxW) break;
    numCols++;
  }
  const cardW = Math.min(maxW, Math.floor((usable - (numCols - 1) * gap) / numCols));
  return { numCols, cardW, gap, padH, usable };
}

// ==== Logic Helpers ====
const saveUserNotes = async (uid, notes) => {
  const db = firebase.database();
  const updates = {};
  updates[`users/${uid}/notes`] = String(notes || '');
  updates[`users/${uid}/notesUpdatedAt`] = Date.now();
  await db.ref().update(updates);
};

// =====================
// ✨ ANIMATION COMPONENTS
// =====================

// כפתור עם אפקט לחיצה (מקטין מעט)
const ScaleBtn = ({ onPress, style, children, activeOpacity = 0.9, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 20 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={({ pressed }) => [
        { opacity: pressed ? activeOpacity : 1, transform: [{ scale }] },
        style
      ]}
    >
      {children}
    </Pressable>
  );
};

// קונטיינר שנכנס באנימציית Fade + Slide
const FadeInView = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, delay, useNativeDriver: true, damping: 20 })
    ]).start();
  }, [delay, opacity, translate]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: translate }] }, style]}>
      {children}
    </Animated.View>
  );
};

// =====================
// 🎨 THEME & STYLES
// =====================
const makeTheme = (isDark) => {
  if (!isDark) {
    return {
      isDark: false,
      bg: '#F3F4F6', // מעט יותר אפור ורך
      card: '#FFFFFF',
      card2: '#F9FAFB',
      border: '#E5E7EB',
      border2: '#D1D5DB',
      text: '#111827',
      subText: '#6B7280',
      muted: '#9CA3AF',
      inputBg: '#FFFFFF',
      topBar: '#1F2937',
      topBtnShadow: 'rgba(0,0,0,0.1)',
      pillBg: '#F3F4F6',
      pillOnBg: '#EEF2FF',
      pillOnBorder: '#6366F1',
      overlay: 'rgba(17, 24, 39, 0.7)',
      goodBg: '#ECFDF5',
      goodBorder: '#10B981',
      warn: '#F59E0B',
      info: '#0EA5E9',
      danger: '#EF4444',
      primary: '#4F46E5', // Indigo modern
      primary2: '#6366F1',
      chip: '#E5E7EB',
      kpiBg: '#FFFFFF',
      kpiBorder: '#E5E7EB',
      trafficBg: '#FFFFFF',
      trafficBoxBg: '#F9FAFB',
      shadow: 'rgba(0, 0, 0, 0.05)',
    };
  }
  return {
    isDark: true,
    bg: '#0F172A', // Slate 900
    card: '#1E293B', // Slate 800
    card2: '#334155',
    border: '#334155',
    border2: '#475569',
    text: '#F3F4F6',
    subText: '#94A3B8',
    muted: '#64748B',
    inputBg: '#1E293B',
    topBar: '#020617',
    topBtnShadow: 'rgba(0,0,0,0.5)',
    pillBg: '#1E293B',
    pillOnBg: '#312E81',
    pillOnBorder: '#818CF8',
    overlay: 'rgba(0,0,0,0.8)',
    goodBg: '#064E3B',
    goodBorder: '#10B981',
    warn: '#F59E0B',
    info: '#38BDF8',
    danger: '#F87171',
    primary: '#818CF8',
    primary2: '#A5B4FC',
    chip: '#334155',
    kpiBg: '#1E293B',
    kpiBorder: '#334155',
    trafficBg: '#1E293B',
    trafficBoxBg: '#0F172A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  };
};

const makeStyles = (theme, isPhone, isLarge) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },

    // TopBar
    topBar: {
      backgroundColor: theme.topBar,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 12,
      paddingBottom: 12,
      flexDirection: isPhone ? 'column' : 'row-reverse',
      alignItems: isPhone ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: 12,
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    topRightActions: {
      flexDirection: 'row-reverse',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: isPhone ? 'space-between' : 'flex-start',
    },
    topBtn: {
      height: 42,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      // Subtle shadow
      shadowColor: theme.topBtnShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    topBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    topTitles: isPhone
      ? { alignItems: 'center', justifyContent: 'center', marginVertical: 4 }
      : { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
    title: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
    now: { color: theme.muted, marginTop: 2, fontSize: 11, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

    headerWrap: {
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        overflow: 'hidden' // For background animations
    },
    headerDecor: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    circle: {
      position: 'absolute',
      right: -20,
      top: -20,
      width: 180,
      height: 180,
      borderRadius: 999,
      backgroundColor: theme.primary2,
      opacity: theme.isDark ? 0.08 : 0.04,
      transform: [{ scale: 1.2 }]
    },
kpiGridWrap: {
  paddingHorizontal: isPhone ? 12 : 16,
  paddingTop: 10,
  paddingBottom: 6,

  // ✅ לא נותן ל-KPI להתפרס על כל המסך במחשב
  width: '100%',
  alignSelf: 'center',
  maxWidth: isLarge ? 1100 : undefined,   // אפשר 1000/1200 לפי טעם
},

kpiGridRow: {
  flexDirection: 'row-reverse',
  alignItems: 'stretch',
  marginBottom: isPhone ? 10 : 12,
},

kpiSpacer: {
  width: isPhone ? 8 : (isLarge ? 10 : 10),
},

kpiCard: {
  flex: 1,
  minWidth: 0,

  borderRadius: isPhone ? 14 : (isLarge ? 14 : 16),
  borderWidth: 1,
  borderColor: theme.kpiBorder,
  backgroundColor: theme.kpiBg,

  // ✅ קומפקט במחשב
  padding: isPhone ? 12 : (isLarge ? 10 : 14),
  minHeight: isPhone ? 78 : (isLarge ? 74 : 92),

  shadowColor: theme.shadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 12,
  elevation: 3,
  justifyContent: 'space-between',
},

kpiLabel: {
  fontSize: isPhone ? 11 : (isLarge ? 11 : 12),
  color: theme.subText,
  fontWeight: '800',
  textAlign: 'right',
  marginBottom: 4,
},

kpiValue: {
  fontSize: isPhone ? 18 : (isLarge ? 16 : 20),  // ✅ קטן יותר בדסקטופ
  fontWeight: '900',
  textAlign: 'right',
  letterSpacing: -0.5,
},


    toolbar: { padding: 16, gap: 12 },
    search: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border2,
      backgroundColor: theme.inputBg,
      paddingHorizontal: 16,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
      elevation: 2
    },

    viewToggleRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 },

    sortRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    sortBtn: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border2,
      backgroundColor: theme.pillBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sortBtnOn: { borderColor: theme.pillOnBorder, backgroundColor: theme.pillOnBg },
    sortTxt: { fontWeight: '700', fontSize: 12, color: theme.subText },
    sortTxtOn: { color: theme.text },

    pill: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border2,
      backgroundColor: theme.pillBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillOn: { borderColor: theme.pillOnBorder, backgroundColor: theme.pillOnBg },
    pillTxt: { fontWeight: '700', fontSize: 12, color: theme.subText },
    pillTxtOn: { color: theme.text },

    // Card Styles
    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: 16,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 20,
      elevation: 4,
    },
    cardHeader: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    cardTitle: { fontSize: 17, fontWeight: '800', color: theme.text, textAlign: 'right', marginBottom: 2 },
    cardSub: { fontSize: 13, color: theme.subText, fontWeight: '600', textAlign: 'right' },

    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnText: { fontSize: 16 },

    rowX: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    labelX: { color: theme.subText, fontWeight: '600', fontSize: 13 },
    valueX: { color: theme.text, fontWeight: '700', fontSize: 13, maxWidth: '75%', textAlign: 'right' },

    statsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
    stat: { flexGrow: 1, minWidth: isPhone ? '45%' : 100, borderRadius: 12, borderWidth: 1, padding: 8, alignItems: 'center', justifyContent: 'center' },
    statK: { fontSize: 11, color: theme.subText, fontWeight: '700', marginBottom: 2 },
    statV: { fontSize: 16, fontWeight: '800' },

    actionsRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
    actionBtn: { height: 38, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    actionText: { fontWeight: '700', fontSize: 13 },

    primaryBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    fabBack: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      paddingHorizontal: 20,
      height: 50,
      borderRadius: 999,
      backgroundColor: theme.topBar,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 100
    },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: isPhone ? 12 : 24 },
    modalCard: {
        width: '100%',
        maxWidth: 500,
        borderRadius: 24,
        backgroundColor: theme.card,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
        elevation: 10
    },
    modalTitle: { fontSize: 20, fontWeight: '900', color: theme.text, textAlign: 'right', marginBottom: 16 },
    input: {
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border2,
      backgroundColor: theme.inputBg,
      paddingHorizontal: 14,
      fontWeight: '600',
      color: theme.text,
    },
  });

const makeTrafficStyles = (theme) =>
  StyleSheet.create({
    toWrap: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.trafficBg, borderRadius: 18, padding: 14, shadowColor: theme.shadow, shadowOpacity: 0.5, shadowRadius: 10, elevation: 2 },
    toHeader: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    toTab: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.pillBg, alignItems: 'center', justifyContent: 'center' },
    toTabActive: { borderColor: theme.pillOnBorder, backgroundColor: theme.pillOnBg },
    toTabText: { fontSize: 12, fontWeight: '700', color: theme.subText },
    toTabTextActive: { color: theme.text },
    chartBox: { borderRadius: 14, backgroundColor: theme.trafficBoxBg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  });

const makeUsersStyles = (theme) =>
  StyleSheet.create({
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 12 },
    hTitle: { fontSize: 22, fontWeight: '900', color: theme.text, textAlign: 'right' },
    row: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
    search: { flex: 1, minWidth: 240, height: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.inputBg, paddingHorizontal: 14, fontWeight: '600', color: theme.text },
    filters: { flexDirection: 'row-reverse', gap: 8 },
    pill: { height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.pillBg, alignItems: 'center', justifyContent: 'center' },
    pillOn: { borderColor: theme.pillOnBorder, backgroundColor: theme.pillOnBg },
    pillTxt: { fontWeight: '700', color: theme.subText },
    pillTxtOn: { color: theme.text },

    kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    kpiMini: { minWidth: 100, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'flex-end' },
    kpiMiniK: { fontSize: 12, color: theme.subText, fontWeight: '700', textAlign: 'right' },
    kpiMiniV: { fontSize: 18, color: theme.text, fontWeight: '900', textAlign: 'right', marginTop: 2 },

    card: { borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 16, elevation: 2, shadowColor: theme.shadow, shadowOpacity: 0.5, shadowRadius: 10 },
    cardDisabled: { opacity: 0.6, backgroundColor: theme.isDark ? '#1a1a1a' : '#f0f0f0' },
    head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 },
    avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: theme.pillOnBg, borderWidth: 1, borderColor: theme.pillOnBorder, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontWeight: '900', color: theme.text, fontSize: 18 },
    name: { fontWeight: '800', color: theme.text, textAlign: 'right', fontSize: 16 },
    email: { fontWeight: '600', color: theme.subText, textAlign: 'right', fontSize: 13 },

    rowTiny: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    kTiny: { fontSize: 12, fontWeight: '700', color: theme.subText },
    vTiny: { fontSize: 12, fontWeight: '600', color: theme.text, maxWidth: 220, textAlign: 'right' },

    tinyAct: { height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.pillBg, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    tinyActTxt: { fontSize: 11, fontWeight: '800', color: theme.subText },

    status: { height: 24, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    on: { backgroundColor: theme.isDark ? '#064E3B' : '#ECFDF5', borderWidth: 1, borderColor: '#10B981' },
    off: { backgroundColor: theme.isDark ? '#450a0a' : '#FEF2F2', borderWidth: 1, borderColor: '#EF4444' },
    statusTxt: { fontSize: 11, fontWeight: '800', color: theme.text },
    reasonInCard: { fontSize: 11, color: theme.danger, fontWeight: '700' },

    actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 },
    btn: { height: 38, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
    btnDanger: { backgroundColor: '#EF4444' },
    btnEnable: { backgroundColor: '#10B981' },
    btnInfo: { backgroundColor: theme.info },
    btnImpersonate: { backgroundColor: theme.primary },

    label: { fontWeight: '800', color: theme.text, textAlign: 'right', marginBottom: 6, fontSize: 13 },
    notes: { minHeight: 80, borderRadius: 14, borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.inputBg, paddingHorizontal: 14, paddingVertical: 12, fontWeight: '600', color: theme.text, textAlignVertical: 'top' },
    notesBar: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: 10 },
    btnSaveNotes: { minWidth: 100 },
  });

// ==== Header אנימטיבי ====
function AnimatedHeader({ theme, S, children }) {
  const bg = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle background pulse
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bg, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(bg, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();

    // Entry animation
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 15 }),
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    return () => loop.stop();
  }, [bg, slide, fade]);

  const bgColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: theme.isDark ? ['#0F172A', '#1E293B'] : ['#F9FAFB', '#F3F4F6'],
  });

  return (
    <Animated.View
      style={[
        S.headerWrap,
        { backgroundColor: bgColor, transform: [{ translateY: slide }], opacity: fade },
      ]}
    >
      <View pointerEvents="none" style={S.headerDecor}>
        <View style={S.circle} />
        <View style={[S.circle, { left: -40, top: 40, width: 120, height: 120, backgroundColor: theme.info }]} />
      </View>
      {children}
    </Animated.View>
  );
}

// ==== תרשים תעבורה ====
function TrafficOverview({ theme, ST, buckets }) {
  const [tab, setTab] = useState('minute');
  const [kind, setKind] = useState('total'); // read|write|upload|total
  const [series, setSeries] = useState([]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const heightPx = 140;

  const tabs = [
    { k: 'minute', label: '60 דק׳' },
    { k: 'hour', label: '24 ש׳' },
    { k: 'day', label: '7 ימים' },
    { k: 'week', label: 'שבועות' },
    { k: 'month', label: 'חודשים' },
  ];
  const kinds = [
    { k: 'total', label: 'סה״כ' },
    { k: 'read', label: 'קריאה' },
    { k: 'write', label: 'כתיבה' },
    { k: 'upload', label: 'העלאה' },
  ];

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const bag = buckets?.sum?.[tab] || {};
    const arr = Object.keys(bag)
      .sort()
      .map((key) => {
        const v = bag[key] || {};
        let bytes = 0;
        if (kind === 'read') bytes = n(v.readBytes ?? v.read);
        else if (kind === 'write') bytes = n(v.writeBytes ?? v.write);
        else if (kind === 'upload') bytes = n(v.uploadBytes ?? v.upload);
        else bytes = n(v.readBytes ?? v.read) + n(v.writeBytes ?? v.write) + n(v.uploadBytes ?? v.upload);
        return { k: key, mb: mb(bytes) };
      });
    setSeries(arr);
    setHoverIdx(arr.length ? arr.length - 1 : null);
  }, [tab, kind, buckets]);

  const maxMB = Math.max(0.1, ...series.map((p) => p.mb));
  const barW = series.length
    ? Math.max(4, Math.floor((Math.min(980, series.length * 12) - 30) / series.length))
    : 8;

  return (
    <View style={ST.toWrap}>
      <View style={[ST.toHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          {tabs.map((t) => (
            <ScaleBtn key={t.k} onPress={() => setTab(t.k)} style={[ST.toTab, tab === t.k && ST.toTabActive]}>
              <Text style={[ST.toTabText, tab === t.k && ST.toTabTextActive]}>{t.label}</Text>
            </ScaleBtn>
          ))}
        </View>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          {kinds.map((k) => (
            <ScaleBtn key={k.k} onPress={() => setKind(k.k)} style={[ST.toTab, kind === k.k && ST.toTabActive]}>
              <Text style={[ST.toTabText, kind === k.k && ST.toTabTextActive]}>{k.label}</Text>
            </ScaleBtn>
          ))}
        </View>
      </View>

      <View
        style={[ST.chartBox, { width: '100%', height: heightPx }]}
        onStartShouldSetResponder={() => true}
        onResponderMove={(e) => {
          if (!series.length || !barW) return;
          const x = e.nativeEvent?.locationX ?? 0;
          const raw = Math.floor((x - 10) / (barW + 2));
          const idx = Math.max(0, Math.min(series.length - 1, raw));
          setHoverIdx(idx);
        }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'flex-end' }}>
          {series.map((p, i) => {
            const h = Math.round((p.mb / maxMB) * (heightPx - 26));
            const active = i === hoverIdx;
            // Modern gradient-like colors
            const color =
              kind === 'read'
                ? active ? '#818CF8' : '#C7D2FE'
                : kind === 'write'
                ? active ? '#F87171' : '#FECACA'
                : kind === 'upload'
                ? active ? '#38BDF8' : '#BAE6FD'
                : active ? theme.primary : theme.primary2 + '80'; // transparent

            return (
              <View
                key={p.k}
                style={{
                  width: barW,
                  height: h,
                  marginRight: 2,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  backgroundColor: color,
                  opacity: active ? 1 : 0.7
                }}
              />
            );
          })}
        </View>

        {hoverIdx != null && series[hoverIdx] && (
          <>
            <View style={{ position: 'absolute', left: 10 + hoverIdx * (barW + 2) + barW/2, top: 0, bottom: 0, width: 1, backgroundColor: theme.text, opacity: 0.2 }} />
            <View style={{ position: 'absolute', left: Math.min(200, Math.max(0, 10 + hoverIdx * (barW + 2) - 50)), top: 6, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, textAlign: 'center' }}>{series[hoverIdx].k}</Text>
              <Text style={{ fontSize: 12, color: theme.primary, textAlign: 'center', fontWeight: '900' }}>{series[hoverIdx].mb.toFixed(2)} MB</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ==== טיקר התחברויות אחרונות ====
function RecentLoginsTicker({ theme, items = [], onPick }) {
  const itemW = 280;
  const gap = 12;
  const speed = 40; // Slower speed for elegance

  const [wrapW, setWrapW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  const data = useMemo(() => (items?.length ? [...items, ...items] : []), [items]);
  const cycleW = useMemo(() => (items?.length ? items.length * (itemW + gap) : 0), [items, itemW, gap]);

  useEffect(() => {
    if (!cycleW || !wrapW || !data.length) return;
    x.stopAnimation();
    x.setValue(wrapW);
    const distance = wrapW + cycleW;
    const duration = Math.max(1000, (distance / speed) * 1000);

    const run = () => {
      Animated.timing(x, { toValue: -cycleW, duration, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        x.setValue(wrapW);
        run();
      });
    };
    run();
    return () => {
      try {
        x.stopAnimation();
      } catch {}
    };
  }, [cycleW, wrapW, data.length, speed, x]);

  if (!items?.length) return null;

  return (
    <View
      onLayout={(e) => setWrapW(e.nativeEvent.layout.width)}
      style={{
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        paddingVertical: 10,
        marginBottom: 8
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: theme.subText, textAlign: 'left', paddingHorizontal: 14, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
        🚀 LAST LOGINS
      </Text>

      <View style={{ height: 40, alignItems: 'flex-start' }}>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ translateX: x }] }}>
          {data.map((it, i) => {
            const d = new Date(it.ts);
            const timeStr = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
            return (
              <ScaleBtn
                key={`${it.uid}_${it.eventId}_${i}`}
                onPress={() => onPick?.(it.uid, it.eventId)}
                activeOpacity={0.85}
                style={{
                  width: itemW,
                  marginRight: gap,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.isDark ? '#334155' : '#E0E7FF',
                  backgroundColor: theme.isDark ? '#0F172A' : '#F5F7FF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: theme.goodBorder, marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: theme.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {it.eventName || 'אירוע'}
                </Text>
                <Text style={{ fontSize: 11, color: theme.muted, fontWeight: '600' }}>
                  {timeStr}
                </Text>
              </ScaleBtn>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

// ==== APIs קטנים ====
async function mirrorCredsUsernameToEvents(uid, username) {
  const rootRef = firebase.database().ref();
  const refUserEvents = firebase.database().ref(`Events/${uid}`);
  const snap = await refUserEvents.once('value');
  const updates = {};
  snap.forEach((child) => {
    const eventId = child.key;
    if (!eventId || String(eventId).startsWith('__')) return;
    updates[`Events/${uid}/${eventId}/__meta/adminCredsUsername`] = username;
    updates[`Events/${uid}/${eventId}/__meta/adminCredsUpdatedAt`] = Date.now();
  });
  if (Object.keys(updates).length) await rootRef.update(updates);
}

export async function ownerLogin(uid, eventId, username, password) {
  const db = firebase.database();
  const creds = (await db.ref(`users/${uid}/adminCreds`).once('value')).val() || {};
  const inputHash = await sha256(password);

  if (!creds.username || !creds.passHash) return { ok: false, message: 'אין פרטי התחברות למשתמש' };
  if (String(username).trim() !== String(creds.username).trim()) return { ok: false, message: 'שם משתמש שגוי' };
  if (String(inputHash) !== String(creds.passHash)) return { ok: false, message: 'סיסמה שגויה' };
  if (!eventId) return { ok: false, message: 'חסר eventId' };

  const eventRef = db.ref(`Events/${uid}/${eventId}/__meta/lastLoginAt`);
  await eventRef.set(firebase.database.ServerValue.TIMESTAMP);
  return { ok: true };
}

const PLAN_MAIN_SMS_MULT = {
  digital: 4,
  basic: 2,
  plus: 4,
  premium: 4,
  complementary: 0,
};
function calcMainSms(numberOfGuests, plan) {
  const g = Number(numberOfGuests || 0);
  const mult = Number(PLAN_MAIN_SMS_MULT[String(plan || '').toLowerCase()] ?? 1);
  return Math.ceil(g * mult);
}

// ==== UI atoms ====
const KPI = ({ theme, S, label, value, tint = '#6C63FF', isText, style }) => (
  <View style={[S.kpiCard, style]}>
    <View>
 <Text style={S.kpiLabel} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
        <Text style={[S.kpiValue, { color: tint }]} numberOfLines={1}>
        {isText ? String(value) : Number(value || 0).toLocaleString('he-IL')}
        </Text>
    </View>
    <View style={{height: 4, width: '40%', backgroundColor: tint, borderRadius: 2, alignSelf: 'flex-end', opacity: 0.6}} />
  </View>
);

const Row = ({ theme, S, k, v, mono }) => (
  <View style={S.rowX}>
    <Text style={S.labelX}>{k}:</Text>
    <Text style={[S.valueX, mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }]} numberOfLines={1}>
      {String(v ?? '')}
    </Text>
  </View>
);

const Stat = ({ theme, S, k, v, tint }) => (
  <View style={[S.stat, { borderColor: tint + '40', backgroundColor: tint + (theme.isDark ? '15' : '10') }]}>
    <Text style={[S.statK, { color: tint }]}>{k}</Text>
    <Text style={[S.statV, { color: theme.text }]}>{Number(v || 0).toLocaleString('he-IL')}</Text>
  </View>
);

const SortButton = ({ theme, S, label, onPress, active }) => (
  <ScaleBtn onPress={onPress} style={[S.sortBtn, active && S.sortBtnOn]}>
    <Text style={[S.sortTxt, active && S.sortTxtOn]}>{label}</Text>
  </ScaleBtn>
);

const TogglePill = ({ theme, S, label, active, onPress }) => (
  <ScaleBtn onPress={onPress} style={[S.pill, active && S.pillOn]}>
    <Text style={[S.pillTxt, active && S.pillTxtOn]}>{label}</Text>
  </ScaleBtn>
);

// ==== UsersManager – helpers ====
const KPIMini = ({ UMx, label, value }) => (
  <View style={UMx.kpiMini}>
    <Text style={UMx.kpiMiniK}>{label}</Text>
    <Text style={UMx.kpiMiniV}>{Number(value || 0).toLocaleString('he-IL')}</Text>
  </View>
);

const TinyRow = ({ UMx, k, v, mono, withToggle, onToggle, copy, copyVal }) => (
  <View style={UMx.rowTiny}>
    <Text style={UMx.kTiny}>{k}:</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '70%' }}>
      <Text
        style={[UMx.vTiny, mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}
        numberOfLines={1}
      >
        {v}
      </Text>

      {withToggle && (
        <TouchableOpacity onPress={onToggle} style={UMx.tinyAct}>
          <Text style={UMx.tinyActTxt}>הצג/הסתר</Text>
        </TouchableOpacity>
      )}

      {copy && (
        <TouchableOpacity onPress={() => copyToClipboard(v)} style={UMx.tinyAct}>
          <Text style={UMx.tinyActTxt}>העתק</Text>
        </TouchableOpacity>
      )}

      {!!copyVal && !copy && (
        <TouchableOpacity onPress={() => copyToClipboard(copyVal)} style={UMx.tinyAct}>
          <Text style={UMx.tinyActTxt}>העתק</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ==== Placeholder for Missing Component ====
const DeviceMonitorsPane = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#888' }}>Device Monitors Logic Placeholder</Text>
        <Text style={{ fontSize: 14, color: '#aaa' }}>(Original code not provided in snippet)</Text>
    </View>
);

// ==== UsersManager ====
function UsersManager({
  theme,
  users = {},
  events = [],
  onDisableToggle,
  onSaveCreds,
  onSaveNotes,
  focusUid,
  onDeleteUser,
  onShowUserEvents,
  onOpenUserEventsModal,
}) {
  const { width } = useWindowDimensions();
  const UMx = useMemo(() => makeUsersStyles(theme), [theme]);
  const { numCols, cardW, gap, padH } = useGridLayout(width, { maxCols: 4 });
  const nav = useNavigation();

  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const [filter, setFilter] = useState('all'); // all | active | disabled

  const [pwdVisible, setPwdVisible] = useState({});
  const [notesDraft, setNotesDraft] = useState({});
  const [highlightUid, setHighlightUid] = useState(null);
  const listRef = useRef(null);
  const dataRef = useRef([]);

  const eventsByUid = useMemo(() => {
    const acc = {};
    for (const e of events) acc[e.uid] = (acc[e.uid] || 0) + 1;
    return acc;
  }, [events]);

  const list = useMemo(() => {
    const entries = Object.entries(users).map(([uid, u]) => ({
      uid,
      displayName: u?.displayName || '',
      email:
        u?.email ??
        u?.authEmail ??
        u?.loginEmail ??
        u?.adminEmail ??
        u?.adminCreds?.email ??
        u?.contact?.email ??
        '',
      disabled: !!u?.disabled,
      disabledReason: u?.disabledReason || '',
      hasPass: !!u?.adminCreds?.passHash,
      username: u?.adminCreds?.username || '',
      password: u?.password || '',
      notes: u?.notes || '',
      eventsCount: eventsByUid[uid] || 0,
      updatedAt: u?.adminCreds?.updatedAt || 0,
      createdAt: safeDate(u?.createdAt) || safeDate(u?.createdAtISO) || 0,
    }));

    const term = (dq || '').toLowerCase().trim();
    let out = entries.filter((it) =>
      [it.uid, it.displayName, it.email, it.username].some((v) =>
        String(v || '').toLowerCase().includes(term)
      )
    );

    if (filter === 'active') out = out.filter((x) => !x.disabled);
    if (filter === 'disabled') out = out.filter((x) => x.disabled);

    out.sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      if (b.eventsCount !== a.eventsCount) return b.eventsCount - a.eventsCount;
      return String(a.displayName || a.email || a.uid).localeCompare(
        String(b.displayName || b.email || b.uid)
      );
    });

    dataRef.current = out;
    return out;
  }, [users, dq, filter, eventsByUid]);

  useEffect(() => {
    const next = {};
    for (const it of list) next[it.uid] = notesDraft[it.uid] ?? it.notes ?? '';
    setNotesDraft(next);
  }, [list.length]);

  const impersonateLogin = async (item) => {
    try {
      if (item?.disabled) {
        return Alert.alert('משתמש מושבת', 'לא ניתן להתחבר לחשבון זה כי הוא מסומן כמושבת.');
      }
      const email = String(item?.email || '').trim();
      const password = String(item?.password || '').trim();
      if (!email) return Alert.alert('חסר אימייל', 'לא נמצא אימייל למשתמש זה.');
      if (!password) return Alert.alert('אין סיסמה שמורה', 'לא נמצאה סיסמה שמורה למשתמש זה.');

      try {
        await firebase.auth().signOut();
      } catch {}
      await firebase.auth().signInWithEmailAndPassword(email, password);
      nav.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      Alert.alert('התחברות נכשלה', e?.message || 'לא ניתן היה להתחבר לחשבון המשתמש.');
    }
  };

  useEffect(() => {
    if (!focusUid) return;
    setHighlightUid(focusUid);
    const t = setTimeout(() => setHighlightUid(null), 3500);

    const idx = dataRef.current.findIndex((x) => x.uid === focusUid);
    if (idx >= 0 && listRef.current?.scrollToIndex) {
      try {
        listRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
      } catch {}
    }
    return () => clearTimeout(t);
  }, [focusUid]);

  const Header = (
    <View style={UMx.header}>
      <Text style={UMx.hTitle}>ניהול משתמשים</Text>

      <View style={UMx.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="חיפוש: שם / אימייל / UID / שם משתמש…"
          placeholderTextColor={theme.muted}
          style={UMx.search}
          textAlign="right"
        />
        <View style={UMx.filters}>
          {['all', 'active', 'disabled'].map((k) => (
            <ScaleBtn key={k} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilter(k); }} style={[UMx.pill, filter === k && UMx.pillOn]}>
              <Text style={[UMx.pillTxt, filter === k && UMx.pillTxtOn]}>
                {k === 'all' ? 'הכל' : k === 'active' ? 'פעילים' : 'מושבתים'}
              </Text>
            </ScaleBtn>
          ))}
        </View>
      </View>

      <View style={UMx.kpis}>
        <KPIMini UMx={UMx} label="סה״כ" value={list.length} />
        <KPIMini UMx={UMx} label="פעילים" value={list.filter((x) => !x.disabled).length} />
        <KPIMini UMx={UMx} label="מושבתים" value={list.filter((x) => x.disabled).length} />
      </View>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const initials = getInitials(item.displayName, item.email);
    const pwdShown = !!pwdVisible[item.uid];
    const onTogglePwd = () => setPwdVisible((s) => ({ ...s, [item.uid]: !s[item.uid] }));
    const onChangeNotes = (t) => setNotesDraft((s) => ({ ...s, [item.uid]: t }));

    const saveNotesClick = async () => {
      try {
        await onSaveNotes?.(item.uid, notesDraft[item.uid] ?? '');
        Alert.alert('נשמר', 'הערות עודכנו.');
      } catch (e) {
        Alert.alert('שגיאה', e?.message || 'נכשל עדכון הערות.');
      }
    };

    const isHighlighted = highlightUid === item.uid;

    return (
      <FadeInView delay={index * 50} style={{ width: cardW }}>
        <View
          style={[
            UMx.card,
            item.disabled && UMx.cardDisabled,
            isHighlighted && {
              borderColor: '#10B981',
              borderWidth: 2,
              shadowColor: '#10B981',
              shadowOpacity: 0.25,
              shadowRadius: 10,
            },
          ]}
        >
          <View style={UMx.head}>
            <View style={UMx.avatar}>
              <Text style={UMx.avatarTxt}>{initials}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={UMx.name} numberOfLines={1}>
                {item.displayName || '—'}
              </Text>
              <Text style={UMx.email} numberOfLines={1}>
                {item.email || '—'}
              </Text>
            </View>
          </View>

          <TinyRow UMx={UMx} k="UID" v={item.uid} copy />
          <TinyRow UMx={UMx} k="שם משתמש" v={item.email || '—'} />
          <TinyRow
            UMx={UMx}
            k="סיסמה"
            v={pwdShown ? item.password || '—' : item.password ? '••••••' : '—'}
            onToggle={onTogglePwd}
            withToggle
            copyVal={item.password || ''}
          />
          <TinyRow UMx={UMx} k="# אירועים" v={String(item.eventsCount)} />
          <TinyRow UMx={UMx} k="נוצר" v={fmtHebDateTime(item.createdAt)} />

          <View style={UMx.rowTiny}>
            <Text style={UMx.kTiny}>סטטוס:</Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View style={[UMx.status, item.disabled ? UMx.off : UMx.on]}>
                <Text style={UMx.statusTxt}>{item.disabled ? 'מושבת' : 'פעיל'}</Text>
              </View>
              {item.disabled && !!item.disabledReason && <Text style={UMx.reasonInCard}>({item.disabledReason})</Text>}
            </View>
          </View>

          <View style={UMx.actions}>
            <ScaleBtn onPress={() => onDisableToggle(item.uid)} style={[UMx.btn, item.disabled ? UMx.btnEnable : UMx.btnDanger]}>
              <Text style={UMx.btnTxt}>{item.disabled ? 'הפעל' : 'השבת'}</Text>
            </ScaleBtn>

            <ScaleBtn onPress={() => onOpenUserEventsModal?.(item.uid)} style={[UMx.btn, UMx.btnInfo]} activeOpacity={0.9}>
              <Text style={UMx.btnTxt}>שמות אירועים</Text>
            </ScaleBtn>

            <ScaleBtn onPress={() => impersonateLogin(item)} style={[UMx.btn, UMx.btnImpersonate]} activeOpacity={0.9}>
              <Text style={UMx.btnTxt}>התחבר כמשתמש</Text>
            </ScaleBtn>

            <ScaleBtn onPress={() => onShowUserEvents?.(item.uid)} style={[UMx.btn, { backgroundColor: '#0F766E' }]} activeOpacity={0.9}>
              <Text style={UMx.btnTxt}>הצג במסך האירועים</Text>
            </ScaleBtn>

            <ScaleBtn onPress={() => onDeleteUser?.(item)} style={[UMx.btn, { backgroundColor: '#7F1D1D' }]} activeOpacity={0.9}>
              <Text style={UMx.btnTxt}>מחק משתמש</Text>
            </ScaleBtn>
          </View>

          <Text style={UMx.label}>הערות</Text>
          <TextInput
            value={notesDraft[item.uid] ?? ''}
            onChangeText={onChangeNotes}
            placeholder="הערות פנימיות…"
            placeholderTextColor={theme.muted}
            style={UMx.notes}
            multiline
            textAlign="right"
          />
          <View style={UMx.notesBar}>
            <ScaleBtn onPress={saveNotesClick} style={[UMx.btn, UMx.btnInfo, UMx.btnSaveNotes]} activeOpacity={0.9}>
              <Text style={UMx.btnTxt}>שמור</Text>
            </ScaleBtn>
          </View>
        </View>
      </FadeInView>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={list}
      key={'users_grid_' + numCols + '_' + (theme.isDark ? 'd' : 'l')}
      numColumns={numCols}
      keyExtractor={(it) => it.uid}
      ListHeaderComponent={Header}
      contentContainerStyle={{ paddingHorizontal: padH, paddingVertical: 10, rowGap: gap }}
      columnWrapperStyle={numCols > 1 ? { columnGap: gap, justifyContent: 'flex-start' } : undefined}
      renderItem={renderItem}
    />
  );
}
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ==== המסך הראשי ====
export default function OwnerDashboard() {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = useMemo(() => makeTheme(isDark), [isDark]);

  const isPhone = width < 500;
const isLarge = width >= 900;

  // KPI responsive width
const kpiW = useMemo(() => {
  // חייב להיות תואם לסטיילים של kpiRow (padH + gap)
  const padH = width < 420 ? 12 : 16;  // במובייל מצמצמים פדינג
  const gap = width < 420 ? 8 : 10;    // gap קטן במובייל
  const cols = width < 360 ? 1 : 2;    // סופר-קטן: עמודה אחת, אחרת 2

  const usable = Math.max(0, width - padH * 2 - gap * (cols - 1));
  const raw = Math.floor(usable / cols);

  // clamp כדי לא לצאת קטן מדי/גדול מדי
  return Math.max(160, Math.min(240, raw));
}, [width]);


// בתוך OwnerDashboard():
const route = useRoute();
const { id, eventId, uid: routeUid } = route.params || {};




const S = useMemo(() => makeStyles(theme, isPhone, isLarge), [theme, isPhone, isLarge]);
  const ST = useMemo(() => makeTrafficStyles(theme), [theme]);

  // View Toggle
  const [cardsView, setCardsView] = useState('gallery'); // 'gallery' | 'list'

  // grid layout for gallery
  const grid = useGridLayout(width, { maxCols: 4 });
  const listLayout = useMemo(() => {
    const padH = grid.padH;
    const fullW = Math.max(280, width - padH * 2);
    return { numCols: 1, cardW: fullW, gap: 10, padH };
  }, [width, grid.padH]);

  const numCols = cardsView === 'list' ? listLayout.numCols : grid.numCols;
  const cardW = cardsView === 'list' ? listLayout.cardW : grid.cardW;
  const gap = cardsView === 'list' ? listLayout.gap : grid.gap;
  const padH = grid.padH;

  const [activeView, setActiveView] = useState('events'); // events | users | servers
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);

  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);

  const [sortBy, setSortBy] = useState('eventDate');
  const [sortDir, setSortDir] = useState('desc');
  const [sortLabel, setSortLabel] = useState('תאריך');

  const [planFilter, setPlanFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(false);

  const [nowText, setNowText] = useState('');
  useEffect(() => {
    const tick = () =>
      setNowText(
        new Date().toLocaleString('he-IL', {
          weekday: 'long',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Delete user cascade
  async function deleteUserCascadeRTDB(uid) {
    if (!uid) throw new Error('חסר uid');
    const db = firebase.database();
    const updates = {};
    updates[`Events/${uid}`] = null;
    updates[`users/${uid}`] = null;
    await db.ref().update(updates);
  }

  // ✅ Delete event
  async function deleteEventRTDB(uid, eventId) {
    if (!uid) throw new Error('חסר uid');
    if (!eventId) throw new Error('חסר eventId');
    const db = firebase.database();
    await db.ref(`Events/${uid}/${eventId}`).set(null);
  }

  function confirmDeleteEvent({ uid, eventId, eventName, eventDate }) {
    const title = 'אישור מחיקה';
    const label = eventName || eventId || 'האירוע';
    const msg = `למחוק לצמיתות את האירוע:\n${label}\n${eventDate ? `תאריך: ${eventDate}\n` : ''}\nהפעולה בלתי הפיכה.`;

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(msg) : false;
      if (!ok) return;
      deleteEventRTDB(uid, eventId)
        .then(() => Alert.alert('נמחק', 'האירוע נמחק מה-Realtime Database.'))
        .catch((e) => Alert.alert('שגיאה', e?.message || 'המחיקה נכשלה.'));
      return;
    }

    Alert.alert(title, msg, [
      { text: 'בטל', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEventRTDB(uid, eventId);
            Alert.alert('נמחק', 'האירוע נמחק מה-Realtime Database.');
          } catch (e) {
            Alert.alert('שגיאה', e?.message || 'המחיקה נכשלה.');
          }
        },
      },
    ]);
  }

  const handleDeleteUser = (user) => {
    const label = user?.email || user?.displayName || user?.uid || 'המשתמש';
    const msg = `למחוק לצמיתות את ${label}?\nזה ימחק גם את כל האירועים שלו מתוך המאגר.`;

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(msg) : false;
      if (!ok) return;
      deleteUserCascadeRTDB(user.uid)
        .then(() => Alert.alert('נמחק', 'המשתמש וכל האירועים שלו נמחקו מה-Realtime Database.'))
        .catch((e) => Alert.alert('שגיאה', e?.message || 'המחיקה נכשלה.'));
      return;
    }

    Alert.alert('אישור מחיקה', msg, [
      { text: 'בטל', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserCascadeRTDB(user.uid);
            Alert.alert('נמחק', 'המשתמש וכל האירועים שלו נמחקו מה-Realtime Database.');
          } catch (e) {
            Alert.alert('שגיאה', e?.message || 'המחיקה נכשלה.');
          }
        },
      },
    ]);
  };

  // User events modal
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [eventsForUser, setEventsForUser] = useState({ uid: '', list: [] });
  const [eventsSearch, setEventsSearch] = useState('');

  const openUserEventsModal = (uid) => {
    const list = events
      .filter((e) => e.uid === uid)
      .map((e) => ({
        eventId: e.eventId,
        name: e.eventName || '(ללא שם)',
        date: e.eventDate || '',
        time: e.eventTime || '',
        location: e.eventLocation || '',
      }));
    setEventsForUser({ uid, list });
    setEventsSearch('');
    setShowEventsModal(true);
  };

  // KPIs
  const [totalEvents, setTotalEvents] = useState(0);
  const [newToday, setNewToday] = useState(0);
  const [newWeek, setNewWeek] = useState(0);
  const [newMonth, setNewMonth] = useState(0);

  const [totalTrafficMB, setTotalTrafficMB] = useState(0);
  const [totalReadMB, setTotalReadMB] = useState(0);
  const [totalWriteMB, setTotalWriteMB] = useState(0);
  const [totalUploadMB, setTotalUploadMB] = useState(0);

  const [userMetaByUid, setUserMetaByUid] = useState({});
  const [trafficBucketsSum, setTrafficBucketsSum] = useState({ sum: { minute: {}, hour: {}, day: {}, week: {}, month: {} } });

  const [loginsToday, setLoginsToday] = useState(0);
  const [logins7d, setLogins7d] = useState(0);
  const [recentLogins, setRecentLogins] = useState([]);

  const [focusUid, setFocusUid] = useState(null);

  // Hotkeys
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || '').toLowerCase();
      const meta = e.ctrlKey || e.metaKey;
      if (meta && k === 'k') {
        const el = document?.querySelector?.('input[placeholder^="חיפוש"]');
        if (el) {
          el.focus();
          el.select?.();
          e.preventDefault();
        }
      } else if (k === 'g') setActiveView('users');
      else if (k === 's') setActiveView('servers');
      else if (k === 'e') setActiveView('events');
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', onKey);
    return () => {
      if (Platform.OS === 'web') window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    setLoading(true);

    const db = firebase.database();
    const refEvents = db.ref('Events');
    const refUsers = db.ref('users');

    const offEvents = refEvents.on('value', (snap) => {
      const out = [];
      const root = snap.val() || {};

      let readBAll = 0,
        writeBAll = 0,
        uploadBAll = 0;

      const acc = { minute: {}, hour: {}, day: {}, week: {}, month: {} };
      const add = (obj, key, dr, dw, du) => {
        if (!key) return;
        const cur = obj[key] || { readBytes: 0, writeBytes: 0, uploadBytes: 0 };
        obj[key] = {
          readBytes: cur.readBytes + Number(dr || 0),
          writeBytes: cur.writeBytes + Number(dw || 0),
          uploadBytes: cur.uploadBytes + Number(du || 0),
        };
      };

      Object.entries(root).forEach(([uid, userEvents]) => {
        if (!userEvents || typeof userEvents !== 'object') return;

        Object.entries(userEvents).forEach(([eventId, data]) => {
          if (!data || typeof data !== 'object') return;
          if (String(eventId).startsWith('__')) return;

          const totals = data.__metrics?.traffic?.totals || {};
          const readB = Number(totals.readBytes ?? totals.read ?? 0);
          const writeB = Number(totals.writeBytes ?? totals.write ?? 0);
          const uploadB = Number(totals.uploadBytes ?? totals.upload ?? 0);

          readBAll += readB;
          writeBAll += writeB;
          uploadBAll += uploadB;

          const createdAt =
            safeDate(data.createdAt) ||
            safeDate(data.__metrics?.lastUpdated) ||
            safeDate(data.createdDate) ||
            safeDate(data.eventDate);

          out.push({
            uid,
            eventId,
            eventName: data.eventName || '',
            eventDate: data.eventDate || '',
            eventTime: data.eventTime || '',
            eventCategory: data.eventCategory || '',
            eventLocation: data.eventLocation || '',
            plan: data.plan || '',
            yes: Number(data.yes_caming || 0),
            maybe: Number(data.maybe || 0),
            no: Number(data.no_cuming || 0),
            pending: Number(data.no_answear || 0),
            numberOfGuests: Number(data.Numberofguests || 0),
            main_sms: Number(data.main_sms || 0),
            sent_msg: Number(data.sent_msg || 0),

            createdAt,
            trafficMB: (readB + writeB + uploadB) / 1e6,
            lastLoginEventTs: safeDate(data?.__meta?.lastLoginAt ?? data?.lastLoginAt ?? 0),
            metaUserName: data?.__meta?.adminCredsUsername || '',
          });

          const t = data.__metrics?.traffic || {};
          ['minute', 'hour', 'day', 'week', 'month'].forEach((bucket) => {
            const b = t[bucket] || {};
            Object.entries(b).forEach(([k, v]) => {
              add(
                acc[bucket],
                k,
                Number(v.readBytes ?? v.read ?? 0),
                Number(v.writeBytes ?? v.write ?? 0),
                Number(v.uploadBytes ?? v.upload ?? 0)
              );
            });
          });
        });
      });

      const toMB = (bytes) => Number(bytes || 0) / 1e6;
      setTotalReadMB(toMB(readBAll));
      setTotalWriteMB(toMB(writeBAll));
      setTotalUploadMB(toMB(uploadBAll));
      setTotalTrafficMB(toMB(readBAll + writeBAll + uploadBAll));

      setTotalEvents(out.length);
      setNewToday(out.reduce((s, e) => s + (isToday(e.createdAt) ? 1 : 0), 0));
      setNewWeek(out.reduce((s, e) => s + (withinDays(e.createdAt, 7) ? 1 : 0), 0));
      setNewMonth(out.reduce((s, e) => s + (withinDays(e.createdAt, 30) ? 1 : 0), 0));

      setEvents(out);
      setTrafficBucketsSum({ sum: acc });

      const nowTs = Date.now();
      const sevenDays = 7 * 86400000;
      setLoginsToday(out.reduce((s, e) => s + (isToday(e.lastLoginEventTs) ? 1 : 0), 0));
      setLogins7d(out.reduce((s, e) => s + (e.lastLoginEventTs && nowTs - e.lastLoginEventTs <= sevenDays ? 1 : 0), 0));

      const recent = out
        .filter((e) => e.lastLoginEventTs)
        .sort((a, b) => b.lastLoginEventTs - a.lastLoginEventTs)
        .slice(0, 20)
        .map((e) => ({
          uid: e.uid,
          eventId: e.eventId,
          eventName: e.eventName || '(ללא שם)',
          ts: e.lastLoginEventTs,
          who: e.metaUserName || '',
          location: e.eventLocation || '',
        }));
      setRecentLogins(recent);

      setLoading(false);
    });

    const offUsers = refUsers.on('value', (snap) => setUserMetaByUid(snap.val() || {}));

    return () => {
      try {
        refEvents.off('value', offEvents);
      } catch {}
      try {
        refUsers.off('value', offUsers);
      } catch {}
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([firebase.database().ref('Events').once('value'), firebase.database().ref('users').once('value')]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const usersMerged = useMemo(() => {
    const base = { ...(userMetaByUid || {}) };
    for (const ev of events) {
      if (!base[ev.uid]) {
        base[ev.uid] = { displayName: '', email: '', password: '', disabled: false, adminCreds: {} };
      }
    }
    return base;
  }, [userMetaByUid, events]);

  useEffect(() => {
    const onBack = () => {
      if (activeView === 'users') {
        setActiveView('events');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [activeView]);

  const filtered = useMemo(() => {
    const term = (dq || '').toLowerCase().trim();
    let arr = events.filter((e) =>
      [e.eventName, e.eventDate, e.eventLocation, e.eventCategory, e.uid, e.eventId, e.plan, e.metaUserName]
        .some((v) => String(v || '').toLowerCase().includes(term))
    );

    if (planFilter !== 'all') arr = arr.filter((e) => String(e.plan || '').toLowerCase() === planFilter);
    if (activeOnly) arr = arr.filter((e) => !userMetaByUid[e.uid]?.disabled);

    arr.sort((a, b) => {
      const A = a[sortBy];
      const B = b[sortBy];
      if (sortBy === 'trafficMB') return sortDir === 'asc' ? A - B : B - A;
      if (sortBy === 'createdAt') return sortDir === 'asc' ? n(A) - n(B) : n(B) - n(A);
      if (sortBy === 'lastLoginEvent') {
        const la = n(a.lastLoginEventTs);
        const lb = n(b.lastLoginEventTs);
        return sortDir === 'asc' ? la - lb : lb - la;
      }
      return sortDir === 'asc'
        ? String(A ?? '').localeCompare(String(B ?? ''))
        : String(B ?? '').localeCompare(String(A ?? ''));
    });

    return arr;
  }, [events, dq, sortBy, sortDir, userMetaByUid, planFilter, activeOnly]);

  const toggleSort = (key, label) => {
    setSortLabel(label);
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const openAdminPanel = (uid, eventId) => nav.navigate?.('AdminPanel', { id: eventId, uid });
const openGuestsManager = (uid, eventId, eventName) =>
  nav.navigate?.('EventGuests', { uid, eventId, eventName });

const openTablesManager = (uid, eventId, eventName) => {
  if (!uid || !eventId) {
    Alert.alert('חסר אירוע', 'חסר uid או eventId.');
    return;
  }

  nav.navigate('TablePlanningViewScreen', {
    uid,
    id: eventId,        // אם המסך שלך קורא לזה id
    eventId,            // אופציונלי (לנוחות)
    eventName: eventName || '',
  });
};


  const saveUserCreds = async (uid, username, pass) => {
    const db = firebase.database();
    const passHash = await sha256(pass);
    await db.ref(`users/${uid}/adminCreds`).update({ username, passHash, updatedAt: Date.now() });
    await db.ref(`users/${uid}/password`).set(pass);
    await mirrorCredsUsernameToEvents(uid, username);
  };

  const setEventPlan = async (uid, eventId, plan) => {
    try {
      const db = firebase.database();
      const baseRef = db.ref(`Events/${uid}/${eventId}`);

      let guests = 0;
      const guestsSnap = await baseRef.child('Numberofguests').once('value');
      guests = Number(guestsSnap.val() || 0);

      if (!guests) {
        const g1 = await baseRef.child('guests').once('value');
        const g2 = await baseRef.child('contacts').once('value');
        guests = Math.max(0, g1.numChildren?.() || 0, g2.numChildren?.() || 0);
      }

      const main_sms = calcMainSms(guests, plan);

      await baseRef.update({
        plan,
        main_sms,
        '__meta/planUpdatedAt': firebase.database.ServerValue.TIMESTAMP,
        '__meta/mainSmsUpdatedAt': firebase.database.ServerValue.TIMESTAMP,
      });

      Alert.alert('עודכן', `התוכנית עודכנה ל-${plan} • main_sms=${main_sms} (מוזמנים: ${guests})`);
    } catch (e) {
      Alert.alert('שגיאה', e?.message || 'נכשל עדכון תוכנית/ main_sms לאירוע.');
    }
  };

  const toggleDisableUser = async (uid) => {
    try {
      const db = firebase.database();
      const userSnap = await db.ref(`users/${uid}`).once('value');
      const userVal = userSnap.val() || {};
      const curDisabled = !!userVal.disabled;

      let reason = '';
      if (!curDisabled) {
        const hasPass = !!userVal?.adminCreds?.passHash;
        reason = hasPass ? 'מושבת ידנית' : '';
      }

      const evSnap = await db.ref(`Events/${uid}`).once('value');
      const updates = {
        [`users/${uid}/disabled`]: !curDisabled,
        [`users/${uid}/disabledUpdatedAt`]: Date.now(),
        [`users/${uid}/disabledReason`]: !curDisabled ? reason : null,
      };

      evSnap.forEach((child) => {
        const eventId = child.key;
        if (!eventId || String(eventId).startsWith('__')) return;
        updates[`Events/${uid}/${eventId}/__meta/userDisabled`] = !curDisabled;
        updates[`Events/${uid}/${eventId}/__meta/userDisabledAt`] = Date.now();
        updates[`Events/${uid}/${eventId}/__meta/userDisabledReason`] = !curDisabled ? reason : null;
      });

      await db.ref().update(updates);
      Alert.alert('עודכן', !curDisabled ? 'המשתמש הושבת.' : 'המשתמש הופעל.');
    } catch (e) {
      Alert.alert('שגיאה', e?.message || 'נכשל עדכון סטטוס משתמש.');
    }
  };

  const AFTER_LOGOUT_ROUTE = 'LoginEmail';
  const adminLogout = async () => {
    try {
      await firebase.auth().signOut();
      nav.reset({ index: 0, routes: [{ name: AFTER_LOGOUT_ROUTE }] });
    } catch (e) {
      Alert.alert('שגיאה', e?.message || 'נכשל להתנתק.');
    }
  };

  const showUserEventsOnEvents = (uid) => {
    setActiveView('events');
    setQ(uid);
  };

  // === Login Modal ===
  const [loginModal, setLoginModal] = useState(false);
  const [loginUid, setLoginUid] = useState('');
  const [loginEvent, setLoginEvent] = useState('');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const tryLogin = async () => {
    try {
      setLoginBusy(true);
      const res = await ownerLogin(loginUid.trim(), loginEvent.trim(), loginUser.trim(), loginPass);
      setLoginBusy(false);
      if (!res.ok) return Alert.alert('התחברות נכשלה', res.message || '');
      Alert.alert('התחברת!', 'lastLoginAt של האירוע עודכן.');
      setLoginModal(false);
      setLoginUid('');
      setLoginEvent('');
      setLoginUser('');
      setLoginPass('');
    } catch (e) {
      setLoginBusy(false);
      Alert.alert('שגיאה', e?.message || 'נכשל ניסיון התחברות.');
    }
  };

  const renderCard = ({ item, index }) => {
    const um = userMetaByUid[item.uid] || {};
    const ownerDisplayName = um.displayName || '—';
    const ownerEmail = um.email || '—';
    const ownerPassword = um.password || '—';
    const freshLogin = isToday(item.lastLoginEventTs);

    const goToUsersAndFocus = () => {
      setFocusUid(item.uid);
      setActiveView('users');
    };

    return (
      <FadeInView delay={index * 40} style={{ width: cardW }}>
        <View
          style={[
            S.card,
            freshLogin && { borderColor: theme.goodBorder, backgroundColor: theme.goodBg },
          ]}
        >
          <View style={S.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={S.cardTitle} numberOfLines={1}>
                {item.eventName || 'ללא שם'}
              </Text>
              <ScaleBtn onPress={goToUsersAndFocus} style={S.iconBtn} accessibilityLabel="פתח ניהול משתמשים לבעל האירוע">
                <Text style={S.iconBtnText}>👤</Text>
              </ScaleBtn>
            </View>
            <Text style={S.cardSub}>{item.eventLocation || '-'}</Text>
          </View>

          <Row theme={theme} S={S} k="תאריך אירוע" v={`${item.eventDate || '-'}${item.eventTime ? ` • ${item.eventTime}` : ''}`} />
          <Row theme={theme} S={S} k="קטגוריה" v={item.eventCategory || '-'} />
          <Row theme={theme} S={S} k="כמות מוזמנים" v={item.numberOfGuests ?? 0} />
          <Row theme={theme} S={S} k="תוכנית" v={item.plan || '-'} />
          <Row theme={theme} S={S} k="כמות אסימונים" v={item.main_sms ?? 0} />
          <Row theme={theme} S={S} k="מכסה" v={Math.max(0, Number(item.main_sms || 0) - Number(item.sent_msg || 0))} />

          <View style={[S.actionsRow, { marginTop: 8, flexWrap: 'wrap' }]}>
            {['basic', 'plus', 'digital', 'premium', 'complementary'].map((p) => (
              <ScaleBtn
                key={p}
                onPress={() => setEventPlan(item.uid, item.eventId, p)}
                style={[S.actionBtn, { backgroundColor: item.plan === p ? theme.primary : theme.chip }]}
              >
                <Text style={[S.actionText, { color: item.plan === p ? '#fff' : theme.subText }]}>{p}</Text>
              </ScaleBtn>
            ))}
          </View>

          <View style={[S.rowX, { alignItems: 'center', marginTop: 10 }]}>
            <Text style={S.labelX}>סטטוס בעלים:</Text>
            <View
              style={[
                {
                  height: 24,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: um?.disabled ? (theme.isDark ? '#450a0a' : '#FEF2F2') : (theme.isDark ? '#064E3B' : '#ECFDF5'),
                  borderWidth: 1,
                  borderColor: um?.disabled ? '#EF4444' : '#10B981',
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: theme.text }}>
                {um?.disabled ? 'מושבת' : 'משתמש פעיל'}
              </Text>
            </View>
          </View>

          <Row theme={theme} S={S} k="UID" v={item.uid} mono />
          <Row theme={theme} S={S} k="אירוע" v={item.eventId} mono />
          <Row
            theme={theme}
            S={S}
            k="התחברות (אירוע)"
            v={
              item.lastLoginEventTs
                ? new Date(item.lastLoginEventTs).toLocaleString('he-IL') + (freshLogin ? ' (היום)' : '')
                : '—'
            }
          />

          <Row theme={theme} S={S} k="שם משתמש" v={ownerDisplayName} />
          <Row theme={theme} S={S} k="אימייל" v={ownerEmail} />
          <Row theme={theme} S={S} k="סיסמה" v={ownerPassword} />

          <View style={S.statsRow}>
            <Stat theme={theme} S={S} k="מגיעים" v={item.yes} tint="#22C55E" />
            <Stat theme={theme} S={S} k="אולי" v={item.maybe} tint="#F59E0B" />
            <Stat theme={theme} S={S} k="לא" v={item.no} tint="#EF4444" />
            <Stat theme={theme} S={S} k="המתנה" v={item.pending} tint={theme.isDark ? '#A78BFA' : '#6C63FF'} />
          </View>

<View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
  <ScaleBtn onPress={() => openAdminPanel(item.uid, item.eventId)} style={[S.primaryBtn, { flex: 1, minWidth: 140 }]}>
    <Text style={S.primaryText}>ניהול אירוע</Text>
  </ScaleBtn>

  {/* ✅ חדש: ניהול מוזמנים */}
  <ScaleBtn
    onPress={() => openGuestsManager(item.uid, item.eventId, item.eventName)}
    style={[S.primaryBtn, { backgroundColor: theme.primary2, flex: 1, minWidth: 140 }]}
  >
    <Text style={S.primaryText}>ניהול מוזמנים</Text>
  </ScaleBtn>

<ScaleBtn
  onPress={() => openTablesManager(item.uid, item.eventId, item.eventName)}
  style={[S.primaryBtn, { backgroundColor: '#0EA5E9', flex: 1, minWidth: 140 }]}
>
  <Text style={S.primaryText}>ניהול שולחנות</Text>
</ScaleBtn>



  <ScaleBtn onPress={goToUsersAndFocus} style={[S.primaryBtn, { backgroundColor: theme.info, flex: 1, minWidth: 120 }]}>
    <Text style={S.primaryText}>למשתמש</Text>
  </ScaleBtn>

  <ScaleBtn
    onPress={() =>
      confirmDeleteEvent({
        uid: item.uid,
        eventId: item.eventId,
        eventName: item.eventName,
        eventDate: item.eventDate,
      })
    }
    style={[S.primaryBtn, { backgroundColor: '#B91C1C', flex: 1, minWidth: 90 }]}
  >
    <Text style={S.primaryText}>מחק</Text>
  </ScaleBtn>
</View>

        </View>
      </FadeInView>
    );
  };

  const renderListHeader = useCallback(() => {
    return (
      <View>
        <AnimatedHeader theme={theme} S={S}>
{(() => {
const cols =
  width < 320 ? 1 :
  width < 520 ? 2 :
  width < 900 ? 3 :
  4; 


  const items = [
    { label: 'סה״כ אירועים', value: totalEvents, tint: '#6366F1' },
    { label: 'חדשים היום', value: newToday, tint: '#22C55E' },
    { label: 'חדשים בשבוע', value: newWeek, tint: theme.info },
    { label: 'חדשים החודש', value: newMonth, tint: '#F59E0B' },

    { label: 'תעבורה כוללת', value: fmtMB(totalTrafficMB), tint: '#A78BFA', isText: true },
    { label: 'קריאה כוללת', value: fmtMB(totalReadMB), tint: '#4F46E5', isText: true },
    { label: 'כתיבה כוללת', value: fmtMB(totalWriteMB), tint: '#F43F5E', isText: true },
    { label: 'העלאות כוללות', value: fmtMB(totalUploadMB), tint: theme.info, isText: true },

    { label: 'התחברויות היום', value: loginsToday, tint: '#10B981' },
    { label: 'התחברויות 7 ימים', value: logins7d, tint: '#14B8A6' },
  ];

  const rows = chunkArray(items, cols);

  return (
    <View style={S.kpiGridWrap}>
      {rows.map((row, ri) => (
        <View key={`kpi_row_${ri}`} style={S.kpiGridRow}>
          {row.map((it, idx) => (
            <React.Fragment key={`${it.label}_${idx}`}>
              <KPI
                theme={theme}
                S={S}
                label={it.label}
                value={it.value}
                tint={it.tint}
                isText={it.isText}
              />
              {idx !== row.length - 1 && <View style={S.kpiSpacer} />}
            </React.Fragment>
          ))}

          {/* אם חסר תא אחרון (כשיש cols=2 ושורה אחרונה רק עם אחד) */}
          {row.length < cols && (
            <>
              <View style={S.kpiSpacer} />
              <View style={{ flex: 1 }} />
            </>
          )}
        </View>
      ))}
    </View>
  );
})()}


          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <RecentLoginsTicker theme={theme} items={recentLogins} onPick={(uid, eventId) => setQ(eventId)} />
          </View>

          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <TrafficOverview theme={theme} ST={ST} buckets={trafficBucketsSum} />
          </View>
        </AnimatedHeader>

        <View style={S.toolbar}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="חיפוש: שם אירוע / תאריך / מיקום / קטגוריה / uid / eventId / plan / username"
            style={S.search}
            placeholderTextColor={theme.muted}
            textAlign="right"
          />

          <View style={S.viewToggleRow}>
            <TogglePill theme={theme} S={S} label="🖼️ גלריה" active={cardsView === 'gallery'} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCardsView('gallery'); }} />
            <TogglePill theme={theme} S={S} label="📝 רשימה" active={cardsView === 'list'} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCardsView('list'); }} />
            <View style={{ flex: 1 }} />
          </View>

          <View style={S.sortRow}>
            <SortButton theme={theme} S={S} label={`🔽 ${sortLabel}`} onPress={() => {}} active />
            <SortButton theme={theme} S={S} label="תאריך" onPress={() => toggleSort('eventDate', 'תאריך')} active={sortBy === 'eventDate'} />
            <SortButton theme={theme} S={S} label="שם" onPress={() => toggleSort('eventName', 'שם')} active={sortBy === 'eventName'} />
            <SortButton theme={theme} S={S} label="מיקום" onPress={() => toggleSort('eventLocation', 'מיקום')} active={sortBy === 'eventLocation'} />
            <SortButton theme={theme} S={S} label="תוכנית" onPress={() => toggleSort('plan', 'תוכנית')} active={sortBy === 'plan'} />
            <SortButton theme={theme} S={S} label="נוצר" onPress={() => toggleSort('createdAt', 'נוצר')} active={sortBy === 'createdAt'} />
            <SortButton theme={theme} S={S} label="תעבורה" onPress={() => toggleSort('trafficMB', 'תעבורה')} active={sortBy === 'trafficMB'} />
            <SortButton theme={theme} S={S} label="התחברות" onPress={() => toggleSort('lastLoginEvent', 'התחברות')} active={sortBy === 'lastLoginEvent'} />

            <View style={{ flexDirection: 'row-reverse', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <TogglePill theme={theme} S={S} label="רק פעילים" active={activeOnly} onPress={() => setActiveOnly((v) => !v)} />
              {['all', 'basic', 'plus', 'digital', 'premium', 'complementary'].map((p) => (
                <TogglePill key={p} theme={theme} S={S} label={p} active={planFilter === p} onPress={() => setPlanFilter(p)} />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }, [
    theme,
    S,
    ST,
    q,
    cardsView,
    totalEvents,
    newToday,
    newWeek,
    newMonth,
    totalTrafficMB,
    totalReadMB,
    totalWriteMB,
    totalUploadMB,
    trafficBucketsSum,
    sortLabel,
    sortBy,
    activeOnly,
    planFilter,
    loginsToday,
    logins7d,
    recentLogins,
  ]);

  return (
    <View style={S.screen}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.topBar} />
      {/* Top Bar */}
      <View style={S.topBar}>
        <View style={S.topRightActions}>
          {activeView !== 'servers' && (
            <ScaleBtn
              onPress={() => nav.navigate('ServerMonitorsPane')}
              style={[S.topBtn, { backgroundColor: theme.card2, borderWidth: 1, borderColor: theme.border }]}
            >
              <Text style={[S.topBtnText, { color: theme.text }]}>🖥️ שרתים</Text>
            </ScaleBtn>
          )}

          {activeView !== 'users' && (
            <ScaleBtn onPress={() => setActiveView('users')} style={[S.topBtn, { backgroundColor: '#0F766E' }]}>
              <Text style={S.topBtnText}>👥 משתמשים</Text>
            </ScaleBtn>
          )}

          <ScaleBtn onPress={adminLogout} style={[S.topBtn, { backgroundColor: '#991B1B' }]}>
            <Text style={S.topBtnText}>🚪 יציאה</Text>
          </ScaleBtn>
        </View>

        <View style={S.topTitles} pointerEvents="none">
          <Text style={S.title}>מערכת ניהול</Text>
          <Text style={S.now}>{nowText}</Text>
        </View>

        {!isPhone && <View style={{ width: 100 }} />}
      </View>

      {activeView === 'servers' ? (
        <DeviceMonitorsPane />
      ) : activeView === 'users' ? (
        <View style={{ flex: 1 }}>
          <UsersManager
            theme={theme}
            users={usersMerged}
            events={events}
            onDisableToggle={toggleDisableUser}
            onSaveCreds={saveUserCreds}
            onSaveNotes={saveUserNotes}
            focusUid={focusUid}
            onDeleteUser={handleDeleteUser}
            onShowUserEvents={showUserEventsOnEvents}
            onOpenUserEventsModal={openUserEventsModal}
          />
        </View>
      ) : loading ? (
        <View style={{flex:1, alignItems:'center', justifyContent:'center'}}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{marginTop:10, color:theme.text}}>טוען נתונים...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <FlatList data={[]} ListHeaderComponent={renderListHeader} />
      ) : (
        <FlatList
          data={filtered}
          key={'grid_' + numCols + '_' + cardsView + '_' + (theme.isDark ? 'd' : 'l')}
          numColumns={numCols}
          keyExtractor={(it) => `${it.uid}__${it.eventId}`}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ paddingHorizontal: padH, paddingBottom: 40, rowGap: gap }}
          columnWrapperStyle={numCols > 1 ? { columnGap: gap, justifyContent: 'flex-start' } : undefined}
          initialNumToRender={8}
          windowSize={5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
          renderItem={renderCard}
        />
      )}

      {activeView === 'users' && (
        <ScaleBtn onPress={() => setActiveView('events')} style={S.fabBack} activeOpacity={0.9}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>↩️ חזרה לאירועים</Text>
        </ScaleBtn>
      )}

      {/* Login Modal */}
      <Modal visible={loginModal} transparent animationType="fade" onRequestClose={() => setLoginModal(false)}>
        <View style={S.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ width: '100%' }}>
            <View style={S.modalCard}>
              <Text style={S.modalTitle}>בדיקת התחברות משתמש (פר־אירוע)</Text>
              <ScrollView contentContainerStyle={{ gap: 12 }}>
                <TextInput placeholder="UID" value={loginUid} onChangeText={setLoginUid} style={S.input} textAlign="right" placeholderTextColor={theme.muted} />
                <TextInput placeholder="Event ID" value={loginEvent} onChangeText={setLoginEvent} style={S.input} textAlign="right" placeholderTextColor={theme.muted} />
                <TextInput placeholder="שם משתמש" value={loginUser} onChangeText={setLoginUser} style={S.input} textAlign="right" placeholderTextColor={theme.muted} />
                <TextInput placeholder="סיסמה" value={loginPass} onChangeText={setLoginPass} secureTextEntry style={S.input} textAlign="right" placeholderTextColor={theme.muted} />
              </ScrollView>

              <View style={[S.actionsRow, { marginTop: 20 }]}>
                <ScaleBtn disabled={loginBusy} onPress={tryLogin} style={[S.actionBtn, { backgroundColor: '#22C55E', opacity: loginBusy ? 0.7 : 1, flex:1 }]}>
                  <Text style={[S.actionText, { color: '#fff' }]}>{loginBusy ? 'מתחבר…' : 'התחבר'}</Text>
                </ScaleBtn>
                <ScaleBtn disabled={loginBusy} onPress={() => setLoginModal(false)} style={[S.actionBtn, { backgroundColor: '#9CA3AF' }]}>
                  <Text style={[S.actionText, { color: '#fff' }]}>סגור</Text>
                </ScaleBtn>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* אירועי המשתמש (Modal) */}
      <Modal visible={showEventsModal} transparent animationType="fade" onRequestClose={() => setShowEventsModal(false)}>
        <View style={S.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ width: '100%' }}>
            <View style={S.modalCard}>
              <Text style={S.modalTitle}>אירועים של המשתמש</Text>

              <TextInput
                value={eventsSearch}
                onChangeText={setEventsSearch}
                placeholder="חיפוש לפי שם/מיקום/תאריך/ID…"
                placeholderTextColor={theme.muted}
                style={[S.input, { marginBottom: 12 }]}
                textAlign="right"
              />

              <ScrollView style={{ maxHeight: 360 }}>
                {eventsForUser.list
                  .filter((e) => {
                    const t = (eventsSearch || '').toLowerCase().trim();
                    if (!t) return true;
                    return [e.name, e.location, e.date, e.time, e.eventId].some((v) => String(v || '').toLowerCase().includes(t));
                  })
                  .map((e) => (
                    <View
                      key={e.eventId}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 10,
                        backgroundColor: theme.card2,
                      }}
                    >
                      <Text style={{ fontWeight: '800', textAlign: 'right', color: theme.text, fontSize: 16 }} numberOfLines={1}>
                        {e.name}
                      </Text>
                      <Text style={{ color: theme.subText, textAlign: 'right', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                        {e.date}
                        {e.time ? ` • ${e.time}` : ''}
                        {e.location ? ` • ${e.location}` : ''}
                      </Text>

                      <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        <ScaleBtn onPress={() => copyToClipboard(e.eventId)} style={[S.actionBtn, { backgroundColor: theme.topBar }]}>
                          <Text style={[S.actionText, { color: '#fff' }]}>העתק ID</Text>
                        </ScaleBtn>

                        <ScaleBtn
                          onPress={() => {
                            setShowEventsModal(false);
                            setActiveView('events');
                            setQ(e.eventId);
                          }}
                          style={[S.actionBtn, { backgroundColor: theme.info }]}
                        >
                          <Text style={[S.actionText, { color: '#fff' }]}>סנן לאירוע</Text>
                        </ScaleBtn>

                        <ScaleBtn
                          onPress={() => {
                            setShowEventsModal(false);
                            openAdminPanel(eventsForUser.uid, e.eventId);
                          }}
                          style={[S.actionBtn, { backgroundColor: '#22C55E' }]}
                        >
                          <Text style={[S.actionText, { color: '#fff' }]}>פתח ניהול אירוע</Text>
                        </ScaleBtn>
                      </View>
                    </View>
                  ))}
              </ScrollView>

              <View style={[S.actionsRow, { marginTop: 14 }]}>
                <ScaleBtn onPress={() => setShowEventsModal(false)} style={[S.actionBtn, { backgroundColor: '#9CA3AF', width: '100%' }]}>
                  <Text style={[S.actionText, { color: '#fff' }]}>סגור</Text>
                </ScaleBtn>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

