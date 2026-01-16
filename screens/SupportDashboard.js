// SupportDashboard.js — SUPPORT TEAM EDITION (Clean)
// ✅ Remove: Traffic monitor chart (no graph)
// ✅ Fix: Search input no longer re-renders whole screen on every keystroke
// ✅ Keep: Guests management + Delete event + KPIs + Sort/Filter
// ✅ Header title: "ברוך הבא צוות תמיכה"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
  Animated,
  Easing,
  RefreshControl,
  useColorScheme,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';

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
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
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

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

// =====================
// ✨ ANIMATION COMPONENTS
// =====================
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
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

const FadeInView = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, delay, useNativeDriver: true, damping: 20 }),
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
      bg: '#F3F4F6',
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
      primary: '#4F46E5',
      primary2: '#6366F1',
      chip: '#E5E7EB',
      kpiBg: '#FFFFFF',
      kpiBorder: '#E5E7EB',
      shadow: 'rgba(0, 0, 0, 0.05)',
    };
  }
  return {
    isDark: true,
    bg: '#0F172A',
    card: '#1E293B',
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
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 12,
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
      shadowColor: theme.topBtnShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    topBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    topTitles: isPhone
      ? { alignItems: 'center', justifyContent: 'center', marginVertical: 4 }
      : {
          position: 'absolute',
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        },
    title: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 0.2 },
    now: {
      color: theme.muted,
      marginTop: 2,
      fontSize: 11,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    headerWrap: {
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      overflow: 'hidden',
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
      transform: [{ scale: 1.2 }],
    },

    kpiGridWrap: {
      paddingHorizontal: isPhone ? 12 : 16,
      paddingTop: 10,
      paddingBottom: 6,
      width: '100%',
      alignSelf: 'center',
      maxWidth: isLarge ? 1100 : undefined,
    },
    kpiGridRow: {
      flexDirection: 'row-reverse',
      alignItems: 'stretch',
      marginBottom: isPhone ? 10 : 12,
    },
    kpiSpacer: { width: isPhone ? 8 : 10 },
    kpiCard: {
      flex: 1,
      minWidth: 0,
      borderRadius: isPhone ? 14 : 16,
      borderWidth: 1,
      borderColor: theme.kpiBorder,
      backgroundColor: theme.kpiBg,
      padding: isPhone ? 12 : isLarge ? 10 : 14,
      minHeight: isPhone ? 78 : isLarge ? 74 : 92,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 3,
      justifyContent: 'space-between',
    },
    kpiLabel: {
      fontSize: isPhone ? 11 : 12,
      color: theme.subText,
      fontWeight: '800',
      textAlign: 'right',
      marginBottom: 4,
    },
    kpiValue: {
      fontSize: isPhone ? 18 : isLarge ? 16 : 20,
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
      elevation: 2,
    },

    viewToggleRow: {
      flexDirection: 'row-reverse',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: 8,
    },

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

    rowX: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    labelX: { color: theme.subText, fontWeight: '600', fontSize: 13 },
    valueX: { color: theme.text, fontWeight: '700', fontSize: 13, maxWidth: '75%', textAlign: 'right' },

    statsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
    stat: {
      flexGrow: 1,
      minWidth: isPhone ? '45%' : 100,
      borderRadius: 12,
      borderWidth: 1,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statK: { fontSize: 11, color: theme.subText, fontWeight: '700', marginBottom: 2 },
    statV: { fontSize: 16, fontWeight: '800' },

    primaryBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: '#fff', fontWeight: '900', fontSize: 14 },

    dangerBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#991B1B', alignItems: 'center', justifyContent: 'center' },
    dangerText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  });

// ==== Header אנימטיבי ====
function AnimatedHeader({ theme, S, children }) {
  const bg = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bg, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(bg, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();

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
    <Animated.View style={[S.headerWrap, { backgroundColor: bgColor, transform: [{ translateY: slide }], opacity: fade }]}>
      <View pointerEvents="none" style={S.headerDecor}>
        <View style={S.circle} />
        <View style={[S.circle, { left: -40, top: 40, width: 120, height: 120, backgroundColor: theme.info }]} />
      </View>
      {children}
    </Animated.View>
  );
}

