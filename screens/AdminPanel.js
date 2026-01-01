// AdminPanel.js — דשבורד ניהול + מדידת תעבורה + תכנית הודעות (main_sms)
// תומך ב־override של uid דרך route.params.uid (מ־OwnerDashboard)

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  Alert, Platform, ScrollView, ActivityIndicator, useWindowDimensions,
  Animated, Easing, Pressable
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

// ======================== CONFIG ========================
const ADMIN_PASS = '31123112';

// כמה להכפיל × מספר המוזמנים לכל תוכנית
const PLAN_FACTORS = {
  basic: 0.40,          // = total2
  plus: 0.65,           // = total3
  digital: 0.80,        // = total4
  complementary: 1.70,  // = total
};

// ======================== NET METER + HELPERS ========================
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
const _pad = (n, w = 2) => String(n).padStart(w, '0');

const keyMinute = (d = new Date()) => {
  const y = d.getUTCFullYear(), m = _pad(d.getUTCMonth() + 1), dd = _pad(d.getUTCDate());
  const hh = _pad(d.getUTCHours()), mm = _pad(d.getUTCMinutes());
  return `${y}-${m}-${dd}T${hh}:${mm}`;
};
const keyHour = (d = new Date()) => {
  const y = d.getUTCFullYear(), m = _pad(d.getUTCMonth() + 1), dd = _pad(d.getUTCDate());
  const hh = _pad(d.getUTCHours());
  return `${y}-${m}-${dd}T${hh}`;
};
const keyDay = (d = new Date()) => {
  const y = d.getUTCFullYear(), m = _pad(d.getUTCMonth() + 1), dd = _pad(d.getUTCDate());
  return `${y}-${m}-${dd}`;
};
const keyMonth = (d = new Date()) => {
  const y = d.getUTCFullYear(), m = _pad(d.getUTCMonth() + 1);
  return `${y}-${m}`;
};
const keyWeek = (d = new Date()) => {
  // ISO week
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${_pad(week)}`;
};

// NetMeter — מודד קריאה/כתיבה/העלאה בזמן אמיתי (2s)
const NetMeter = {
  totals: { read: 0, write: 0, upload: 0 },   // bytes (מצטבר)
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
        dt, rateRead, rateWrite, rateUpload,
        totalRead: this.totals.read, totalWrite: this.totals.write, totalUpload: this.totals.upload,
      };

      this.last = { t: now, read: this.totals.read, write: this.totals.write, upload: this.totals.upload };
      this.listeners.forEach((cb) => { try { cb(this.lastStats); } catch {} });
    }, intervalMs);
  },
  stop() { if (this._timer) clearInterval(this._timer); this._timer = null; },
  subscribe(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); },
};
NetMeter.start(2000);

// עטיפות RTDB למדידה
const meteredGet = async (dbRef) => {
  const snap = await dbRef.get();
  NetMeter.totals.read += _bytesOf(snap.val());
  return snap;
};
const meteredOnValue = (dbRef, cb) => {
  const handler = (snap) => {
    NetMeter.totals.read += _bytesOf(snap.val());
    cb(snap);
  };
  dbRef.on('value', handler);
  return handler; // לקריאה עם off
};
const meteredSet = async (dbRef, value) => {
  const sz = _bytesOf(value);
  await dbRef.set(value);
  NetMeter.totals.write += sz;
};

// מעקב העלאה ל־Storage (compat)
const trackUploadTask = (uploadTask) => {
  let prev = 0;
  uploadTask.on('state_changed', (s) => {
    const delta = Math.max((s?.bytesTransferred || 0) - prev, 0);
    prev = s?.bytesTransferred || prev;
    NetMeter.totals.upload += delta;
  });
  return uploadTask;
};

// שמירת דלתאות מצטברות: __metrics/traffic/(minute|hour|day|week|month|totals)
const startTrafficBuckets = (db, uid, eventId, intervalMs = 10000) => {
  if (!db || !uid || !eventId) return () => {};
  let stopped = false;
  let timer = null;
  let prev = { read: 0, write: 0, upload: 0 };

  const base = (path = '') => db.ref(`Events/${uid}/${eventId}/__metrics/traffic/${path}`);

  const addAtomic = async (bucketRef, dr, dw, du) =>
    bucketRef.transaction((cur) => {
      const c = cur || {};
      return {
        readBytes:   Number(c.readBytes   || 0) + Math.max(0, dr),
        writeBytes:  Number(c.writeBytes  || 0) + Math.max(0, dw),
        uploadBytes: Number(c.uploadBytes || 0) + Math.max(0, du),
        updatedAt:   Date.now(),
      };
    });

  const flush = async () => {
    if (stopped) return;
    const totals = NetMeter?.totals || { read: 0, write: 0, upload: 0 };
    const dr = Math.max(0, totals.read   - prev.read);
    const dw = Math.max(0, totals.write  - prev.write);
    const du = Math.max(0, totals.upload - prev.upload);
    if (dr <= 0 && dw <= 0 && du <= 0) return;

    const now = new Date();
    try {
      await addAtomic(base('totals'), dr, dw, du);
      await Promise.all([
        addAtomic(base(`minute/${keyMinute(now)}`), dr, dw, du),
        addAtomic(base(`hour/${keyHour(now)}`),     dr, dw, du),
        addAtomic(base(`day/${keyDay(now)}`),       dr, dw, du),
        addAtomic(base(`week/${keyWeek(now)}`),     dr, dw, du),
        addAtomic(base(`month/${keyMonth(now)}`),   dr, dw, du),
      ]);
    } catch (e) {
      console.warn('[traffic] flush failed:', e?.message || e);
    } finally {
      prev = { ...totals };
    }
  };

  prev = { ...(NetMeter?.totals || { read: 0, write: 0, upload: 0 }) };
  timer = setInterval(flush, intervalMs);

  const onVisChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisChange);
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisChange);
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', flush);
  };
};

// רולאפים היסטוריים יומי/שעתית: __metrics/byDay/<YYYY-MM-DD>/{totals,byHour/<HH>}
let _rollupTimer = null;
const _dayKey  = (d = new Date()) => d.toISOString().slice(0, 10);       // YYYY-MM-DD (UTC)
const _hourKey = (d = new Date()) => String(d.getUTCHours()).padStart(2,'0');

const startRollups = (db, uid, eventId) => {
  if (!uid || !eventId || _rollupTimer) return () => {};
  const base = (path='') => db.ref(`Events/${uid}/${eventId}/__metrics/${path}`);
  let lastFlushed = { read: 0, write: 0, upload: 0 };

  const flush = async () => {
    const now = new Date();
    const day = _dayKey(now), hour = _hourKey(now);
    const cur = { read: NetMeter.totals.read, write: NetMeter.totals.write, upload: NetMeter.totals.upload };
    const dlt = { read: Math.max(0, cur.read - lastFlushed.read), write: Math.max(0, cur.write - lastFlushed.write), upload: Math.max(0, cur.upload - lastFlushed.upload) };

    if (dlt.read === 0 && dlt.write === 0 && dlt.upload === 0) {
      try { await base('lastUpdated').set(Date.now()); } catch {}
      return;
    }

    const addDelta = (v) => {
      const next = v || {};
      next.read   = Number(next.read   || next.readBytes   || 0) + dlt.read;
      next.write  = Number(next.write  || next.writeBytes  || 0) + dlt.write;
      next.upload = Number(next.upload || next.uploadBytes || 0) + dlt.upload;
      return next;
    };

    try {
      await base(`byDay/${day}/totals`).transaction(addDelta);
      await base(`byDay/${day}/byHour/${hour}`).transaction(addDelta);
      await base(`traffic/totals`).transaction(addDelta);
      await base('lastUpdated').set(Date.now());
    } catch (e) {
      console.log('rollup flush error:', e?.message || e);
    } finally {
      lastFlushed = cur;
    }
  };

  flush();
  _rollupTimer = setInterval(flush, 15000);
  return () => { clearInterval(_rollupTimer); _rollupTimer = null; };
};

// מוני ביקורים: __admin/visits
const bumpVisitCounters = async (db, uid, eventId) => {
  if (!uid || !eventId) return;
  const base = (p='') => db.ref(`Events/${uid}/${eventId}/__admin/visits/${p}`);

  const now = new Date();
  const day   = _dayKey(now);
  const week  = Math.floor(now.getTime() / (1000*60*60*24*7));
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;

  try {
    await Promise.all([
      base(`day/${day}`).transaction((v) => (v || 0) + 1),
      base(`week/${week}`).transaction((v) => (v || 0) + 1),
      base(`month/${month}`).transaction((v) => (v || 0) + 1),
      db.ref(`Events/${uid}/${eventId}/__admin/visits/lastAt`).set(Date.now()),
    ]);
  } catch {}
};

// ======================== HELPERS: Guests + Plan Quota ========================
const fetchGuestCount = async (db, uid, eventId) => {
  // נסיון 0: Numberofguests (כמו אצלך "400")
  const nSnap = await db.ref(`Events/${uid}/${eventId}/Numberofguests`).get();
  if (nSnap.exists()) {
    const n = parseInt(nSnap.val(), 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }

  // נסיון 1: guests
  const g1 = await db.ref(`Events/${uid}/${eventId}/guests`).get();
  if (g1.exists()) {
    const val = g1.val() || {};
    return Object.keys(val).length;
  }

  // נסיון 2: formattedContacts
  const g2 = await db.ref(`Events/${uid}/${eventId}/formattedContacts`).get();
  if (g2.exists()) {
    const val = g2.val() || {};
    return Object.keys(val).length;
  }

  return 0;
};

const clamp = (n, min = 0, max = 999999) => Math.max(min, Math.min(max, n));

// כתיבה קומפקטית: תמיד מספר ב-main_sms + מטא ב-main_sms_meta
const writeMainSmsCompat = async (db, uid, eventId, quota, meta) => {
  await meteredSet(db.ref(`Events/${uid}/${eventId}/main_sms`), quota);
  await meteredSet(db.ref(`Events/${uid}/${eventId}/main_sms_meta`), { quota, ...meta });
};

const recomputeAndWriteQuota = async (planType, targetUid, id) => {
  if (!targetUid || !id) return;
  const db = firebase.database();

  const Numberofguests = await fetchGuestCount(db, targetUid, id);
  const factor = PLAN_FACTORS[planType] ?? PLAN_FACTORS.basic;
  const quotaRaw = Math.ceil(Numberofguests * factor);
  const quota = clamp(quotaRaw, 0, 999999);

  await writeMainSmsCompat(db, targetUid, id, quota, {
    guests: Numberofguests,
    factor,
    plan: planType,
    updatedAt: Date.now(),
    source: 'auto-plan-change',
  });

  // לוג לאודיט
  const key = db.ref().push().key;
  await db.ref(`Events/${targetUid}/${id}/__admin/audit/${key}`).set({
    ts: Date.now(),
    action: `עודכנה מכסה ב-main_sms: ${quota} (guests=${Numberofguests}, plan=${planType}, factor=${factor})`
  });
};

// ======================== COMPONENT ========================
export default function AdminPanel() {
  const route = useRoute();
  const navigation = useNavigation();
  const id = route?.params?.id;

  // uid: יכול להגיע מבחוץ (OwnerDashboard) או מהמשתמש המחובר
  const overrideUid = route?.params?.uid;
  const authUser = firebase.auth().currentUser;
  const targetUid = overrideUid || authUser?.uid;
  const autoAuthorize = Boolean(overrideUid);

  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  // STATE
  const [authorized, setAuthorized] = useState(autoAuthorize);
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(true);

  // תכנית הודעות
  const [plan, setPlan] = useState({ type: 'basic' }); // הערך בפועל מהמסד
  const [pendingPlanType, setPendingPlanType] = useState('basic'); // בחירה במסך לפני/אחרי שמירה

  // היום מתוך היסטוריית byDay (מצטבר בין סשנים)
  const [todayTraffic, setTodayTraffic] = useState({ readMB: 0, writeMB: 0, uploadMB: 0 });
  const todayKeyUTC = () => new Date().toISOString().slice(0, 10);
  const toMB = (b = 0) => Number(b) / 1e6;

  const [visits, setVisits] = useState({ today: 0, week: 0, month: 0, lastAt: 0 });
  const [rsvp, setRsvp]     = useState({ yes: 0, maybe: 0, no: 0, pending: 0 });
  const [storageUsage, setStorageUsage] = useState({ files: 0, bytes: 0 });
  const [audit, setAudit]   = useState([]);

  // באקטים "חיים"
  const [traffic, setTraffic] = useState({
    minute: { readMB: 0, writeMB: 0, uploadMB: 0 },
    hour:   { readMB: 0, writeMB: 0, uploadMB: 0 },
    day:    { readMB: 0, writeMB: 0, uploadMB: 0 },
    week:   { readMB: 0, writeMB: 0, uploadMB: 0 },
    month:  { readMB: 0, writeMB: 0, uploadMB: 0 },
    totals: { readMB: 0, writeMB: 0, uploadMB: 0 },
  });

  // סדר הצ'יפים
  const [bucket, setBucket] = useState('day');
  const buckets = ['totals','month','week','day','hour','minute'];

  // אנימציה
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 420, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideUp, { toValue: 0, duration: 420, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [authorized]);

  // HELPERS
  const fmt = (n) => Number(n || 0).toLocaleString('he-IL');
  const fmtMB = (n) => `${(Number(n||0)).toFixed(2)} MB`;
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleString('he-IL') : '-';
  const doAuth = () => pass.trim() === ADMIN_PASS ? setAuthorized(true) : Alert.alert('שגיאה', 'סיסמה שגויה');
  const doBack = () => navigation.goBack();

  const selectedTraffic = bucket === 'day'
    ? todayTraffic
    : (traffic[bucket] || { readMB:0, writeMB:0, uploadMB:0 });

  const sumSelected = selectedTraffic.readMB + selectedTraffic.writeMB + selectedTraffic.uploadMB || 0.0001;
  const pct = (x) => Math.min(100, Math.round((x / sumSelected) * 100));

  // ===== התחלת כתיבה מצטברת (רק אם יש targetUid) =====
  useEffect(() => {
    if (!targetUid || !id) return;
    const db = firebase.database();
    const stopBuckets = startTrafficBuckets(db, targetUid, id, 15000); // flush כל 15 שניות
    const stopRollups = startRollups(db, targetUid, id);               // היסטוריה byDay/byHour
    bumpVisitCounters(db, targetUid, id);                              // מוני כניסות
    return () => { stopBuckets?.(); stopRollups?.(); };
  }, [targetUid, id]);

  // ===== DATA LOAD מאזינים (קריאה בלבד) =====
  useEffect(() => {
    let offs = [];
    if (!authorized || !targetUid || !id) return;

    setLoading(true);
    const db = firebase.database();

    // Visits
    const vRef = db.ref(`Events/${targetUid}/${id}/__admin/visits`);
    offs.push(vRef.on('value', (s) => {
      const v = s.val() || {};
      const dayMap = v.day || {};
      const lastDayKey = Object.keys(dayMap).sort().pop();
      setVisits({
        today:  Number(v.today || (lastDayKey ? dayMap[lastDayKey] : 0) || 0),
        week:   Number(v.week  || 0),
        month:  Number(v.month || 0),
        lastAt: Number(v.lastAt|| 0),
      });
    }));

    // RSVP snapshot
    const eRef = db.ref(`Events/${targetUid}/${id}`);
    offs.push(eRef.on('value', (s) => {
      const v = s.val() || {};
      setRsvp({
        yes: Number(v.yes_caming || 0),
        maybe: Number(v.maybe || 0),
        no: Number(v.no_cuming || 0),
        pending: Number(v.no_answear || 0),
      });
    }));

    // PLAN: קריאה מהמסד ועדכון סטייט
    const pRef = db.ref(`Events/${targetUid}/${id}/plan/type`);
    offs.push(pRef.on('value', (s) => {
      const t = (s.val() || 'basic').toString();
      setPlan({ type: t });
      setPendingPlanType(t); // מסנכרן את בחירת ה־UI למצב הקיים
    }));

    // היום מתוך היסטוריית byDay/<YYYY-MM-DD>/totals
    const dRef = db.ref(`Events/${targetUid}/${id}/__metrics/byDay/${todayKeyUTC()}/totals`);
    offs.push(dRef.on('value', (s) => {
      const v = s.val() || {};
      setTodayTraffic({
        readMB:   toMB(v.read   ?? v.readBytes   ?? 0),
        writeMB:  toMB(v.write  ?? v.writeBytes  ?? 0),
        uploadMB: toMB(v.upload ?? v.uploadBytes ?? 0),
      });
    }));

    // הבאקטים ה"נדיפים" (חי)
    ['minute','hour','day','week','month','totals'].forEach((b) => {
      const br = db.ref(`Events/${targetUid}/${id}/__metrics/traffic/${b}`);
      offs.push(br.on('value', (s) => {
        const v = s.val() || {};
        setTraffic((prev) => ({
          ...prev,
          [b]: {
            readMB:   Number((v.readBytes||0)/1e6),
            writeMB:  Number((v.writeBytes||0)/1e6),
            uploadMB: Number((v.uploadBytes||0)/1e6),
          }
        }));
      }));
    });

    // Audit
    const aRef = db.ref(`Events/${targetUid}/${id}/__admin/audit`).limitToLast(50);
    offs.push(aRef.on('value', (s) => {
      const arr = [];
      s.forEach((c) => arr.push({ key: c.key, ...(c.val()||{}) }));
      arr.sort((a,b)=> (a.ts||0) - (b.ts||0));
      setAudit(arr.reverse());
    }));

    // Storage usage
    (async () => {
      try {
        const storage = firebase.storage().ref();
        const base = storage.child(`users/${targetUid}/${id}`);
        const listAllRec = async (folderRef) => {
          let count = 0, bytes = 0;
          const walk = async (ref) => {
            const res = await ref.listAll();
            for (const item of res.items) {
              const md = await item.getMetadata();
              count += 1;
              bytes += Number(md.size || 0);
            }
            for (const pref of res.prefixes) await walk(pref);
          };
          await walk(base);
          return { files: count, bytes };
        };
        const { files, bytes } = await listAllRec(base);
        setStorageUsage({ files, bytes });
      } catch {
        setStorageUsage({ files: 0, bytes: 0 });
      }
      setLoading(false);
    })();

    // ===== עדכון מכסה אוטומטי כשמספר המוזמנים משתנה =====
    // Numberofguests (מחרוזת/מספר)
    const nGuestsRef = db.ref(`Events/${targetUid}/${id}/Numberofguests`);
    offs.push(nGuestsRef.on('value', async () => {
      await recomputeAndWriteQuota((plan?.type) || 'basic', targetUid, id);
    }));
    // guests
    const guestsRef = db.ref(`Events/${targetUid}/${id}/guests`);
    offs.push(guestsRef.on('value', async () => {
      await recomputeAndWriteQuota((plan?.type) || 'basic', targetUid, id);
    }));
    // formattedContacts
    const fcRef = db.ref(`Events/${targetUid}/${id}/formattedContacts`);
    offs.push(fcRef.on('value', async () => {
      await recomputeAndWriteQuota((plan?.type) || 'basic', targetUid, id);
    }));

    return () => {
      try { offs.forEach((off) => { try { typeof off === 'function' ? off() : null; } catch {} }); } catch {}
      db.goOffline(); db.goOnline();
    };
  }, [authorized, targetUid, id, plan?.type]);

  // בחירה מיידית של תכנית + חישוב ושמירת main_sms
  const applyPlanInstant = async (nextType) => {
    if (!targetUid || !id) return;
    const db = firebase.database();

    await meteredSet(db.ref(`Events/${targetUid}/${id}/plan`), {
      type: nextType,
      updatedAt: Date.now()
    });

    await recomputeAndWriteQuota(nextType, targetUid, id);
    setPendingPlanType(nextType);

    const key = db.ref().push().key;
    await db.ref(`Events/${targetUid}/${id}/__admin/audit/${key}`).set({
      ts: Date.now(),
      action: `תוכנית עודכנה ל-${nextType} (לחיצה מיידית)`
    });
  };

  // (נשאר למי שרוצה כפתור שמירה, אבל לא חובה)
  const savePlan = async () => {
    await applyPlanInstant(pendingPlanType || 'basic');
    Alert.alert('עודכן', `נשמרה תכנית: ${(pendingPlanType || 'basic').toUpperCase()}`);
  };

  // UI PRIMITIVES
  const Section = ({ title, icon, children, color='#6C63FF' }) => (
    <Animated.View style={[
      styles.section,
      { transform: [{ translateY: slideUp }], opacity: fadeIn, borderColor: color + '33', backgroundColor: '#ffffff' }
    ]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color+'22', borderColor: color+'66' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Animated.View>
  );
  const StatRow = ({ label, value, subtitle, strong, align='space-between' }) => (
    <View style={[styles.row, { justifyContent: align }]}>
      <Text style={styles.dim}>{label}</Text>
      <View style={{ alignItems:'flex-end' }}>
        <Text style={[styles.value, strong && styles.bold]}>{value}</Text>
        {!!subtitle && <Text style={styles.dimSmall}>{subtitle}</Text>}
      </View>
    </View>
  );
  const Bar = ({ label, mb, perc, tint='#6C63FF' }) => (
    <View style={{ marginVertical: 6 }}>
      <View style={[styles.row, { marginBottom: 4 }]}>
        <Text style={styles.dim}>{label}</Text>
        <Text style={styles.dim}>{fmtMB(mb)}  •  {perc}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(3, perc)}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
  const Chip = ({ text, active, onPress }) => (
    <Pressable onPress={onPress} style={[styles.chip, active ? { backgroundColor:'#6C63FF' } : { backgroundColor:'#F2F2FF' }]}>
      <Text style={[styles.chipText, active ? { color:'#fff' } : { color:'#4b4b76' }]}>{text}</Text>
    </Pressable>
  );

  // GUARDS
  if (!targetUid || !id) {
    return (<View style={s.wrap}><Text style={s.title}>לא נמצא uid או id</Text></View>);
  }

  if (!authorized) {
    return (
      <View style={styles.loginWrap}>
        <View style={[styles.loginCard, { width: Math.min(460, width*0.9) }]}>
          <View style={styles.loginHeader}>
            <TouchableOpacity onPress={doBack} style={styles.backBtn} accessibilityLabel="חזרה">
              <Ionicons name="arrow-back" size={20} color="#222" />
            </TouchableOpacity>
            <Ionicons name="shield-checkmark" size={26} color="#6C63FF" />
            <Text style={styles.loginTitle}>מסך ניהול (מוגן)</Text>
            <Text style={styles.loginSub}>הזן/י סיסמה כדי להמשיך</Text>
          </View>

          <View style={{ width: '100%' }}>
            <TextInput
              value={pass}
              onChangeText={setPass}
              secureTextEntry
              keyboardType="number-pad"
              placeholder="********"
              placeholderTextColor="#9aa3ac"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={doAuth}
            />
            <TouchableOpacity onPress={doAuth} style={styles.primaryBtn}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>כניסה</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginFooter}>
            <Text style={styles.loginFooterText}>אירוע: <Text style={styles.bold}>{id}</Text></Text>
          </View>
        </View>
      </View>
    );
  }

  // RENDER
  return (
    <View style={[styles.screen, { backgroundColor: isMobile ? '#f6f7fb' : '#f2f3ff' }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={doBack} style={styles.topBackBtn} accessibilityLabel="חזרה">
          <Ionicons name="arrow-back" size={20} color="#1c1c28" />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.topTitle}>דשבורד ניהול • {id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { padding: isMobile ? 12 : 16 }]}>
        {loading ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}

        {/* KPIs */}
        <Animated.View style={[styles.kpiRow, { opacity: fadeIn, transform:[{ translateY: slideUp }] }]}>
          <View style={[styles.kpiCard, { backgroundColor:'#F0F5FF', borderColor:'#B9CCFF' }]}>
            <View style={styles.kpiIcon}><Ionicons name="people" size={18} color="#3B6BFF" /></View>
            <Text style={styles.kpiLabel}>מגיעים</Text>
            <Text style={styles.kpiValue}>{fmt(rsvp.yes)}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor:'#FFF7EE', borderColor:'#FFD7AA' }]}>
            <View style={styles.kpiIcon}><Ionicons name="help-buoy" size={18} color="#F59E0B" /></View>
            <Text style={styles.kpiLabel}>אולי</Text>
            <Text style={styles.kpiValue}>{fmt(rsvp.maybe)}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor:'#FEF2F2', borderColor:'#FECACA' }]}>
            <View style={styles.kpiIcon}><Ionicons name="close-circle" size={18} color="#EF4444" /></View>
            <Text style={styles.kpiLabel}>לא מגיעים</Text>
            <Text style={styles.kpiValue}>{fmt(rsvp.no)}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor:'#F5F5FB', borderColor:'#D6D6FE' }]}>
            <View style={styles.kpiIcon}><Ionicons name="time" size={18} color="#6C63FF" /></View>
            <Text style={styles.kpiLabel}>בהמתנה</Text>
            <Text style={styles.kpiValue}>{fmt(rsvp.pending)}</Text>
          </View>
        </Animated.View>

        {/* Visits */}
        <Section title="כניסות משתמש" icon="footsteps" color="#0EA5E9">
          <StatRow label="היום" value={fmt(visits.today)} strong />
          <StatRow label="7 ימים" value={fmt(visits.week)} />
          <StatRow label="30 ימים" value={fmt(visits.month)} />
          <StatRow label="כניסה אחרונה" value={fmtDate(visits.lastAt)} />
          <TouchableOpacity onPress={async () => {
            const csv = [
              'category,value',
              `today,${visits.today}`,
              `week,${visits.week}`,
              `month,${visits.month}`,
              `lastAt,${fmtDate(visits.lastAt)}`
            ].join('\n');

            const fileUri = FileSystem.cacheDirectory + `visits_${Date.now()}.csv`;
            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
            if (Platform.OS !== 'web') await Sharing.shareAsync(fileUri);
            else {
              const link = document.createElement('a');
              link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
              link.download = `visits_${Date.now()}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }} style={[styles.secondaryBtn, { marginTop: 10 }]}>
            <Ionicons name="download-outline" size={16} color="#0EA5E9" />
            <Text style={[styles.secondaryBtnText, { color:'#0EA5E9' }]}>ייצוא CSV</Text>
          </TouchableOpacity>
        </Section>

        {/* Plan */}
        <Section title="תכנית הודעות" icon="paper-plane-outline" color="#6366F1">
          <View style={[styles.row, { marginBottom: 6, flexWrap:'wrap', gap: 6, justifyContent:'flex-start' }]}>
            {[
              { key:'basic', label:'basic ×0.40' },
              { key:'plus', label:'plus ×0.65' },
              { key:'digital', label:'digital ×0.80' },
              { key:'complementary', label:'complementary ×1.70' },
            ].map((opt) => (
              <Chip
                key={opt.key}
                text={opt.label}
                active={pendingPlanType === opt.key}
                onPress={() => applyPlanInstant(opt.key)} // עדכון מיידי של plan + main_sms
              />
            ))}
          </View>
          <StatRow
            label="תכנית נוכחית"
            value={plan?.type ? plan.type.toUpperCase() : 'BASIC'}
            subtitle={`פקטור: ×${PLAN_FACTORS[plan?.type || 'basic']}`}
            strong
          />
          <TouchableOpacity onPress={savePlan} style={[styles.primaryBtn, { marginTop: 8 }]}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>שמור תכנית</Text>
          </TouchableOpacity>
          <Text style={[styles.dimSmall, { marginTop: 6, textAlign:'left' }]}>
            שמירה/בחירת צ׳יפ תעדכן אוטומטית את main_sms לפי (#מוזמנים × פקטור).
          </Text>
        </Section>

        {/* Traffic */}
        <Section title="תעבורת Firebase/Storage" icon="cloud-upload-outline" color="#6C63FF">
          {/* בחירת באקט */}
          <View style={[styles.row, { marginBottom: 6, flexWrap:'wrap', gap: 6 }]}>
            {buckets.map((b) => (
              <Chip key={b} text={b === 'totals' ? 'סה״כ' : b} active={bucket === b} onPress={() => setBucket(b)} />
            ))}
          </View>

          {/* היום מתוך היסטוריית byDay */}
          <View style={[s.group, { marginTop: 6 }]}>
            <Text style={s.dim}>היום (byDay)</Text>
            <View style={s.row}><Text>קריאה</Text><Text style={s.bold}>{todayTraffic.readMB.toFixed(2)} MB</Text></View>
            <View style={s.row}><Text>כתיבה</Text><Text style={s.bold}>{todayTraffic.writeMB.toFixed(2)} MB</Text></View>
            <View style={s.row}><Text>העלאה</Text><Text style={s.bold}>{todayTraffic.uploadMB.toFixed(2)} MB</Text></View>
          </View>

          {/* שלושת הפסים */}
          <Bar label="קריאה (RTDB)"    mb={selectedTraffic.readMB}   perc={pct(selectedTraffic.readMB)}   tint="#60A5FA" />
          <Bar label="כתיבה (RTDB)"    mb={selectedTraffic.writeMB}  perc={pct(selectedTraffic.writeMB)}  tint="#34D399" />
          <Bar label="העלאה (Storage)" mb={selectedTraffic.uploadMB} perc={pct(selectedTraffic.uploadMB)} tint="#A78BFA" />

          {bucket !== 'totals' && (
            <Text style={[styles.dimSmall, { textAlign:'left', marginTop: 6 }]}>
              סכום כולל: {(selectedTraffic.readMB + selectedTraffic.writeMB + selectedTraffic.uploadMB).toFixed(2)} MB
            </Text>
          )}
        </Section>

        {/* Storage */}
        <Section title="שימוש ב־Storage" icon="folder-open" color="#22C55E">
          <StatRow label="כמות קבצים" value={fmt(storageUsage.files)} strong />
          <StatRow label="נפח כולל" value={fmtMB(storageUsage.bytes/1e6)} />
        </Section>

        {/* Audit */}
        <Section title="פעולות אחרונות" icon="clipboard-outline" color="#F97316">
          {audit.length === 0 ? (
            <Text style={styles.dim}>אין נתונים עדיין.</Text>
          ) : (
            <FlatList
              data={audit}
              keyExtractor={(i)=>i.key}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({item}) => (
                <View style={[styles.row, { alignItems:'flex-start' }]}>
                  <View style={styles.auditTime}>
                    <Ionicons name="time-outline" size={14} color="#999" />
                    <Text style={styles.auditTimeText}>{fmtDate(item.ts)}</Text>
                  </View>
                  <Text style={{ flex:1, textAlign:'right' }}>{item.action}</Text>
                </View>
              )}
            />
          )}
        </Section>

        <View style={{ height: isMobile ? 24 : 36 }} />
      </ScrollView>
    </View>
  );
}

