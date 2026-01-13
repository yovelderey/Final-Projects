// ListItem.js — Cache + Live Sync + WhatsApp/RSVP + NetMeter (2s UI & console) + Persisted Event-Local Metrics/Admin
// שמירת כל המדדים/ביקורים/לוגים בתוך האירוע עצמו:
// Events/{uid}/{eventId}/__metrics/...  ו-  Events/{uid}/{eventId}/__admin/...

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View, Modal, Platform, TextInput, useWindowDimensions, ImageBackground, Text, FlatList,
  Alert, TouchableOpacity, Image, ScrollView, StyleSheet, Animated, Pressable, Linking, useColorScheme
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getDatabase, ref, set, get, onValue, off, remove, update, runTransaction,query, orderByChild, limitToLast } from 'firebase/database';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import * as Progress from 'react-native-progress';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import XLSX, { utils, writeFileXLSX } from 'xlsx';
import { enableLogging } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';

// ===== נכסי ברירת־מחדל לקרוסלה =====
const imagesFallback = [
  require('../assets/imagemainone.png'),
  require('../assets/imgmaintwo.png'),
  require('../assets/imagemainthree.png'),
  require('../assets/imagemainfour.png'),
  require('../assets/addpic.png'),
];

// ===== Firebase =====
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

// ===== NetMeter (2s) – מדידת RTDB & Storage =====
const _TextEncoder = typeof TextEncoder !== 'undefined' ? TextEncoder : null;
const _enc = _TextEncoder ? new _TextEncoder() : null;
const _bytesOf = (v) => {
  try {
    const s = JSON.stringify(v);
    if (_enc) return _enc.encode(s).length;
    return s.length; // fallback בקירוב
  } catch { return 0; }
};
const _MB = (b) => (b / 1e6);

const NetMeter = {
  totals: { read: 0, write: 0, upload: 0 },
  last:   { t: Date.now(), read: 0, write: 0, upload: 0 },
  lastStats: { dt: 2, rateRead: 0, rateWrite: 0, rateUpload: 0, totalRead: 0, totalWrite: 0, totalUpload: 0 },
  listeners: new Set(),
  _timer: null,
  start(intervalMs = 2000) {
    if (this._timer) return;
    this._timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.max((now - this.last.t) / 1000, 0.001);
      const rateRead   = (this.totals.read   - this.last.read)   / dt;
      const rateWrite  = (this.totals.write  - this.last.write)  / dt;
      const rateUpload = (this.totals.upload - this.last.upload) / dt;
      this.lastStats = {
        dt,
        rateRead,
        rateWrite,
        rateUpload,
        totalRead: this.totals.read,
        totalWrite: this.totals.write,
        totalUpload: this.totals.upload
      };



      this.last = { t: now, read: this.totals.read, write: this.totals.write, upload: this.totals.upload };
      this.listeners.forEach((cb) => { try { cb(this.lastStats); } catch {} });
    }, intervalMs);
  },
  stop() { clearInterval(this._timer); this._timer = null; },
  subscribe(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); },
};

// עטיפות RTDB למדידה
const meteredGet = async (dbRef) => {
  const snap = await get(dbRef);
  NetMeter.totals.read += _bytesOf(snap.val());
  return snap;
};
const meteredOnValue = (dbRef, cb, cancelCb, opts) => {
  return onValue(
    dbRef,
    (snap) => {
      NetMeter.totals.read += _bytesOf(snap.val());
      cb(snap);
    },
    cancelCb,
    opts
  );
};
const meteredSet = async (dbRef, value) => {
  const sz = _bytesOf(value);
  await set(dbRef, value);
  NetMeter.totals.write += sz;
};
// Storage upload metering
const trackUploadTask = (uploadTask) => {
  let prev = 0;
  uploadTask.on('state_changed', (s) => {
    const delta = Math.max((s.bytesTransferred || 0) - prev, 0);
    prev = s.bytesTransferred || prev;
    NetMeter.totals.upload += delta;
  });
  return uploadTask;
};
// הפעלת המד (2s)
NetMeter.start(2000);

// ===== Persist NetMeter rollups + visits (בנתיבים של האירוע) =====
const _dayKey  = (d=new Date()) => d.toISOString().slice(0,10); // YYYY-MM-DD
const _hourKey = (d=new Date()) => String(d.getHours()).padStart(2,'0');
let _rollupTimer = null;

