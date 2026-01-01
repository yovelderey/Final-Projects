// OwnerDashboard.js – Pro Edition (Fixed Grid, Left Ticker, Impersonate & Focus User)
// Users Manager, Back handling, merged users, recent logins with date+time,
// KPIs (read/write/upload), traffic chart kind picker, sticky equal-width cards,
// Impersonate button per user, person-button per event to open Users and focus the owner card.

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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';

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

// ==== Hashing (expo-crypto נטען דינמית כדי לא לשבור web אם לא מותקן) ====
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
const todayISO = () => new Date().toISOString().slice(0, 10);

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

// ==== Extras Utils ====
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const avg = (arr) => (arr?.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
const maxArr = (arr) => (arr?.length ? arr.reduce((m, x) => (x > m ? x : m), -Infinity) : 0);
const palette = ['#6C63FF', '#22C55E', '#0EA5E9', '#F59E0B', '#EF4444', '#14B8A6', '#A78BFA'];
const serverColor = (name, i = 0) => palette[Math.abs((name?.length || 0) + i) % palette.length];

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

// ==== Analytics – percentiles, rolling, deltas, anomalies, SLA rules ====
function percentile(arr = [], p = 0.95) {
  if (!arr?.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))));
  return a[idx];
}

function zScore(series = [], win = 12) {
  if (!series?.length) return [];
  const out = [];
  let sum = 0,
    sum2 = 0;
  const q = [];
  for (let i = 0; i < series.length; i++) {
    const v = Number(series[i] || 0);
    q.push(v);
    sum += v;
    sum2 += v * v;
    if (q.length > win) {
      const r = q.shift();
      sum -= r;
      sum2 -= r * r;
    }
    const nn = q.length;
    const mean = sum / nn;
    const std = Math.sqrt(Math.max(1e-9, sum2 / nn - mean * mean));
    out.push((v - mean) / (std || 1));
  }
  return out;
}

function trendDelta(curr = [], prev = []) {
  const m1 = curr?.length ? curr.reduce((s, x) => s + x, 0) / curr.length : 0;
  const m0 = prev?.length ? prev.reduce((s, x) => s + x, 0) / prev.length : 0;
  const delta = m1 - m0;
  const pct = m0 ? delta / m0 : m1 ? 1 : 0;
  return { m0, m1, delta, pct };
}

const DEFAULT_SLA = {
  perMinWarn: 20,
  perMinCrit: 27,
  heartbeatSecWarn: 30,
  heartbeatSecCrit: 90,
  zAbsWarn: 2.0,
  zAbsCrit: 3.2,
};

function buildServerAlerts({
  metaByName,
  rates,
  series,
  capPerMin,
  nowTs = Date.now(),
  sla = DEFAULT_SLA,
}) {
  const alerts = [];
  const keys = Object.keys(metaByName || {});
  for (const name of keys) {
    const meta = metaByName[name] || {};
    const enabled = meta.enabled !== false;

    const lastISO = meta.last_sent || meta.updatedAt;
    let lastTs = 0;
    try {
      lastTs = lastISO ? new Date(lastISO).getTime() : 0;
    } catch {}

    const ageSec = lastTs ? Math.floor((nowTs - lastTs) / 1000) : 999999;
    const rateNow = Number(rates[name] || 0);

    const s = series[name] || [];
    const z = zScore(s, Math.min(24, Math.max(8, Math.floor(s.length / 3))));
    const zNow = z.length ? Math.abs(z[z.length - 1]) : 0;

    if (enabled && ageSec >= sla.heartbeatSecCrit) {
      alerts.push({ sev: 'critical', name, kind: 'heartbeat', msg: `אין דופק ${ageSec} שניות` });
    } else if (enabled && ageSec >= sla.heartbeatSecWarn) {
      alerts.push({ sev: 'warning', name, kind: 'heartbeat', msg: `דופק איטי (${ageSec}s)` });
    }

    if (rateNow >= sla.perMinCrit || rateNow >= capPerMin * 0.95) {
      alerts.push({ sev: 'critical', name, kind: 'capacity', msg: `קצב ${rateNow.toFixed(1)} הוד׳/ד׳ (כמעט תקרה)` });
    } else if (rateNow >= sla.perMinWarn) {
      alerts.push({ sev: 'warning', name, kind: 'capacity', msg: `קצב גבוה ${rateNow.toFixed(1)} הוד׳/ד׳` });
    }

    if (zNow >= sla.zAbsCrit) {
      alerts.push({ sev: 'critical', name, kind: 'anomaly', msg: `אנומליה חריגה (|z|=${zNow.toFixed(1)})` });
    } else if (zNow >= sla.zAbsWarn) {
      alerts.push({ sev: 'warning', name, kind: 'anomaly', msg: `אנומליה (|z|=${zNow.toFixed(1)})` });
    }
  }

  alerts.sort((a, b) =>
    a.sev === b.sev ? a.name.localeCompare(b.name) : a.sev === 'critical' ? -1 : 1
  );
  return alerts;
}

// ==== NEW: גריד שווה-שווה עם רוחב כרטיס קבוע ====
function useGridLayout(
  width,
  { minW = 260, maxW = 420, gap = 8, padH = 16, maxCols = 4 } = {}
) {
  const usable = Math.max(0, width - padH * 2);
  let numCols = Math.max(1, Math.min(maxCols, Math.floor((usable + gap) / (minW + gap))));
  while (numCols < maxCols) {
    const w = Math.floor((usable - (numCols - 1) * gap) / numCols);
    if (w <= maxW) break;
    numCols++;
  }
  const cardW = Math.min(maxW, Math.floor((usable - (numCols - 1) * gap) / numCols));
  return { numCols, cardW, gap, padH };
}

// ==== שמירת הערות למשתמש ====
const saveUserNotes = async (uid, notes) => {
  const db = firebase.database();
  const updates = {};
  updates[`users/${uid}/notes`] = String(notes || '');
  updates[`users/${uid}/notesUpdatedAt`] = Date.now();
  await db.ref().update(updates);
};

// ==== Header אנימטיבי ====
function AnimatedHeader({ children }) {
  const bg = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bg, {
          toValue: 1,
          duration: 5500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(bg, {
          toValue: 0,
          duration: 5500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();

    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    return () => loop.stop();
  }, [bg, slide, fade]);

  const bgColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EEF2FF', '#E0F2FE'],
  });

  return (
    <Animated.View
      style={[
        styles.headerWrap,
        { backgroundColor: bgColor, transform: [{ translateY: slide }], opacity: fade },
      ]}
    >
      <View pointerEvents="none" style={styles.headerDecor}>
        <View style={styles.circle} />
        <View style={[styles.circle, { right: 40, top: 28, width: 80, height: 80, opacity: 0.08 }]} />
      </View>
      {children}
    </Animated.View>
  );
}