// ======================== STYLES ========================
const styles = StyleSheet.create({
  screen:{ flex:1 },
  scroll:{ paddingBottom: 20 },
  topBar:{ height: 54, paddingHorizontal: 12, flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#ffffff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor:'#E6E8F0' },
  topBackBtn:{ width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:'#F2F3FF' },
  topTitle:{ fontSize:16, fontWeight:'700', color:'#1c1c28', textAlign:'center', flex:1, paddingHorizontal: 8 },

  // Login
  loginWrap:{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#f2f3ff', padding:16 },
  loginCard:{ backgroundColor:'#fff', borderRadius:18, padding:16, borderWidth:StyleSheet.hairlineWidth, borderColor:'#e6e6f0', alignItems:'center' },
  loginHeader:{ alignItems:'center', marginBottom: 10, gap: 6 },
  backBtn:{ position:'absolute', top:0, left:0, width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center', backgroundColor:'#F2F3FF' },
  loginTitle:{ fontSize:18, fontWeight:'800', color:'#1c1c28', marginTop: 8 },
  loginSub:{ fontSize:13, color:'#6b7280' },
  input:{ height:48, borderRadius:12, borderWidth:1, borderColor:'#D6DAE6', paddingHorizontal:14, marginTop:12, textAlign:'center', color:'#111' },
  primaryBtn:{ marginTop:12, height:46, borderRadius:12, backgroundColor:'#6C63FF', alignItems:'center', justifyContent:'center', flexDirection:'row', gap:8 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },
  loginFooter:{ marginTop:10 },
  loginFooterText:{ fontSize:12, color:'#6b7280' },

  // Sections
  section:{ backgroundColor:'#fff', borderRadius:16, padding:14, marginVertical:8, borderWidth:1, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:6, shadowOffset:{ width:0, height:3 }, elevation:3 },
  sectionHeader:{ flexDirection:'row-reverse', alignItems:'center', marginBottom:8, gap:8 },
  sectionIcon:{ width:32, height:32, borderRadius:8, alignItems:'center', justifyContent:'center', borderWidth:1 },
  sectionTitle:{ fontSize:16, fontWeight:'800', color:'#1c1c28' },

  // Generic rows
  row:{ flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', marginVertical:4 },
  dim:{ color:'#6b7280', fontSize:13 },
  dimSmall:{ color:'#8b90a0', fontSize:12 },
  value:{ fontSize:15, color:'#111' },
  bold:{ fontWeight:'800' },

  // KPI
  kpiRow:{ flexDirection:'row-reverse', gap:10, marginTop:6, marginBottom:4, flexWrap:'wrap' },
  kpiCard:{ flexGrow:1, minWidth:150, flexBasis: '48%', borderRadius:16, padding:12, borderWidth:1 },
  kpiIcon:{ width:28, height:28, borderRadius:8, alignItems:'center', justifyContent:'center', backgroundColor:'#fff', marginBottom:4 },
  kpiLabel:{ fontSize:12, color:'#4b5563' },
  kpiValue:{ fontSize:20, fontWeight:'800', color:'#111' },

  // Buttons
  secondaryBtn:{ height:42, borderRadius:12, backgroundColor:'#F0F9FF', alignItems:'center', justifyContent:'center', flexDirection:'row', gap:8, borderWidth:1, borderColor:'#BAE6FD' },
  secondaryBtnText:{ fontWeight:'700' },

  // Bars
  barTrack:{ height:10, borderRadius:6, backgroundColor:'#F1F1F8', overflow:'hidden' },
  barFill:{ height:10, borderRadius:6 },

  // Chips
  chip:{ paddingHorizontal:12, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  chipText:{ fontSize:12, fontWeight:'700' },

  // Audit
  sep:{ height:1, backgroundColor:'#EFEFF6', marginVertical:6 },
  auditTime:{ flexDirection:'row', alignItems:'center', gap:4 },
  auditTimeText:{ color:'#888', fontSize:12 }
});

// fallback
const s = StyleSheet.create({
  wrap:{ flex:1, alignItems:'center', justifyContent:'center', padding:20 },
  title:{ fontSize:22, fontWeight:'700', textAlign:'center', marginBottom:6 },
  // משתמש גם ל"קופסא" של היום (byDay)
  group: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  row: { flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', marginVertical:2 },
  dim: { opacity: 0.7 },
  bold: { fontWeight:'700' },
});
