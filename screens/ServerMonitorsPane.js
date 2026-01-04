import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  Animated,
  Easing,
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

// ==== Utils ====
const todayISO = () => new Date().toISOString().slice(0, 10); // ⚠️ תואם לבוט (UTC slice)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const isoToTs = (iso) => {
  const t = Date.parse(String(iso || ''));
  return Number.isFinite(t) ? t : 0;
};

const parseTs = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
};

const timeAgoHe = (ts) => {
  if (!ts) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec <= 4) return 'עכשיו';
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  return `${days}d`;
};

const pad2 = (n) => String(n).padStart(2, '0');

// ISO week key (תואם למה שהכנסנו בבוט)
function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

function buildTimeKeys(now = new Date()) {
  // ⚠️ תואם לבוט: isoDay ב-UTC slice, hour ב-local getHours()
  const isoDay = now.toISOString().slice(0, 10);
  const hour = pad2(now.getHours());
  const half = now.getHours() < 12 ? 'H1' : 'H2';
  const month = now.toISOString().slice(0, 7);
  const year = now.toISOString().slice(0, 4);
  const week = isoWeekKey(now);
  return { isoDay, hour, half, month, year, week };
}

function lastNDaysKeys(n) {
  // מחזיר מערך YYYY-MM-DD (UTC slice) אחורה כולל היום
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out; // [today, yesterday,...]
}

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ==== Config ====
const RANGE_PRESETS = [
  { key: '1h', label: '1 ש׳', days: 0 },      // hourly bucket
  { key: '12h', label: '12 ש׳', days: 0 },    // halfDay bucket
  { key: '1d', label: 'יום', days: 1 },       // day bucket
  { key: '7d', label: 'שבוע', days: 7 },      // sum last 7 days
  { key: '30d', label: 'חודש', days: 30 },    // sum last 30 days
];

// ==== Hooks ====
function useDeviceServerRates({ windowMs = 60_000, pollMs = 2000 } = {}) {
  const [rates, setRates] = useState({});
  const [series, setSeries] = useState({});
  const historyRef = useRef({});

  useEffect(() => {
    const ref = firebase.database().ref('device_server');
    const cb = ref.on('value', (snap) => {
      const val = snap.val() || {};
      const keys = Object.keys(val).filter((k) => /^server_\d+$/.test(k));
      const now = Date.now();
      const iso = todayISO();

      keys.forEach((k) => {
        const serverData = val[k] || {};
        // תמיכה בשני מבני נתונים (ישיר או תחת day)
        const daily = Number(serverData[iso] || serverData?.day?.[iso] || 0);
        const lastSent = String(serverData.last_sent || '');

        const hist = (historyRef.current[k] = historyRef.current[k] || []);
        hist.push({ ts: now, count: daily });

        const prevPulse = hist.__lastPulse || '';
        if (lastSent && lastSent !== prevPulse) {
          hist.__lastPulse = lastSent;
          hist.push({ ts: now + 1, count: daily + 0.01 }); // "טיק" קטן כדי לראות תנועה
        }

        historyRef.current[k] = hist.filter((s) => now - s.ts <= windowMs + 5000);
      });
    });

    return () => {
      try {
        firebase.database().ref('device_server').off('value', cb);
      } catch {}
    };
  }, [windowMs]);

  useEffect(() => {
    const t = setInterval(() => {
      const nextRates = {};
      const nextSeries = {};

      for (const [k, samples] of Object.entries(historyRef.current)) {
        if (!samples?.length) continue;
        let rate = 0;
        if (samples.length >= 2) {
          const a = samples[0];
          const b = samples[samples.length - 1];
          const dtMin = Math.max(1e-6, (b.ts - a.ts) / 60000);
          const dc = Math.max(0, b.count - a.count);
          rate = dc / dtMin;
        }
        nextRates[k] = rate;
        nextSeries[k] = samples.map((s) => s.count).slice(-24);
      }

      setRates(nextRates);
      setSeries(nextSeries);
    }, pollMs);

    return () => clearInterval(t);
  }, [pollMs]);

  return { rates, series };
}