// ==== טיקר התחברויות אחרונות ====
function RecentLoginsTicker({ theme, items = [], onPick }) {
  const itemW = 280;
  const gap = 12;
  const speed = 40;

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
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: theme.subText,
          textAlign: 'left',
          paddingHorizontal: 14,
          marginBottom: 6,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
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
                <Text style={{ fontSize: 11, color: theme.muted, fontWeight: '600' }}>{timeStr}</Text>
              </ScaleBtn>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

// ==== UI atoms ====
const KPI = ({ theme, S, label, value, tint = '#6C63FF', isText, style }) => (
  <View style={[S.kpiCard, style]}>
    <View>
      <Text style={S.kpiLabel} numberOfLines={2} ellipsizeMode="tail">
        {label}
      </Text>
      <Text style={[S.kpiValue, { color: tint }]} numberOfLines={1}>
        {isText ? String(value) : Number(value || 0).toLocaleString('he-IL')}
      </Text>
    </View>
    <View style={{ height: 4, width: '40%', backgroundColor: tint, borderRadius: 2, alignSelf: 'flex-end', opacity: 0.6 }} />
  </View>
);

const Row = ({ S, k, v, mono }) => (
  <View style={S.rowX}>
    <Text style={S.labelX}>{k}:</Text>
    <Text
      style={[
        S.valueX,
        mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
      ]}
      numberOfLines={1}
    >
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

// ✅ SearchBox: local state (no whole-screen re-render on each keystroke)
const SearchBox = React.forwardRef(function SearchBox(
  { theme, S, placeholder, onDebouncedChange, debounceMs = 350 },
  ref
) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  React.useImperativeHandle(ref, () => ({
    setText: (t) => setText(String(t ?? '')),
    focus: () => inputRef.current?.focus?.(),
    clear: () => setText(''),
  }));

  const debounced = useDebounced(text, debounceMs);

  useEffect(() => {
    onDebouncedChange?.(debounced);
  }, [debounced, onDebouncedChange]);

  return (
    <TextInput
      ref={inputRef}
      value={text}
      onChangeText={setText}
      placeholder={placeholder}
      style={S.search}
      placeholderTextColor={theme.muted}
      textAlign="right"
    />
  );
});

// =====================
// ✅ MAIN SCREEN (Support Dashboard)
// =====================
export default function SupportDashboard() {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = useMemo(() => makeTheme(isDark), [isDark]);

  const isPhone = width < 500;
  const isLarge = width >= 900;

  const S = useMemo(() => makeStyles(theme, isPhone, isLarge), [theme, isPhone, isLarge]);

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);

  // ✅ Search: no global q state while typing
  const searchRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [sortBy, setSortBy] = useState('eventDate');
  const [sortDir, setSortDir] = useState('desc');
  const [sortLabel, setSortLabel] = useState('תאריך');

  const [planFilter, setPlanFilter] = useState('all');

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

  // ✅ Delete event
  async function deleteEventRTDB(uid, eventId) {
    if (!uid) throw new Error('חסר uid');
    if (!eventId) throw new Error('חסר eventId');
    const db = firebase.database();
    await db.ref(`Events/${uid}/${eventId}`).set(null);
  }

  // ✅ Guests manager
  const openGuestsManager = (uid, eventId, eventName) =>
    nav.navigate?.('EventGuests', { uid, eventId, eventName });

  // KPIs
  const [totalEvents, setTotalEvents] = useState(0);
  const [newToday, setNewToday] = useState(0);
  const [newWeek, setNewWeek] = useState(0);
  const [newMonth, setNewMonth] = useState(0);

  // ✅ Still keep totals (no chart)
  const [totalTrafficMB, setTotalTrafficMB] = useState(0);
  const [totalReadMB, setTotalReadMB] = useState(0);
  const [totalWriteMB, setTotalWriteMB] = useState(0);
  const [totalUploadMB, setTotalUploadMB] = useState(0);

  const [loginsToday, setLoginsToday] = useState(0);
  const [logins7d, setLogins7d] = useState(0);
  const [recentLogins, setRecentLogins] = useState([]);

  useEffect(() => {
    setLoading(true);

    const db = firebase.database();
    const refEvents = db.ref('Events');

    const offEvents = refEvents.on('value', (snap) => {
      const out = [];
      const root = snap.val() || {};

      let readBAll = 0,
        writeBAll = 0,
        uploadBAll = 0;

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
        }));
      setRecentLogins(recent);

      setLoading(false);
    });

    return () => {
      try {
        refEvents.off('value', offEvents);
      } catch {}
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await firebase.database().ref('Events').once('value');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    let arr = events.filter((e) =>
      [e.eventName, e.eventDate, e.eventLocation, e.eventCategory, e.uid, e.eventId, e.plan].some((v) =>
        String(v || '').toLowerCase().includes(term)
      )
    );

    if (planFilter !== 'all') arr = arr.filter((e) => String(e.plan || '').toLowerCase() === planFilter);

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
  }, [events, searchTerm, sortBy, sortDir, planFilter]);

  const toggleSort = (key, label) => {
    setSortLabel(label);
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
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

  const askDelete = (uid, eventId, eventName) => {
    Alert.alert(
      'מחיקת אירוע',
      `למחוק את האירוע:\n"${eventName || 'ללא שם'}"\n\nuid: ${uid}\neventId: ${eventId}\n\nהפעולה בלתי הפיכה.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventRTDB(uid, eventId);
              Alert.alert('נמחק', 'האירוע נמחק בהצלחה');
            } catch (e) {
              Alert.alert('שגיאה', e?.message || 'נכשל למחוק אירוע');
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item, index }) => {
    const freshLogin = isToday(item.lastLoginEventTs);

    return (
      <FadeInView delay={index * 40} style={{ width: cardW }}>
        <View style={[S.card, freshLogin && { borderColor: theme.goodBorder, backgroundColor: theme.goodBg }]}>
          <View style={S.cardHeader}>
            <Text style={S.cardTitle} numberOfLines={1}>
              {item.eventName || 'ללא שם'}
            </Text>
            <Text style={S.cardSub}>{item.eventLocation || '-'}</Text>
          </View>

          <Row S={S} k="תאריך אירוע" v={`${item.eventDate || '-'}${item.eventTime ? ` • ${item.eventTime}` : ''}`} />
          <Row S={S} k="קטגוריה" v={item.eventCategory || '-'} />
          <Row S={S} k="כמות מוזמנים" v={item.numberOfGuests ?? 0} />
          <Row S={S} k="תוכנית" v={item.plan || '-'} />
          <Row S={S} k="כמות אסימונים" v={item.main_sms ?? 0} />
          <Row S={S} k="מכסה" v={Math.max(0, Number(item.main_sms || 0) - Number(item.sent_msg || 0))} />

          <Row
            S={S}
            k="התחברות (אירוע)"
            v={item.lastLoginEventTs ? fmtHebDateTime(item.lastLoginEventTs) + (freshLogin ? ' (היום)' : '') : '—'}
          />

          <View style={S.statsRow}>
            <Stat theme={theme} S={S} k="מגיעים" v={item.yes} tint="#22C55E" />
            <Stat theme={theme} S={S} k="אולי" v={item.maybe} tint="#F59E0B" />
            <Stat theme={theme} S={S} k="לא" v={item.no} tint="#EF4444" />
            <Stat theme={theme} S={S} k="המתנה" v={item.pending} tint={theme.isDark ? '#A78BFA' : '#6C63FF'} />
          </View>

          {/* ✅ Actions */}
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <ScaleBtn
              onPress={() => openGuestsManager(item.uid, item.eventId, item.eventName)}
              style={[S.primaryBtn, { backgroundColor: theme.primary2, flex: 1, minWidth: 160 }]}
            >
              <Text style={S.primaryText}>ניהול מוזמנים</Text>
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
            const cols = width < 320 ? 1 : width < 520 ? 2 : width < 900 ? 3 : 4;

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
                        <KPI theme={theme} S={S} label={it.label} value={it.value} tint={it.tint} isText={it.isText} />
                        {idx !== row.length - 1 && <View style={S.kpiSpacer} />}
                      </React.Fragment>
                    ))}

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

          {/* ✅ Recent logins ticker */}
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <RecentLoginsTicker
              theme={theme}
              items={recentLogins}
              onPick={(uid, eventId) => {
                searchRef.current?.setText?.(eventId);
                searchRef.current?.focus?.();
              }}
            />
          </View>

          {/* ❌ TrafficOverview REMOVED */}
        </AnimatedHeader>

        <View style={S.toolbar}>
          <SearchBox
            ref={searchRef}
            theme={theme}
            S={S}
            placeholder="חיפוש: שם אירוע / תאריך / מיקום / קטגוריה / uid / eventId / plan"
            onDebouncedChange={setSearchTerm}
            debounceMs={350}
          />

          <View style={S.viewToggleRow}>
            <TogglePill
              theme={theme}
              S={S}
              label="🖼️ גלריה"
              active={cardsView === 'gallery'}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setCardsView('gallery');
              }}
            />
            <TogglePill
              theme={theme}
              S={S}
              label="📝 רשימה"
              active={cardsView === 'list'}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setCardsView('list');
              }}
            />
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
    cardsView,
    totalEvents,
    newToday,
    newWeek,
    newMonth,
    totalTrafficMB,
    totalReadMB,
    totalWriteMB,
    totalUploadMB,
    sortLabel,
    sortBy,
    planFilter,
    loginsToday,
    logins7d,
    recentLogins,
    width,
  ]);

  return (
    <View style={S.screen}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.topBar} />

      {/* Top Bar */}
      <View style={S.topBar}>
        <View style={S.topRightActions}>
          <ScaleBtn onPress={adminLogout} style={[S.topBtn, { backgroundColor: '#991B1B' }]}>
            <Text style={S.topBtnText}>🚪 יציאה</Text>
          </ScaleBtn>
        </View>

        <View style={S.topTitles} pointerEvents="none">
          <Text style={S.title}>ברוך הבא צוות תמיכה</Text>
          <Text style={S.now}>{nowText}</Text>
        </View>

        {!isPhone && <View style={{ width: 100 }} />}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 10, color: theme.text }}>טוען נתונים...</Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={renderCard}
        />
      )}
    </View>
  );
}
