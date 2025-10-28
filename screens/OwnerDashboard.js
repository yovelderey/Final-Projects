// OwnerDashboard.js – Pro Edition (Fixed Grid, Left Ticker, Impersonate & Focus User)
// Users Manager, Back handling, merged users, recent logins with date+time,
// KPIs (read/write/upload), traffic chart kind picker, sticky equal-width cards,
// Impersonate button per user, person-button per event to open Users and focus the owner card.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Platform, useWindowDimensions, Alert, Animated, Easing,
  RefreshControl, Modal, KeyboardAvoidingView, ScrollView, BackHandler
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
try { ExpoCrypto = require('expo-crypto'); } catch {}
async function sha256(text) {
  const str = String(text ?? '');
  if (ExpoCrypto?.digestStringAsync && ExpoCrypto?.CryptoDigestAlgorithm) {
    return await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      str,
      { encoding: (ExpoCrypto.CryptoEncoding?.HEX || 'hex') }
    );
  }
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const enc = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('SHA-256 לא זמין. התקן expo-crypto או הרץ בדפדפן מודרני.');
}

// ==== Utils ====


const n = (x) => Number(x || 0);
const mb = (bytes) => (n(bytes) / 1e6);
const fmtMB = (x) => `${(Number(x || 0)).toFixed(2)} MB`;
const safeDate = (v) => {
  if (!v) return 0;
  const t = Number(v);
  if (Number.isFinite(t) && t > 1e10) return t;
  const p = Date.parse(String(v));
  return Number.isFinite(p) ? p : 0;
};
const withinDays = (ts, days) => ts && (Date.now() - ts) <= days * 86400000;
const isToday = (ts) => {
  if (!ts) return false;
  const d = new Date(ts), now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() &&
         d.getUTCMonth() === now.getUTCMonth() &&
         d.getUTCDate() === now.getUTCDate();
};
const fmtHebDateTime = (ts) => ts
  ? new Date(ts).toLocaleString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
  : '—';
const useDebounced = (value, delay=250) => {
  const [v, setV] = useState(value);
  useEffect(()=>{ const id=setTimeout(()=>setV(value), delay); return ()=>clearTimeout(id); },[value,delay]);
  return v;
};
function strengthColor(pwd='') {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score >= 4) return '#10B981';
  if (score >= 3) return '#F59E0B';
  return '#EF4444';
}
const getInitials = (name, email) => {
  const base = String(name || email || '').trim();
  if (!base) return '—';
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map(p => (p[0] || '').toUpperCase()).join('') || '—';
};
async function copyToClipboard(text) {
  try {
    if (Platform.OS === 'web' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text ?? ''));
      Alert?.alert?.('הועתק', 'הטקסט הועתק ללוח.');
    }
  } catch {}
}