function useWhatsAppServersMeta() {
  // servers/<serverId> meta כולל count/date/dailyLimit/lastSeen/status/state...
  const [rawWA, setRawWA] = useState({});
  useEffect(() => {
    const ref = firebase.database().ref('servers');
    const cb = ref.on('value', (snap) => setRawWA(snap.val() || {}));
    return () => {
      try {
        ref.off('value', cb);
      } catch {}
    };
  }, []);
  return rawWA;
}

function useWhatsAppStatsGlobal() {
  // ✅ stats/global/*
  const [globalStats, setGlobalStats] = useState({});
  useEffect(() => {
    const ref = firebase.database().ref('stats/global');
    const cb = ref.on('value', (snap) => setGlobalStats(snap.val() || {}));
    return () => {
      try {
        ref.off('value', cb);
      } catch {}
    };
  }, []);
  return globalStats;
}

function useWhatsAppStatsPerServer(serverIds = []) {
  // ✅ servers/{serverId}/stats/*
  const [stats, setStats] = useState({}); // { serverId: statsObj }
  const listenersRef = useRef({});

  useEffect(() => {
    // נקה מאזינים קודמים
    const prev = listenersRef.current;
    Object.keys(prev).forEach((sid) => {
      try {
        firebase.database().ref(`servers/${sid}/stats`).off('value', prev[sid]);
      } catch {}
    });
    listenersRef.current = {};

    const nextState = {};
    const attach = (sid) => {
      const r = firebase.database().ref(`servers/${sid}/stats`);
      const cb = r.on('value', (snap) => {
        const v = snap.val() || {};
        setStats((cur) => ({ ...cur, [sid]: v }));
      });
      listenersRef.current[sid] = cb;
      nextState[sid] = nextState[sid] || {};
    };

    serverIds.forEach(attach);
    setStats((cur) => ({ ...nextState, ...cur }));

    return () => {
      const cur = listenersRef.current;
      Object.keys(cur).forEach((sid) => {
        try {
          firebase.database().ref(`servers/${sid}/stats`).off('value', cur[sid]);
        } catch {}
      });
      listenersRef.current = {};
    };
  }, [serverIds.join('|')]);

  return stats;
}

// ==== Stats read helpers (תואם לבוט) ====
function getWAValueInRangeFromStats(statsObj, rangeKey) {
  if (!statsObj) return 0;
  const now = new Date();
  const { isoDay, hour, half } = buildTimeKeys(now);

  if (rangeKey === '1h') {
    const hourKey = `${isoDay}__${hour}`;
    return safeNum(statsObj?.hours?.[hourKey]?.sent);
  }

  if (rangeKey === '12h') {
    const halfKey = `${isoDay}__${half}`;
    return safeNum(statsObj?.halfDays?.[halfKey]?.sent);
  }

  if (rangeKey === '1d') {
    return safeNum(statsObj?.days?.[isoDay]?.sent);
  }

  if (rangeKey === '7d' || rangeKey === '30d') {
    const n = rangeKey === '7d' ? 7 : 30;
    const days = lastNDaysKeys(n);
    let sum = 0;
    days.forEach((d) => {
      sum += safeNum(statsObj?.days?.[d]?.sent);
    });
    return sum;
  }

  return 0;
}

// ==== Components ====
const PulseDot = ({ color = '#10B981' }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.pulseDot, { backgroundColor: color, opacity: anim }]} />;
};