// ==== תרשים תעבורה ====
function TrafficOverview({ buckets }) {
  const [tab, setTab] = useState('minute');
  const [kind, setKind] = useState('total'); // read|write|upload|total
  const [series, setSeries] = useState([]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const heightPx = 120;

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
    ? Math.max(2, Math.floor((Math.min(980, series.length * 10) - 30) / series.length))
    : 8;

  return (
    <View style={st.toWrap}>
      <View style={[st.toHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          {tabs.map((t) => (
            <TouchableOpacity key={t.k} onPress={() => setTab(t.k)} style={[st.toTab, tab === t.k && st.toTabActive]}>
              <Text style={[st.toTabText, tab === t.k && st.toTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          {kinds.map((k) => (
            <TouchableOpacity key={k.k} onPress={() => setKind(k.k)} style={[st.toTab, kind === k.k && st.toTabActive]}>
              <Text style={[st.toTabText, kind === k.k && st.toTabTextActive]}>{k.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View
        style={[st.chartBox, { width: '100%', height: heightPx }]}
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
            const color =
              kind === 'read'
                ? active ? '#6366F1' : '#A5B4FC'
                : kind === 'write'
                ? active ? '#F43F5E' : '#FDA4AF'
                : kind === 'upload'
                ? active ? '#0EA5E9' : '#7DD3FC'
                : active ? '#6C63FF' : '#A78BFA';

            return (
              <View
                key={p.k}
                style={{
                  width: barW,
                  height: h,
                  marginRight: 2,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: color,
                }}
              />
            );
          })}
        </View>

        {hoverIdx != null && series[hoverIdx] && (
          <>
            <View style={{ position: 'absolute', left: 10 + hoverIdx * (barW + 2), top: 0, bottom: 0, width: 2, backgroundColor: '#6C63FF33' }} />
            <View style={{ position: 'absolute', left: Math.max(6, 10 + hoverIdx * (barW + 2) - 60), top: 6, backgroundColor: '#fff', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111', textAlign: 'center' }}>{series[hoverIdx].k}</Text>
              <Text style={{ fontSize: 12, color: '#374151', textAlign: 'center' }}>{series[hoverIdx].mb.toFixed(2)} MB</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ==== טיקר התחברויות אחרונות ====
function RecentLoginsTicker({ items = [], onPick }) {
  const itemW = 260;
  const gap = 12;
  const speed = 45;

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
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6E9F5',
        backgroundColor: '#ffffff',
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', textAlign: 'left', paddingHorizontal: 10, marginBottom: 4 }}>
        התחברויות אחרונות
      </Text>

      <View style={{ height: 38, alignItems: 'flex-start' }}>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ translateX: x }] }}>
          {data.map((it, i) => {
            const d = new Date(it.ts);
            const dateStr = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const timeStr = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
            return (
              <TouchableOpacity
                key={`${it.uid}_${it.eventId}_${i}`}
                onPress={() => onPick?.(it.uid, it.eventId)}
                activeOpacity={0.85}
                style={{
                  width: itemW,
                  marginRight: gap,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#C7D2FE',
                  backgroundColor: '#EEF2FF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: '#312E81', fontWeight: '800' }} numberOfLines={1}>
                  {it.eventName || '(ללא שם)'}
                </Text>
                {!!it.location && (
                  <Text style={{ fontSize: 12, color: '#475569', marginHorizontal: 6 }} numberOfLines={1}>
                    • {it.location}
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  • {dateStr} {timeStr}
                </Text>
              </TouchableOpacity>
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

// ✅ התחברות פר־אירוע (קורא מ-users/<uid>/adminCreds)
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

// ==== Rates (device_server) ====
function useDeviceServerRates({ windowMs = 60_000, pollMs = 2000, capPerMin = 30 } = {}) {
  const [rates, setRates] = useState({});
  const [series, setSeries] = useState({});
  const historyRef = useRef({});
  const [serverKeys, setServerKeys] = useState([]);

  useEffect(() => {
    const ref = firebase.database().ref('device_server');
    const off = ref.on('value', (snap) => {
      const val = snap.val() || {};
      const keys = Object.keys(val)
        .filter((k) => /^server_\d+$/.test(k))
        .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
      setServerKeys(keys);

      const now = Date.now();
      const iso = todayISO();

      keys.forEach((k) => {
        const daily = Number(val[k]?.day?.[iso] || 0);
        const lastSent = String(val[k]?.last_sent || '');

        const hist = (historyRef.current[k] = historyRef.current[k] || []);
        hist.push({ ts: now, count: daily });

        const prevPulse = hist.__lastPulse || '';
        if (lastSent && lastSent !== prevPulse) {
          hist.__lastPulse = lastSent;
          hist.push({ ts: now + 1, count: daily + 0.01 });
        }

        historyRef.current[k] = hist.filter((s) => now - s.ts <= windowMs + 5000);
      });
    });
    return () => {
      try {
        firebase.database().ref('device_server').off('value', off);
      } catch {}
    };
  }, [windowMs]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const nextRates = {};
      const nextSeries = {};
      const minsSinceMidnight = Math.max(
        1,
        Math.floor((now - new Date(todayISO()).getTime()) / 60000)
      );

      for (const [k, samples] of Object.entries(historyRef.current)) {
        if (!samples?.length) continue;

        const latest = samples[samples.length - 1];

        const approxPerMin = clamp(Number(latest.count || 0) / minsSinceMidnight, 0, capPerMin);

        let instPerMin = 0;
        if (samples.length >= 2) {
          const a = samples[samples.length - 2];
          const b = samples[samples.length - 1];
          const dtMin2 = Math.max(1e-6, (b.ts - a.ts) / 60000);
          const dc2 = Math.max(0, b.count - a.count);
          instPerMin = clamp(dc2 / dtMin2, 0, capPerMin);
        }

        const dailyMax = 0.3;
        const dailyW = Math.max(0, Math.min(dailyMax, (windowMs / (30 * 60 * 1000)) * dailyMax));
        const blended = instPerMin * (1 - dailyW) + approxPerMin * dailyW;
        nextRates[k] = blended;

        const dens = 30;
        const step = windowMs / dens;
        const pts = [];
        for (let i = 0; i < dens; i++) {
          const t0 = now - windowMs + i * step;
          let before = samples[0],
            after = samples[samples.length - 1];
          for (let j = 0; j < samples.length; j++) {
            if (samples[j].ts <= t0) before = samples[j];
            if (samples[j].ts >= t0) {
              after = samples[j];
              break;
            }
          }
          const dtMin = Math.max(1e-6, (after.ts - before.ts) / 60000);
          const dc = Math.max(0, after.count - before.count);
          const inst = clamp(dc / dtMin, 0, capPerMin);
          pts.push(inst * 0.7 + approxPerMin * 0.3);
        }
        nextSeries[k] = pts;
      }

      setRates(nextRates);
      setSeries(nextSeries);
    }, pollMs);

    return () => clearInterval(t);
  }, [pollMs, windowMs, capPerMin]);

  return { rates, series, serverKeys };
}

// ==== ECG Strip ====
function ServerECGStrip({ name, value, maxValue = 30, height = 96, color, seriesSamples = [] }) {
  const PAD_H = 10;
  const PAD_TOP = 6;
  const PAD_BOTTOM = 6;
  const usableH = Math.max(8, height - PAD_TOP - PAD_BOTTOM);

  const samples = Array.isArray(seriesSamples) && seriesSamples.length ? seriesSamples : [Number(value) || 0];

  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const maxY = Math.max(1, p95 || 1, maxValue * 0.5);

  const barW = Math.max(2, Math.min(8, Math.floor((300 - (samples.length - 1) * 2) / Math.max(1, samples.length))));
  const boxH = height;

  return (
    <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: 0.9 }} />
          <Text style={{ fontWeight: '900', color: '#0f172a' }}>{name}</Text>
        </View>
        <Text style={{ fontWeight: '800', color: '#334155' }}>
          {(Number(samples[samples.length - 1]) || 0).toFixed(1)} / {maxValue} הוד׳/דקה
        </Text>
      </View>

      <View style={{ height: boxH, backgroundColor: '#F9FAFF', borderTopWidth: 1, borderTopColor: '#EEF2FF' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <View key={p} style={{ position: 'absolute', left: 0, right: 0, bottom: Math.round(p * boxH), height: 1, backgroundColor: '#EAF0FF' }} />
          ))}
        </View>

        <View style={{ position: 'absolute', left: PAD_H, right: PAD_H, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' }}>
          {samples.map((v, i) => {
            const ratio = Math.max(0, Math.min(1, (Number(v) || 0) / maxY));
            const h = Math.max(2, Math.round(ratio * usableH));
            return (
              <View
                key={i}
                style={{
                  width: barW,
                  height: h,
                  marginRight: 2,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  backgroundColor: color,
                  opacity: i === samples.length - 1 ? 1 : 0.75,
                  alignSelf: 'flex-end',
                  marginBottom: PAD_BOTTOM,
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
// ==== Plan → main_sms calculator ====
const PLAN_MAIN_SMS_MULT = {
  digital: 4,
  basic: 2,
  plus: 4,
  premium: 4,
  // premium: 2.8,
  // complementary: 0,
};

function calcMainSms(numberOfGuests, plan) {
  const g = Number(numberOfGuests || 0);
  const mult = Number(PLAN_MAIN_SMS_MULT[String(plan || '').toLowerCase()] ?? 1);
  // עיגול למעלה כדי לא לחתוך
  return Math.ceil(g * mult);
}

const WINDOW_PRESETS = [
  { label: '1 דק׳', sec: 60 },
  { label: '3 דק׳', sec: 180 },
  { label: '5 דק׳', sec: 300 },
  { label: '15 דק׳', sec: 900 },
  { label: '30 דק׳', sec: 1800 },
  { label: 'שעה', sec: 3600 },
  { label: '12 שעות', sec: 43200 },
  { label: 'יום', sec: 86400 },
  { label: 'שבוע', sec: 604800 },
  { label: 'חודש', sec: 2592000 },
];

function WindowPresets({ windowSec, setWindowSec }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 10, gap: 8 }}
      style={{ marginTop: 8 }}
    >
      {WINDOW_PRESETS.map((p) => {
        const active = windowSec === p.sec;
        return (
          <TouchableOpacity
            key={p.sec}
            onPress={() => setWindowSec(p.sec)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? '#5B6BFF' : '#E5E7EB',
              backgroundColor: active ? '#EEF2FF' : '#FFFFFF',
            }}
          >
            <Text style={{ fontWeight: '800', color: active ? '#3749FF' : '#334155' }}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function MiniWindowButtons({ windowSec, onPick }) {
  const options = [60, 180, 300, 900, 1800, 3600, 43200, 86400, 604800, 2592000];
  const labels = ['1ד׳', '3ד׳', '5ד׳', '15ד׳', '30ד׳', '1ש׳', '12ש׳', 'יום', 'שבוע', 'חודש'];
  return (
    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {options.map((sec, i) => {
        const active = windowSec === sec;
        return (
          <TouchableOpacity
            key={sec}
            onPress={() => onPick?.(sec)}
            style={{
              height: 28,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? '#5B6BFF' : '#E5E7EB',
              backgroundColor: active ? '#EEF2FF' : '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#3749FF' : '#334155' }}>
              {labels[i]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ServerCard({
  name,
  meta,
  rate,
  series,
  capPerMin,
  onReset,
  onToggle,
  color,
  windowSec,
  onChangeWindowSec,
}) {
  const enabled = meta?.enabled !== false;
  const count = Number(meta?.count || 0);
  const date = String(meta?.date || '');
  const updatedAt = meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString('he-IL') : '—';
  const rArr = Array.isArray(series) ? series : [];
  const mean = avg(rArr);
  const peak = maxArr(rArr);

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 10, marginTop: 8 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: enabled ? '#10B981' : '#EF4444' }} />
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>{name}</Text>
          {meta?.updatedAt && Date.now() - meta.updatedAt < 10000 && (
            <View style={{ marginStart: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F43F5E' }} />
          )}
        </View>

        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          <TouchableOpacity
            onPress={() => onReset(name)}
            style={{ backgroundColor: '#111827', paddingHorizontal: 12, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>אפס מונה</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onToggle(name, !enabled)}
            style={{ backgroundColor: enabled ? '#EF4444' : '#22C55E', paddingHorizontal: 12, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>{enabled ? 'השבת' : 'הפעל'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <MiniWindowButtons windowSec={windowSec} onPick={onChangeWindowSec} />

      <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <View style={{ flexGrow: 1, minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: color + '55', backgroundColor: color + '12', paddingVertical: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#334155' }}>קצב נוכחי</Text>
          {(() => {
            const r = Number(rate) || 0;
            const txt = r > 0 && r < 0.1 ? '~0.1' : r.toFixed(2);
            return (
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                {txt} / {capPerMin}
              </Text>
            );
          })()}
        </View>

        <View style={{ flexGrow: 1, minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: '#A1A1AA55', backgroundColor: '#F8FAFF', paddingVertical: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#334155' }}>ממוצע ({windowSec}s)</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{mean.toFixed(1)}</Text>
        </View>

        <View style={{ flexGrow: 1, minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: '#A1A1AA55', backgroundColor: '#FFF7ED', paddingVertical: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#9A3412' }}>שיא ({windowSec}s)</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#7C2D12' }}>{(Number.isFinite(peak) ? peak : 0).toFixed(1)}</Text>
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <ServerECGStrip
          name={`ECG – ${name}`}
          value={Number(rate) || 0}
          maxValue={capPerMin}
          height={96}
          color={color}
          seriesSamples={rArr}
        />
      </View>

      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
        <Text style={{ color: '#6b7280' }}>
          תאריך מונה: <Text style={{ color: '#111', fontWeight: '800' }}>{date || '—'}</Text>
        </Text>
        <Text style={{ color: '#6b7280' }}>
          כמות יומית: <Text style={{ color: '#111', fontWeight: '800' }}>{count.toLocaleString('he-IL')}</Text>
        </Text>
        <Text style={{ color: '#6b7280' }}>
          עודכן: <Text style={{ color: '#111', fontWeight: '700' }}>{updatedAt}</Text>
        </Text>
      </View>
    </View>
  );
}

function AverageMonitorCard({ names = [], rates = {}, capPerMin = 30 }) {
  const active = names.filter((n) => n !== 'server_6');
  const vals = active.map((n) => Number(rates[n] || 0));
  const mean = vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : 0;
  const peak = vals.length ? Math.max(...vals) : 0;
  const totalCap = capPerMin * active.length;
  const totalNow = vals.reduce((s, x) => s + x, 0);
  const pct = totalCap ? Math.min(1, totalNow / totalCap) : 0;

  return (
    <View style={{ marginTop: 8, marginBottom: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E6E9F5', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', textAlign: 'right', color: '#0f172a' }}>
          מוניטור ממוצע – כל השרתים הפעילים
        </Text>

        <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFF', paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#334155' }}>קצב ממוצע</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{mean.toFixed(1)} הוד׳/דקה</Text>
          </View>

          <View style={{ flexGrow: 1, minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFF7ED', paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#9A3412' }}>שיא מיידי</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#7C2D12' }}>{peak.toFixed(1)}</Text>
          </View>

          <View style={{ flexGrow: 1, minWidth: 160, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 11, color: '#334155', textAlign: 'right' }}>תפוקה כוללת כרגע</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>
              {totalNow.toFixed(1)} / {totalCap} הוד׳/דקה
            </Text>
            <View style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden', marginTop: 6 }}>
              <View style={{ width: `${(pct * 100).toFixed(1)}%`, height: '100%', backgroundColor: '#6C63FF' }} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ==== UsersManager – helpers ====
const KPIMini = ({ label, value }) => (
  <View style={UM.kpiMini}>
    <Text style={UM.kpiMiniK}>{label}</Text>
    <Text style={UM.kpiMiniV}>{Number(value || 0).toLocaleString('he-IL')}</Text>
  </View>
);

const TinyRow = ({ k, v, mono, withToggle, onToggle, copy, copyVal }) => (
  <View style={UM.rowTiny}>
    <Text style={UM.kTiny}>{k}:</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '70%' }}>
      <Text
        style={[UM.vTiny, mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}
        numberOfLines={1}
      >
        {v}
      </Text>

      {withToggle && (
        <TouchableOpacity onPress={onToggle} style={UM.tinyAct}>
          <Text style={UM.tinyActTxt}>הצג/הסתר</Text>
        </TouchableOpacity>
      )}

      {copy && (
        <TouchableOpacity onPress={() => copyToClipboard(v)} style={UM.tinyAct}>
          <Text style={UM.tinyActTxt}>העתק</Text>
        </TouchableOpacity>
      )}

      {!!copyVal && !copy && (
        <TouchableOpacity onPress={() => copyToClipboard(copyVal)} style={UM.tinyAct}>
          <Text style={UM.tinyActTxt}>העתק</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ==== UsersManager ====
function UsersManager({
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
  const { numCols, cardW, gap, padH } = useGridLayout(width, { maxCols: 4 });
  const nav = useNavigation();

  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const [filter, setFilter] = useState('all'); // all | active | disabled
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState({ uid: '', username: '', password: '' });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  const openEdit = (user) => {
    setEdit({ uid: user.uid, username: user.username || '', password: '' });
    setShowModal(true);
  };

  const closeEdit = () => {
    setShowModal(false);
    setEdit({ uid: '', username: '', password: '' });
  };

  const handleSave = async () => {
    const uid = String(edit.uid || '').trim();
    const username = String(edit.username || '').trim();
    const password = String(edit.password || '');
    if (!uid) return Alert.alert('שגיאה', 'חסר UID');
    if (!username) return Alert.alert('שגיאה', 'יש להזין שם משתמש');
    if (!password) return Alert.alert('שגיאה', 'יש להזין סיסמה');
    try {
      await onSaveCreds(uid, username, password);
      Alert.alert('נשמר', 'פרטי ההתחברות עודכנו.');
      closeEdit();
    } catch (e) {
      Alert.alert('שגיאה', e?.message || 'נכשל עדכון פרטי התחברות.');
    }
  };

  // התחבר כמשתמש (impersonate)
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

  // פוקוס כרטיס לפי focusUid
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
    <View style={UM.header}>
      <Text style={UM.hTitle}>ניהול משתמשים</Text>

      <View style={UM.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="חיפוש: שם / אימייל / UID / שם משתמש…"
          placeholderTextColor="#9AA3AC"
          style={UM.search}
          textAlign="right"
        />
        <View style={UM.filters}>
          {['all', 'active', 'disabled'].map((k) => (
            <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[UM.pill, filter === k && UM.pillOn]}>
              <Text style={[UM.pillTxt, filter === k && UM.pillTxtOn]}>
                {k === 'all' ? 'הכל' : k === 'active' ? 'פעילים' : 'מושבתים'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={UM.kpis}>
        <KPIMini label="סה״כ" value={list.length} />
        <KPIMini label="פעילים" value={list.filter((x) => !x.disabled).length} />
        <KPIMini label="מושבתים" value={list.filter((x) => x.disabled).length} />
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
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
      <View
        style={[
          UM.card,
          item.disabled && UM.cardDisabled,
          { width: cardW },
          isHighlighted && {
            borderColor: '#10B981',
            borderWidth: 2,
            shadowColor: '#10B981',
            shadowOpacity: 0.25,
            shadowRadius: 8,
          },
        ]}
      >
        <View style={UM.head}>
          <View style={UM.avatar}>
            <Text style={UM.avatarTxt}>{initials}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={UM.name} numberOfLines={1}>
              {item.displayName || '—'}
            </Text>
            <Text style={UM.email} numberOfLines={1}>
              {item.email || '—'}
            </Text>
          </View>
        </View>

        <TinyRow k="UID" v={item.uid} copy />
        <TinyRow k="שם משתמש" v={item.email || '—'} />
        <TinyRow
          k="סיסמה"
          v={pwdShown ? item.password || '—' : item.password ? '••••••' : '—'}
          onToggle={onTogglePwd}
          withToggle
          copyVal={item.password || ''}
        />
        <TinyRow k="# אירועים" v={String(item.eventsCount)} />
        <TinyRow k="נוצר" v={fmtHebDateTime(item.createdAt)} />

        <View style={UM.rowTiny}>
          <Text style={UM.kTiny}>סטטוס:</Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View style={[UM.status, item.disabled ? UM.off : UM.on]}>
              <Text style={UM.statusTxt}>{item.disabled ? 'מושבת' : 'פעיל'}</Text>
            </View>
            {item.disabled && !!item.disabledReason && <Text style={UM.reasonInCard}>({item.disabledReason})</Text>}
          </View>
        </View>

        <View style={UM.actions}>
          <TouchableOpacity onPress={() => onDisableToggle(item.uid)} style={[UM.btn, item.disabled ? UM.btnEnable : UM.btnDanger]}>
            <Text style={UM.btnTxt}>{item.disabled ? 'הפעל' : 'השבת'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openEdit(item)} style={[UM.btn, UM.btnInfo]} activeOpacity={0.9}>
            <Text style={UM.btnTxt}>עדכן כניסה</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onOpenUserEventsModal?.(item.uid)} style={[UM.btn, UM.btnInfo]} activeOpacity={0.9}>
            <Text style={UM.btnTxt}>שמות אירועים</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => impersonateLogin(item)} style={[UM.btn, UM.btnImpersonate]} activeOpacity={0.9}>
            <Text style={UM.btnTxt}>התחבר כמשתמש</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onShowUserEvents?.(item.uid)} style={[UM.btn, { backgroundColor: '#0F766E' }]} activeOpacity={0.9}>
            <Text style={UM.btnTxt}>הצג במסך האירועים</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onDeleteUser?.(item)} style={[UM.btn, { backgroundColor: '#7F1D1D' }]} activeOpacity={0.9}>
            <Text style={UM.btnTxt}>מחק משתמש</Text>
          </TouchableOpacity>
        </View>

        <Text style={UM.label}>הערות</Text>
        <TextInput
          value={notesDraft[item.uid] ?? ''}
          onChangeText={onChangeNotes}
          placeholder="הערות פנימיות…"
          placeholderTextColor="#9AA3AC"
          style={UM.notes}
          multiline
          textAlign="right"
        />
        <View style={UM.notesBar}>
          <TouchableOpacity onPress={saveNotesClick} style={[UM.btn, UM.btnInfo, UM.btnSaveNotes]} activeOpacity={0.9}>
            <Text style={UM.btnTxt}>שמור</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <FlatList
        ref={listRef}
        data={list}
        key={'users_grid_' + numCols}
        numColumns={numCols}
        keyExtractor={(it) => it.uid}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingHorizontal: padH, paddingVertical: 10, rowGap: gap }}
        columnWrapperStyle={numCols > 1 ? { columnGap: gap, justifyContent: 'flex-start' } : undefined}
        renderItem={renderItem}
        onScrollToIndexFailed={(info) => {
          try {
            listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
            setTimeout(() => listRef.current?.scrollToIndex?.({ index: info.index, animated: true }), 300);
          } catch {}
        }}
      />

      {/* Modal עריכת כניסה */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ width: '100%' }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>עדכון פרטי התחברות</Text>
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                <TextInput value={edit.uid} editable={false} style={[styles.input, { opacity: 0.8 }]} textAlign="right" />
                <TextInput placeholder="שם משתמש" value={edit.username} onChangeText={(t) => setEdit((s) => ({ ...s, username: t }))} style={styles.input} textAlign="right" />
                <TextInput placeholder="סיסמה" value={edit.password} onChangeText={(t) => setEdit((s) => ({ ...s, password: t }))} style={styles.input} secureTextEntry textAlign="right" />
              </ScrollView>
              <View style={[styles.actionsRow, { marginTop: 10 }]}>
                <TouchableOpacity onPress={handleSave} style={[styles.actionBtn, { backgroundColor: '#22C55E' }]}>
                  <Text style={[styles.actionText, { color: '#fff' }]}>שמור</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeEdit} style={[styles.actionBtn, { backgroundColor: '#9CA3AF' }]}>
                  <Text style={[styles.actionText, { color: '#fff' }]}>ביטול</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// ==== DeviceMonitorsPane ====
function DeviceMonitorsPane() {
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const [capPerMin, setCapPerMin] = useState(30);
  const [windowSec, setWindowSec] = useState(300);
  const [rawDevice, setRawDevice] = useState({});
  const iso = todayISO();

  useEffect(() => {
    const ref = firebase.database().ref('device_server');
    const off = ref.on('value', (snap) => setRawDevice(snap.val() || {}));
    return () => {
      try {
        ref.off('value', off);
      } catch {}
    };
  }, []);

  const { rates, series } = useDeviceServerRates({
    windowMs: Math.max(5, windowSec) * 1000,
    pollMs: 2000,
    capPerMin: Math.max(1, capPerMin),
  });

  const keys = Array.from({ length: 6 }, (_, i) => `server_${i + 1}`);

  const metaByName = useMemo(() => {
    const m = {};
    keys.forEach((k) => (m[k] = rawDevice?.[k] || {}));
    return m;
  }, [rawDevice, keys]);

  const enabledList = keys.filter((n) => n !== 'server_6' && metaByName[n].enabled !== false);
  const disabledList = keys.filter((n) => !enabledList.includes(n));

  const avgSeries = useMemo(() => {
    const k = enabledList;
    const len = Math.max(...k.map((n) => (series[n] || []).length), 0);
    return Array.from({ length: len }, (_, i) => {
      const vals = k.map((n) => (series[n] || [])[i]).filter((v) => typeof v === 'number');
      return vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : 0;
    });
  }, [series, enabledList]);

  const dayTotal = keys.reduce((s, n) => s + Number(rawDevice?.[n]?.day?.[iso] || 0), 0);
  const totalRateNow = enabledList.reduce((s, n2) => s + Number(rates[n2] || 0), 0);
  const overallRateMean = enabledList.length ? totalRateNow / enabledList.length : 0;
  const totalCapNow = Math.max(1, capPerMin) * Math.max(1, enabledList.length);
  const utilization = totalCapNow ? Math.min(1, totalRateNow / totalCapNow) : 0;

  const alerts = buildServerAlerts({
    metaByName,
    rates,
    series,
    capPerMin,
    sla: DEFAULT_SLA,
  });

  const displayKeys = onlyEnabled
    ? keys.filter((n2) => n2 !== 'server_6' && metaByName[n2].enabled !== false)
    : keys;

  const resetDaily = async (name) => {
    await firebase.database().ref(`device_server/${name}/day/${iso}`).set(0);
    await firebase.database().ref(`device_server/${name}/last_sent`).set(new Date().toISOString());
    Alert.alert('עודכן', `איפוס ספירת היום ל-${name}.`);
  };

  const toggleEnabled = async (name, on) => {
    await firebase.database().ref(`device_server/${name}/enabled`).set(!!on);
    await firebase.database().ref(`device_server/${name}/updatedAt`).set(firebase.database.ServerValue.TIMESTAMP);
    Alert.alert('עודכן', on ? 'השרת הופעל' : 'השרת הושבת');
  };

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 24 }}>
      {/* סיכום + ECG ממוצע */}
      <AverageMonitorCard names={enabledList} rates={rates} capPerMin={capPerMin} />

      <View style={{ marginTop: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E6E9F5', backgroundColor: '#FFFFFF', padding: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', textAlign: 'right', color: '#0f172a', marginBottom: 6 }}>
          ECG ממוצע – כל השרתים הפעילים
        </Text>
        <ServerECGStrip name="ECG – ממוצע" value={overallRateMean} maxValue={capPerMin} height={96} color={'#6C63FF'} seriesSamples={avgSeries} />
      </View>

      {/* Alerts */}
      {alerts?.length ? (
        <View style={{ marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#fff', padding: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '900', textAlign: 'right', color: '#0f172a', marginBottom: 6 }}>התראות פעילות</Text>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
            {alerts.slice(0, 12).map((a, i) => (
              <View
                key={i}
                style={{
                  paddingHorizontal: 10,
                  height: 30,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: a.sev === 'critical' ? '#FCA5A5' : '#FDE68A',
                  backgroundColor: a.sev === 'critical' ? '#FEE2E2' : '#FEF9C3',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: a.sev === 'critical' ? '#7F1D1D' : '#7A5C00', fontWeight: '800' }}>
                  {a.name} • {a.msg}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Controls */}
      <View style={{ marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E6E9F5', backgroundColor: '#FFFFFF', padding: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', textAlign: 'right', color: '#0f172a', marginBottom: 6 }}>
          הגדרות חישוב • סיכום • פעולות
        </Text>

        <WindowPresets windowSec={windowSec} setWindowSec={setWindowSec} />

        <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#374151', fontWeight: '800' }}>תקרה (הודעות/דקה):</Text>
            <TextInput
              value={String(capPerMin)}
              onChangeText={(t) => setCapPerMin(Math.max(1, Number(t || 0)))}
              keyboardType="numeric"
              style={{ width: 90, height: 36, borderWidth: 1, borderColor: '#D6DAE6', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, textAlign: 'center' }}
              placeholder="30"
              placeholderTextColor="#9AA3AC"
            />
          </View>

          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#374151', fontWeight: '800' }}>חלון (שניות):</Text>
            <TextInput
              value={String(windowSec)}
              onChangeText={(t) => setWindowSec(Math.max(5, Number(t || 0)))}
              keyboardType="numeric"
              style={{ width: 90, height: 36, borderWidth: 1, borderColor: '#D6DAE6', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, textAlign: 'center' }}
              placeholder="60"
              placeholderTextColor="#9AA3AC"
            />
          </View>

          <TouchableOpacity
            onPress={() => setOnlyEnabled((v) => !v)}
            style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: onlyEnabled ? '#6C63FF' : '#D6DAE6', backgroundColor: onlyEnabled ? '#EEF2FF' : '#fff', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontWeight: '800', color: onlyEnabled ? '#312E81' : '#111' }}>
              {onlyEnabled ? 'מציג: פעילים' : 'מציג: כולם'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFF', paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#334155' }}>שרתים פעילים</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{enabledList.length}</Text>
          </View>

          <View style={{ flexGrow: 1, minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2', paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#991B1B' }}>שרתים מושבתים</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#7F1D1D' }}>{disabledList.length}</Text>
          </View>

          <View style={{ flexGrow: 1, minWidth: 160, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 11, color: '#334155', textAlign: 'right' }}>תפוקה כוללת כרגע</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>
              {totalRateNow.toFixed(1)} / {totalCapNow} הוד׳/דקה
            </Text>
            <View style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden', marginTop: 6 }}>
              <View style={{ width: `${(utilization * 100).toFixed(1)}%`, height: '100%', backgroundColor: '#22C55E' }} />
            </View>
          </View>

          <View style={{ flexGrow: 1, minWidth: 160, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 11, color: '#334155', textAlign: 'right' }}>סך הודעות היום</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>
              {dayTotal.toLocaleString('he-IL')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row-reverse', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={async () => {
              const ok = Platform.OS === 'web' ? window.confirm('לאפס את המונה היומי לכל השרתים?') : true;
              if (!ok) return;
              await Promise.all(keys.map((k) => firebase.database().ref(`device_server/${k}/day/${iso}`).set(0)));
              Alert.alert('בוצע', 'כל המונים אופסו להיום.');
            }}
            style={{ backgroundColor: '#111827', paddingHorizontal: 12, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>איפוס כל המונים</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Promise.all(keys.filter((k) => k !== 'server_6').map((k) => firebase.database().ref(`device_server/${k}/enabled`).set(true)));
              Alert.alert('בוצע', 'כל השרתים הופעלו.');
            }}
            style={{ backgroundColor: '#22C55E', paddingHorizontal: 12, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>הפעל הכל</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Promise.all(keys.filter((k) => k !== 'server_6').map((k) => firebase.database().ref(`device_server/${k}/enabled`).set(false)));
              Alert.alert('בוצע', 'כל השרתים הושבתו.');
            }}
            style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>השבת הכל</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid */}
      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {displayKeys.map((name, idx) => {
          const hardDisabled = name === 'server_6';
          const meta = rawDevice?.[name] || {};
          const enabled = hardDisabled ? false : meta.enabled !== false;
          const dayCount = Number(meta?.day?.[iso] || 0);
          const lastSent = meta?.last_sent || null;
          const color = serverColor(name, idx);

          return (
            <View key={name} style={{ width: '49%', marginBottom: 10 }}>
              <ServerCard
                name={name}
                meta={{
                  enabled,
                  count: dayCount,
                  date: iso,
                  updatedAt: lastSent ? new Date(lastSent).getTime() : undefined,
                }}
                rate={rates[name] || 0}
                series={series[name] || []}
                capPerMin={capPerMin}
                onReset={resetDaily}
                onToggle={(n2, on) => (hardDisabled ? Alert.alert('כבוי', 'server_6 מכובה לפי דרישה.') : toggleEnabled(n2, on))}
                color={color}
                windowSec={windowSec}
                onChangeWindowSec={setWindowSec}
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ==== UI atoms ====
const KPI = ({ label, value, tint = '#6C63FF', isText }) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, { color: tint }]} numberOfLines={1}>
      {isText ? String(value) : Number(value || 0).toLocaleString('he-IL')}
    </Text>
  </View>
);

const Row = ({ k, v, mono }) => (
  <View style={styles.rowX}>
    <Text style={styles.labelX}>{k}:</Text>
    <Text style={[styles.valueX, mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} numberOfLines={1}>
      {String(v ?? '')}
    </Text>
  </View>
);

const Stat = ({ k, v, tint }) => (
  <View style={[styles.stat, { borderColor: tint + '44', backgroundColor: tint + '11' }]}>
    <Text style={styles.statK}>{k}</Text>
    <Text style={[styles.statV, { color: tint }]}>{Number(v || 0).toLocaleString('he-IL')}</Text>
  </View>
);

const SortButton = ({ label, onPress, active }) => (
  <TouchableOpacity onPress={onPress} style={[styles.sortBtn, active && styles.sortBtnOn]}>
    <Text style={[styles.sortTxt, active && styles.sortTxtOn]}>{label}</Text>
  </TouchableOpacity>
);

const TogglePill = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillOn]}>
    <Text style={[styles.pillTxt, active && styles.pillTxtOn]}>{label}</Text>
  </TouchableOpacity>
);

// ==== המסך הראשי ====
export default function OwnerDashboard() {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const { numCols, cardW, gap, padH } = useGridLayout(width, { maxCols: 4 });

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
          second: '2-digit',
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

    // קורא כמות מוזמנים מהשדה Numberofguests
    let guests = 0;
    const guestsSnap = await baseRef.child('Numberofguests').once('value');
    guests = Number(guestsSnap.val() || 0);

    // אם אין/0 – ניסיון fallback (לא חובה, אבל מציל אותך במקרים שחסר השדה)
    if (!guests) {
      const g1 = await baseRef.child('guests').once('value');     // אם יש לך guests/{guestId}
      const g2 = await baseRef.child('contacts').once('value');   // אם יש contacts/{id}
      guests = Math.max(0, g1.numChildren?.() || 0, g2.numChildren?.() || 0);
    }

    const main_sms = calcMainSms(guests, plan);

    // עדכון אטומי
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

  const exportCSV = async () => {
    try {
      const rows = [
        ['uid','email','displayName','disabled','username','lastLoginEvent','eventId','eventName','eventDate','eventTime','location','category','plan','yes','maybe','no','pending','createdAt','trafficMB'],
        ...filtered.map((e) => {
          const um = userMetaByUid[e.uid] || {};
          const username = um.adminCreds?.username || '';
          return [
            e.uid,
            um.email || '',
            um.displayName || '',
            um.disabled ? 'true' : 'false',
            username,
            e.lastLoginEventTs ? new Date(e.lastLoginEventTs).toISOString() : '',
            e.eventId,
            e.eventName,
            e.eventDate,
            e.eventTime,
            e.eventLocation,
            e.eventCategory,
            e.plan,
            e.yes,
            e.maybe,
            e.no,
            e.pending,
            e.createdAt ? new Date(e.createdAt).toISOString() : '',
            e.trafficMB.toFixed(2),
          ];
        }),
      ];
      const csv = rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `owner_events_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const { default: FileSystem } = await import('expo-file-system');
        const { default: Sharing } = await import('expo-sharing');
        const uri = FileSystem.cacheDirectory + `owner_events_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri);
      }
    } catch {
      Alert.alert('שגיאה', 'נכשל ייצוא CSV');
    }
  };

  const exportJSON = async () => {
    try {
      const payload = { generatedAt: new Date().toISOString(), total: filtered.length, events: filtered, users: userMetaByUid };
      const json = JSON.stringify(payload, null, 2);

      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
        a.download = `owner_events_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const { default: FileSystem } = await import('expo-file-system');
        const { default: Sharing } = await import('expo-sharing');
        const uri = FileSystem.cacheDirectory + `owner_events_${Date.now()}.json`;
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri);
      }
    } catch {
      Alert.alert('שגיאה', 'נכשל ייצוא JSON');
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

  const renderCard = ({ item }) => {
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
      <View style={[styles.card, { width: cardW }, freshLogin && { borderColor: '#10B98199', backgroundColor: '#F0FFF7' }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.eventName || 'ללא שם'}
            </Text>
            <TouchableOpacity onPress={goToUsersAndFocus} style={styles.iconBtn} accessibilityLabel="פתח ניהול משתמשים לבעל האירוע">
              <Text style={styles.iconBtnText}>👤</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSub}>{item.eventLocation || '-'}</Text>
        </View>

        <Row k="תאריך אירוע" v={`${item.eventDate || '-'}${item.eventTime ? ` • ${item.eventTime}` : ''}`} />
        <Row k="קטגוריה" v={item.eventCategory || '-'} />
        <Row k="כמות מוזמנים" v={item.Numberofguests ?? 0} />
        <Row k="תוכנית" v={item.plan || '-'} />

        <View style={[styles.actionsRow, { marginTop: 4, flexWrap: 'wrap' }]}>
          {['basic', 'plus', 'digital', 'premium', 'complementary'].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setEventPlan(item.uid, item.eventId, p)}
              style={[styles.actionBtn, { backgroundColor: item.plan === p ? '#312E81' : '#CBD5E1' }]}
            >
              <Text style={[styles.actionText, { color: '#fff' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.rowX, { alignItems: 'center' }]}>
          <Text style={styles.labelX}>סטטוס בעלים:</Text>
          <View style={[UM.status, um?.disabled ? UM.off : UM.on, { height: 24, paddingHorizontal: 10 }]}>
            <Text style={UM.statusTxt}>{um?.disabled ? 'מושבת' : 'משתמש פעיל'}</Text>
          </View>
        </View>

        <Row k="UID" v={item.uid} mono />
        <Row k="אירוע" v={item.eventId} mono />
        <Row
          k="התחברות אחרונה (אירוע)"
          v={
            item.lastLoginEventTs
              ? new Date(item.lastLoginEventTs).toLocaleString('he-IL') + (freshLogin ? ' (היום)' : '')
              : '—'
          }
        />

        <Row k="שם משתמש" v={ownerDisplayName} />
        <Row k="אימייל" v={ownerEmail} />
        <Row k="סיסמה" v={ownerPassword} />

        <View style={styles.statsRow}>
          <Stat k="מגיעים" v={item.yes} tint="#22C55E" />
          <Stat k="אולי" v={item.maybe} tint="#F59E0B" />
          <Stat k="לא מגיעים" v={item.no} tint="#EF4444" />
          <Stat k="בהמתנה" v={item.pending} tint="#6C63FF" />
        </View>

        <View style={{ flexDirection: 'row-reverse', gap: 6, marginTop: 6 }}>
          <TouchableOpacity onPress={() => openAdminPanel(item.uid, item.eventId)} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>פתח ניהול האירוע</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToUsersAndFocus} style={[styles.primaryBtn, { backgroundColor: '#0EA5E9' }]}>
            <Text style={styles.primaryText}>למשתמש</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              confirmDeleteEvent({
                uid: item.uid,
                eventId: item.eventId,
                eventName: item.eventName,
                eventDate: item.eventDate,
              })
            }
            style={[styles.primaryBtn, { backgroundColor: '#7F1D1D', flex: 0.8 }]}
          >
            <Text style={styles.primaryText}>מחק</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  const renderListHeader = useCallback(() => {
    return (
      <View>
        <AnimatedHeader>
          <View style={styles.kpiRow}>
            <KPI label="סה״כ אירועים" value={totalEvents} tint="#6366F1" />
            <KPI label="חדשים היום" value={newToday} tint="#22C55E" />
            <KPI label="חדשים בשבוע" value={newWeek} tint="#0EA5E9" />
            <KPI label="חדשים ב-30 ימים" value={newMonth} tint="#F59E0B" />
            <KPI label="תעבורה כוללת" value={fmtMB(totalTrafficMB)} tint="#A78BFA" isText />
            <KPI label="קריאה כוללת" value={fmtMB(totalReadMB)} tint="#4F46E5" isText />
            <KPI label="כתיבה כוללת" value={fmtMB(totalWriteMB)} tint="#F43F5E" isText />
            <KPI label="העלאות כוללות" value={fmtMB(totalUploadMB)} tint="#0EA5E9" isText />
            <KPI label="התחברויות היום" value={loginsToday} tint="#10B981" />
            <KPI label="התחברויות 7 ימים" value={logins7d} tint="#14B8A6" />
          </View>

          <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
            <RecentLoginsTicker items={recentLogins} onPick={(uid, eventId) => setQ(eventId)} />
          </View>

          <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
            <TrafficOverview buckets={trafficBucketsSum} />
          </View>
        </AnimatedHeader>

        <View style={styles.toolbar}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="חיפוש: שם אירוע / תאריך / מיקום / קטגוריה / uid / eventId / plan / username"
            style={styles.search}
            placeholderTextColor="#9aa3ac"
            textAlign="right"
          />

          <View style={styles.sortRow}>
            <SortButton label={`סידור: ${sortLabel}`} onPress={() => {}} active />
            <SortButton label="תאריך" onPress={() => toggleSort('eventDate', 'תאריך')} active={sortBy === 'eventDate'} />
            <SortButton label="שם" onPress={() => toggleSort('eventName', 'שם')} active={sortBy === 'eventName'} />
            <SortButton label="מיקום" onPress={() => toggleSort('eventLocation', 'מיקום')} active={sortBy === 'eventLocation'} />
            <SortButton label="תוכנית" onPress={() => toggleSort('plan', 'תוכנית')} active={sortBy === 'plan'} />
            <SortButton label="נוצר" onPress={() => toggleSort('createdAt', 'נוצר')} active={sortBy === 'createdAt'} />
            <SortButton label="תעבורה" onPress={() => toggleSort('trafficMB', 'תעבורה')} active={sortBy === 'trafficMB'} />
            <SortButton label="התחברות (אירוע)" onPress={() => toggleSort('lastLoginEvent', 'התחברות (אירוע)')} active={sortBy === 'lastLoginEvent'} />

            <View style={{ flexDirection: 'row-reverse', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <TogglePill label="רק פעילים" active={activeOnly} onPress={() => setActiveOnly((v) => !v)} />
              {['all', 'basic', 'plus', 'digital', 'premium', 'complementary'].map((p) => (
                <TogglePill key={p} label={p} active={planFilter === p} onPress={() => setPlanFilter(p)} />
              ))}
            </View>
          </View>

          <View style={[styles.sortRow, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity onPress={exportCSV} style={[styles.actionBtn, { backgroundColor: '#6C63FF' }]}>
              <Text style={[styles.actionText, { color: '#fff' }]}>ייצוא CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exportJSON} style={[styles.actionBtn, { backgroundColor: '#111827' }]}>
              <Text style={[styles.actionText, { color: '#fff' }]}>ייצוא JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLoginModal(true)} style={[styles.actionBtn, { backgroundColor: '#0EA5E9' }]}>
              <Text style={[styles.actionText, { color: '#fff' }]}>בדיקת Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [
    totalEvents,
    newToday,
    newWeek,
    newMonth,
    totalTrafficMB,
    totalReadMB,
    totalWriteMB,
    totalUploadMB,
    trafficBucketsSum,
    q,
    sortLabel,
    sortBy,
    activeOnly,
    planFilter,
    loginsToday,
    logins7d,
    recentLogins,
  ]);

  return (
    <View style={styles.screen}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topRightActions}>
          {activeView !== 'servers' && (
            <TouchableOpacity onPress={() => setActiveView('servers')} style={[styles.topBtn, { backgroundColor: '#6B7280' }]}>
              <Text style={styles.topBtnText}>ניהול שרתים</Text>
            </TouchableOpacity>
          )}

          {activeView !== 'users' && (
            <TouchableOpacity onPress={() => setActiveView('users')} style={[styles.topBtn, { backgroundColor: '#0F766E' }]}>
              <Text style={styles.topBtnText}>ניהול משתמשים</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={adminLogout} style={[styles.topBtn, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.topBtnText}>התנתק</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topTitles} pointerEvents="none">
          <Text style={styles.title}>דשבורד מנהל</Text>
          <Text style={styles.now}>{nowText}</Text>
        </View>

        <View style={{ width: 1 }} />
      </View>

      {activeView === 'servers' ? (
        <DeviceMonitorsPane />
      ) : activeView === 'users' ? (
        <View style={{ flex: 1 }}>
          <UsersManager
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
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : filtered.length === 0 ? (
        <FlatList data={[]} ListHeaderComponent={renderListHeader} />
      ) : (
        <FlatList
          data={filtered}
          key={'grid_' + numCols}
          numColumns={numCols}
          keyExtractor={(it) => `${it.uid}__${it.eventId}`}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ paddingHorizontal: padH, paddingBottom: 24, rowGap: gap }}
          columnWrapperStyle={numCols > 1 ? { columnGap: gap, justifyContent: 'flex-start' } : undefined}
          initialNumToRender={18}
          windowSize={10}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderCard}
        />
      )}

      {/* FABs */}
      {activeView === 'servers' && (
        <TouchableOpacity onPress={() => setActiveView('events')} style={[styles.fabBack, { backgroundColor: '#374151' }]} activeOpacity={0.9}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>חזרה לאירועים</Text>
        </TouchableOpacity>
      )}

      {activeView === 'users' && (
        <TouchableOpacity onPress={() => setActiveView('events')} style={styles.fabBack} activeOpacity={0.9}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>חזרה</Text>
        </TouchableOpacity>
      )}

      {/* Login Modal */}
      <Modal visible={loginModal} transparent animationType="fade" onRequestClose={() => setLoginModal(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ width: '100%' }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>בדיקת התחברות משתמש (פר־אירוע)</Text>
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                <TextInput placeholder="UID" value={loginUid} onChangeText={setLoginUid} style={styles.input} textAlign="right" />
                <TextInput placeholder="Event ID" value={loginEvent} onChangeText={setLoginEvent} style={styles.input} textAlign="right" />
                <TextInput placeholder="שם משתמש" value={loginUser} onChangeText={setLoginUser} style={styles.input} textAlign="right" />
                <TextInput placeholder="סיסמה" value={loginPass} onChangeText={setLoginPass} secureTextEntry style={styles.input} textAlign="right" />
              </ScrollView>

              <View style={[styles.actionsRow, { marginTop: 10 }]}>
                <TouchableOpacity disabled={loginBusy} onPress={tryLogin} style={[styles.actionBtn, { backgroundColor: '#22C55E', opacity: loginBusy ? 0.7 : 1 }]}>
                  <Text style={[styles.actionText, { color: '#fff' }]}>{loginBusy ? 'מתחבר…' : 'התחבר'}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={loginBusy} onPress={() => setLoginModal(false)} style={[styles.actionBtn, { backgroundColor: '#9CA3AF' }]}>
                  <Text style={[styles.actionText, { color: '#fff' }]}>סגור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* אירועי המשתמש (Modal) */}
      <Modal visible={showEventsModal} transparent animationType="fade" onRequestClose={() => setShowEventsModal(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ width: '100%' }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>אירועים של המשתמש</Text>

              <TextInput
                value={eventsSearch}
                onChangeText={setEventsSearch}
                placeholder="חיפוש לפי שם/מיקום/תאריך/ID…"
                placeholderTextColor="#9AA3AC"
                style={[styles.input, { marginBottom: 8 }]}
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
                    <View key={e.eventId} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 8, marginBottom: 6, backgroundColor: '#fff' }}>
                      <Text style={{ fontWeight: '800', textAlign: 'right' }} numberOfLines={1}>
                        {e.name}
                      </Text>
                      <Text style={{ color: '#475569', textAlign: 'right' }} numberOfLines={1}>
                        {e.date}
                        {e.time ? ` • ${e.time}` : ''}
                        {e.location ? ` • ${e.location}` : ''}
                      </Text>

                      <View style={{ flexDirection: 'row-reverse', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <TouchableOpacity onPress={() => copyToClipboard(e.eventId)} style={[styles.actionBtn, { backgroundColor: '#111827' }]}>
                          <Text style={[styles.actionText, { color: '#fff' }]}>העתק ID</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setShowEventsModal(false);
                            setActiveView('events');
                            setQ(e.eventId);
                          }}
                          style={[styles.actionBtn, { backgroundColor: '#0EA5E9' }]}
                        >
                          <Text style={[styles.actionText, { color: '#fff' }]}>סנן לאירוע</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setShowEventsModal(false);
                            openAdminPanel(eventsForUser.uid, e.eventId);
                          }}
                          style={[styles.actionBtn, { backgroundColor: '#22C55E' }]}
                        >
                          <Text style={[styles.actionText, { color: '#fff' }]}>פתח ניהול אירוע</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </ScrollView>

              <View style={[styles.actionsRow, { marginTop: 10 }]}>
                <TouchableOpacity onPress={() => setShowEventsModal(false)} style={[styles.actionBtn, { backgroundColor: '#9CA3AF' }]}>
                  <Text style={[styles.actionText, { color: '#fff' }]}>סגור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ==== Styles ====
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8FF' },

  topBar: {
    height: 62,
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRightActions: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  topBtn: { height: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topBtnText: { color: '#fff', fontWeight: '900' },
  topTitles: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontWeight: '900', fontSize: 16 },
  now: { color: '#cbd5e1', marginTop: 2, fontSize: 12, fontWeight: '700' },

  headerWrap: { paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E6E9F5' },
  headerDecor: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  circle: { position: 'absolute', right: 10, top: 10, width: 120, height: 120, borderRadius: 999, backgroundColor: '#6C63FF', opacity: 0.06 },

  kpiRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6 },
  kpiCard: { width: 160, borderRadius: 14, borderWidth: 1, borderColor: '#E6E9F5', backgroundColor: '#fff', padding: 10 },
  kpiLabel: { fontSize: 12, color: '#475569', fontWeight: '800', textAlign: 'right' },
  kpiValue: { fontSize: 18, fontWeight: '900', textAlign: 'right', marginTop: 6 },

  toolbar: { padding: 12, gap: 10 },
  search: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#D6DAE6', backgroundColor: '#fff', paddingHorizontal: 14, fontWeight: '700' },

  sortRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  sortBtn: { height: 34, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#D6DAE6', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sortBtnOn: { borderColor: '#6C63FF', backgroundColor: '#EEF2FF' },
  sortTxt: { fontWeight: '800', color: '#334155' },
  sortTxtOn: { color: '#312E81' },

  pill: { height: 34, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#D6DAE6', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pillOn: { borderColor: '#6C63FF', backgroundColor: '#EEF2FF' },
  pillTxt: { fontWeight: '800', color: '#334155' },
  pillTxtOn: { color: '#312E81' },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E9F5',
    backgroundColor: '#fff',
    padding: 12,
    overflow: 'hidden',
  },
  cardHeader: { marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'right' },
  cardSub: { marginTop: 2, color: '#64748b', fontWeight: '700', textAlign: 'right' },

  iconBtn: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: '#E6E9F5', backgroundColor: '#F8FAFF', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 16 },

  rowX: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  labelX: { color: '#475569', fontWeight: '800' },
  valueX: { color: '#0f172a', fontWeight: '800', maxWidth: '70%', textAlign: 'right' },

  statsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  stat: { flexGrow: 1, minWidth: 120, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center' },
  statK: { fontSize: 12, color: '#475569', fontWeight: '900' },
  statV: { fontSize: 18, fontWeight: '900', marginTop: 4 },

  actionsRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  actionBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '900' },

  primaryBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: '#312E81', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },

  fabBack: { position: 'absolute', right: 14, bottom: 16, paddingHorizontal: 16, height: 44, borderRadius: 999, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 560, borderRadius: 18, backgroundColor: '#fff', padding: 14, borderWidth: 1, borderColor: '#E6E9F5' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginBottom: 10 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#D6DAE6', backgroundColor: '#fff', paddingHorizontal: 12, fontWeight: '700' },
});

const st = StyleSheet.create({
  toWrap: { borderWidth: 1, borderColor: '#E6E9F5', backgroundColor: '#fff', borderRadius: 16, padding: 10 },
  toHeader: { flexDirection: 'row-reverse', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  toTab: { height: 30, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  toTabActive: { borderColor: '#6C63FF', backgroundColor: '#EEF2FF' },
  toTabText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  toTabTextActive: { color: '#312E81' },
  chartBox: { borderRadius: 12, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#EEF2FF', overflow: 'hidden' },
});

const UM = StyleSheet.create({
  header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 10 },
  hTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'right' },
  row: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  search: { flex: 1, minWidth: 220, height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#D6DAE6', backgroundColor: '#fff', paddingHorizontal: 12, fontWeight: '700' },
  filters: { flexDirection: 'row-reverse', gap: 8 },
  pill: { height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pillOn: { borderColor: '#6C63FF', backgroundColor: '#EEF2FF' },
  pillTxt: { fontWeight: '800', color: '#334155' },
  pillTxtOn: { color: '#312E81' },

  kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  kpiMini: { minWidth: 90, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#E6E9F5', backgroundColor: '#fff' },
  kpiMiniK: { fontSize: 11, color: '#64748b', fontWeight: '900', textAlign: 'right' },
  kpiMiniV: { fontSize: 16, color: '#0f172a', fontWeight: '900', textAlign: 'right', marginTop: 4 },

  card: { borderRadius: 18, borderWidth: 1, borderColor: '#E6E9F5', backgroundColor: '#fff', padding: 12 },
  cardDisabled: { opacity: 0.78 },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: '900', color: '#312E81' },
  name: { fontWeight: '900', color: '#0f172a', textAlign: 'right' },
  email: { fontWeight: '700', color: '#64748b', textAlign: 'right' },

  rowTiny: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kTiny: { fontSize: 12, fontWeight: '900', color: '#475569' },
  vTiny: { fontSize: 12, fontWeight: '800', color: '#0f172a', maxWidth: 220, textAlign: 'right' },

  tinyAct: { height: 26, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tinyActTxt: { fontSize: 11, fontWeight: '900', color: '#334155' },

  status: { height: 22, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  off: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  statusTxt: { fontSize: 11, fontWeight: '900', color: '#0f172a' },
  reasonInCard: { fontSize: 11, color: '#7F1D1D', fontWeight: '800' },

  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 8 },
  btn: { height: 36, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '900' },
  btnDanger: { backgroundColor: '#EF4444' },
  btnEnable: { backgroundColor: '#22C55E' },
  btnInfo: { backgroundColor: '#0EA5E9' },
  btnImpersonate: { backgroundColor: '#6C63FF' },

  label: { fontWeight: '900', color: '#0f172a', textAlign: 'right', marginBottom: 6 },
  notes: { minHeight: 70, borderRadius: 14, borderWidth: 1, borderColor: '#D6DAE6', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontWeight: '700' },
  notesBar: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: 8 },
  btnSaveNotes: { minWidth: 90 },
});