// הוספה:
const _minuteKey = (d=new Date()) => `${_dayKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const _weekKey   = (d=new Date()) => Math.floor(d.getTime() / (1000*60*60*24*7));        // מספר שבוע יוניקס
const _monthKey  = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

// === Persist traffic deltas atomically (accumulates across sessions) ===
// ===== Write only on real change (no noisy writes) =====

// אם העוזרים לא קיימים אצלך – נגדירם כאן בעדינות:
const _pad2 = (n) => String(n).padStart(2,'0');
if (typeof keyDay !== 'function') {
  var keyDay   = (d=new Date()) => {
    const y=d.getUTCFullYear(), m=_pad2(d.getUTCMonth()+1), dd=_pad2(d.getUTCDate());
    return `${y}-${m}-${dd}`;
  };
}
if (typeof keyWeek !== 'function') {
  var keyWeek  = (d=new Date()) => {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
    const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay()+6)%7)) / 7);
    return `${date.getUTCFullYear()}-W${_pad2(week)}`;
  };
}
if (typeof keyMonth !== 'function') {
  var keyMonth = (d=new Date()) => `${d.getUTCFullYear()}-${_pad2(d.getUTCMonth()+1)}`;
}

const _n = (x) => (Number.isFinite(x) ? x : 0);

// כתיבה “חכמה” ל־traffic — כותבים רק כשיש דלתא חדשה (>= 1KB) ומאגדים כל 30ש׳.
export const startTrafficBuckets = (db, uid, eventId, {
  minDeltaBytes = 1024,     // סף מינימלי לדלתא שתגרום לכתיבה (1KB)
  intervalMs    = 30_000,   // כל כמה זמן לבדוק אם נצברה דלתא (30ש׳)
  fineBuckets   = false     // לא לכתוב minute/hour כברירת־מחדל
} = {}) => {
  if (!db || !uid || !eventId) return () => {};
  let stopped = false;
  let timer   = null;

  // נקודת ייחוס אחרונה שנכתבה
  let prev = { read: 0, write: 0, upload: 0 };

  // עזר לכתיבה אטומית מצטברת
  const addDeltaTx = (path, dr, dw, du) =>
    firebase.database()
      .ref(`Events/${uid}/${eventId}/__metrics/traffic/${path}`)
      .transaction((cur) => {
        const c = cur || {};
        return {
          readBytes:   _n(c.readBytes)   + dr,
          writeBytes:  _n(c.writeBytes)  + dw,
          uploadBytes: _n(c.uploadBytes) + du,
          updatedAt:   Date.now(),
        };
      });

  const flushIfChanged = async () => {
    if (stopped) return;

    // סופרי NetMeter (מופעל אצלך כבר)
    const t = NetMeter?.totals || { read: 0, write: 0, upload: 0 };

    // דלתא מאז הפלאש הקודם
    let dr = Math.max(0, _n(t.read)   - _n(prev.read));
    let dw = Math.max(0, _n(t.write)  - _n(prev.write));
    let du = Math.max(0, _n(t.upload) - _n(prev.upload));

    // עיגול קטן כדי לא לכתוב על תנודות זעירות (לכיוון 1KB)
    const roundTo = 1024;
    dr = Math.floor(dr / roundTo) * roundTo;
    dw = Math.floor(dw / roundTo) * roundTo;
    du = Math.floor(du / roundTo) * roundTo;

    const delta = dr + dw + du;
    if (delta < minDeltaBytes) return; // אין שינוי ממשי ⇒ לא כותבים

    const now = new Date();
    const dayKey   = keyDay(now);
    const weekKey  = keyWeek(now);
    const monthKey = keyMonth(now);

    try {
      // totals – מצטבר כל חיי האירוע
      await addDeltaTx(`totals`, dr, dw, du);

      // באקטים עיקריים בלבד: day/week/month
      const promises = [
        addDeltaTx(`day/${dayKey}`,     dr, dw, du),
        addDeltaTx(`week/${weekKey}`,   dr, dw, du),
        addDeltaTx(`month/${monthKey}`, dr, dw, du),
      ];
      // אם ממש צריך דיוק דק – ניתן להדליק minute/hour
      if (fineBuckets) {
        const hh = `${now.getUTCHours()}`.padStart(2,'0');
        const mm = `${now.getUTCMinutes()}`.padStart(2,'0');
        promises.push(
          addDeltaTx(`hour/${dayKey}T${hh}`, dr, dw, du),
          addDeltaTx(`minute/${dayKey}T${hh}:${mm}`, dr, dw, du),
        );
      }
      await Promise.all(promises);
    } catch (e) {
      console.warn('[traffic] write failed:', e?.message || e);
    } finally {
      // מעדכנים נקודת ייחוס – כך שבכניסה/יציאה מדף זה ימשיך להיספר נכון
      prev = { ...t };
    }
  };

  // ייחוס התחלתי = מצב נוכחי (לא מאפס מדידה קיימת)
  prev = { ...(NetMeter?.totals || { read: 0, write: 0, upload: 0 }) };

  // בדיקה “איטית” — לא כותבת אם אין שינוי
  timer = setInterval(flushIfChanged, intervalMs);

  // flush ביציאה/הסתרה (ווב) — כדי לא לאבד דלתא שנצברה
  const visHandler = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      flushIfChanged();
    }
  };
  const unloadHandler = () => flushIfChanged();

  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visHandler);
  if (typeof window   !== 'undefined') window.addEventListener('beforeunload', unloadHandler);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visHandler);
    if (typeof window   !== 'undefined') window.removeEventListener('beforeunload', unloadHandler);
  };
};

// רולאפים ל־byDay/byHour (היסטוריה) — גם כאן כותבים רק כשיש דלתא חדשה
export const startRollups = (db, uid, eventId, {
  minDeltaBytes = 1024,
  intervalMs    = 30_000,
  writeByHour   = true,   // אפשר לכבות אם רוצים אפילו פחות כתיבות
} = {}) => {
  if (!uid || !eventId) return () => {};
  let timer = null;

  let lastFlushed = { read: 0, write: 0, upload: 0 };
  const base = (p='') => firebase.database().ref(`Events/${uid}/${eventId}/__metrics/${p}`);

  const flushIfChanged = async () => {
    // ערכי נטמטר נוכחיים
    const t = NetMeter?.totals || { read: 0, write: 0, upload: 0 };

    // דלתא מאז הריצה הקודמת
    let dRead   = Math.max(0, _n(t.read)   - _n(lastFlushed.read));
    let dWrite  = Math.max(0, _n(t.write)  - _n(lastFlushed.write));
    let dUpload = Math.max(0, _n(t.upload) - _n(lastFlushed.upload));

    // עיגול ל־1KB
    const roundTo = 1024;
    dRead   = Math.floor(dRead   / roundTo) * roundTo;
    dWrite  = Math.floor(dWrite  / roundTo) * roundTo;
    dUpload = Math.floor(dUpload / roundTo) * roundTo;

    const delta = dRead + dWrite + dUpload;
    if (delta < minDeltaBytes) return; // אין שינוי ⇒ לא כותבים

    const now = new Date();
    const day = keyDay(now);
    const hour= `${now.getUTCHours()}`.padStart(2,'0');

    const addDeltaCompat = (v) => {
      const n = v || {};
      n.read   = _n(n.read   ?? n.readBytes)   + dRead;
      n.write  = _n(n.write  ?? n.writeBytes)  + dWrite;
      n.upload = _n(n.upload ?? n.uploadBytes) + dUpload;
      return n;
    };

    try {
      await base(`byDay/${day}/totals`).transaction(addDeltaCompat);
      if (writeByHour) {
        await base(`byDay/${day}/byHour/${hour}`).transaction(addDeltaCompat);
      }
      await base('lastUpdated').set(Date.now());
    } catch (e) {
      console.log('[rollups] write failed:', e?.message || e);
    } finally {
      lastFlushed = { ...t };
    }
  };

  // הפעלה “איטית”; לא כותב אם אין דלתא
  flushIfChanged();
  timer = setInterval(flushIfChanged, intervalMs);

  return () => { if (timer) clearInterval(timer); };
};




// מונה ביקורים/כניסות — נשמר תחת Events/{uid}/{eventId}/__admin/visits
const bumpVisitCounters = async (db, uid, eventId) => {
  if (!uid || !eventId) return;
  const base = (path='') => ref(db, `Events/${uid}/${eventId}/__admin/visits/${path}`);

  const now = new Date();
  const day   = _dayKey(now);
  const week  = Math.floor(now.getTime() / (1000*60*60*24*7));
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  try {
    await Promise.all([
      runTransaction(base(`day/${day}`),   v => (v||0)+1),
      runTransaction(base(`week/${week}`), v => (v||0)+1),
      runTransaction(base(`month/${month}`), v => (v||0)+1),
      set(ref(db, `Events/${uid}/${eventId}/__admin/visits/lastAt`), Date.now()),
    ]);
  } catch {}
};

// ===== עזרי Cache (עם גרסאות) =====
const CACHE_VER = 'v3';
const cacheKey = (uid, id, name) => `EV:${uid}:${id}:${name}:${CACHE_VER}`;
const loadCache = async (key, fallback = null) => {
  try { const s = await AsyncStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
};
const saveCache = async (key, data) => { try { await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {} };
const unwrap = (v) => (v && typeof v === 'object' && 'data' in v ? v.data : v);

// ===== נרמול סטטוס הודעות =====
const normalizeStatus = (rawStatus) => {
  const s = String(rawStatus || '').toLowerCase().trim();
  if (!s) return { label: 'בהמתנה', sev: 0 };
  if (/error|failed|undelivered|bounce|reject/.test(s)) return { label: 'שגיאה בשליחה', sev: 3 };
  if (/pending|queue|queued|waiting|scheduled|processing/.test(s)) return { label: 'ממתין לשליחה', sev: 2 };
  if (/sent|delivered|success|ok|accepted/.test(s)) return { label: 'נשלח', sev: 1 };
  return { label: 'בהמתנה', sev: 0 };
};

// ===== עזרי טלפון =====
const normPhone = (raw) => String(raw ?? '').replace(/[^0-9+]/g, '').replace(/^0/, '972').replace(/^\+972/, '972');
const toLocalPhone = (num = '') => String(num).replace(/[^0-9]/g, '').replace(/^972/, '0');
const formatPhoneNumber = (num = '') => String(num).replace(/[^0-9+]/g, '').replace(/^0/, '972').replace(/^\+972/, '972');
const phoneFromMsg = (m) => normPhone(m.formattedContacts || m.formattedContact || (Array.isArray(m.to) ? m.to[0] : m.to) || m.toNumber || '');

// ===== הקומפוננטה =====
function ListItem(props) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const id = props.route?.params?.id;
  const database = getDatabase();
const [user, setUser] = useState(null);
const adminLog = (action) => {
  try {
    const aRef = firebase.database().ref(`Events/${user?.uid}/${id}/__admin/audit`).push();
    aRef.set({ ts: Date.now(), action });
  } catch {}
};
// helpers (שים למעלה בקובץ)
const _hashStr = (str = '') => {
  // DJB2 hash יציב
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
};

const _dayKeyIL = (ms) => {
  // YYYY-MM-DD לפי אזור זמן ישראל
  return new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
};

// בתוך הקומפוננטה
const pushNotif = useCallback(async (title, body = '', extra = {}) => {
  try {
    if (!user?.uid || !id) return;

    const now = Date.now();
    const day = _dayKeyIL(now);

    // ✅ אותו תוכן => אותו notifId => אין כפילות
    const fp = `${String(title || '').trim()}|${String(body || '').trim()}`;
    const notifId = `${day}_${_hashStr(fp)}`;

    const notifPath = `Events/${user.uid}/${id}/__admin/notifications/${notifId}`;

    await firebase.database().ref(notifPath).set({
      ts: firebase.database.ServerValue.TIMESTAMP,
      clientTs: now,
      title,
      body,
      notifId,
      ...extra,
    });

  } catch (e) {
    console.warn('[pushNotif] failed:', e?.message || e);
  }
}, [user?.uid, id]);




// ========================= GUEST CHANGE ALERTS (RSVP / AMOUNT / BLESSING) =========================
const _normAmount = (v) => Number(String(v ?? 0).replace(/[^\d]/g, '')) || 0;
const _short = (s, n = 110) => {
  const t = String(s || '').trim();
  if (!t) return '';
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

// שומרים snapshot קודם כדי לזהות שינוי
const alertsPrimedRef = useRef({ contacts: false, responses: false });
const prevGiftRef = useRef({});      // { guestKey: { amount, blessing } }
const prevRespRef = useRef({});      // { guestKey: { response, guests } }
const localDedupeRef = useRef(new Set()); // ✅ הוסף את השורה הזו (זיכרון מקומי לחסימה מיידית)
// אינדקס שמות לפי recordID/id (כדי לקשר responses לשם)
const buildNameIndex = (contactsObj = {}) => {
  const map = {};
  Object.entries(contactsObj || {}).forEach(([fbKey, c]) => {
    const guestKey = c?.recordID || c?.id || c?.key || fbKey;
    const name = c?.displayName || c?.name || 'מוזמן';
    map[String(guestKey)] = name;
  });
  return map;
};

const emitGiftNotifs = useCallback((contactsObj = {}) => {
  // לא “מצפצף” על הטעינה הראשונה
  if (!alertsPrimedRef.current.contacts) {
    const init = {};
    Object.entries(contactsObj || {}).forEach(([fbKey, c]) => {
      const guestKey = String(c?.recordID || c?.id || c?.key || fbKey);
      init[guestKey] = {
        amount: _normAmount(c?.newPrice ?? c?.price ?? 0),
        blessing: String(c?.blessing ?? c?.bracha ?? c?.greeting ?? c?.note ?? c?.wish ?? '').trim(),
      };
    });
    prevGiftRef.current = init;
    alertsPrimedRef.current.contacts = true;
    return;
  }

  const prev = prevGiftRef.current || {};
  const next = {};

  // לצמצם ספאם: אם הגיעו המון עדכונים בבת אחת → התראה אחת
  const changes = [];

  Object.entries(contactsObj || {}).forEach(([fbKey, c]) => {
    const guestKey = String(c?.recordID || c?.id || c?.key || fbKey);
    const name = c?.displayName || c?.name || 'מוזמן';

    const amount = _normAmount(c?.newPrice ?? c?.price ?? 0);
    const blessing = String(c?.blessing ?? c?.bracha ?? c?.greeting ?? c?.note ?? c?.wish ?? '').trim();

    const p = prev[guestKey] || { amount: 0, blessing: '' };

    // סכום
    if (amount > 0 && amount !== (p.amount || 0)) {
      changes.push(() =>
        pushNotif(
          'עודכנה מתנה',
          `${name} הזין סכום: ₪${amount.toLocaleString('he-IL')}`,
          { type: 'gift_amount', guestKey, amount }
        )
      );
    }

    // ברכה
    if (blessing && blessing !== (p.blessing || '')) {
      changes.push(() =>
        pushNotif(
          'ברכה חדשה',
          `${name}: ${_short(blessing)}`,
          { type: 'gift_blessing', guestKey, blessing: _short(blessing, 200) }
        )
      );
    }

    next[guestKey] = { amount, blessing };
  });

  // אם יש יותר מדי שינויים בבת אחת (ייבוא/רענון), שלח סיכום אחד
  if (changes.length >= 6) {
    pushNotif('עדכונים חדשים במתנות', `עודכנו ${changes.length} פריטים (סכום/ברכה)`, { type: 'gift_bulk', count: changes.length });
  } else {
    changes.forEach((fn) => fn());
  }

  prevGiftRef.current = next;
}, [pushNotif]);

const emitRsvpNotifs = useCallback((responsesObj = {}, contactsObj = {}) => {
  // לא “מצפצף” על הטעינה הראשונה
  if (!alertsPrimedRef.current.responses) {
    const init = {};
    Object.entries(responsesObj || {}).forEach(([guestKey, r]) => {
      init[String(guestKey)] = {
        response: String(r?.response || '').trim(),
        guests: Number(r?.numberOfGuests ?? r?.numOfGuests ?? r?.guests ?? 0) || 0,
      };
    });
    prevRespRef.current = init;
    alertsPrimedRef.current.responses = true;
    return;
  }

  const nameIndex = buildNameIndex(contactsObj);
  const prev = prevRespRef.current || {};
  const next = {};
  const changes = [];

  Object.entries(responsesObj || {}).forEach(([guestKey, r]) => {
    const gk = String(guestKey);
    const resp = String(r?.response || '').trim();
    const guests = Number(r?.numberOfGuests ?? r?.numOfGuests ?? r?.guests ?? 0) || 0;

    const p = prev[gk] || { response: '', guests: 0 };
    next[gk] = { response: resp, guests };

    if (!resp || resp === p.response) return;

    // רק הסטטוסים שמעניינים אותך
    const ok = (resp === 'מגיע' || resp === 'לא מגיע' || resp === 'אולי' || resp === 'טרם השיבו');
    if (!ok) return;

    const name = nameIndex[gk] || 'מוזמן';
    const extraGuests = resp === 'מגיע' && guests > 0 ? ` (${guests})` : '';

    changes.push(() =>
      pushNotif(
        'עדכון סטטוס מוזמן',
        `${name} סימן: ${resp}${extraGuests}`,
        { type: 'rsvp_status', guestKey: gk, status: resp, guests }
      )
    );
  });

  if (changes.length >= 6) {
    pushNotif('עדכוני RSVP', `עודכנו ${changes.length} מוזמנים בסטטוס`, { type: 'rsvp_bulk', count: changes.length });
  } else {
    changes.forEach((fn) => fn());
  }

  prevRespRef.current = next;
}, [pushNotif]);

// ========================= NOTIFICATIONS (bell + badge) =========================
const [notifLastReadAt, setNotifLastReadAt] = useState(null);
const [notifMutedUntil, setNotifMutedUntil] = useState(0);
const [unreadNotifCount, setUnreadNotifCount] = useState(0);


// ✅ Local "seen"
const [localNotifSeenAt, setLocalNotifSeenAt] = useState(-1); // -1 = עדיין לא נטען
const latestNotifTsRef = useRef(0);

// ✅ קודם מגדירים, ואז משתמשים
const notifSeenHydrated = localNotifSeenAt > -1;
const notifReady = notifSeenHydrated && notifLastReadAt !== null;


const notifSeenKey = useMemo(() => {
  if (!user?.uid || !id) return null;
  return cacheKey(user.uid, id, 'notifSeenAt');
}, [user?.uid, id]);

useEffect(() => {
  if (!notifSeenKey) return;
  (async () => {
    const cached = await loadCache(notifSeenKey, 0);
    const v = Number(unwrap(cached) || 0);
    setLocalNotifSeenAt(v);
  })();
}, [notifSeenKey]);

const effectiveNotifSeenAt = useMemo(() => {
  const a = Number(notifLastReadAt || 0);
  const b = Number(localNotifSeenAt > -1 ? localNotifSeenAt : 0);
  return Math.max(a, b);
}, [notifLastReadAt, localNotifSeenAt]);




const notifLastReadPath = useMemo(() => {
  if (!user?.uid || !id) return null;
  return `Events/${user.uid}/${id}/__meta/notificationsLastReadAt`;
}, [user?.uid, id]);

const notifListPath = useMemo(() => {
  if (!user?.uid || !id) return null;
  return `Events/${user.uid}/${id}/__admin/notifications`;
}, [user?.uid, id]);




const notifMutedPath = useMemo(() => {
  if (!user?.uid || !id) return null;
  return `Events/${user.uid}/${id}/__meta/notificationsMutedUntil`;
}, [user?.uid, id]);
useEffect(() => {
  if (!notifMutedPath) return;
  const r = ref(database, notifMutedPath);

  const unsub = meteredOnValue(r, (snap) => {
    const v = snap.val();
    setNotifMutedUntil(typeof v === 'number' ? v : 0);
  });

  return () => { try { unsub?.(); } catch {} };
}, [database, notifMutedPath]);

  // מידות
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 600;
  const isDesktop = screenW >= 992;
  const isMobile = screenW < 600;
  const isNarrowHeader = screenW < 420;

  const CONTENT_MAX_W = 980;
  const GRID_COLS = isDesktop ? 5 : isTablet ? 4 : 2;
  const GRID_GAP = 12;
  const GRID_W = Math.min(screenW * 0.96, CONTENT_MAX_W);
  const BTN_W = Math.floor((GRID_W - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS);

  const CAROUSEL_AR = isDesktop ? 16 / 6 : 16 / 9;
  const CAROUSEL_W = Math.min(screenW * 0.96, CONTENT_MAX_W);
  const CAROUSEL_H = Math.round(CAROUSEL_W / CAROUSEL_AR);

  // ===== תמה ונגישות =====
  const [a11yOpen, setA11yOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [textBold, setTextBold] = useState(false);
  const [readabilityMode, setReadabilityMode] = useState(false);
  const [bigTargets, setBigTargets] = useState(false);
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('auto');
  const applyingRemoteThemeRef = useRef(false);
// ========================= NOTIFICATIONS PANEL (inside ListItem) =========================
const [notifOpen, setNotifOpen] = useState(false);
const [notifLoading, setNotifLoading] = useState(true);
const [notifItems, setNotifItems] = useState([]); // [{key, title, body, ts, ...}]
const [notifBaselineAt, setNotifBaselineAt] = useState(0); // קו בסיס להדגשת "חדש"





  const isDark = useMemo(() => themeMode === 'dark' || (themeMode === 'auto' && systemScheme === 'dark'), [themeMode, systemScheme]);
// ===== Theme -> Firebase logging (event-local) =====
const themeHydratedRef = useRef(false);
const prevThemeModeRef = useRef(null);
const pendingThemeWriteRef = useRef(null);

const writeThemeModeToFirebase = useCallback(async (modeToWrite) => {
  if (!user?.uid || !id) {
    pendingThemeWriteRef.current = modeToWrite;
    return;
  }

  const resolvedIsDark =
    modeToWrite === 'dark' || (modeToWrite === 'auto' && systemScheme === 'dark');

  const payload = {
    mode: modeToWrite,                  // "auto" | "dark" | "light"
    systemScheme: systemScheme || null, // "dark" | "light" | null
    resolvedIsDark,                     // true/false
    platform: Platform.OS,              // ios/android/web
    ts: Date.now(),
  };

  try {
    // ✅ כאן זה יישב בדיוק איפה שרצית:
    await firebase
      .database()
      .ref(`Events/${user.uid}/${id}/__admin/ui/theme`)
      .update(payload);

    // אופציונלי: היסטוריה
    firebase
      .database()
      .ref(`Events/${user.uid}/${id}/__admin/ui/themeHistory`)
      .push(payload);

  } catch (e) {
    console.warn('[theme] firebase write failed:', e?.message || e);
  }
}, [user?.uid, id, systemScheme]);


  // טעינות
  const [eventLoaded, setEventLoaded] = useState(false);
  const [checkboxLoaded, setCheckboxLoaded] = useState(false);
  const [eventExists, setEventExists] = useState(true);
  const hydrated = eventLoaded && checkboxLoaded;

  const resetA11y = () => { setFontScale(1); setHighContrast(false); setReduceMotion(false); setTextBold(false); setReadabilityMode(false); setBigTargets(false); };

  const headerBtnSize = (isNarrowHeader ? 30 : 36) + (bigTargets ? 6 : 0);
  const iconSize = (isNarrowHeader ? 16 : 18) + (bigTargets ? 2 : 0);
const ACTIONS_W = headerBtnSize * 3 + 16; // ✅ מקום ל-3 אייקונים

  const HEADER_FONT = isDesktop ? 22 : isTablet ? 20 : screenW < 340 ? 10 : screenW < 380 ? 12 : 14;

  const COLORS = useMemo(() => {
    if (highContrast) {
      if (isDark) return { bg:'#000', text:'#fff', subtext:'#e6e6e6', card:'#000', cardBorder:'#fff', chipBg:'#111', chipBorder:'#fff', inputBg:'#111', placeholder:'#bbb', primary:'#FFD400', onPrimary:'#000', tableHeaderBg:'#222', tableHeaderText:'#fff', countdownBg:'#111', countdownText:'#FFD400', trAlt:'#111', status:{greenBg:'#0f3f0f',yellowBg:'#3f3a0f',redBg:'#3f0f14',orangeBg:'#43260f'} };
      return { bg:'#fff', text:'#000', subtext:'#111', card:'#fff', cardBorder:'#000', chipBg:'#eee', chipBorder:'#000', inputBg:'#f2f2f2', placeholder:'#555', primary:'#000', onPrimary:'#fff', tableHeaderBg:'#ddd', tableHeaderText:'#000', countdownBg:'#f2f2f2', countdownText:'#000', trAlt:'#f2f2f2', status:{greenBg:'#bde5c8',yellowBg:'#ffe9a8',redBg:'#f7c2c2',orangeBg:'#ffd8b0'} };
    }
    if (isDark) return { bg:'#0e1113', text:'#f5f6f8', subtext:'#cfd3d7', card:'#14181b', cardBorder:'#2a2f35', chipBg:'#1b2024', chipBorder:'#2a2f35', inputBg:'#1b2024', placeholder:'#9aa3ac', primary:'#6c63ff', onPrimary:'#ffffff', tableHeaderBg:'rgba(108,99,255,0.18)', tableHeaderText:'#e5e6ff', countdownBg:'#1b2024', countdownText:'#cfc9ff', trAlt:'#161a1e', status:{greenBg:'#2a3b2f',yellowBg:'#403a21',redBg:'#40262a',orangeBg:'#4a2e1e'} };
    return { bg:'#ffffff', text:'#111', subtext:'#34495e', card:'#ffffff', cardBorder:'#e6e6e6', chipBg:'#f2f2f2', chipBorder:'#e6e6e6', inputBg:'#f4f4f4', placeholder:'#888', primary:'#6c63ff', onPrimary:'#ffffff', tableHeaderBg:'rgba(108,99,255,0.12)', tableHeaderText:'#333', countdownBg:'#fff0f5', countdownText:'rgba(108, 99, 255, 0.9)', trAlt:'#fafafa', status:{greenBg:'#d4edda',yellowBg:'#fff3cd',redBg:'#f8d7da',orangeBg:'#ffe1cc'} };
  }, [isDark, highContrast]);

  const t = (size, colorOverride) => ({ fontSize: Math.round(size * fontScale), color: colorOverride ?? COLORS.text, ...(textBold ? { fontWeight: '700' } : {}), ...(readabilityMode ? { letterSpacing: 0.4, lineHeight: Math.round(size * fontScale * 1.35) } : {}) });
  const hit = bigTargets ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined;

  // ========================= DATA =========================
  const [eventDetails, setEventDetails] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isScheduled_contact, setIsScheduled_contact] = useState(true);
  const [isScheduled_table, setIsScheduled_table] = useState(true);
  const [isScheduled_rspv, setIsScheduled_rspv] = useState(true);
  const [displayCash, setDisplayCash] = useState(0);
  const [displayTables, setDisplayTables] = useState(0);
  const cashAnim = useRef(new Animated.Value(0)).current;
  const tableAnim = useRef(new Animated.Value(0)).current;
  const [daysLeft, setDaysLeft] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [guestRows, setGuestRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [databaseRef2, setDatabaseRef2] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePath, setSelectedImagePath] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imagesToShow = selectedImage ? [{ uri: selectedImage }] : imagesFallback;
  const scrollRef = useRef(null);
  const latestWhatsStatusRef = useRef({});

  // שורת "מד רשת" במסך
  const [netLine, setNetLine] = useState('');
  useEffect(() => {
    const unsub = NetMeter.subscribe((s) => {
      setNetLine(
        `[NET 2s] read=${(s.rateRead/1e6).toFixed(3)} MB/s, ` +
        `write=${(s.rateWrite/1e6).toFixed(3)} MB/s, ` +
        `upload=${(s.rateUpload/1e6).toFixed(3)} MB/s | totals ` +
        `read=${(s.totalRead/1e6).toFixed(2)} MB, ` +
        `write=${(s.totalWrite/1e6).toFixed(2)} MB, ` +
        `upload=${(s.totalUpload/1e6).toFixed(2)} MB`
      );
    });
    return unsub;
  }, []);

  enableLogging((msg) => console.log('[RTDB]', msg));

  // ========================= AUTH =========================
  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged((currentUser) => setUser(currentUser));
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) setDatabaseRef2(ref(database, `Events/${currentUser.uid}/${id}/checkbox`));
      else { setDatabaseRef2(null); navigation.replace('LoginEmail'); }
    });
    return () => unsub();
  }, [database, id, navigation]);

  // הפעלת רולאפים ומוני כניסות כשהמשתמש מחובר והאירוע טעון
  useEffect(() => {
    if (!user || !id) return;
    const stop = startRollups(database, user.uid, id);
    bumpVisitCounters(database, user.uid, id);
    return () => { if (stop) stop(); };
  }, [user, id, database]);

  // תמה — טעינה/שמירה ב־AsyncStorage
// תמה — טעינה מ-AsyncStorage (לא לוג בפעם הראשונה)
useEffect(() => {
  (async () => {
    try {
      const saved = await AsyncStorage.getItem('themeMode');
      if (['auto', 'light', 'dark'].includes(saved)) {
        setThemeMode(saved);
      }
    } catch {}
    finally {
      themeHydratedRef.current = true;
    }
  })();
}, []);

// תמה — שמירה ל-AsyncStorage + כתיבה לפיירבייס רק כשבאמת השתנה (אחרי hydration)
useEffect(() => {
  AsyncStorage.setItem('themeMode', themeMode).catch(() => {});

  if (!themeHydratedRef.current) return;

  // ✅ אם זה עדכון שהגיע מהפיירבייס — לא עושים echo לשרת
  if (applyingRemoteThemeRef.current) return;

  if (prevThemeModeRef.current === null) {
    prevThemeModeRef.current = themeMode;
    return;
  }

  if (prevThemeModeRef.current === themeMode) return;

  prevThemeModeRef.current = themeMode;
  writeThemeModeToFirebase(themeMode);
}, [themeMode, writeThemeModeToFirebase]);

useEffect(() => {
  const nav = props.navigation ?? navigation;
  const s = nav.getState?.();
  console.log('routeNames:', s?.routeNames);
  console.log('routes:', s?.routes?.map(r => r.name));
}, []);
const markNotificationsRead = useCallback(async (seenAtOverride) => {
  if (!user?.uid || !id) return;

  const seenAt = Number(seenAtOverride || latestNotifTsRef.current || Date.now());

  // UI מיידי
  setLocalNotifSeenAt(seenAt);
  if (notifSeenKey) saveCache(notifSeenKey, seenAt);

  // Firebase
  try {
    await update(ref(database, `Events/${user.uid}/${id}/__meta`), {
      notificationsLastReadAt: seenAt,
    });
  } catch (e) {
    console.warn('[markNotificationsRead] failed:', e);
  }
}, [user?.uid, id, database, notifSeenKey]);

const closeNotifCenter = useCallback(() => {
  setNotifOpen(false);

  const newestTs =
    Number(latestNotifTsRef.current) ||
    Number(notifItems?.[0]?.ts) ||
    Date.now();

  markNotificationsRead(newestTs);
}, [markNotificationsRead, notifItems]);

// אם המשתמש/אירוע נטענים אחרי שכבר החלפת תמה — נכתוב כשזה נהיה זמין
useEffect(() => {
  if (user?.uid && id && pendingThemeWriteRef.current) {
    const mode = pendingThemeWriteRef.current;
    pendingThemeWriteRef.current = null;
    writeThemeModeToFirebase(mode);
  }
}, [user?.uid, id, writeThemeModeToFirebase]);
const cycleThemeMode = () => {
  setThemeMode((m) => (m === 'auto' ? 'dark' : m === 'dark' ? 'light' : 'auto'));
};

  const themeIconName = themeMode === 'auto' ? 'contrast' : isDark ? 'sunny' : 'moon';
  const themeA11yLabel = themeMode === 'auto' ? 'מצב מערכת (אוטומטי)' : isDark ? 'מצב כהה' : 'מצב בהיר';
// 1) מאזין ל-lastReadAt
useEffect(() => {
  if (!notifLastReadPath) return;
  const r = ref(database, notifLastReadPath);

  const unsub = meteredOnValue(r, (snap) => {
    const v = snap.val();
setNotifLastReadAt(Number(v) || 0);
  });

return () => { try { unsub?.(); } catch {} };

}, [database, notifLastReadPath]);

// 2) מאזין להתראות ומחשב כמה לא נקראו (ts > lastReadAt)
useEffect(() => {
  if (!notifListPath) return;

  const r = query(
    ref(database, notifListPath),
    orderByChild('clientTs'),
    limitToLast(50)
  );

  const unsub = meteredOnValue(r, (snap) => {
    const obj = snap.val() || {};
    const arr = Object.values(obj);

    const lastRead = Number(effectiveNotifSeenAt || 0);

    const unread = arr.reduce((acc, n) => {
      const ts = Number(n?.clientTs || n?.ts || 0);
      return ts > lastRead ? acc + 1 : acc;
    }, 0);

    setUnreadNotifCount(unread);
  });

  return () => { try { unsub?.(); } catch {} };
}, [database, notifListPath, effectiveNotifSeenAt]);


const muteNotifications = useCallback(async () => {
  if (!user?.uid || !id || !notifListPath) return;

  try {
    // נביא את ההתראה האחרונה לפי ts (server time)
    const qLast = query(
      ref(database, notifListPath),
      orderByChild('ts'),
      limitToLast(1)
    );

    const snap = await meteredGet(qLast);

    let latestTs = 0;
    if (snap.exists()) {
      const v = snap.val() || {};
      const only = Object.values(v)[0];
      latestTs = typeof only?.ts === 'number' ? only.ts : 0;
    }

    // עד כאן נחשב כ"נראה" (אם אין כלום, לפחות עכשיו)
    const until = Math.max(latestTs || 0, Date.now(), notifLastReadAt || 0);

    await update(ref(database, `Events/${user.uid}/${id}/__meta`), {
      notificationsMutedUntil: until,
      notificationsLastReadAt: Math.max(notifLastReadAt || 0, until),
    });

    // UI מיידי
    setNotifMutedUntil(until);
    setNotifOpen(false);
  } catch (e) {
    console.warn('[notif] mute failed:', e?.message || e);
  }
}, [user?.uid, id, database, notifListPath, notifLastReadAt]);


// 3) מאזין לתוכן ההתראות (לרשימה בתוך המסך)

useEffect(() => {
  if (!notifListPath) return;

  setNotifLoading(true);

  const r = query(
    ref(database, notifListPath),
    orderByChild('clientTs'),
    limitToLast(80)
  );

  const unsub = meteredOnValue(r, (snap) => {
    const v = snap.val() || {};
    const arr = Object.entries(v).map(([key, n]) => ({ key, ...(n || {}) }));

    // חדש->ישן לפי clientTs
    arr.sort((a, b) => Number(b.clientTs || b.ts || 0) - Number(a.clientTs || a.ts || 0));

    latestNotifTsRef.current = Number(arr[0]?.clientTs || arr[0]?.ts || 0);
    setNotifItems(arr);
    setNotifLoading(false);
  }, () => setNotifLoading(false));

  return () => { try { unsub?.(); } catch {} };
}, [database, notifListPath]);


  // ========================= EVENT =========================
// ========================= EVENT (LIVE - compat) =========================
useEffect(() => {
  if (!user?.uid || !id) return;

  let cancelled = false;
  const k = cacheKey(user.uid, id, 'event');
  const r = firebase.database().ref(`Events/${user.uid}/${id}`);

  // 1) cache מהיר
  (async () => {
    const cached = await loadCache(k);
    if (!cancelled && cached) {
      setEventDetails(unwrap(cached) || {});
      setEventExists(true);
    }
  })();

  // 2) realtime
  const handler = (snap) => {
    const data = snap.val() || {};
    if (cancelled) return;

    setEventExists(snap.exists());
    setEventDetails(data);
    saveCache(k, data);
    setEventLoaded(true);

    // DEBUG (אפשר למחוק אחרי שאתה רואה שזה עובד)
    // console.log('[EVENT LIVE]', { yes: data.yes_caming, no: data.no_cuming, maybe: data.maybe, wait: data.no_answear });
  };

  const errHandler = (err) => {
    console.warn('[EVENT LIVE] error:', err?.message || err);
    setEventLoaded(true);
  };

  r.on('value', handler, errHandler);

  return () => {
    cancelled = true;
    r.off('value', handler);
  };
}, [user?.uid, id]);


  // ========================= CHECKBOX =========================
  useEffect(() => {
    if (!user || !id) return;
    const checkboxRef = ref(database, `Events/${user.uid}/${id}/checkbox`);
    const unsub = meteredOnValue(checkboxRef, (snap) => {
      if (!snap.exists()) { setDontShowAgain(false); setCheckboxLoaded(true); return; }
      const v = snap.val();
      setDontShowAgain(v === 1 || v === '1' || v === true);
      setCheckboxLoaded(true);
    });
return () => { try { unsub?.(); } catch {} };
  }, [user, id, database]);

  const handleCheckboxChange = async () => {
    const newValue = !dontShowAgain;
    setDontShowAgain(newValue);
    try {
      if (databaseRef2) await meteredSet(databaseRef2, newValue ? 1 : 0);
      else if (user) await meteredSet(ref(database, `Events/${user.uid}/${id}/checkbox`), newValue ? 1 : 0);
    } catch {}
    if (newValue) setIsModalVisible(false);
  };

  useEffect(() => {
  if (!user?.uid || !id) return;
  const stopRollups = startRollups(database, user.uid, id);
const stopTraffic = startTrafficBuckets(database, user.uid, id, { intervalMs: 10_000 });
  bumpVisitCounters(database, user.uid, id);
  return () => {
    stopRollups?.();
    stopTraffic?.();
  };
}, [user?.uid, id, database]);
  // אינדיקטורים
  useEffect(() => {
    const data = eventDetails || {};
    setIsScheduled_contact(!data?.contacts);
    setIsScheduled_table(!data?.tables);
    setIsScheduled_rspv(!data?.message);
  }, [eventDetails]);

  useEffect(() => {
    if (!hydrated || !isFocused || !eventExists) return;
    const needSetup = !eventDetails?.contacts || !eventDetails?.tables || !eventDetails?.message;
    const noShow = dontShowAgain || eventDetails?.checkbox === 1 || eventDetails?.checkbox === '1' || eventDetails?.checkbox === true;
    setIsModalVisible(needSetup && !noShow);
  }, [hydrated, isFocused, eventExists, eventDetails, dontShowAgain]);

  useEffect(() => { if (!isFocused) setIsModalVisible(false); }, [isFocused]);

  // ========================= תמונה ראשית =========================
  const fetchImageFromStorage = async () => {
    try {
      const storageRef = firebase.storage().ref();
      const imagePath = `users/${user.uid}/${id}/main_carusela/`;
      const listResult = await storageRef.child(imagePath).listAll();
      if (listResult.items.length > 0) {
        const firstImageRef = listResult.items[0];
        const downloadURL = await firstImageRef.getDownloadURL();
        setSelectedImage(downloadURL);
        setSelectedImagePath(firstImageRef.fullPath);
      } else { setSelectedImage(null); setSelectedImagePath(null); }
    } catch { Alert.alert('שגיאה', 'לא ניתן לטעון את התמונה.'); }
  };
  useEffect(() => { if (user && id) fetchImageFromStorage(); }, [user, id]);

  useEffect(() => {
    if (!user || !id) return;
    const databaseRefMain = ref(database, `Events/${user.uid}/${id}/mainImage`);
    const unsub = meteredOnValue(databaseRefMain, (snapshot) => {
      const data = snapshot.val();
      if (data?.imageURL) setSelectedImage(data.imageURL);
      setSelectedImagePath(data?.path ?? null);
    });
return () => { try { unsub(); } catch {} };
  }, [user, id, database]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4,3], quality: 1 });
      if (result.canceled) return;

      const imageName = result.assets[0].uri.split('/').pop();
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const storageRef = firebase.storage().ref();
      const imageRef = storageRef.child(`users/${user.uid}/${id}/main_carusela/${imageName}`);

      const uploadTask = trackUploadTask(imageRef.put(blob));
      setUploading(true); setUploadProgress(0);

      uploadTask.on(
        'state_changed',
        (snap) => { if (snap.totalBytes > 0) setUploadProgress(snap.bytesTransferred / snap.totalBytes); },
        () => { setUploading(false); Alert.alert('שגיאה', 'לא ניתן להעלות את התמונה.'); },
        async () => {
          const downloadURL = await imageRef.getDownloadURL();
          setSelectedImage(downloadURL);
          setSelectedImagePath(imageRef.fullPath);
          try { await meteredSet(ref(database, `Events/${user.uid}/${id}/mainImage`), { imageURL: downloadURL, path: imageRef.fullPath }); }
          catch {}
          setUploading(false);
        }
      );
    } catch { setUploading(false); Alert.alert('שגיאה', 'לא ניתן לבחור תמונה.'); }
  };

  const confirmDeleteNative = () =>
    new Promise((resolve) => {
      Alert.alert('מחיקת תמונה','למחוק את התמונה ולהחזיר לקרוסלה?',[
        { text:'בטל', style:'cancel', onPress:()=>resolve(false) },
        { text:'מחק', style:'destructive', onPress:()=>resolve(true) },
      ],{ cancelable:true });
    });

  const deleteSelectedImage = async () => {
    try {
      const ok = Platform.OS === 'web' ? window.confirm('למחוק את התמונה ולהחזיר לקרוסלה?') : await confirmDeleteNative();
      if (!ok) return;
      setUploading(true);
      try {
        if (selectedImagePath) await firebase.storage().ref().child(selectedImagePath).delete();
        else if (selectedImage && selectedImage.startsWith('http')) await firebase.storage().refFromURL(selectedImage).delete();
      } catch(e){ console.warn('Storage delete error:', e?.message || e); }
      try { await remove(ref(database, `Events/${user?.uid}/${id}/mainImage`)); } catch(e){ console.warn('DB remove error:', e?.message || e); }
      setSelectedImage(null); setSelectedImagePath(null);
    } catch(e){ Alert.alert('שגיאה', e?.message || 'לא ניתן למחוק את התמונה.'); }
    finally { setUploading(false); }
  };

  // קרוסלה
  useEffect(() => {
    if (!scrollRef.current || selectedImage) return;
    const intervalId = setInterval(() => {
      scrollRef.current?.scrollTo({ x: Math.floor((Date.now() / 5000) % imagesToShow.length) * CAROUSEL_W, animated: true });
    }, 5000);
    return () => clearInterval(intervalId);
  }, [imagesToShow.length, selectedImage, CAROUSEL_W]);

  // ========================= ספירת ימים =========================
  useEffect(() => {
    const targetDate = new Date(eventDetails.eventDate);
    const interval = setInterval(() => {
      const currentDate = new Date();
      const timeDiff = targetDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      if (isNaN(daysDiff)) setDaysLeft('');
      else if (daysDiff > 0) setDaysLeft(`🎉 עוד ${daysDiff} ימים לאירוע הגדול! 🎉`);
      else if (daysDiff === 0) setDaysLeft('🎉 בשעה טובה! 🎉');
      else setDaysLeft('🎉 האירוע מאחורינו 🎉');
    }, 1000);
    return () => clearInterval(interval);
  }, [eventDetails.eventDate]);
const confirmClearNotifs = () =>
  new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm('למחוק את כל ההתראות מהאירוע?'));
      return;
    }
    Alert.alert(
      'ניקוי התראות',
      'למחוק את כל ההתראות מהאירוע?',
      [
        { text: 'בטל', style: 'cancel', onPress: () => resolve(false) },
        { text: 'נקה', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true }
    );
  });

const clearAllNotifications = useCallback(async () => {
  if (!user?.uid || !id || !notifListPath) return;

  const ok = await confirmClearNotifs();
  if (!ok) return;

  const now = Date.now();
  const seenAt = Math.max(
    now,
    Number(latestNotifTsRef.current || 0),
    Number(effectiveNotifSeenAt || 0)
  );

  try {
    // 1) מחיקה מלאה של ההתראות מהאירוע
    await remove(ref(database, notifListPath));

    // 2) עדכון meta כדי שלא יקפוץ שוב + איפוס "חדש"
    await update(ref(database, `Events/${user.uid}/${id}/__meta`), {
      notificationsLastReadAt: seenAt,
      notificationsMutedUntil: seenAt,
    });

    // 3) UI מיידי
    latestNotifTsRef.current = seenAt;
    setNotifItems([]);
    setUnreadNotifCount(0);
    setNotifBaselineAt(seenAt);
    setLocalNotifSeenAt(seenAt);
    if (notifSeenKey) saveCache(notifSeenKey, seenAt);
  } catch (e) {
    console.warn('[notif] clear failed:', e?.message || e);
    if (Platform.OS !== 'web') Alert.alert('שגיאה', 'לא הצלחתי לנקות התראות');
  }
}, [user?.uid, id, database, notifListPath, effectiveNotifSeenAt, notifSeenKey]);

  // ========================= טבלת מוזמנים — Cache + Live =========================
  const findTableByPhone = useCallback((phone, tablesObj) => {
    for (const tblKey in tablesObj) {
      const guests = tablesObj[tblKey]?.guests || {};
      for (const g of Object.values(guests)) {
        if (formatPhoneNumber(g.phoneNumbers) === phone) {
          return { name: tablesObj[tblKey].displayName, number: tablesObj[tblKey].numberTable, key: tblKey };
        }
      }
    }
    return null;
  }, []);


  // ... existing state ...
// ===== אנימציות נגישות =====
const a11yAnim = useRef(new Animated.Value(0)).current; // 0 = סגור, 1 = פתוח

const toggleA11yPanel = () => {
  const next = !a11yOpen;
  setA11yOpen(next);
  
  Animated.spring(a11yAnim, {
    toValue: next ? 1 : 0,
    useNativeDriver: true,
    friction: 7,
    tension: 40
  }).start();
};

const a11yTranslateY = a11yAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [20, 0] // גלישה קלה מלמטה
});

const a11yOpacity = a11yAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 1]
});

const fabRotate = a11yAnim.interpolate({
  inputRange: [0, 1],
  outputRange: ['0deg', '45deg'] // סיבוב ה-X
});

  const hydratedFromCacheRef = useRef(false);
  const rebuildScheduledRef = useRef(false);

  const rebuild = useCallback((contacts, tables, responses) => {
    const statusByPhone = latestWhatsStatusRef.current || {};
    const seen = new Set();
    const rows = [];

    Object.values(contacts || {}).forEach((c) => {
      const phone = normPhone(c.phoneNumbers);
      if (!phone || seen.has(phone)) return;
      seen.add(phone);

      const guestKey = c.recordID || c.id || c.key;
      const respObj = (responses || {})[guestKey] || {};
      const resp = respObj.response;

      const tsRaw = respObj.timestamp;
      const tsText = tsRaw ? new Date(tsRaw).toLocaleString('he-IL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';

      const guestsCnt = Number(respObj.numberOfGuests ?? respObj.numOfGuests ?? respObj.guests ?? 0);

      const wa = statusByPhone[phone]; // {label, sev}
      let statusText = 'בהמתנה', statusClr = 'grey';
      if (wa && wa.sev === 3) { statusText = 'שגיאה בשליחה'; statusClr = 'orange'; }
      else if (resp) { statusText = resp; statusClr = resp === 'מגיע' ? 'green' : resp === 'אולי' ? 'yellow' : 'red'; }
      else if (wa && wa.sev === 2) { statusText = 'ממתין לשליחה'; statusClr = 'grey'; }
      else if (wa && wa.sev === 1) { statusText = 'נשלח'; statusClr = 'blue'; }

      const tbl = findTableByPhone(phone, tables || {});
      const amount = Number(String(c.newPrice || c.price || 0).replace(/[^\d]/g, ''));

      rows.push({ no: rows.length + 1, name: c.displayName, phone, table: tbl?.name || tbl?.number || '', tableKey: tbl?.key || '', statusText, statusClr, guests: guestsCnt, updateTime: tsText, amount });
    });

    setGuestRows((prev) => (rows.length === 0 && prev.length > 0 ? prev : rows));

    const totalCash = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalTables = Object.keys(tables || {}).length;

    Animated.timing(cashAnim, { toValue: totalCash, duration: reduceMotion ? 0 : 1500, useNativeDriver: false }).start();
    Animated.timing(tableAnim, { toValue: totalTables, duration: reduceMotion ? 0 : 1500, useNativeDriver: false }).start();
  }, [cashAnim, tableAnim, reduceMotion, findTableByPhone]);

  const maybeRebuild = () => {
    if (rebuildScheduledRef.current) return;
    rebuildScheduledRef.current = true;
    setTimeout(() => { rebuildScheduledRef.current = false; rebuild(memRefs.current.contacts, memRefs.current.tables, memRefs.current.responses); }, 0);
  };

  const memRefs = useRef({ contacts: {}, tables: {}, responses: {} });

  useEffect(() => {
    if (!user || !id) return;

    const ckC = cacheKey(user.uid, id, 'contacts');
    const ckT = cacheKey(user.uid, id, 'tables');
    const ckR = cacheKey(user.uid, id, 'responses');
    const ckW = cacheKey(user.uid, id, 'whatsapp');

    (async () => {
      const [c0, t0, r0, w0] = await Promise.all([loadCache(ckC), loadCache(ckT), loadCache(ckR), loadCache(ckW)]);
      memRefs.current.contacts  = unwrap(c0) || {};
      memRefs.current.tables    = unwrap(t0) || {};
      memRefs.current.responses = unwrap(r0) || {};
      latestWhatsStatusRef.current = unwrap(w0) || {};
      rebuild(memRefs.current.contacts, memRefs.current.tables, memRefs.current.responses);
      hydratedFromCacheRef.current = true;
    })();

    const cRef = ref(database, `Events/${user.uid}/${id}/contacts`);
    const tRef = ref(database, `Events/${user.uid}/${id}/tables`);
    const rRef = ref(database, `Events/${user.uid}/${id}/responses`);
    const mRef = ref(database, `whatsapp/${user.uid}/${id}`);


const unsubC = meteredOnValue(cRef, (s) => {
  memRefs.current.contacts = s.val() || {};
  saveCache(ckC, memRefs.current.contacts);

  // ✅ התראות על כסף/ברכה כש־contacts משתנה
  emitGiftNotifs(memRefs.current.contacts);

  // ❌ אל תפעיל RSVP מפה (זה יוצר prime עם {})
  // emitRsvpNotifs(memRefs.current.responses, memRefs.current.contacts);

  maybeRebuild();
});


const unsubR = meteredOnValue(rRef, (s) => {
  memRefs.current.responses = s.val() || {};
  saveCache(ckR, memRefs.current.responses);

  // ✅ התראות על שינוי סטטוס RSVP כש־responses משתנה
  emitRsvpNotifs(memRefs.current.responses, memRefs.current.contacts);

  maybeRebuild();
});

const unsubM = meteredOnValue(mRef, (snap) => {
  const statusByPhone = {};
  if (snap.exists()) {
    Object.values(snap.val()).forEach((msg) => {
      const p = phoneFromMsg(msg); if (!p) return;
      const raw = msg.status || msg.messageStatus || msg.deliveryStatus || msg.state || '';
      const norm = normalizeStatus(raw);
      const prev = statusByPhone[p];
      if (!prev || norm.sev > prev.sev) statusByPhone[p] = norm;
    });
  }
  latestWhatsStatusRef.current = statusByPhone;
  saveCache(ckW, statusByPhone);

  // ❌ להסיר מכאן את emitGiftNotifs / emitRsvpNotifs
  maybeRebuild();
});



    const unsubT = meteredOnValue(tRef, (s) => { memRefs.current.tables   = s.val() || {}; saveCache(ckT, memRefs.current.tables);   maybeRebuild(); });


return () => {
  try { unsubC(); } catch {}
  try { unsubT(); } catch {}
  try { unsubR(); } catch {}
  try { unsubM(); } catch {}
};
  }, [user, id, database, rebuild]);

  // אנימציות
  useEffect(() => {
    const cashL = cashAnim.addListener(({ value }) => setDisplayCash(Math.round(value)));
    const tblsL = tableAnim.addListener(({ value }) => setDisplayTables(Math.round(value)));
    return () => { cashAnim.removeListener(cashL); tableAnim.removeListener(tblsL); };
  }, [cashAnim, tableAnim]);


 const updateLastLoginUser = async (uid) => {
   if (!uid) return;
   await firebase.database()
     .ref(`users/${uid}/lastLoginAt`)
     .set(firebase.database.ServerValue.TIMESTAMP);
 };

// ---- 2) event-level (זה מה שהדשבורד מציג) ----
const markEventLogin = async (uid, eventId) => {
  if (!uid || !eventId) return;
  const db = firebase.database();
  const updates = {
    [`Events/${uid}/${eventId}/__meta/lastLoginAt`]:
      firebase.database.ServerValue.TIMESTAMP,
  };
  await db.ref().update(updates);
};

// ---- מאזין auth יחיד בלבד ----
useEffect(() => {
  const unsub = firebase.auth().onAuthStateChanged(async (currentUser) => {
    setUser(currentUser); // אם כבר יש לך setUser – תשאיר
    if (currentUser) {
      // עדכון כללי למשתמש (אופציונלי)
      updateLastLoginUser(currentUser.uid).catch(()=>{});
    } else {
      // ניתוק – נווט למסך כניסה אם צריך
      // navigation.replace('LoginEmail');
    }
    console.log('LISTITEM compat currentUser =', firebase.auth().currentUser?.uid);

  });
  return () => unsub();
}, []);

// ---- בכל פעם שהמסך בפוקוס ויש user+eventId – עדכן באירוע ----
useEffect(() => {
  if (user?.uid && id && isFocused) {
    markEventLogin(user.uid, id).catch((e) =>
      console.log('markEventLogin failed:', e?.message || e)
    );
  }
}, [user?.uid, id, isFocused]);


  // מיון/חיפוש/סינון
  const getFilteredRows = () => {
    let filtered = guestRows
      .filter((r) => statusFilter === 'all' ? true : statusFilter === 'green' ? r.statusClr === 'green' : statusFilter === 'yellow' ? r.statusClr === 'yellow' : statusFilter === 'red' ? r.statusClr === 'red' : true)
      .filter((r) => (r.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (r.phone || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
    if (sortBy) {
      filtered.sort((a,b) => {
        const valA=a[sortBy], valB=b[sortBy];
        if (typeof valA === 'number') return sortDirection==='asc'? valA-valB : valB-valA;
        return sortDirection==='asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return filtered;
  };
  const handleSort = (column) => { if (sortBy === column) setSortDirection((d)=> (d==='asc'?'desc':'asc')); else { setSortBy(column); setSortDirection('asc'); } };
  const getSortIndicator = (column) => sortBy === column ? (sortDirection === 'asc' ? ' 🔼' : ' 🔽') : '';

  // יצוא + הדפסה
  const exportToExcel = () => {
    const rows = guestRows.map((r) => ({ '#': r.no, 'שם': r.name, 'טלפון': r.phone, 'שולחן': r.table, 'סטטוס': r.statusText, 'סכום': r.amount, }));
    const ws = utils.json_to_sheet(rows); const wb = utils.book_new(); utils.book_append_sheet(wb, ws, 'Guests');
    const fileName = `guests_${Date.now()}.xlsx`;
    if (Platform.OS === 'web') writeFileXLSX(wb, fileName);
    else {
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + fileName;
      FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 })
        .then(() => Sharing.shareAsync(uri))
        .catch(() => Alert.alert('שגיאה', 'לא ניתן לשתף קובץ'));
    }
  };
  const printTable = async () => {
    const rowsHtml = guestRows.map((r) => `<tr><td>${r.no}</td><td>${r.name}</td><td>${toLocalPhone(r.phone)}</td><td>${r.table}</td><td>${r.statusText}</td><td>${r.amount ? r.amount.toLocaleString('he-IL') : ''}</td></tr>`).join('');
    const html = `
      <html dir="rtl"><head><meta charset="utf-8" />
        <style> body{font-family:Arial;margin:24px} table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #666;padding:6px;text-align:center} th{background:#eee} </style>
      </head><body>
        <h2 style="text-align:center">${eventDetails.eventName || ''} – רשימת מוזמנים</h2>
        <table><thead><tr><th>#</th><th>שם</th><th>טלפון</th><th>שולחן</th><th>סטטוס</th><th>₪</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
      </body></html>`;
    if (Platform.OS === 'web') { const win = window.open('', '_blank'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 0); }
    else await Print.printAsync({ html });
  };

  const go = (name, params) => props.navigation.navigate(name, params);

  // ===== נתוני פוטר =====
  const NAV_ITEMS = [
    { label: 'מסך בית', onPress: () => go('Main') },
    { label: 'ניהול אורחים', onPress: () => go('Management', { id }) },
    { label: 'סידורי הושבה', onPress: () => go('SeatedAtTable', { id }) },
    {
      label: 'אישורי הגעה',
      onPress: () => go(eventDetails?.message && eventDetails?.message_date_hour ? 'RSVPs' : 'RSVPstwo', { id }),
    },
    { label: 'תקציב', onPress: () => go('Budget', { id }) },
    { label: 'מסמכים', onPress: () => go('Document', { id }) },
    { label: 'ניהול', onPress: () => go('AdminPanel', { id }) },
  ];

  const CONTACT_ITEMS = [
    { label: '📞 054-245-5869', onPress: () => Linking.openURL('tel:0542455869') },
    { label: '✉️ support@easyvent.co.il', onPress: () => Linking.openURL('mailto:support@easyvent.co.il') },
    { label: '💬 WhatsApp', onPress: () => Linking.openURL('https://wa.me/972542455869') },
    { label: 'מדיניות פרטיות', onPress: () => Linking.openURL('https://easyvent.co.il/privacy') },
    { label: 'תנאי שימוש', onPress: () => Linking.openURL('https://easyvent.co.il/terms') },
    { label: 'ניהול', onPress: () => go('AdminPanel', { id }) },
  ];




  const FooterGrid = ({ items, underlineRule }) => {
    const itemW = '50%';
    return (
      <View style={styles.footerGridRow}>
        {items.map((it, i) => (
          <Pressable key={i} onPress={it.onPress} accessibilityRole="button" accessibilityLabel={it.label} hitSlop={6} style={[styles.footerGridItem, { width: itemW }]}>
            <Text numberOfLines={1} style={[t(13), { textAlign: 'right', textDecorationLine: underlineRule?.(it) ? 'underline' : 'none' }]}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  // ===== רנדר =====
  const COLS = isMobile
    ? [{ key:'no',flex:0.7,label:'#' },{ key:'name',flex:2.2,label:'שם' },{ key:'phone',flex:2.2,label:'טלפון' },{ key:'table',flex:1.6,label:'שולחן' },{ key:'status',flex:1.6,label:'סטטוס' },{ key:'amount',flex:1.0,label:'₪' }]
    : [{ key:'no',flex:0.7,label:'#' },{ key:'name',flex:2.2,label:'שם' },{ key:'phone',flex:2.4,label:'טלפון' },{ key:'table',flex:1.8,label:'שולחן' },{ key:'status',flex:1.6,label:'סטטוס' },{ key:'updateTime',flex:2.2,label:'עדכון' },{ key:'amount',flex:1.0,label:'₪' }];

  return (
    <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* פס עליון */}
      <View style={[styles.headerBar, { maxWidth: CONTENT_MAX_W }]}>
        <View style={{ width: ACTIONS_W }} />
        <View style={styles.headerCenter}>
          <Text numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit={false} style={[styles.title, t(HEADER_FONT), { writingDirection: 'rtl' }]}>
            {`${eventDetails.eventDate || ''}  ●  ${eventDetails.eventName || ''}  ●  ${eventDetails.eventLocation || ''}`}
          </Text>
        </View>
          <View style={[styles.headerActions, { width: ACTIONS_W }]}>

  {/* --- כפתור 1: שינוי מצב תצוגה (Theme) --- */}
  <Pressable
    onPress={cycleThemeMode}
    onLongPress={() => setThemeMode('auto')}
    hitSlop={hit}
    style={({ pressed }) => [
      styles.headerIconBtn,
      {
        width: headerBtnSize,
        height: headerBtnSize,
        backgroundColor: COLORS.chipBg,
        borderColor: COLORS.chipBorder,
        borderWidth: StyleSheet.hairlineWidth,
        opacity: pressed ? 0.7 : 1,
      },
    ]}
    accessibilityRole="button"
    accessibilityLabel={themeA11yLabel}
  >
    {/* טיפ חשוב: הוספתי tintColor גם כאן.
        זה אומר שלא משנה אם התמונה המקורית שחורה או כחולה,
        היא תהפוך ללבנה ב-Dark Mode ולשחורה ב-Light Mode.
    */}
    <Image
      source={
        themeMode === 'auto'
          ? require('../assets/automatic.png')
          : isDark
          ? require('../assets/nightmode.png')
          : require('../assets/lightmode.png')
      }
      style={{ 
        width: iconSize + 4, 
        height: iconSize + 4, 
        resizeMode: 'contain',
        tintColor: COLORS.text // <--- זה התיקון שהופך את האייקון לברור
      }}
    />
  </Pressable>


  {/* --- כפתור 2: פעמון התראות --- */}
  <Pressable
    onPress={async () => {
      const next = !notifOpen;
      if (next) {
        setNotifBaselineAt(effectiveNotifSeenAt || 0);
        setNotifOpen(true);
      } else {
        closeNotifCenter();
      }
    }}
    hitSlop={hit}
    style={({ pressed }) => [
      styles.headerIconBtn,
      {
        width: headerBtnSize,
        height: headerBtnSize,
        backgroundColor: COLORS.chipBg,
        borderColor: COLORS.chipBorder,
        borderWidth: StyleSheet.hairlineWidth,
        position: 'relative',
        opacity: pressed ? 0.7 : 1,
      },
    ]}
    accessibilityRole="button"
    accessibilityLabel="התראות"
  >
    {/* הפעמון יקבל את צבע הטקסט (לבן בחושך, שחור באור) */}
    <Image
      source={require('../assets/notification.png')}
      style={{
        width: iconSize + 2,
        height: iconSize + 2,
        resizeMode: 'contain',
        tintColor: COLORS.text, // <--- מוודא שזה לא "סתם לבן" אלא דינמי
      }}
    />

    {/* עיגול אדום למספר התראות (אם יש) */}
    {unreadNotifCount > 0 && (
      <View style={{
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.bg, 
      }}>
        <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
          {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
        </Text>
      </View>
    )}
  </Pressable>

</View>

      </View>

<Modal
  visible={notifOpen}
  transparent
  animationType="fade"
  onRequestClose={closeNotifCenter}   // ✅
  
>
  <View style={styles.notifOverlay}>
<Pressable style={StyleSheet.absoluteFill} onPress={closeNotifCenter} />

    <View style={[
      styles.notifCardFloating,
      { backgroundColor: COLORS.card, borderColor: COLORS.cardBorder }
    ]}>
<View style={styles.notifHeader}>
  <Text style={[t(16), { fontWeight: '800' }]}>מרכז התראות</Text>

<View style={{ flexDirection: 'row-reverse', gap: 8 }}>
{notifItems.length > 0 && (
  <Pressable
    onPress={clearAllNotifications}
    style={[styles.notifMiniBtn, { backgroundColor: '#EF4444' }]}
  >
    <Text style={[t(12), { fontWeight: '800', color: '#fff' }]}>נקה</Text>
  </Pressable>
)}


  <Pressable
    onPress={closeNotifCenter}
    style={[styles.notifMiniBtn, { backgroundColor: COLORS.inputBg }]}
  >
    <Text style={[t(12), { fontWeight: '700' }]}>סגור</Text>
  </Pressable>
</View>

</View>


      {notifLoading ? (
        <Text style={[t(13, COLORS.subtext)]}>טוען התראות…</Text>
      ) : notifItems.length === 0 ? (
        <Text style={[t(13, COLORS.subtext)]}>אין התראות כרגע</Text>
      ) : (
<FlatList
  data={notifItems}
  keyExtractor={(item) => item.key}
  style={{ maxHeight: 380 }}
  renderItem={({ item }) => {
const tsForUi = Number(item.clientTs || item.ts || 0);
const isUnread = tsForUi > (notifBaselineAt || (effectiveNotifSeenAt || 0));

    return (
        <View
  style={[
    styles.notifRow,
    {
      backgroundColor: isUnread ? 'rgba(108,99,255,0.14)' : COLORS.inputBg,
      borderColor: isUnread ? COLORS.primary : COLORS.cardBorder,
      borderWidth: isUnread ? 2 : StyleSheet.hairlineWidth,
      opacity: 1,
    },
  ]}
>
  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
    <Text style={[t(13), { fontWeight: isUnread ? '900' : '800' }]} numberOfLines={1}>
      {item.title || item.type || 'התראה'}
    </Text>

    {isUnread && (
      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: COLORS.primary }}>
        <Text style={{ color: COLORS.onPrimary, fontSize: 11, fontWeight: '900' }}>חדש</Text>
      </View>
    )}
  </View>

  {!!item.body && (
    <Text style={[t(12, COLORS.subtext)]} numberOfLines={2}>
      {item.body}
    </Text>
  )}

  {!!item.ts && (
    <Text style={[t(11, COLORS.subtext), { marginTop: 4 }]}>
      {new Date(item.ts).toLocaleString('he-IL')}
    </Text>
  )}
</View>

    );
  }}
/>

      )}
    </View>
  </View>
</Modal>



      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.container}>
          {/* קרוסלה */}
          <View style={[styles.carouselContainer, { width: CAROUSEL_W, height: CAROUSEL_H }]}>
            <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {imagesToShow.map((item, idx) => (
                <TouchableOpacity key={idx} onPress={pickImage} activeOpacity={0.85}>
                  <Image source={item.uri ? { uri: item.uri } : item} style={{ width: CAROUSEL_W, height: CAROUSEL_H, resizeMode: 'cover' }} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedImage && (
              <Pressable onPress={deleteSelectedImage} disabled={uploading} style={[styles.deleteBtn, uploading && { opacity: 0.6 }]} hitSlop={8} accessibilityRole="button" accessibilityLabel="מחק תמונה">
<Image
  source={require('../assets/close.png')}
  style={{
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: '#fff', // כי הכפתור אדום
  }}
/>
              </Pressable>
            )}

            {uploading && (
              <View style={styles.uploadOverlay} pointerEvents="none">
                <Progress.Circle size={72} progress={uploadProgress} showsText animated={!reduceMotion} color={COLORS.primary} borderWidth={3} thickness={8} />
                <Text style={[t(14), { marginTop: 8 }]}>{Math.round(uploadProgress * 100)}%</Text>
                <Text style={[t(12), { marginTop: 2 }]}>מעלה תמונה…</Text>
              </View>
            )}
          </View>

          {/* שלושת הקלפים */}
          <View style={[styles.backgroundContainer, { width: Math.min(screenW * 0.96, CONTENT_MAX_W) }]}>
            <View style={styles.rowCards}>
              {/* מסמכים */}
              <View style={[styles.documentContainer,{ backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: StyleSheet.hairlineWidth }]}>
                <View style={styles.infoContainer}>
                  <Text style={[styles.headerText, t(isDesktop ? 20 : 18)]}>מסמכים</Text>
                  <Text style={[styles.textInfo, { color: COLORS.subtext }]}>{(eventDetails.Numberofimage || 0)} / 10</Text>
                </View>
                <View style={styles.progressContainer}>
                  <Progress.Circle size={100} progress={Math.min((eventDetails.Numberofimage || 0) / 10, 1)} showsText
                    formatText={() => `${Math.round(Math.min((eventDetails.Numberofimage || 0) / 10, 1) * 100)}%`} thickness={8} borderWidth={3} color={COLORS.primary} animated={!reduceMotion} />
                </View>
              </View>

              {/* מוזמנים */}
              <View style={[styles.documentContainer,{ backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: StyleSheet.hairlineWidth }]}>
                <View style={styles.infoContainer}>
                  <Text style={[styles.headerText, t(isDesktop ? 20 : 18)]}>מוזמנים</Text>
                  <Text style={[styles.textInfo, { color: COLORS.subtext }]}>{eventDetails.counter_contacts || 0} / {eventDetails.Numberofguests || 0}</Text>
                </View>
                <View style={styles.progressContainer}>
                  <Progress.Circle size={100} progress={(eventDetails.counter_contacts || 0) / (eventDetails.Numberofguests || 1)} showsText
                    formatText={() => `${Math.round(((eventDetails.counter_contacts || 0) / (eventDetails.Numberofguests || 1)) * 100)}%`} thickness={10} borderWidth={4} color={COLORS.primary} animated={!reduceMotion} />
                </View>
              </View>

              {/* תקציב */}
              <View style={[styles.documentContainer,{ backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: StyleSheet.hairlineWidth }]}>
                <View style={styles.infoContainer}>
                  <Text style={[styles.headerText, t(isDesktop ? 20 : 18)]}>תקציב</Text>
                  <Text style={[styles.textInfo, { color: COLORS.subtext }]}>{eventDetails.spend || 0} / {eventDetails.budget || 0}</Text>
                </View>
                <View style={styles.progressContainer}>
                  <Progress.Circle size={100} progress={eventDetails.budget ? (eventDetails.spend || 0) / eventDetails.budget : 0} showsText
                    formatText={() => eventDetails.budget ? `${Math.round(((eventDetails.spend || 0) / eventDetails.budget) * 100)}%` : '0%'}
                    thickness={12} borderWidth={2} color={COLORS.primary} animated={!reduceMotion} />
                </View>
              </View>
            </View>
          </View>

          {/* קאונטר ימים */}
          {!!daysLeft && (
            <Text style={[styles.countdownText,{ backgroundColor: COLORS.countdownBg, color: COLORS.countdownText }, t(20, COLORS.countdownText)]}>
              {daysLeft}
            </Text>
          )}

          {/* סטטוסים כוללים */}
          <View style={{ alignItems: 'center', width: '100%' }}>
            <View style={[styles.rectangle, { maxWidth: CONTENT_MAX_W, width: '96%' }]}>
              <View style={styles.statusItem}>
                <ImageBackground source={isDark ? require('../assets/question-mark-white.png') : require('../assets/question-mark.png')} style={styles.statusIcon} />
                <Text style={[styles.imageTextLabel, t(14)]}>בהמתנה</Text>
                <Text style={[styles.imageText, t(18)]}>{eventDetails.no_answear || 0}</Text>
              </View>
              <View style={styles.statusItem}>
                <ImageBackground source={require('../assets/warning.png')} style={styles.statusIcon} />
                <Text style={[styles.imageTextLabel, t(14)]}>לא מגיעים</Text>
                <Text style={[styles.imageText, t(18)]}>{eventDetails.no_cuming || 0}</Text>
              </View>
              <View style={styles.statusItem}>
                <ImageBackground source={require('../assets/warningy.png')} style={styles.statusIcon} />
                <Text style={[styles.imageTextLabel, t(14)]}>אולי</Text>
                <Text style={[styles.imageText, t(18)]}>{eventDetails.maybe || 0}</Text>
              </View>
              <View style={styles.statusItem}>
                <ImageBackground source={require('../assets/checked.png')} style={styles.statusIcon} />
                <Text style={[styles.imageTextLabel, t(14)]}>מגיעים</Text>
                <Text style={[styles.imageText, t(18)]}>{eventDetails.yes_caming || 0}</Text>
              </View>
            </View>
          </View>

          {/* כפתורים – גריד */}
          <View style={[styles.buttonContainer,{ width: GRID_W, gap: GRID_GAP, alignSelf: 'center', justifyContent: 'flex-start' }]}>
            {[
              { onPress: () => go('Budget', { id }), icon: require('../assets/budget.png'), label: 'תקציב' },
              { onPress: () => go('Management', { id }), icon: require('../assets/people.png'), label: 'ניהול אורחים' },
              { onPress: () => go('Task', { id }), icon: require('../assets/completed.png'), label: 'משימות' },
              { onPress: () => go('SeatedAtTable', { id }), icon: require('../assets/table.png'), label: 'סידורי הושבה' },
              { onPress: () => go('Providers', { id }), icon: require('../assets/share.png'), label: 'ניהול ספקים' },
              { onPress: () => (eventDetails.message && eventDetails.message_date_hour ? go('RSVPs', { id }) : go('RSVPstwo', { id })), icon: require('../assets/checked.png'), label: 'אישורי הגעה' },
              { onPress: () => go('Gift', { id }), icon: require('../assets/gift.png'), label: 'מתנות' },
              { onPress: () => go('Document', { id }), icon: require('../assets/folder.png'), label: 'קבלות ומסמכים' },
              { onPress: () => go('Main'), icon: require('../assets/home.png'), label: 'מסך בית' },
              { onPress: () => go('HomeThree', { Numberofguests: eventDetails.Numberofguests, finalEventName: id }), icon: require('../assets/debit-card.png'), label: 'רכוש חבילה' },
            ].map((b, i) => (
              <TouchableOpacity key={i} onPress={b.onPress} activeOpacity={0.85}
                style={[styles.button,{ width: BTN_W, backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: StyleSheet.hairlineWidth, paddingVertical: bigTargets ? 10 : 6 }]}>
                <Image source={b.icon} style={styles.icon} />
                <Text style={[styles.buttonText, t(14)]}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* טבלת מוזמנים */}
          <View style={[styles.guestsWrapper,{ width: Math.min(screenW * 0.96, CONTENT_MAX_W), backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[styles.guestsTitle, t(19)]}>רשימת המוזמנים</Text>

            <View style={styles.searchRow}>
              <TextInput style={[styles.searchInput, { backgroundColor: COLORS.inputBg, color: COLORS.text }]} placeholder="חיפוש לפי שם / טלפון" placeholderTextColor={COLORS.placeholder} value={searchTerm} onChangeText={setSearchTerm} />
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={[styles.filterBtn, { backgroundColor: COLORS.primary }]} onPress={() => {
                  const order = ['all', 'green', 'yellow', 'red']; setStatusFilter(order[(order.indexOf(statusFilter) + 1) % order.length]); }}>
                  <Text style={{ color: COLORS.onPrimary, fontWeight: '600' }}>
                    {statusFilter === 'all' ? 'הכול' : statusFilter === 'green' ? 'מגיע' : statusFilter === 'yellow' ? 'אולי' : 'לא מגיע'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={exportToExcel} style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}>
                    <Image source={require('../assets/download.png')} style={styles.icon4} resizeMode="contain" />
                </TouchableOpacity>
                <TouchableOpacity onPress={printTable} style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}>
                    <Image source={require('../assets/printing.png')} style={styles.icon4} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            </View>

            {/* כותרת */}
            <View style={[styles.tableHeader,{ backgroundColor: COLORS.tableHeaderBg, borderColor: COLORS.cardBorder, borderWidth: StyleSheet.hairlineWidth }, styles.rtlRow]}>
              {COLS.map(({ key, flex, label }) => (
                <TouchableOpacity key={key} onPress={() => handleSort(key)} style={[styles.thBox, { flex }]}>
                  <Text style={[styles.th, t(13, COLORS.tableHeaderText)]}>{label}{getSortIndicator(key)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* תוכן */}
            <FlatList
              data={getFilteredRows()}
              keyExtractor={(item, index) => item.phone || String(index)}
              initialNumToRender={20}
              maxToRenderPerBatch={24}
              windowSize={12}
              removeClippedSubviews
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 520 }}
              getItemLayout={(data, index) => ({ length: 42, offset: 42 * index, index })}
              renderItem={({ item, index }) => {
                const rowBg = item.statusClr === 'green' ? COLORS.status.greenBg
                              : item.statusClr === 'yellow' ? COLORS.status.yellowBg
                              : item.statusClr === 'red' ? COLORS.status.redBg
                              : item.statusClr === 'orange' ? COLORS.status.orangeBg
                              : index % 2 === 0 ? COLORS.trAlt : 'transparent';

                const valueFor = (k) => {
                  switch (k) {
                    case 'no': return item.no;
                    case 'name': return item.name;
                    case 'phone': return toLocalPhone(item.phone);
                    case 'table': return item.table;
                    case 'status': return item.statusText === 'מגיע' && item.guests > 0 ? `${item.statusText} (${item.guests})` : item.statusText;
                    case 'updateTime': return item.updateTime;
                    case 'amount': return item.amount ? item.amount.toLocaleString('he-IL') : '-';
                    default: return '';
                  }
                };

                return (
                  <View style={[styles.tr, styles.rtlRow, { backgroundColor: rowBg }]}>
                    {COLS.map(({ key, flex }) => (
                      <View key={key} style={[styles.tdBox, { flex }]}>
                        <Text style={[styles.td, t(13)]} numberOfLines={key === 'name' || key === 'updateTime' ? 1 : undefined}>
                          {valueFor(key)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              }}
            />
          </View>

          {/* דאשבורד קצר */}
          <View style={[styles.dashboard, { width: Math.min(screenW * 0.96, CONTENT_MAX_W) }]}>
            <View style={[styles.dashCard, styles.shadow, { backgroundColor: COLORS.primary }]}>
              <Animated.Text style={[styles.circleNumber, { color: COLORS.onPrimary }]}>{displayCash.toLocaleString()} ₪</Animated.Text>
              <Text style={[styles.circleLabel, { color: COLORS.onPrimary }]}>סכום</Text>
            </View>
            <View style={[styles.dashCard, styles.shadow, { backgroundColor: COLORS.primary }]}>
              <Animated.Text style={[styles.circleNumber, { color: COLORS.onPrimary }]}>{displayTables}</Animated.Text>
              <Text style={[styles.circleLabel, { color: COLORS.onPrimary }]}>שולחנות</Text>
            </View>
          </View>

          {/* ===== פוטר ===== */}
          <View style={[styles.footerInner, { maxWidth: CONTENT_MAX_W }]}>
            {isMobile ? (
              <>
                <View style={[styles.footerCol, { width: '50%' }]}>
                  <Text style={[styles.footerSectionTitle, t(14)]}>ניווט מהיר</Text>
                  <FooterGrid items={NAV_ITEMS} />
                </View>
                <View style={[styles.footerCol, { width: '50%' }]}>
                  <Text style={[styles.footerSectionTitle, t(14)]}>יצירת קשר</Text>
                  <FooterGrid items={CONTACT_ITEMS} underlineRule={(it) => it.label.startsWith('מדיניות') || it.label.startsWith('תנאי')} />
                </View>
                <View style={[styles.footerCol, { width: '100%' }]}>
                  <Text style={[styles.footerTitle, t(16)]}>EasyVent</Text>
                  <Text style={[styles.footerText, t(13, COLORS.subtext)]}>ניהול אירוע חכם: הזמנות, אישורי הגעה, תקציב וסידורי הושבה – במקום אחד.</Text>
                  <View style={styles.footerSocialRow} />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.footerCol, { flex: 1, minWidth: 240, maxWidth: 360 }]}>
                  <Text style={[styles.footerTitle, t(18)]}>EasyVent</Text>
                  <Text style={[styles.footerText, t(13, COLORS.subtext)]}>ניהול אירוע חכם: הזמנות, אישורי הגעה, תקציב וסידורי הושבה – במקום אחד.</Text>
                  <View style={styles.footerSocialRow} />
                </View>
                <View style={[styles.footerCol, { flex: 1, minWidth: 240, maxWidth: 360 }]}>
                  <Text style={[styles.footerSectionTitle, t(16)]}>ניווט מהיר</Text>
                  <FooterGrid items={NAV_ITEMS} />
                </View>
                <View style={[styles.footerCol, { flex: 1, minWidth: 240, maxWidth: 360 }]}>
                  <Text style={[styles.footerSectionTitle, t(16)]}>יצירת קשר</Text>
                  <FooterGrid items={CONTACT_ITEMS} underlineRule={(it) => it.label.startsWith('מדיניות') || it.label.startsWith('תנאי')} />
                </View>
              </>
            )}
          </View>
        </View>

                  {/* מודל הדרכה */}
<Modal
  visible={isFocused && hydrated && eventExists && isModalVisible}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContainer, { width: Math.min(screenW * 0.9, 370) }]}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../assets/backg1.png')}
          style={styles.modalBg}
          imageStyle={styles.modalBgImage}
        >
{/* X עגול בפינה */}
<TouchableOpacity
  onPress={() => setIsModalVisible(false)}
  activeOpacity={0.85}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  style={styles.closeTextBtn}
>
  <Text style={styles.closeTextBtnText}>✕</Text>
</TouchableOpacity>



          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, t(22, '#333')]}>ברוכים הבאים ל- EasyVent!</Text>
            <Text style={[styles.modalSubtitle, t(16, '#555')]}>מערכת לניהול אירועים</Text>
            <Text style={[styles.modalSubtitle, t(16, '#555')]}>
              כדי להתחיל את האירוע יש להשלים את השלבים הבאים:
            </Text>

            <View style={styles.stepsContainer}>
              <Text style={[styles.modalStep, t(15, '#222')]}>✔ ניהול אורחים</Text>
              <Text style={[styles.modalStep, t(15, '#222')]}>✔ ניהול הושבה</Text>
              <Text style={[styles.modalStep, t(15, '#222')]}>✔ אישורי הגעה</Text>
            </View>

            <Text style={[styles.modalSubtitle, t(16, '#555')]}>בחרו שלב להתחלה:</Text>

            <View style={styles.buttonsContainer}>
              {isScheduled_contact && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setIsModalVisible(false);
                    navigation.navigate('Management', { id });
                    adminLog('פתיחת מסך ניהול אורחים');
                  }}
                  activeOpacity={0.9}
                >
                  <Image source={require('../assets/buttonmodal1.png')} style={styles.icon2} />
                </TouchableOpacity>
              )}

              {isScheduled_table && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setIsModalVisible(false);
                    navigation.navigate('SeatedAtTable', { id });
                    adminLog('פתיחת מסך הושבה');
                  }}
                  activeOpacity={0.9}
                >
                  <Image source={require('../assets/buttonmodal2.png')} style={styles.icon2} />
                </TouchableOpacity>
              )}

              {isScheduled_rspv && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setIsModalVisible(false);
                    navigation.navigate('RSVPstwo', { id });
                    adminLog('פתיחת מסך RSVP');
                  }}
                  activeOpacity={0.9}
                >
                  <Image source={require('../assets/buttonmodal3.png')} style={styles.icon2} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => {
                handleCheckboxChange();
                adminLog('סימון אל תציג שוב');
              }}
              activeOpacity={0.9}
            >
              <View style={styles.checkbox}>
                {dontShowAgain && <Text style={styles.checkboxMark}>✔</Text>}
              </View>
              <Text style={styles.checkboxText}>אל תציג הודעה זו שוב</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </ScrollView>
    </View>
  </View>
</Modal>

      </ScrollView>

      {/* FAB נגישות */}
                {/* FAB נגישות משודרג */}
<View pointerEvents="box-none" style={styles.fabWrap}>
  
  {/* החלונית עצמה */}
              {/* החלונית עצמה */}
  {a11yOpen && (
    <Animated.View 
      style={[
        styles.fabPanel, 
        { 
          backgroundColor: COLORS.card, 
          borderColor: COLORS.cardBorder,
          opacity: a11yOpacity,
          transform: [{ translateY: a11yTranslateY }]
        }
      ]}
    >
      <View style={styles.panelHeader}>
        <Text style={[t(16), { fontWeight: '800' }]}>הגדרות נגישות</Text>
      </View>

      <View style={styles.panelDivider} />

      {/* גודל טקסט */}
      <View style={styles.fabRow}>
        <View style={styles.rowLabelWrap}>
          {/* החלפנו את האייקון בטקסט פשוט ואלגנטי */}
          <Text style={{ fontSize: 18, marginLeft: 8, color: COLORS.subtext }}>Aa</Text>
          <Text style={[t(14)]}>גודל טקסט</Text>
        </View>
        <View style={styles.resizeControls}>
          <Pressable 
            onPress={() => setFontScale((s) => Math.max(0.85, s - 0.05))} 
            style={[styles.resizeBtn, { borderColor: COLORS.cardBorder, backgroundColor: COLORS.inputBg }]}
          >
            <Text style={[t(16), { lineHeight: 18 }]}>-</Text>
          </Pressable>
          <View style={styles.resizeIndicator}>
            <Text style={[t(12, COLORS.subtext)]}>{Math.round(fontScale * 100)}%</Text>
          </View>
          <Pressable 
            onPress={() => setFontScale((s) => Math.min(1.4, s + 0.05))} 
            style={[styles.resizeBtn, { borderColor: COLORS.cardBorder, backgroundColor: COLORS.inputBg }]}
          >
            <Text style={[t(16), { lineHeight: 18 }]}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* מתגים - שימוש באימוג'ים במקום אייקונים כדי למנוע ריבועים */}
      {[
        { label: 'ניגודיות גבוהה', icon: '🌗', val: highContrast, set: setHighContrast },
        { label: 'טקסט מודגש', icon: '𝗕', val: textBold, set: setTextBold },
        { label: 'מצב קריאות', icon: '👁️', val: readabilityMode, set: setReadabilityMode },
        { label: 'כפתורים גדולים', icon: '👆', val: bigTargets, set: setBigTargets },
        { label: 'הפחתת תזוזה', icon: '✋', val: reduceMotion, set: setReduceMotion },
      ].map((item, idx) => (
        <Pressable 
          key={idx} 
          onPress={() => item.set(v => !v)} 
          style={styles.fabRow}
        >
          <View style={styles.rowLabelWrap}>
            {/* כאן השינוי - טקסט במקום Ionicons */}
            <Text style={{ fontSize: 18, marginLeft: 8 }}>{item.icon}</Text>
            <Text style={[t(14)]}>{item.label}</Text>
          </View>
          
          {/* המתג המעוצב */}
          <View style={[styles.modernToggle, item.val && { backgroundColor: COLORS.primary }]}>
            <Animated.View style={[
              styles.modernToggleCircle, 
              { 
                transform: [{ translateX: item.val ? -18 : 0 }], 
                backgroundColor: '#fff' 
              }
            ]} />
          </View>
        </Pressable>
      ))}

      <View style={styles.panelDivider} />

      {/* איפוס */}
      <Pressable 
        onPress={resetA11y} 
        style={({pressed}) => [styles.resetBtn, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>אפס הגדרות</Text>
      </Pressable>

    </Animated.View>
  )}

  {/* הכפתור הראשי */}
  <Pressable 
    onPress={toggleA11yPanel} 
    style={[styles.fabBtn, { backgroundColor: COLORS.primary }]} 
    hitSlop={hit} 
    accessibilityRole="button" 
    accessibilityLabel="אפשרויות נגישות"
  >
    <Animated.View style={{ transform: [{ rotate: fabRotate }] }}>
       {/* אם יש לך תמונה מקומית, נשתמש בה. אם לא - עדיף אייקון וקטורי */}
       {/* אופציה א: התמונה המקורית שלך */}
       <Image
        source={require('../assets/accessibility.png')}
        style={{
          width: 26,
          height: 26,
          resizeMode: 'contain',
          tintColor: COLORS.onPrimary,
        }}
      />
      {/* אופציה ב (מומלצת אם התמונה לא נראית טוב בסיבוב): 
          <Ionicons name="accessibility" size={28} color={COLORS.onPrimary} /> 
      */}
    </Animated.View>
  </Pressable>
</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollViewContainer: { flexGrow: 1 },
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 5 },
  headerBar: { width: '96%', minHeight: 44, marginTop: 6, marginBottom: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  title: { textAlign: 'center' },
  headerIconBtn: { borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 6, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
  carouselContainer: { alignSelf: 'center', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f3f3f3', marginBottom: 16 },
  backgroundContainer: { alignSelf: 'center', marginTop: 8 },
  rowCards: { flexDirection: 'row', gap: 12 },
  documentContainer: { flex: 1, minWidth: 0, alignItems: 'center', padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  infoContainer: { marginBottom: 8, alignItems: 'center' },
  headerText: { fontWeight: '700' },
  textInfo: { fontSize: 14, textAlign: 'center' },
  progressContainer: { justifyContent: 'center', alignItems: 'center', padding: 10 },
  countdownText: { textAlign: 'center', padding: 8, borderRadius: 7, shadowColor: 'rgba(108, 99, 255, 0.9)', shadowOpacity: 0.6, shadowRadius: 18, elevation: 8, marginTop: 10, marginBottom: 5 },
  rectangle: { alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, paddingVertical: 10, marginVertical: 10 },
  statusItem: { alignItems: 'center', justifyContent: 'center', width: 80 },
  statusIcon: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  imageTextLabel: { fontWeight: 'bold', textAlign: 'center', marginTop: 6 },
  imageText: { fontWeight: 'bold', textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  button: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },
  buttonText: { marginTop: 6 },
  icon: { width: 48, height: 48, marginBottom: 2 },
  guestsWrapper: { alignSelf: 'center', marginTop: 24, padding: 12, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  guestsTitle: { fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  searchRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, width: '100%', paddingHorizontal: 10 },
  searchInput: { flex: 1, height: 38, borderRadius: 20, paddingHorizontal: 14, textAlign: 'right' },
  filterBtn: { marginLeft: 8, paddingHorizontal: 14, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { marginLeft: 8, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tableHeader: { flexDirection: 'row', borderRadius: 10, marginBottom: 4, paddingVertical: 6 },
  thBox: { alignItems: 'center', justifyContent: 'center' },
  th: { fontWeight: '700', textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 3 },
  tdBox: { alignItems: 'center', justifyContent: 'center' },
  td: { textAlign: 'center' },
  rtlRow: { flexDirection: 'row-reverse' },
  dashboard: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', alignSelf: 'center', marginTop: 18, marginBottom: 6 },
  dashCard: { flex: 1, marginHorizontal: 6, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 10 },
  circleNumber: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  circleLabel: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, alignItems: 'center', justifyContent: 'center' },
  icon3: { width: 390, height: 670 },
  closeButton: { position: 'absolute', top: 10, right: 20, backgroundColor: 'red', width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 15, zIndex: 10 },
  modalContent: { padding: 20, alignItems: 'center' },
  modalTitle: { fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  modalSubtitle: { fontWeight: '600', textAlign: 'center', marginVertical: 5 },
  stepsContainer: { marginVertical: 6, alignItems: 'center', gap: 4 },
  modalStep: { textAlign: 'center', marginVertical: 3 },
  buttonsContainer: { width: '100%', alignItems: 'center', gap: 8, marginTop: 6 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginVertical: 5, width: '90%', alignItems: 'center' },
  icon2: { width: 270, height: 65 },
  icon4: {
    width: 22,
    height: 22,
    tintColor: '#fff', // או COLORS.onPrimary
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#007AFF', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: '#fff' },
  checkboxMark: { fontSize: 15, color: '#007AFF' },
  checkboxText: { fontSize: 14, color: '#333' },
  closeModalButton: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#eee', borderRadius: 8 },
  closeModalButtonText: { color: 'red', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  footerInner: { width: '96%', alignSelf: 'center', paddingVertical: 14, flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-start', rowGap: 12, columnGap: 12 },
  footerCol: { paddingHorizontal: 4 },
  footerTitle: { fontWeight: '700', marginBottom: 6, textAlign: 'right' },
  footerText: { marginBottom: 8, textAlign: 'right' },
  footerSectionTitle: { fontWeight: '700', marginBottom: 8, textAlign: 'right' },
  footerGridRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between' },
  footerGridItem: { paddingVertical: 6, paddingHorizontal: 6 },
  footerSocialRow: { marginTop: 6, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  footerBottom: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: 16, bottom: 20, alignItems: 'flex-end', zIndex: 9999 },
  fabBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  fabPanel: { marginTop: 8, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, width: 240 },
  fabRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fabChip: { paddingHorizontal: 10, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fabChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  toggle: { width: 44, height: 28, borderRadius: 14, backgroundColor: '#c9c9c9', alignItems: 'flex-start', justifyContent: 'center', padding: 2 },
  toggleOn: { backgroundColor: '#6c63ff', alignItems: 'flex-end' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  notifCard: {
  width: '96%',
  maxWidth: 980,
  alignSelf: 'center',
  marginTop: 6,
  marginBottom: 6,
  borderRadius: 14,
  padding: 12,
  borderWidth: StyleSheet.hairlineWidth,
},
notifHeader: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
},
notifMiniBtn: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 10,
},
notifRow: {
  borderRadius: 12,
  padding: 10,
  borderWidth: StyleSheet.hairlineWidth,
  marginBottom: 8,
},
notifOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-start',
  paddingTop: 70,
},

notifCardFloating: {
  width: '92%',
  maxWidth: 980,
  alignSelf: 'center',
  borderRadius: 16,
  padding: 12,
  borderWidth: StyleSheet.hairlineWidth,
  maxHeight: '70%',
},
closeTextBtn: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 999,
},

closeTextBtnText: {
  color: '#fff',
  fontWeight: '900',
  fontSize: 14,
},
closeTextBtn: {
  position: 'absolute',
  top: 10,
  right: 10,            // 👉 זה ה”קצת יותר ימינה” (נסה 8/6 אם אתה רוצה עוד)
  width: 34,
  height: 34,
  borderRadius: 17,     // ✅ עגול
  backgroundColor: '#EF4444',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
  ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
},

closeTextBtnText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '900',
  lineHeight: 18,
},
// החלף או הוסף את הסטיילים הבאים בסוף הקובץ:

fabWrap: {
  position: 'absolute',
  right: 20,
  bottom: 24,
  alignItems: 'flex-end',
  zIndex: 10000, // מעל הכל
},
fabBtn: {
  width: 56,
  height: 56,
  borderRadius: 28,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8, // Android shadow
},
fabPanel: {
  marginBottom: 16,
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderRadius: 16,
  borderWidth: 1,
  width: 280,
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 10,
},
panelHeader: {
  alignItems: 'center',
  marginBottom: 8,
},
panelDivider: {
  height: 1,
  backgroundColor: 'rgba(0,0,0,0.05)',
  marginVertical: 10,
  width: '100%',
},
fabRow: {
  flexDirection: 'row-reverse', // RTL
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
  minHeight: 32,
},
rowLabelWrap: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
},
// ... styles אחרים

resizeControls: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.03)', 
  borderRadius: 8,
  padding: 2,
},

resizeBtn: {
  width: 32,
  height: 32,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  borderWidth: StyleSheet.hairlineWidth,
},

// ... styles אחרים
resizeIndicator: {
  width: 40,
  alignItems: 'center',
},
modernToggle: {
  width: 46,
  height: 26,
  borderRadius: 13,
  backgroundColor: '#E0E0E0',
  padding: 2,
  justifyContent: 'center',
  alignItems: 'flex-end', // למצב כבוי (RTL)
},
modernToggleCircle: {
  width: 22,
  height: 22,
  borderRadius: 11,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
},
resetBtn: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 4,
},
});

export default ListItem;