const StatusChip = ({ label, type = 'neutral' }) => {
  const colors = {
    ok: { bg: '#DCFCE7', text: '#166534' },
    warn: { bg: '#FEF3C7', text: '#92400E' },
    bad: { bg: '#FEE2E2', text: '#991B1B' },
    neutral: { bg: '#F3F4F6', text: '#374151' },
    info: { bg: '#E0E7FF', text: '#3730A3' },
  };
  const c = colors[type] || colors.neutral;
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const KpiBox = ({ label, value, sub, color = '#6366F1', animDelay = 0 }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 700,
      delay: animDelay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        styles.kpiBox,
        { borderTopColor: color, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {!!sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </Animated.View>
  );
};

const DistributionBar = ({ wa, sms }) => {
  const total = wa + sms || 1;
  const waPct = (wa / total) * 100;
  const smsPct = (sms / total) * 100;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [wa, sms]);

  const waFlex = anim.interpolate({ inputRange: [0, 1], outputRange: [0.0001, waPct] });
  const smsFlex = anim.interpolate({ inputRange: [0, 1], outputRange: [0.0001, smsPct] });

  return (
    <View style={styles.distContainer}>
      <View style={styles.distLabels}>
        <Text style={styles.distLabel}>WhatsApp ({Math.round(waPct)}%)</Text>
        <Text style={styles.distLabel}>SMS ({Math.round(smsPct)}%)</Text>
      </View>

      <View style={styles.distBar}>
        <Animated.View
          style={[
            styles.distSegment,
            { flex: waFlex, backgroundColor: '#10B981', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
          ]}
        />
        <View style={{ width: 2, backgroundColor: '#fff' }} />
        <Animated.View
          style={[
            styles.distSegment,
            { flex: smsFlex, backgroundColor: '#3B82F6', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
          ]}
        />
      </View>
    </View>
  );
};

const MiniBars = ({ values = [], color = '#3B82F6' }) => {
  const max = Math.max(1, ...values.map((x) => Number(x) || 0));
  return (
    <View style={styles.miniBars}>
      {values.slice(-20).map((v, i) => {
        const h = clamp(((Number(v) || 0) / max) * 18, 2, 18);
        return <View key={i} style={[styles.miniBar, { height: h, backgroundColor: color }]} />;
      })}
    </View>
  );
};

// ==== Server Card (עם אנימציות מורכבות + WA stats אמיתי) ====
const ServerCard = ({
  name,
  status,
  lastSeen,
  data = {},
  historyData = {},
  type = 'sms',
  onToggle,
  onReset,
  waStatsObj = null, // ✅ servers/{id}/stats
  entranceAnim,      // Animated.Value 0..1
  searchHit = true,
  onSetDailyLimit,   // (serverId, limit)
}) => {
  const [range, setRange] = useState('1d');
  const [expanded, setExpanded] = useState(false);
  const [limitDraft, setLimitDraft] = useState('');

  const exp = useRef(new Animated.Value(0)).current; // 0 collapsed -> 1 expanded
  useEffect(() => {
    Animated.timing(exp, {
      toValue: expanded ? 1 : 0,
      duration: expanded ? 520 : 420,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const isOnline = status === 'ok';
  const accent = type === 'wa' ? '#10B981' : '#3B82F6';

  // 🔥 totalInRange
  const totalInRange = useMemo(() => {
    const preset = RANGE_PRESETS.find((p) => p.key === range);

    if (type === 'sms') {
      const daysBack = preset?.days || 1;
      if (range === '1h' || range === '12h') {
        // SMS אין לנו buckets של שעה/12ש — מציג "היום" כfallback
        const iso = todayISO();
        const keysToScan = historyData.day ? historyData.day : historyData;
        return safeNum(keysToScan?.[iso]);
      }

      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const startTs = now.getTime() - daysBack * 24 * 60 * 60 * 1000;

      let sum = 0;
      const keysToScan = historyData.day ? historyData.day : historyData;
      Object.keys(keysToScan || {}).forEach((key) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          const t = isoToTs(key);
          if (t >= startTs) sum += safeNum(keysToScan[key]);
        }
      });
      return sum;
    }

    if (type === 'wa') {
      // ✅ WhatsApp: קורא מהנתיב הנכון servers/{id}/stats/...
      return getWAValueInRangeFromStats(waStatsObj, range);
    }

    return 0;
  }, [range, historyData, waStatsObj, type]);

  // WA daily progress (מבוסס servers/{id}/count + date)
  const waTodayCount = useMemo(() => {
    if (type !== 'wa') return 0;
    const iso = todayISO();
    const date = String(data.date || '');
    const c = safeNum(data.count || 0);
    return date === iso ? c : 0;
  }, [type, data.date, data.count]);

  const waLimit = useMemo(() => {
    if (type !== 'wa') return 0;
    const v = safeNum(data.dailyLimit);
    return v > 0 ? v : 0;
  }, [type, data.dailyLimit]);

  const progress = useMemo(() => {
    if (type !== 'wa' || !waLimit) return 0;
    return clamp(waTodayCount / waLimit, 0, 1);
  }, [type, waTodayCount, waLimit]);

  const progAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(progAnim, {
      toValue: progress,
      speed: 18,
      bounciness: 8,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const rotate = exp.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const advH = exp.interpolate({ inputRange: [0, 1], outputRange: [0, type === 'wa' ? 142 : 110] });

  // "Glow" לאונליין
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isOnline) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();
  }, [isOnline]);

  const glowBg = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(16,185,129,0.00)', 'rgba(16,185,129,0.10)'] });

  if (!searchHit) return null;

  return (
    <Animated.View
      style={[
        styles.serverCard,
        {
          borderColor: isOnline ? 'rgba(16,185,129,0.35)' : '#E2E8F0',
          transform: [
            { translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
          opacity: entranceAnim,
        },
      ]}
    >
      <Animated.View style={[styles.serverHeader, isOnline && { backgroundColor: glowBg }]}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          {isOnline ? <PulseDot color={accent} /> : <View style={[styles.pulseDot, { backgroundColor: '#CBD5E1' }]} />}
          <Text style={styles.serverName}>{name}</Text>
        </View>

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => setExpanded((s) => !s)} style={styles.iconBtn}>
            <Animated.Text style={{ color: '#334155', fontWeight: '900', transform: [{ rotate }] }}>⌄</Animated.Text>
          </TouchableOpacity>
<StatusChip
  label={
    data.enabled === false
      ? 'מושבת'
      : isOnline
      ? 'דלוק'
      : 'מנותק'
  }
  type={
    data.enabled === false ? 'neutral' : isOnline ? 'ok' : 'bad'
  }
/>

        </View>
      </Animated.View>

      <View style={styles.serverBody}>

      <View style={styles.detailGrid}>
  {/* נראה לאחרונה (מתי השרת “חי” לאחרונה / heartbeat) */}
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>נראה לאחרונה</Text>
    <Text style={styles.detailValue}>{timeAgoHe(lastSeen)}</Text>
  </View>

  {/* הודעה אחרונה (מתי נשלחה הודעה אחרונה) */}
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>הודעה אחרונה</Text>
    <Text style={styles.detailValue}>
      {timeAgoHe(
        parseTs(
          type === 'wa'
            ? (data.lastSentAt || data.last_sent || data.lastSent)
            : (data.last_sent || data.lastSentAt || data.lastSent)
        )
      )}
    </Text>
  </View>

  {type === 'wa' && (
    <>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>State</Text>
        <Text style={styles.detailValue}>{data.state || '-'}</Text>
      </View>

      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Status</Text>
        <Text style={styles.detailValue}>{data.status || '-'}</Text>
      </View>

      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Limit</Text>
        <Text style={styles.detailValue}>{data.dailyLimit ?? '-'}</Text>
      </View>
    </>
  )}

  {type === 'sms' && (
    <>
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Rate</Text>
        <Text style={styles.detailValue}>{Number(data.rate || 0).toFixed(1)}/m</Text>
      </View>

      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>Enabled</Text>
        <Text style={styles.detailValue}>{data.enabled ? 'true' : 'false'}</Text>
      </View>
    </>
  )}
</View>


        {/* כפתורי טווח */}
        <View style={styles.cardRangeRow}>
          {RANGE_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.cardRangeBtn, range === p.key && styles.cardRangeBtnActive]}
              onPress={() => setRange(p.key)}
            >
              <Text style={[styles.cardRangeText, range === p.key && styles.cardRangeTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rangeResultBox}>
          <Text style={styles.rangeResultLabel}>סה"כ בטווח:</Text>
          <Text style={styles.rangeResultValue}>{Number(totalInRange || 0).toLocaleString()}</Text>
        </View>

        {/* WA Progress */}
        {type === 'wa' && waLimit > 0 && (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.detailLabel}>היום</Text>
              <Text style={[styles.detailValue, { fontSize: 12 }]}>{waTodayCount}/{waLimit}</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    backgroundColor: progress >= 1 ? '#EF4444' : '#10B981',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Advanced (Animated height) */}
        <Animated.View style={[styles.advancedBox, { height: advH, opacity: exp }]}>
          {type === 'wa' ? (
            <>
              <Text style={styles.advTitle}>Advanced (WA Stats Paths)</Text>
              <Text style={styles.advLine}>• per-server: servers/{name}/stats/*</Text>
              <Text style={styles.advLine}>• global: stats/global/*</Text>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.advTitle}>Set dailyLimit</Text>
                <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={styles.limitInput}
                    value={limitDraft}
                    placeholder={`${data.dailyLimit ?? ''}`}
                    onChangeText={setLimitDraft}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.limitSaveBtn}
                    onPress={() => {
                      const n = Number(limitDraft);
                      if (!Number.isFinite(n) || n <= 0) {
                        Alert.alert('שגיאה', 'dailyLimit חייב להיות מספר חיובי');
                        return;
                      }
                      onSetDailyLimit?.(name, n);
                      setLimitDraft('');
                    }}
                  >
                    <Text style={styles.limitSaveText}>שמור</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.advTitle}>Advanced</Text>
              <Text style={styles.advLine}>• device_server/{name} (daily counters)</Text>
              <Text style={styles.advLine}>• last_sent: device_server/{name}/last_sent</Text>
            </>
          )}
        </Animated.View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.footerBtn, data.enabled !== false ? styles.btnStop : styles.btnStart]}
          onPress={() => onToggle(name, !(data.enabled !== false))}
        >
          <Text style={styles.footerBtnText}>{data.enabled !== false ? 'השבת' : 'הפעל'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.footerBtn, styles.btnReset]} onPress={() => onReset(name)}>
          <Text style={styles.footerBtnText}>איפוס</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ==== Main Component ====
export default function ServerMonitorsPane({
  serversCount = 6,
  hardDisabled = ['server_6'],
  defaultCapPerMin = 30,
}) {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const colCount = width > 900 ? 3 : width > 600 ? 2 : 1;
  const colWidth = `${100 / colCount}%`;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.poly(4)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const [capPerMin, setCapPerMin] = useState(defaultCapPerMin);
  const [globalRange, setGlobalRange] = useState('1d');
  const [search, setSearch] = useState('');

  const [rawDevice, setRawDevice] = useState({});
  const rawWA = useWhatsAppServersMeta();
  const waGlobalStats = useWhatsAppStatsGlobal();

  const iso = todayISO();

  useEffect(() => {
    const ref = firebase.database().ref('device_server');
    const cb = ref.on('value', (snap) => setRawDevice(snap.val() || {}));
    return () => {
      try {
        ref.off('value', cb);
      } catch {}
    };
  }, []);

  const { rates, series } = useDeviceServerRates({ windowMs: 60000, pollMs: 2000, capPerMin });

  const smsKeys = Array.from({ length: serversCount }, (_, i) => `server_${i + 1}`).filter(
    (k) => !hardDisabled.includes(k)
  );

  const waKeys = useMemo(() => Object.keys(rawWA || {}).sort(), [rawWA]);

  // ✅ per-server WA stats from servers/{id}/stats/*
  const waStatsPerServer = useWhatsAppStatsPerServer(waKeys);

  // --- Global totals (WA from stats/global, SMS from device_server history) ---
  const globalTotals = useMemo(() => {
    // SMS range sum (מה שיש לך — נשאר)
    const preset = RANGE_PRESETS.find((p) => p.key === globalRange);
    const daysBack = preset?.days || 1;

    let smsTotal = 0;

    if (globalRange === '1h' || globalRange === '12h') {
      // SMS אין buckets כאלה בנתונים — fallback: היום
      smsKeys.forEach((k) => {
        const data = rawDevice[k] || {};
        const keysToScan = data.day ? data.day : data;
        smsTotal += safeNum(keysToScan?.[iso]);
      });
    } else {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const startTs = now.getTime() - daysBack * 24 * 60 * 60 * 1000;

      smsKeys.forEach((k) => {
        const data = rawDevice[k] || {};
        const keysToScan = data.day ? data.day : data;
        Object.keys(keysToScan || {}).forEach((dateKey) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            const t = isoToTs(dateKey);
            if (t >= startTs) smsTotal += safeNum(keysToScan[dateKey]);
          }
        });
      });
    }

    // ✅ WA total from stats/global/*
    const waTotal = getWAValueInRangeFromStats(waGlobalStats, globalRange);

    return { smsTotal, waTotal, total: smsTotal + waTotal };
  }, [globalRange, rawDevice, smsKeys.join('|'), iso, waGlobalStats]);

  const waOnlineCount = useMemo(() => {
    return waKeys.filter((k) => {
      const meta = rawWA[k] || {};
      const lastSeen = parseTs(meta.lastSeen);
      const enabled = meta.enabled !== false;
      const isOnline = enabled && meta.status === 'online' && Date.now() - lastSeen < 90_000;
      return isOnline;
    }).length;
  }, [waKeys, rawWA]);

  // ========== Actions ==========
  const toggleSms = (n, on) => firebase.database().ref(`device_server/${n}/enabled`).set(!!on);
  const resetSms = (n) => firebase.database().ref(`device_server/${n}/${iso}`).set(0);

  const toggleWA = (n, on) => firebase.database().ref(`servers/${n}/enabled`).set(!!on);
  const resetWA = (n) => firebase.database().ref(`servers/${n}/count`).set(0);

  const setWADailyLimit = (serverId, limit) =>
    firebase.database().ref(`servers/${serverId}/dailyLimit`).set(Number(limit));

  const confirm = (title, msg, onYes) => {
    Alert.alert(title, msg, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'כן', style: 'destructive', onPress: onYes },
    ]);
  };

  const toggleAllWA = (on) => {
    confirm('אישור', `${on ? 'להפעיל' : 'להשבית'} את כל שרתי WhatsApp?`, async () => {
      await Promise.all(waKeys.map((k) => firebase.database().ref(`servers/${k}/enabled`).set(!!on)));
    });
  };

  const toggleAllSMS = (on) => {
    confirm('אישור', `${on ? 'להפעיל' : 'להשבית'} את כל שרתי SMS?`, async () => {
      await Promise.all(smsKeys.map((k) => firebase.database().ref(`device_server/${k}/enabled`).set(!!on)));
    });
  };

  const resetAllCounts = () => {
    confirm('אישור', 'לאפס מונים (count) לכל שרתי WhatsApp + SMS?', async () => {
      await Promise.all([
        ...waKeys.map((k) => firebase.database().ref(`servers/${k}/count`).set(0)),
        ...smsKeys.map((k) => firebase.database().ref(`device_server/${k}/${iso}`).set(0)),
      ]);
    });
  };

  // Entrance animations per card (stagger)
  const waEntrance = useRef({}).current;
  const smsEntrance = useRef({}).current;

  const getEntrance = (map, key, index) => {
    if (!map[key]) map[key] = new Animated.Value(0);
    return map[key];
  };

  useEffect(() => {
    const all = [
      ...waKeys.map((k, i) => ({ key: `wa:${k}`, v: getEntrance(waEntrance, k, i), delay: 80 * i })),
      ...smsKeys.map((k, i) => ({ key: `sms:${k}`, v: getEntrance(smsEntrance, k, i), delay: 80 * i })),
    ];

    // reset all to 0 then animate
    all.forEach((x) => x.v.setValue(0));

    Animated.stagger(
      60,
      all.map((x) =>
        Animated.timing(x.v, {
          toValue: 1,
          duration: 520,
          delay: 0,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [waKeys.join('|'), smsKeys.join('|')]);

  const searchNorm = search.trim().toLowerCase();
  const match = useCallback(
    (name) => {
      if (!searchNorm) return true;
      return String(name || '').toLowerCase().includes(searchNorm);
    },
    [searchNorm]
  );

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← חזור</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>ניהול שרתים</Text>
        </View>

        {/* Search + Quick Actions */}
        <View style={styles.topToolsRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="חיפוש שרת… (server1 / server_2)"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <TouchableOpacity style={styles.quickBtn} onPress={() => toggleAllWA(true)}>
            <Text style={styles.quickBtnText}>WA ON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: 'rgba(239,68,68,0.22)' }]} onPress={() => toggleAllWA(false)}>
            <Text style={styles.quickBtnText}>WA OFF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => toggleAllSMS(true)}>
            <Text style={styles.quickBtnText}>SMS ON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: 'rgba(239,68,68,0.22)' }]} onPress={() => toggleAllSMS(false)}>
            <Text style={styles.quickBtnText}>SMS OFF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: 'rgba(148,163,184,0.22)' }]} onPress={resetAllCounts}>
            <Text style={styles.quickBtnText}>RESET</Text>
          </TouchableOpacity>
        </View>

        {/* Global Range Selector */}
        <View style={styles.rangeSelector}>
          {RANGE_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.rangeBtn, globalRange === p.key && styles.rangeBtnActive]}
              onPress={() => setGlobalRange(p.key)}
            >
              <Text style={[styles.rangeText, globalRange === p.key && styles.rangeTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* KPI Row */}
          <View style={styles.kpiRow}>
            <KpiBox
              label={`תעבורה (${RANGE_PRESETS.find((p) => p.key === globalRange)?.label})`}
              value={globalTotals.total.toLocaleString()}
              sub={`WA: ${globalTotals.waTotal.toLocaleString()} | SMS: ${globalTotals.smsTotal.toLocaleString()}`}
              color="#10B981"
              animDelay={0}
            />
            <KpiBox
              label="שרתי WA פעילים"
              value={`${waOnlineCount} / ${waKeys.length}`}
              sub="Online"
              color="#3B82F6"
              animDelay={80}
            />
            <KpiBox
              label="שרתי SMS מוגדרים"
              value={smsKeys.length}
              sub={`Rate cap: ${capPerMin}/m`}
              color="#F59E0B"
              animDelay={160}
            />
          </View>

          {/* Distribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פילוח תעבורה ({RANGE_PRESETS.find((p) => p.key === globalRange)?.label})</Text>
            <View style={styles.chartCard}>
              <DistributionBar wa={globalTotals.waTotal} sms={globalTotals.smsTotal} />
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.statLabel}>WhatsApp: {globalTotals.waTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.statLabel}>SMS: {globalTotals.smsTotal.toLocaleString()}</Text>
                </View>
              </View>

              {/* ✅ debug info כדי שתראה שזה באמת קורא מה-path הנכון */}
              <View style={styles.debugBox}>
                <Text style={styles.debugText}>WA Global Path: stats/global/*</Text>
                <Text style={styles.debugText}>WA Per Server Path: servers/&lt;id&gt;/stats/*</Text>
              </View>
            </View>
          </View>

          {/* WhatsApp Servers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>שרתי WhatsApp</Text>
            <View style={styles.grid}>
              {waKeys.map((k, idx) => {
                const meta = rawWA[k] || {};
                const enabled = meta.enabled !== false;
                const lastSeen = parseTs(meta.lastSeen);
                const isOnline = enabled && meta.status === 'online' && Date.now() - lastSeen < 90_000;
                const status = isOnline ? 'ok' : enabled ? 'bad' : 'neutral';

                const entranceAnim = getEntrance(waEntrance, k, idx);

                return (
                  <View key={k} style={{ width: colWidth, padding: 6 }}>
                    <ServerCard
                      name={k}
                      type="wa"
                      status={status}
                      lastSeen={lastSeen}
                      data={meta}
                      waStatsObj={waStatsPerServer[k] || null} // ✅ פה התיקון העיקרי
                      onToggle={toggleWA}
                      onReset={resetWA}
                      entranceAnim={entranceAnim}
                      searchHit={match(k)}
                      onSetDailyLimit={setWADailyLimit}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* SMS Servers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>שרתי SMS</Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                <Text style={styles.labelInput}>Rate Limit:</Text>
                <TextInput
                  style={styles.smallInput}
                  value={String(capPerMin)}
                  onChangeText={(t) => setCapPerMin(Number(t) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.grid}>
              {smsKeys.map((k, idx) => {
                const meta = rawDevice[k] || {};
                const enabled = meta.enabled !== false;
                const lastSeen = parseTs(meta.last_sent);
                const age = Date.now() - lastSeen;

                const status = !enabled ? 'neutral' : age < 60_000 ? 'ok' : age < 300_000 ? 'warn' : 'bad';
                const rate = rates[k] || 0;
                const entranceAnim = getEntrance(smsEntrance, k, idx);

                return (
                  <View key={k} style={{ width: colWidth, padding: 6 }}>
                    <View style={{ position: 'absolute', right: 18, top: 10, zIndex: 3 }}>
                      {series[k]?.length ? <MiniBars values={series[k]} color="#3B82F6" /> : null}
                    </View>

                    <ServerCard
                      name={k}
                      type="sms"
                      status={status}
                      lastSeen={lastSeen}
                      data={{ ...meta, rate, enabled }}
                      historyData={meta}
                      onToggle={toggleSms}
                      onReset={resetSms}
                      entranceAnim={entranceAnim}
                      searchHit={match(k)}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ==== Styles ====
const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  backText: { color: '#FFF', fontWeight: '600' },

  topToolsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },

  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    flexGrow: 1,
    minWidth: 220,
  },
  searchIcon: { color: '#CBD5E1', fontWeight: '900', marginLeft: 8 },
  searchInput: { color: '#fff', flex: 1, textAlign: 'right', fontWeight: '700' },

  quickBtn: {
    backgroundColor: 'rgba(59,130,246,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  rangeSelector: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
  },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  rangeBtnActive: { backgroundColor: '#3B82F6' },
  rangeText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  rangeTextActive: { color: '#FFF' },

  scrollContent: { padding: 16 },

  kpiRow: { flexDirection: 'row-reverse', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  kpiBox: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  kpiLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4, textAlign: 'right' },
  kpiSub: { fontSize: 10, color: '#94A3B8', marginTop: 2, textAlign: 'right' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'right', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },

  distContainer: { marginBottom: 16 },
  distLabels: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
  distLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  distBar: { flexDirection: 'row-reverse', height: 12, borderRadius: 6, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  distSegment: { height: '100%' },

  statRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 20, marginTop: 10 },
  statItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statLabel: { fontSize: 13, color: '#334155' },

  debugBox: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debugText: { color: '#64748B', fontWeight: '700', fontSize: 12, textAlign: 'right' },

  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginHorizontal: -6 },

  serverCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  serverHeader: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  serverName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  serverBody: { padding: 12 },

  detailGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  detailItem: { flexGrow: 1, minWidth: '42%' },
  detailLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textAlign: 'right' },
  detailValue: { fontSize: 13, color: '#0F172A', fontWeight: '800', textAlign: 'right' },

  cardRangeRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  cardRangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  cardRangeBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRangeText: { fontSize: 11, color: '#64748B', fontWeight: '800' },
  cardRangeTextActive: { color: '#0F172A' },

  rangeResultBox: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 10,
  },
  rangeResultLabel: { fontSize: 12, color: '#4338CA', fontWeight: '800' },
  rangeResultValue: { fontSize: 14, color: '#312E81', fontWeight: '900' },

  progressTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 8 },

  advancedBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  advTitle: { color: '#0F172A', fontWeight: '900', marginBottom: 6, textAlign: 'right' },
  advLine: { color: '#64748B', fontWeight: '700', fontSize: 12, textAlign: 'right' },

  limitInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontWeight: '900',
    color: '#0F172A',
  },
  limitSaveBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  limitSaveText: { color: '#fff', fontWeight: '900' },

  cardFooter: { flexDirection: 'row-reverse', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingBottom: 12 },
  footerBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnStart: { backgroundColor: '#10B981' },
  btnStop: { backgroundColor: '#EF4444' },
  btnReset: { backgroundColor: '#334155' },
  footerBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900' },

  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: '900' },

  labelInput: { fontSize: 13, color: '#64748B', marginLeft: 8, fontWeight: '800' },
  smallInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    textAlign: 'center',
    width: 70,
    fontWeight: '900',
    color: '#0F172A',
  },

  miniBars: {
    flexDirection: 'row-reverse',
    gap: 2,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(241,245,249,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniBar: { width: 3, borderRadius: 3 },
});