// ==== NEW: גריד שווה-שווה עם רוחב כרטיס קבוע ====
function useGridLayout(width, {
  minW = 260, maxW = 420, gap = 8, padH = 16, maxCols = 4,
} = {}) {
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
        Animated.timing(bg, { toValue: 1, duration: 5500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(bg, { toValue: 0, duration: 5500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();

    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    return () => loop.stop();
  }, []);

  const bgColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EEF2FF', '#E0F2FE'],
  });

  return (
    <Animated.View style={[styles.headerWrap, { backgroundColor: bgColor, transform: [{ translateY: slide }], opacity: fade }]}>
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
  const [tab, setTab]   = useState('minute');
  const [kind, setKind] = useState('total'); // 'read' | 'write' | 'upload' | 'total'
  const [series, setSeries] = useState([]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const heightPx = 120;

  const tabs = [
    { k: 'minute', label: '60 דק׳' },
    { k: 'hour',   label: '24 ש׳'  },
    { k: 'day',    label: '7 ימים' },
    { k: 'week',   label: 'שבועות' },
    { k: 'month',  label: 'חודשים' },
  ];
  const kinds = [
    { k: 'total',  label: 'סה״כ'   },
    { k: 'read',   label: 'קריאה'  },
    { k: 'write',  label: 'כתיבה'  },
    { k: 'upload', label: 'העלאה'  },
  ];

  useEffect(() => {
    const bag = buckets?.sum?.[tab] || {};
    const arr = Object.keys(bag).sort().map((key) => {
      const v = bag[key] || {};
      let bytes = 0;
      if (kind === 'read')        bytes = n(v.readBytes   ?? v.read);
      else if (kind === 'write')  bytes = n(v.writeBytes  ?? v.write);
      else if (kind === 'upload') bytes = n(v.uploadBytes ?? v.upload);
      else bytes = n(v.readBytes ?? v.read) + n(v.writeBytes ?? v.write) + n(v.uploadBytes ?? v.upload);
      return { k: key, mb: mb(bytes) };
    });
    setSeries(arr);
    setHoverIdx(arr.length ? arr.length - 1 : null);
  }, [tab, kind, buckets]);

  const maxMB = Math.max(0.1, ...series.map(p => p.mb));
  const barW = series.length ? Math.max(2, Math.floor((Math.min(980, series.length * 10) - 30) / series.length)) : 8;

  return (
    <View style={st.toWrap}>
      <View style={[st.toHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          {tabs.map((tabItem) => (
            <TouchableOpacity key={tabItem.k} onPress={() => setTab(tabItem.k)} style={[st.toTab, tab === tabItem.k && st.toTabActive]}>
              <Text style={[st.toTabText, tab === tabItem.k && st.toTabTextActive]}>{tabItem.label}</Text>
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
              kind === 'read'    ? (active ? '#6366F1' : '#A5B4FC') :
              kind === 'write'   ? (active ? '#F43F5E' : '#FDA4AF') :
              kind === 'upload'  ? (active ? '#0EA5E9' : '#7DD3FC') :
                                   (active ? '#6C63FF' : '#A78BFA');
            return (
              <Animated.View
                key={p.k}
                style={{
                  width: barW, height: h, marginRight: 2,
                  borderTopLeftRadius: 4, borderTopRightRadius: 4,
                  backgroundColor: color
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

// ==== טיקר התחברויות אחרונות (מרקיז חלק, מתחיל מהקצה הימני) ====
function RecentLoginsTicker({ items = [], onPick }) {
  const itemW = 260;
  const gap   = 12;
  const speed = 45;

  const [wrapW, setWrapW] = React.useState(0);
  const x = React.useRef(new Animated.Value(0)).current;

  const data = React.useMemo(() => {
    if (!items?.length) return [];
    return [...items, ...items];
  }, [items]);

  const cycleW = React.useMemo(() => {
    if (!items?.length) return 0;
    return items.length * (itemW + gap);
  }, [items, itemW, gap]);

  React.useEffect(() => {
    if (!cycleW || !wrapW || !data.length) return;
    x.stopAnimation();
    x.setValue(wrapW);
    const distance = wrapW + cycleW;
    const duration = Math.max(1000, (distance / speed) * 1000);

    const run = () => {
      Animated.timing(x, {
        toValue: -cycleW,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        x.setValue(wrapW);
        run();
      });
    };

    run();
    return () => { try { x.stopAnimation(); } catch {} };
  }, [cycleW, wrapW, data.length, speed]);

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
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            transform: [{ translateX: x }],
          }}
        >
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
  snap.forEach(child => {
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

// ==== UsersManager ====
function UsersManager({
  users = {},
  events = [],
  onDisableToggle,
  onSaveCreds,
  onSaveNotes,
  focusUid,             // ⬅ NEW: UID לסמן ולגלול אליו
  onDeleteUser,        // ⬅ חדש
  onShowUserEvents,
  onOpenUserEventsModal,    // ⬅ חדש
}) {
  const { width } = useWindowDimensions();
  const { numCols, cardW, gap, padH } = useGridLayout(width, { maxCols: 4 });
  const nav = useNavigation();

  // --- STATE ---
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const [filter, setFilter] = useState('all'); // all | active | disabled
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState({ uid: '', username: '', password: '' });

  const [pwdVisible, setPwdVisible] = useState({});
  const [notesDraft, setNotesDraft] = useState({});

  const [highlightUid, setHighlightUid] = useState(null); // הדגשה זמנית
  const listRef = useRef(null);
  const dataRef = useRef([]); // לשמירת הרשימה הנוכחית עבור scrollToIndex

  const eventsByUid = useMemo(() => {
    const acc = {};
    for (const e of events) acc[e.uid] = (acc[e.uid] || 0) + 1;
    return acc;
  }, [events]);

  const list = useMemo(() => {
    const entries = Object.entries(users).map(([uid, u]) => ({
    uid,
    displayName: u?.displayName || '',
    email: u?.email || '',
    disabled: !!u?.disabled,
    disabledReason: u?.disabledReason || '',            // ⬅️ חדש
    hasPass: !!u?.adminCreds?.passHash,                 // ⬅️ חדש
    username: u?.adminCreds?.username || '',
    password: u?.password || '',
    notes: u?.notes || '',
    eventsCount: eventsByUid[uid] || 0,
    updatedAt: u?.adminCreds?.updatedAt || 0,
    createdAt: safeDate(u?.createdAt) || safeDate(u?.createdAtISO) || 0,
    }));


    const term = (dq || '').toLowerCase().trim();
    let out = entries.filter(it =>
      [it.uid, it.displayName, it.email, it.username]
        .some(v => String(v || '').toLowerCase().includes(term))
    );

    if (filter === 'active')   out = out.filter(x => !x.disabled);
    if (filter === 'disabled') out = out.filter(x => x.disabled);

    out.sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      if (b.eventsCount !== a.eventsCount) return b.eventsCount - a.eventsCount;
      return String(a.displayName || a.email || a.uid)
        .localeCompare(String(b.displayName || b.email || b.uid));
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

  const openEdit = (user) => { setEdit({ uid: user.uid, username: user.username || '', password: '' }); setShowModal(true); };
  const closeEdit = () => { setShowModal(false); setEdit({ uid: '', username: '', password: '' }); };

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

  // התחברות ישירה לחשבון המשתמש (impersonate)
const impersonateLogin = async (item) => {
  try {
    if (item?.disabled) {
      return Alert.alert('משתמש מושבת', 'לא ניתן להתחבר לחשבון זה כי הוא מסומן כמושבת.');
    }
    const email = String(item?.email || '').trim();
    const password = String(item?.password || '').trim();
    if (!email) return Alert.alert('חסר אימייל', 'לא נמצא אימייל למשתמש זה.');
    if (!password) return Alert.alert('אין סיסמה שמורה', 'לא נמצאה סיסמה שמורה למשתמש זה.'); // ← בלי "חסרה סיסמה"

    try { await firebase.auth().signOut(); } catch {}
    await firebase.auth().signInWithEmailAndPassword(email, password);
    nav.reset({ index: 0, routes: [{ name: 'Main' }] });
  } catch (e) {
    Alert.alert('התחברות נכשלה', e?.message || 'לא ניתן היה להתחבר לחשבון המשתמש.');
  }
};


  // קבלה של focusUid מבחוץ: מדגיש ומגלגל לכרטיס המתאים
  useEffect(() => {
    if (!focusUid) return;
    setHighlightUid(focusUid);
    // מנקים הדגשה אחרי כמה שניות
    const t = setTimeout(() => setHighlightUid(null), 3500);

    // ניסיון לגלול לאינדקס של ה־uid
    const idx = dataRef.current.findIndex(x => x.uid === focusUid);
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
          {['all', 'active', 'disabled'].map(k => (
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
        <KPIMini label="פעילים" value={list.filter(x => !x.disabled).length} />
        <KPIMini label="מושבתים" value={list.filter(x => x.disabled).length} />
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const initials = getInitials(item.displayName, item.email);
    const pwdShown = !!pwdVisible[item.uid];
    const onTogglePwd = () => setPwdVisible(s => ({ ...s, [item.uid]: !s[item.uid] }));
    const onChangeNotes = (t) => setNotesDraft(s => ({ ...s, [item.uid]: t }));
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
          isHighlighted && { borderColor: '#10B981', borderWidth: 2, shadowColor: '#10B981', shadowOpacity: 0.25, shadowRadius: 8 }
        ]}
      >
<View style={UM.head}>
  <View style={UM.avatar}><Text style={UM.avatarTxt}>{initials}</Text></View>

  <View style={{ flex: 1, alignItems: 'flex-end' }}>
    <Text style={UM.name} numberOfLines={1}>{item.displayName || '—'}</Text>
    <Text style={UM.email} numberOfLines={1}>{item.email || '—'}</Text>


  </View>
</View>


        <TinyRow k="UID" v={item.uid} copy />
        {/* שם המשתמש = אימייל */}
        <TinyRow k="שם משתמש" v={item.email || '—'} />
        <TinyRow
          k="סיסמה"
          v={pwdShown ? (item.password || '—') : (item.password ? '••••••' : '—')}
          onToggle={onTogglePwd}
          withToggle
          copyVal={item.password || ''}
        />
        <TinyRow k="# אירועים" v={String(item.eventsCount)} />
        <TinyRow k="נוצר" v={fmtHebDateTime(item.createdAt)} />
       {/* סטטוס (חדש – כמו שאר האלמנטים) */}
<View style={UM.rowTiny}>
  <Text style={UM.kTiny}>סטטוס:</Text>
  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
    <View style={[UM.status, item.disabled ? UM.off : UM.on]}>
      <Text style={UM.statusTxt}>{item.disabled ? 'מושבת' : 'פעיל'}</Text>
    </View>
    {item.disabled && !!item.disabledReason && (
      <Text style={UM.reasonInCard}>({item.disabledReason})</Text>
    )}
  </View>
</View>

            <View style={UM.actions}>


                <TouchableOpacity onPress={() => onDisableToggle(item.uid)} style={[UM.btn, item.disabled ? UM.btnEnable : UM.btnDanger]}>
                    <Text style={UM.btnTxt}>{item.disabled ? 'הפעל' : 'השבת'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                onPress={() => onOpenUserEventsModal?.(item.uid)}
                style={[UM.btn, UM.btnInfo]}
                activeOpacity={0.9}
                >
                <Text style={UM.btnTxt}>שמות אירועים</Text>
                </TouchableOpacity>

                {/* התחבר כמשתמש (Impersonate) */}
                <TouchableOpacity
                onPress={() => impersonateLogin(item)}
                style={[UM.btn, UM.btnImpersonate]}
                activeOpacity={0.9}
                >
                <Text style={UM.btnTxt}>התחבר כמשתמש</Text>
                </TouchableOpacity>

                {/* חדש: הצג במסך האירועים */}
                <TouchableOpacity
                    onPress={() => onShowUserEvents?.(item.uid)}
                    style={[UM.btn, { backgroundColor: '#0F766E' }]}
                    activeOpacity={0.9}
                >
                    <Text style={UM.btnTxt}>הצג במסך האירועים</Text>
                </TouchableOpacity>

                {/* מחק משתמש – דרך prop */}
                <TouchableOpacity
                    onPress={() => onDeleteUser?.(item)}
                    style={[UM.btn, { backgroundColor: '#7F1D1D' }]}
                    activeOpacity={0.9}
                >
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
        />
        {/* סרגל שמירה מופרד מהשדה */}
        <View style={UM.notesBar}>
          <TouchableOpacity
            onPress={saveNotesClick}
            style={[UM.btn, UM.btnInfo, UM.btnSaveNotes]}
            activeOpacity={0.9}
          >
            <Text style={UM.btnTxt}>שמור</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  return (
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
      getItemLayout={(data, index) => ({ length: 1, offset: index, index })} // מונע אזהרות scrollToIndex
      onScrollToIndexFailed={(info) => {
        try {
          listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
          setTimeout(() => listRef.current?.scrollToIndex?.({ index: info.index, animated: true }), 300);
        } catch {}
      }}
    />
  );
}

// ---- תתי קומפוננטים דקים ל-UsersManager ----
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
      {copyVal && !copy && (
        <TouchableOpacity onPress={() => copyToClipboard(copyVal)} style={UM.tinyAct}>
          <Text style={UM.tinyActTxt}>העתק</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ==== המסך הראשי ====
export default function OwnerDashboard() {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const { numCols, cardW, gap, padH } = useGridLayout(width, { maxCols: 4 });

  const [activeView, setActiveView] = useState('events'); // 'events' | 'users'

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
    const tick = () => setNowText(new Date().toLocaleString('he-IL', {
      weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
    tick(); const timerId = setInterval(tick, 1000); return () => clearInterval(timerId);
  }, []);

// בתוך OwnerDashboard

async function deleteUserCascadeRTDB(uid) {
  if (!uid) throw new Error('חסר uid');
  const db = firebase.database();
  const updates = {};
  updates[`Events/${uid}`] = null;
  updates[`users/${uid}`]  = null;
  await db.ref().update(updates);
}

const handleDeleteUser = (user) => {
  const label = user?.email || user?.displayName || user?.uid || 'המשתמש';
  const msg =
    `למחוק לצמיתות את ${label}?\nזה ימחק גם את כל האירועים שלו מתוך המאגר.`;

  if (Platform.OS === 'web') {
    // ב־web אין Alert עם כפתורים → משתמשים ב-window.confirm
    const ok = typeof window !== 'undefined' ? window.confirm(msg) : false;
    if (!ok) return;
    deleteUserCascadeRTDB(user.uid)
      .then(() => Alert.alert('נמחק', 'המשתמש וכל האירועים שלו נמחקו מה-Realtime Database.'))
      .catch((e) => Alert.alert('שגיאה', e?.message || 'המחיקה נכשלה.'));
    return;
  }

  // מובייל/Native – Alert עם כפתורים תקין
  Alert.alert(
    'אישור מחיקה',
    msg,
    [
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
        }
      }
    ]
  );
};


const [showEventsModal, setShowEventsModal] = useState(false);
const [eventsForUser, setEventsForUser] = useState({ uid: '', list: [] });
const [eventsSearch, setEventsSearch] = useState('');

const showUserEventsOnEvents = (uid) => {
  setActiveView('events');
  setQ(uid); // מסנן לפי UID (כבר נתמך בחיפוש)
};

const openUserEventsModal = (uid) => {
  const list = events
    .filter(e => e.uid === uid)
    .map(e => ({
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


  // KPI-ים כוללים
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

  // KPIs התחברויות + טיקר
  const [loginsToday, setLoginsToday] = useState(0);
  const [logins7d, setLogins7d] = useState(0);
  const [recentLogins, setRecentLogins] = useState([]);

  // ⬅ פוקוס משתמש לניהול משתמשים (כשמגיעים מכפתור 👤 בכרטיס האירוע)
  const [focusUid, setFocusUid] = useState(null);

  useEffect(() => {
    setLoading(true);
    const db = firebase.database();
    const refEvents = db.ref('Events');
    const refUsers = db.ref('users');

    const offEvents = refEvents.on('value', (snap) => {
      const out = [];
      const root = snap.val() || {};
      let readBAll = 0, writeBAll = 0, uploadBAll = 0;

      const acc = { minute: {}, hour: {}, day: {}, week: {}, month: {} };
      const add = (obj, key, dr, dw, du) => {
        if (!key) return;
        const cur = obj[key] || { readBytes: 0, writeBytes: 0, uploadBytes: 0 };
        obj[key] = {
          readBytes:   cur.readBytes   + (Number(dr || 0)),
          writeBytes:  cur.writeBytes  + (Number(dw || 0)),
          uploadBytes: cur.uploadBytes + (Number(du || 0)),
        };
      };

      Object.entries(root).forEach(([uid, userEvents]) => {
        if (!userEvents || typeof userEvents !== 'object') return;

        Object.entries(userEvents).forEach(([eventId, data]) => {
          if (!data || typeof data !== 'object') return;
          if (String(eventId).startsWith('__')) return;

          const totals  = data.__metrics?.traffic?.totals || {};
          const readB   = Number(totals.readBytes   ?? totals.read   ?? 0);
          const writeB  = Number(totals.writeBytes  ?? totals.write  ?? 0);
          const uploadB = Number(totals.uploadBytes ?? totals.upload ?? 0);

          readBAll   += readB;
          writeBAll  += writeB;
          uploadBAll += uploadB;

          const createdAt =
            safeDate(data.createdAt) ||
            safeDate(data.__metrics?.lastUpdated) ||
            safeDate(data.createdDate) ||
            safeDate(data.eventDate);

          out.push({
            uid, eventId,
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
          ['minute','hour','day','week','month'].forEach(bucket => {
            const b = t[bucket] || {};
            Object.entries(b).forEach(([k, v]) => {
              add(acc[bucket], k,
                Number(v.readBytes   ?? v.read   ?? 0),
                Number(v.writeBytes  ?? v.write  ?? 0),
                Number(v.uploadBytes ?? v.upload ?? 0));
            });
          });
        });
      });

      const toMB = (bytes) => (Number(bytes || 0) / 1e6);
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
      setLogins7d(out.reduce((s, e) => s + (e.lastLoginEventTs && (nowTs - e.lastLoginEventTs) <= sevenDays ? 1 : 0), 0));

      const recent = out
        .filter(e => e.lastLoginEventTs)
        .sort((a, b) => b.lastLoginEventTs - a.lastLoginEventTs)
        .slice(0, 20)
        .map(e => ({
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

    const offUsers = refUsers.on('value', (snap) => {
      setUserMetaByUid(snap.val() || {});
    });

    return () => {
      try { refEvents.off('value', offEvents); } catch {}
      try { refUsers.off('value', offUsers); } catch {}
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        firebase.database().ref('Events').once('value'),
        firebase.database().ref('users').once('value'),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const usersMerged = useMemo(() => {
    const base = { ...(userMetaByUid || {}) };
    for (const ev of events) {
      if (!base[ev.uid]) {
        base[ev.uid] = {
          displayName: '',
          email: '',
          password: '',
          disabled: false,
          adminCreds: {},
        };
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
    let arr = events.filter(e =>
      [e.eventName, e.eventDate, e.eventLocation, e.eventCategory, e.uid, e.eventId, e.plan, e.metaUserName]
        .some(v => String(v || '').toLowerCase().includes(term))
    );

    if (planFilter !== 'all') arr = arr.filter(e => String(e.plan || '').toLowerCase() === planFilter);
    if (activeOnly) arr = arr.filter(e => !userMetaByUid[e.uid]?.disabled);

    arr.sort((a, b) => {
      const A = a[sortBy], B = b[sortBy];
      if (sortBy === 'trafficMB')  return sortDir === 'asc' ? (A - B) : (B - A);
      if (sortBy === 'createdAt')  return sortDir === 'asc' ? (n(A) - n(B)) : (n(B) - n(A));
      if (sortBy === 'lastLoginEvent') {
        const la = n(a.lastLoginEventTs);
        const lb = n(b.lastLoginEventTs);
        return sortDir === 'asc' ? (la - lb) : (lb - la);
      }
      return sortDir === 'asc'
        ? String(A ?? '').localeCompare(String(B ?? ''))
        : String(B ?? '').localeCompare(String(A ?? ''));
    });

    return arr;
  }, [events, dq, sortBy, sortDir, userMetaByUid, planFilter, activeOnly]);

  const toggleSort = (key, label) => { setSortLabel(label); if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir('asc'); } };
  const openAdminPanel = (uid, eventId) => nav.navigate?.('AdminPanel', { id: eventId, uid });

  // === עריכת קרדנציאלס ברמת משתמש ===
  const saveUserCreds = async (uid, username, pass) => {
    const db = firebase.database();
    const passHash = await sha256(pass);
    await db.ref(`users/${uid}/adminCreds`).update({ username, passHash, updatedAt: Date.now() });
    await db.ref(`users/${uid}/password`).set(pass); // לשיקוף בכרטיס
    await mirrorCredsUsernameToEvents(uid, username);
  };

  // === שינוי תוכנית פר-אירוע ===
  const setEventPlan = async (uid, eventId, plan) => {
    try {
      await firebase.database().ref(`Events/${uid}/${eventId}/plan`).set(plan);
      Alert.alert('עודכן', `התוכנית של האירוע עודכנה ל-${plan}.`);
    } catch (e) {
      Alert.alert('שגיאה', e?.message || 'נכשל עדכון תוכנית לאירוע.');
    }
  };

  // === השבתה/הפעלה ===
const toggleDisableUser = async (uid) => {
  try {
    const db = firebase.database();
    const userSnap = await db.ref(`users/${uid}`).once('value');
    const userVal = userSnap.val() || {};
    const curDisabled = !!userVal.disabled;

    // נקבע סיבה בעת השבתה; בעת הפעלה ננקה
    let reason = '';
    if (!curDisabled) {
      // עכשיו משביתים
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
      updates[`Events/${uid}/${eventId}/__meta/userDisabledReason`] = !curDisabled ? reason : null; // ⬅️ שיקוף סיבה
    });

    await db.ref().update(updates);
    Alert.alert('עודכן', !curDisabled ? 'המשתמש הושבת.' : 'המשתמש הופעל.');
  } catch (e) {
    Alert.alert('שגיאה', e?.message || 'נכשל עדכון סטטוס משתמש.');
  }
};


  // === יצוא ===
  const exportCSV = async () => {
    try {
      const rows = [
        ['uid','email','displayName','disabled','username','lastLoginEvent','eventId','eventName','eventDate','eventTime','location','category','plan','yes','maybe','no','pending','createdAt','trafficMB'],
        ...filtered.map(e => {
          const um = userMetaByUid[e.uid] || {};
          const username = um.adminCreds?.username || '';
          return [
            e.uid, um.email || '', um.displayName || '', um.disabled ? 'true' : 'false',
            username, e.lastLoginEventTs ? new Date(e.lastLoginEventTs).toISOString() : '',
            e.eventId, e.eventName, e.eventDate, e.eventTime, e.eventLocation, e.eventCategory, e.plan,
            e.yes, e.maybe, e.no, e.pending,
            e.createdAt ? new Date(e.createdAt).toISOString() : '',
            e.trafficMB.toFixed(2)
          ];
        })
      ];
      const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `owner_events_${Date.now()}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } else {
        const { default: FileSystem } = await import('expo-file-system');
        const { default: Sharing } = await import('expo-sharing');
        const uri = FileSystem.cacheDirectory + `owner_events_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri);
      }
    } catch { Alert.alert('שגיאה', 'נכשל ייצוא CSV'); }
  };

  const exportJSON = async () => {
    try {
      const payload = { generatedAt: new Date().toISOString(), total: filtered.length, events: filtered, users: userMetaByUid };
      const json = JSON.stringify(payload, null, 2);
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
        a.download = `owner_events_${Date.now()}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } else {
        const { default: FileSystem } = await import('expo-file-system');
        const { default: Sharing } = await import('expo-sharing');
        const uri = FileSystem.cacheDirectory + `owner_events_${Date.now()}.json`;
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri);
      }
    } catch { Alert.alert('שגיאה', 'נכשל ייצוא JSON'); }
  };

  // === Logout אדמין ===
  const AFTER_LOGOUT_ROUTE = 'LoginEmail';
  const adminLogout = async () => {
    try { await firebase.auth().signOut(); nav.reset({ index: 0, routes: [{ name: AFTER_LOGOUT_ROUTE }] }); }
    catch (e) { Alert.alert('שגיאה', e?.message || 'נכשל להתנתק.'); }
  };

  // === כרטיס אירוע ===
  const renderCard = ({ item }) => {
    const um = userMetaByUid[item.uid] || {};
    const ownerDisplayName = um.displayName || '—';
    const ownerEmail = um.email || '—';
    const ownerPassword = um.password || '—';
    const freshLogin = isToday(item.lastLoginEventTs);

    const goToUsersAndFocus = () => {
      setFocusUid(item.uid);
      setActiveView('users'); // יעבור למסך משתמשים, UsersManager יקלוט focusUid ויגלגל/ידגיש
    };

    return (
      <View style={[
        styles.card,
        { width: cardW },
        freshLogin && { borderColor: '#10B98199', backgroundColor: '#F0FFF7' }
      ]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.eventName || 'ללא שם'}</Text>

            {/* כפתור איש – מעבר לניהול משתמשים ופוקוס על בעל האירוע */}
            <TouchableOpacity onPress={goToUsersAndFocus} style={styles.iconBtn} accessibilityLabel="פתח ניהול משתמשים לבעל האירוע">
              <Text style={styles.iconBtnText}>👤</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSub}>{item.eventLocation || '-'}</Text>
        </View>

        <Row k="תאריך אירוע" v={`${item.eventDate || '-'}${item.eventTime ? ` • ${item.eventTime}` : ''}`} />
        <Row k="קטגוריה" v={item.eventCategory || '-'} />
        <Row k="תוכנית" v={item.plan || '-'} />
        <View style={[styles.actionsRow, { marginTop: 4 }]}>
          {['basic','plus','digital','premium','complementary'].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setEventPlan(item.uid, item.eventId, p)}
              style={[styles.actionBtn, { backgroundColor: (item.plan === p) ? '#312E81' : '#CBD5E1' }]}
            >
              <Text style={[styles.actionText, { color: '#fff' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* סטטוס בעלים */}
        <View style={[styles.rowX, { alignItems: 'center' }]}>
        <Text style={styles.labelX}>סטטוס בעלים:</Text>
        <View style={[
            UM.status,
            (um?.disabled ? UM.off : UM.on),
            { height: 24, paddingHorizontal: 10 }
        ]}>
            <Text style={UM.statusTxt}>
            {um?.disabled ? 'מושבת' : 'משתמש פעיל'}
            </Text>
        </View>
        </View>
        <Row k="UID" v={item.uid} mono />
        <Row k="אירוע" v={item.eventId} mono />
        <Row
          k="התחברות אחרונה (אירוע)"
          v={item.lastLoginEventTs
            ? new Date(item.lastLoginEventTs).toLocaleString('he-IL') + (freshLogin ? ' (היום)' : '')
            : '—'}
        />

        <Row k="שם משתמש" v={ownerDisplayName} />
        <Row k="אימייל"     v={ownerEmail} />
        <Row k="סיסמה"     v={ownerPassword} />

        <View style={styles.statsRow}>
          <Stat k="מגיעים" v={item.yes} tint="#22C55E" />
          <Stat k="אולי" v={item.maybe} tint="#F59E0B" />
          <Stat k="לא מגיעים" v={item.no} tint="#EF4444" />
          <Stat k="בהמתנה" v={item.pending} tint="#6C63FF" />
        </View>




        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          <TouchableOpacity onPress={() => openAdminPanel(item.uid, item.eventId)} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>פתח ניהול האירוע</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToUsersAndFocus} style={[styles.primaryBtn, { backgroundColor: '#0EA5E9' }]}>
            <Text style={styles.primaryText}>למשתמש</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderListHeader = useCallback(() => (
    <View>
      <AnimatedHeader>
        <View style={styles.kpiRow}>
          <KPI label="סה״כ אירועים"     value={totalEvents}   tint="#6366F1" />
          <KPI label="חדשים היום"        value={newToday}      tint="#22C55E" />
          <KPI label="חדשים בשבוע"       value={newWeek}       tint="#0EA5E9" />
          <KPI label="חדשים ב-30 ימים"   value={newMonth}      tint="#F59E0B" />
          <KPI label="תעבורה כוללת"      value={fmtMB(totalTrafficMB)} tint="#A78BFA" isText />
          <KPI label="קריאה כוללת"       value={fmtMB(totalReadMB)}   tint="#4F46E5" isText />
          <KPI label="כתיבה כוללת"       value={fmtMB(totalWriteMB)}  tint="#F43F5E" isText />
          <KPI label="העלאות כוללות"     value={fmtMB(totalUploadMB)} tint="#0EA5E9" isText />
          <KPI label="התחברויות היום"    value={loginsToday}   tint="#10B981" />
          <KPI label="התחברויות 7 ימים"  value={logins7d}      tint="#14B8A6" />
        </View>

        <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
          <RecentLoginsTicker
            items={recentLogins}
            onPick={(uid, eventId) => setQ(eventId)}
          />
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
        />
        <View style={styles.sortRow}>
          <SortButton label={`סידור: ${sortLabel}`} onPress={() => {}} active />
          <SortButton label="תאריך" onPress={() => toggleSort('eventDate','תאריך')} active={sortBy==='eventDate'} />
          <SortButton label="שם" onPress={() => toggleSort('eventName','שם')} active={sortBy==='eventName'} />
          <SortButton label="מיקום" onPress={() => toggleSort('eventLocation','מיקום')} active={sortBy==='eventLocation'} />
          <SortButton label="תוכנית" onPress={() => toggleSort('plan','תוכנית')} active={sortBy==='plan'} />
          <SortButton label="נוצר" onPress={() => toggleSort('createdAt','נוצר')} active={sortBy==='createdAt'} />
          <SortButton label="תעבורה" onPress={() => toggleSort('trafficMB','תעבורה')} active={sortBy==='trafficMB'} />
          <SortButton label="התחברות (אירוע)" onPress={() => toggleSort('lastLoginEvent','התחברות (אירוע)')} active={sortBy==='lastLoginEvent'} />
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginLeft: 'auto' }}>
            <TogglePill label="רק פעילים" active={activeOnly} onPress={() => setActiveOnly(v => !v)} />
            {['all','basic','plus','digital','premium','complementary'].map(p => (
              <TogglePill key={p} label={p} active={planFilter===p} onPress={() => setPlanFilter(p)} />
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
  ), [totalEvents,newToday,newWeek,newMonth,totalTrafficMB,totalReadMB,totalWriteMB,totalUploadMB,trafficBucketsSum,q,sortLabel,sortBy,activeOnly,planFilter,loginsToday,logins7d,recentLogins]);

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
      setLoginModal(false); setLoginUid(''); setLoginEvent(''); setLoginUser(''); setLoginPass('');
    } catch (e) { setLoginBusy(false); Alert.alert('שגיאה', e?.message || 'נכשל ניסיון התחברות.'); }
  };

  return (
    <View style={styles.screen}>
      {/* Top Bar */}
{/* Top Bar */}
<View style={styles.topBar}>
  <View style={styles.topRightActions}>
    {activeView !== 'users' && (
      <TouchableOpacity
        onPress={() => setActiveView('users')}
        style={[styles.topBtn, { backgroundColor: '#0F766E' }]}
      >
        <Text style={styles.topBtnText}>ניהול משתמשים</Text>
      </TouchableOpacity>
    )}
    <TouchableOpacity
      onPress={adminLogout}
      style={[styles.topBtn, { backgroundColor: '#EF4444' }]}
    >
      <Text style={styles.topBtnText}>התנתק</Text>
    </TouchableOpacity>
  </View>

  {/* חשוב: שלא יחסום מגעים */}
  <View style={styles.topTitles} pointerEvents="none">
    <Text style={styles.title}>דשבורד מנהל</Text>
    <Text style={styles.now}>{nowText}</Text>
  </View>

  <View style={{ width: 1 }} />
</View>


      {activeView === 'users' ? (
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
            onOpenUserEventsModal={openUserEventsModal}   // ⬅️ חדש
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

      {/* FAB חזרה כאשר במסך משתמשים */}
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
                <TextInput placeholder="UID"         value={loginUid}    onChangeText={setLoginUid}    style={styles.input} textAlign="right" />
                <TextInput placeholder="Event ID"    value={loginEvent}  onChangeText={setLoginEvent}  style={styles.input} textAlign="right" />
                <TextInput placeholder="שם משתמש"   value={loginUser}   onChangeText={setLoginUser}   style={styles.input} textAlign="right" />
                <TextInput placeholder="סיסמה"       value={loginPass}   onChangeText={setLoginPass}   secureTextEntry style={styles.input} textAlign="right" />
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
            .filter(e => {
              const t = (eventsSearch || '').toLowerCase().trim();
              if (!t) return true;
              return [e.name, e.location, e.date, e.time, e.eventId].some(v =>
                String(v || '').toLowerCase().includes(t)
              );
            })
            .map(e => (
              <View key={e.eventId} style={{ borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, padding:8, marginBottom:6, backgroundColor:'#fff' }}>
                <Text style={{ fontWeight:'800', textAlign:'right' }} numberOfLines={1}>{e.name}</Text>
                <Text style={{ color:'#475569', textAlign:'right' }} numberOfLines={1}>
                  {e.date}{e.time ? ` • ${e.time}` : ''}{e.location ? ` • ${e.location}` : ''}
                </Text>
<View style={{ flexDirection:'row-reverse', gap:6, marginTop:6 }}>
  <TouchableOpacity
    onPress={() => copyToClipboard(e.eventId)}
    style={[styles.actionBtn, { backgroundColor:'#111827' }]}
  >
    <Text style={[styles.actionText, { color:'#fff' }]}>העתק ID</Text>
  </TouchableOpacity>

  {/* חפש במסך האירועים לפי ה־eventId המדויק */}
  <TouchableOpacity
    onPress={() => {
      setShowEventsModal(false);
      setActiveView('events');
      setQ(e.eventId);       // ← מסנן לפי ה־eventId, לא לפי uid
    }}
    style={[styles.actionBtn, { backgroundColor:'#6C63FF' }]}
  >
    <Text style={[styles.actionText, { color:'#fff' }]}>חפש במסך האירועים</Text>
  </TouchableOpacity>
</View>

              </View>
            ))}
          {eventsForUser.list.length === 0 && (
            <Text style={{ textAlign:'center', color:'#6b7280' }}>אין אירועים למשתמש זה</Text>
          )}
        </ScrollView>

        <View style={[styles.actionsRow, { marginTop: 10 }]}>
          <TouchableOpacity onPress={() => setShowEventsModal(false)} style={[styles.actionBtn, { backgroundColor:'#9CA3AF' }]}>
            <Text style={[styles.actionText, { color:'#fff' }]}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </View>
</Modal>

    </View>
  );
}

// ==== קומפוננטים + עיצוב ====
const Row = ({ k, v, mono }) => (
  <View style={styles.rowX}>
    <Text style={styles.labelX}>{k}:</Text>
    <Text style={[styles.valX, mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} numberOfLines={1}>{v}</Text>
  </View>
);
const KPI = ({ label, value, tint = '#6C63FF', isText = false }) => (
  <View style={[styles.kpiCard, { borderColor: tint + '44', backgroundColor: tint + '12' }]}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{isText ? value : Number(value || 0).toLocaleString('he-IL')}</Text>
  </View>
);
const SortButton = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.sortBtn, active && { borderColor: '#6C63FF', backgroundColor: '#EEF2FF' }]}>
    <Text style={[styles.sortText, active && { color: '#312E81', fontWeight: '800' }]}>{label}</Text>
  </TouchableOpacity>
);
const TogglePill = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
  </TouchableOpacity>
);
const Stat = ({ k, v, tint }) => (
  <View style={[styles.statBox, { borderColor: tint + '55', backgroundColor: tint + '15' }]}>
    <Text style={styles.statK}>{k}</Text>
    <Text style={styles.statV}>{Number(v || 0).toLocaleString('he-IL')}</Text>
  </View>
);

const st = StyleSheet.create({
  toWrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 10 },
  toHeader: { flexDirection: 'row-reverse', gap: 6, marginBottom: 6, alignItems: 'center' },
  toTab: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFF' },
  toTabActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  toTabText: { color: '#111', fontWeight: '700', fontSize: 12 },
  toTabTextActive: { color: '#312E81' },
  chartBox: { backgroundColor: '#FCFCFF', borderWidth: 1, borderColor: '#EEF2FF', borderRadius: 12, overflow: 'hidden' },
});

const UM = StyleSheet.create({
  header: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6E9F5', borderRadius: 14, padding: 10, marginBottom: 6 },
  hTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginBottom: 6 },

  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  filters: { flexDirection: 'row-reverse', gap: 6, marginLeft: 'auto' },

  search: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#D6DAE6', paddingHorizontal: 12, backgroundColor: '#fff' },
  pill: { paddingHorizontal: 10, height: 30, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFF' },
  pillOn: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  pillTxt: { fontSize: 12, color: '#374151', fontWeight: '700' },
  pillTxtOn: { color: '#312E81' },

  kpis: { flexDirection: 'row-reverse', gap: 6, marginTop: 8 },
  kpiMini: { flex: 1, minWidth: 90, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingVertical: 6, alignItems: 'center' },
  kpiMiniK: { fontSize: 11, color: '#475569' },
  kpiMiniV: { marginTop: 2, fontSize: 16, fontWeight: '800', color: '#0f172a' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E7E9F4' },
  cardDisabled: { opacity: 0.9, backgroundColor: '#FAFAFA' },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  avatarTxt: { color: '#312E81', fontWeight: '900', fontSize: 12 },
  name: { fontSize: 14, fontWeight: '800', color: '#0f172a', textAlign: 'right' },
  email: { fontSize: 11, color: '#6b7280', textAlign: 'right' },

  status: { paddingHorizontal: 10, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statusTxt: { fontSize: 11, fontWeight: '800' },
  on: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
  off:{ borderColor: '#EF4444', backgroundColor: '#FEE2E2' },

  rowTiny: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginVertical: 2 },
  kTiny: { color: '#6b7280', fontSize: 11 },
  vTiny: { color: '#111827', fontSize: 12, fontWeight: '700' },

  tinyAct: { height: 24, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center' },
  tinyActTxt: { color: '#312E81', fontWeight: '800', fontSize: 11 },

  actions: { flexDirection: 'row-reverse', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  btn: { paddingHorizontal: 10, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  btnPrimary: { backgroundColor: '#6366F1' },
  btnDanger: { backgroundColor: '#EF4444' },
  btnEnable: { backgroundColor: '#22C55E' },
  btnInfo: { backgroundColor: '#0EA5E9' },
  btnImpersonate: { backgroundColor: '#6C63FF' }, // התחבר לחשבון

  label: { color:'#6b7280', fontSize:11, marginTop:6, marginBottom:2, textAlign:'right' },
  notes: { minHeight: 60, borderWidth:1,marginBottom: 10, borderRadius:8, borderColor:'#D6DAE6', backgroundColor:'#fff', paddingHorizontal:10, paddingTop:6, textAlign:'right' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f7fb' },

  // Top bar (מרוכז)
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRightActions: {
  flexDirection: 'row-reverse',
  gap: 8,
  zIndex: 2, // ← מבטיח שהכפתורים מעל שכבת הטקסט האמצעית
  },
  topBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtnText: { color: '#fff', fontWeight: '800' },
  topTitles: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1c1c28' },
  now: { marginTop: 2, color: '#475569', textAlign: 'center' },

  headerWrap: {
    marginHorizontal: 12, marginTop: 8, marginBottom: 6,
    borderRadius: 16, borderWidth: 1, borderColor: '#E6E9F5',
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  headerDecor: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  circle: { position: 'absolute', left: 24, top: 22, width: 120, height: 120, borderRadius: 60, backgroundColor: '#ffffff', opacity: 0.06 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 10, marginBottom: 6, justifyContent: 'space-between' },
  kpiCard: { flexGrow: 1, minWidth: 160, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 12, color: '#374151' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 4 },

  toolbar: { paddingHorizontal: 12, gap: 6, marginBottom: 6 },
  search: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#D6DAE6', paddingHorizontal: 12, backgroundColor: '#fff', textAlign: 'right' },
  sortRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4, alignItems: 'center' },

  sortBtn: { paddingHorizontal: 12, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#D6DAE6', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  sortText: { color: '#111', fontWeight: '700' },

  pill: { height: 30, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pillActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  pillText: { fontSize: 12, color: '#374151', fontWeight: '700' },
  pillTextActive: { color: '#312E81' },

  actionsRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '700', color: '#111' },

  // כרטיס אירוע
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#e7e9f4', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111', textAlign: 'right' },
  cardSub: { fontSize: 12, color: '#6b7280', textAlign: 'right' },

  rowX: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginVertical: 2 },
  labelX: { color: '#6b7280', fontSize: 12 },
  valX: { color: '#111', fontSize: 13, fontWeight: '700', textAlign: 'left', maxWidth: '65%' },

  statsRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 6, marginBottom: 8, flexWrap: 'wrap' },
  statBox: { flexGrow: 1, minWidth: 100, borderRadius: 12, borderWidth: 1, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  statK: { fontSize: 11, color: '#334155' },
  statV: { fontSize: 17, fontWeight: '800', color: '#0f172a' },

  input: { height: 40, borderWidth: 1, borderRadius: 10, borderColor: '#D6DAE6', backgroundColor: '#fff', paddingHorizontal: 10 },

  primaryBtn: { height: 42, borderRadius: 12, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryText: { color: '#fff', fontWeight: '800' },

  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  iconBtnText: { fontSize: 18 },
    badgeDisabled: { marginBottom: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
    badgeDisabledText: { color: '#7F1D1D', fontWeight: '900', textAlign: 'center' },
    badgeWarn: { marginBottom: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D' },
    badgeWarnText: { color: '#92400E', fontWeight: '800', textAlign: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
// styles.modalCard
modalCard: {
  width: '100%',
  maxWidth: 420,
  borderRadius: 14,
  backgroundColor: '#fff',
  padding: 14,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  alignSelf: 'center',    // ← מרכז גם כשההורה ברוחב מלא
},
  modalTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  reasonTxt: { marginTop: 4, color: '#991B1B', fontWeight: '800', textAlign: 'right' },
  missingTxt:{ marginTop: 4, color: '#92400E', fontWeight: '700', textAlign: 'right' },

  fabBack: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
notesBar: { flexDirection:'row-reverse', justifyContent:'flex-start', marginTop: 8 },
btnSaveNotes: { height: 34, alignSelf: 'flex-start' },
statusRow: { flexDirection:'row-reverse', alignItems:'center', justifyContent:'flex-start', gap: 8, marginTop: 6, marginBottom: 4 },
reasonInCard: { color:'#7F1D1D', fontWeight:'700' },
topBar: {
  paddingHorizontal: 12,
  paddingTop: 10,
  paddingBottom: 4,
  flexDirection: 'row-reverse',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',              // ⬅️ חשוב
},
topTitles: {
  position: 'absolute',              // ⬅️ מרכז מוחלט
  left: 0,
  right: 0,
  alignItems: 'center',
  justifyContent: 'center',
},

});
