// ServerMonitorsPane.js
// ✅ Pro Dashboard Redesign + Back button + Range presets (1h/12h/day/week/month/year)
// ✅ Combined usage (WA+SMS) for selected range
// ✅ WhatsApp servers (lastSeen heartbeat) + SMS servers (rates + day aggregates)

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';

// ==== Firebase init (guard) ====
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
const todayISO = () => new Date().toISOString().slice(0, 10);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const avg = (arr) => (arr?.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
const maxArr = (arr) => (arr?.length ? arr.reduce((m, x) => (x > m ? x : m), -Infinity) : 0);
const sumNum = (arr) => arr.reduce((s, x) => s + (Number(x) || 0), 0);

const isoToTs = (iso) => {
  const t = Date.parse(String(iso || ''));
  return Number.isFinite(t) ? t : 0;
};
const tsToISO = (ts) => new Date(ts).toISOString().slice(0, 10);

const parseTs = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
};

const prettyDT = (ts) => (ts ? new Date(ts).toLocaleString('he-IL') : '—');
const timeAgoHe = (ts) => {
  if (!ts) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec <= 4) return 'עכשיו';
  if (sec < 60) return `לפני ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `לפני ${min} ד׳`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} ש׳`;
  const days = Math.floor(hr / 24);
  return `לפני ${days} ימים`;
};

const palette = ['#6C63FF', '#22C55E', '#0EA5E9', '#F59E0B', '#EF4444', '#14B8A6', '#A78BFA'];
const serverColor = (name, i = 0) => palette[Math.abs((name?.length || 0) + i) % palette.length];

// ==== Presets (Ranges) ====
const RANGE_PRESETS = [
  // rolling (best for rates/heartbeat)
  { key: '1h', label: 'שעה', kind: 'rolling', ms: 60 * 60 * 1000, chartWindowSec: 60 * 60 },
  { key: '12h', label: '12 שעות', kind: 'rolling', ms: 12 * 60 * 60 * 1000, chartWindowSec: 12 * 60 * 60 },
  // calendar-ish (best for day map sums)
  { key: '1d', label: 'יום', kind: 'days', days: 1, ms: 24 * 60 * 60 * 1000, chartWindowSec: 24 * 60 * 60 },
  { key: '7d', label: 'שבוע', kind: 'days', days: 7, ms: 7 * 24 * 60 * 60 * 1000, chartWindowSec: 24 * 60 * 60 },
  { key: '30d', label: 'חודש', kind: 'days', days: 30, ms: 30 * 24 * 60 * 60 * 1000, chartWindowSec: 24 * 60 * 60 },
  { key: '365d', label: 'שנה', kind: 'days', days: 365, ms: 365 * 24 * 60 * 60 * 1000, chartWindowSec: 24 * 60 * 60 },
];

const getPreset = (key) => RANGE_PRESETS.find((p) => p.key === key) || RANGE_PRESETS[2];

// ==== z-score (SMS anomaly) ====
function zScore(series = [], win = 12) {
  if (!series?.length) return [];
  const out = [];
  let sum1 = 0,
    sum2 = 0;
  const q = [];
  for (let i = 0; i < series.length; i++) {
    const v = Number(series[i] || 0);
    q.push(v);
    sum1 += v;
    sum2 += v * v;
    if (q.length > win) {
      const r = q.shift();
      sum1 -= r;
      sum2 -= r * r;
    }
    const nn = q.length;
    const mean = sum1 / nn;
    const std = Math.sqrt(Math.max(1e-9, sum2 / nn - mean * mean));
    out.push((v - mean) / (std || 1));
  }
  return out;
}

const DEFAULT_SLA = {
  perMinWarn: 20,
  perMinCrit: 27,
  heartbeatSecWarn: 30,
  heartbeatSecCrit: 90,
  zAbsWarn: 2.0,
  zAbsCrit: 3.2,
};

const WA_SLA = { heartbeatSecWarn: 45, heartbeatSecCrit: 120 };

// ==== Alerts (SMS) ====
function buildServerAlerts({ metaByName, rates, series, capPerMin, nowTs = Date.now(), sla = DEFAULT_SLA }) {
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

    if (enabled && ageSec >= sla.heartbeatSecCrit) alerts.push({ sev: 'critical', name, msg: `אין דופק ${ageSec}s` });
    else if (enabled && ageSec >= sla.heartbeatSecWarn) alerts.push({ sev: 'warning', name, msg: `דופק איטי (${ageSec}s)` });

    if (rateNow >= sla.perMinCrit || rateNow >= capPerMin * 0.95) alerts.push({ sev: 'critical', name, msg: `קצב ${rateNow.toFixed(1)} הוד׳/ד׳` });
    else if (rateNow >= sla.perMinWarn) alerts.push({ sev: 'warning', name, msg: `קצב גבוה ${rateNow.toFixed(1)}` });

    if (zNow >= sla.zAbsCrit) alerts.push({ sev: 'critical', name, msg: `אנומליה |z|=${zNow.toFixed(1)}` });
    else if (zNow >= sla.zAbsWarn) alerts.push({ sev: 'warning', name, msg: `אנומליה |z|=${zNow.toFixed(1)}` });
  }

  alerts.sort((a, b) => (a.sev === b.sev ? a.name.localeCompare(b.name) : a.sev === 'critical' ? -1 : 1));
  return alerts;
}

// ==== Rates hook (SMS device_server) ====
function useDeviceServerRates({ windowMs = 60_000, pollMs = 2000, capPerMin = 30 } = {}) {
  const [rates, setRates] = useState({});
  const [series, setSeries] = useState({});
  const historyRef = useRef({});

  useEffect(() => {
    const ref = firebase.database().ref('device_server');
    const off = ref.on('value', (snap) => {
      const val = snap.val() || {};
      const keys = Object.keys(val)
        .filter((k) => /^server_\d+$/.test(k))
        .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));

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
      const minsSinceMidnight = Math.max(1, Math.floor((now - new Date(todayISO()).getTime()) / 60000));

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

        const dens = 26;
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

  return { rates, series };
}

// ==== WhatsApp servers hook ====
function useWhatsAppServers() {
  const [rawWA, setRawWA] = useState({});
  useEffect(() => {
    const ref = firebase.database().ref('servers');
    const off = ref.on('value', (snap) => setRawWA(snap.val() || {}));
    return () => {
      try {
        ref.off('value', off);
      } catch {}
    };
  }, []);
  return rawWA;
}

// ==== UI atoms ====
function Panel({ title, subtitle, right, children, style }) {
  return (
    <View style={[S.panel, style]}>
      <View style={S.panelHead}>
        <View style={{ flex: 1 }}>
          <Text style={S.panelTitle}>{title}</Text>
          {!!subtitle && <Text style={S.panelSub}>{subtitle}</Text>}
        </View>
        {!!right && <View style={{ alignItems: 'flex-end' }}>{right}</View>}
      </View>
      {children}
    </View>
  );
}

function Chip({ label, tone = 'neutral' }) {
  const map = {
    ok: { bg: '#ECFDF5', br: '#A7F3D0', tx: '#065F46' },
    warn: { bg: '#FFFBEB', br: '#FDE68A', tx: '#7A5C00' },
    bad: { bg: '#FEF2F2', br: '#FCA5A5', tx: '#7F1D1D' },
    neutral: { bg: '#F1F5F9', br: '#E2E8F0', tx: '#334155' },
    info: { bg: '#EEF2FF', br: '#C7D2FE', tx: '#312E81' },
  };
  const c = map[tone] || map.neutral;
  return (
    <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 999, borderWidth: 1, borderColor: c.br, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.tx, fontWeight: '900', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function KpiCard({ label, value, hint, tone = 'info', wide = false }) {
  const map = {
    ok: { bg: '#ECFDF5', br: '#A7F3D0', tx: '#065F46' },
    warn: { bg: '#FFFBEB', br: '#FDE68A', tx: '#7A5C00' },
    bad: { bg: '#FEF2F2', br: '#FCA5A5', tx: '#7F1D1D' },
    info: { bg: '#EEF2FF', br: '#C7D2FE', tx: '#312E81' },
    neutral: { bg: '#FFFFFF', br: '#E2E8F0', tx: '#0f172a' },
  };
  const c = map[tone] || map.neutral;

  return (
    <View style={[S.kpi, { backgroundColor: c.bg, borderColor: c.br }, wide && { minWidth: 220, flexGrow: 2 }]}>
      <Text style={[S.kpiLabel, { color: c.tx }]}>{label}</Text>
      <Text style={[S.kpiValue, { color: c.tx }]}>{value}</Text>
      {!!hint && <Text style={[S.kpiHint, { color: c.tx }]}>{hint}</Text>}
    </View>
  );
}

function ProgressBar({ pct = 0, tone = 'info' }) {
  const map = {
    ok: '#22C55E',
    warn: '#F59E0B',
    bad: '#EF4444',
    info: '#6C63FF',
    neutral: '#94A3B8',
  };
  const c = map[tone] || map.info;
  return (
    <View style={S.progressBg}>
      <View style={[S.progressFill, { width: `${(Math.max(0, Math.min(1, pct)) * 100).toFixed(1)}%`, backgroundColor: c }]} />
    </View>
  );
}

function MiniSpark({ samples = [], color = '#6C63FF', height = 40 }) {
  const s = Array.isArray(samples) ? samples : [];
  const maxV = Math.max(1, ...s.map((x) => Number(x) || 0));
  const bars = s.slice(-22);
  return (
    <View style={[S.spark, { height }]}>
      {bars.map((v, i) => {
        const h = Math.max(2, Math.round(((Number(v) || 0) / maxV) * (height - 8)));
        return <View key={i} style={{ width: 5, height: h, borderRadius: 4, backgroundColor: color, opacity: i === bars.length - 1 ? 1 : 0.6 }} />;
      })}
    </View>
  );
}

function DangerDot({ tone = 'ok' }) {
  const map = { ok: '#22C55E', warn: '#F59E0B', bad: '#EF4444', neutral: '#94A3B8', info: '#6C63FF' };
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: map[tone] || '#94A3B8' }} />;
}

function RangeButtons({ value, onChange }) {
  return (
    <View style={S.rangeWrap}>
      {RANGE_PRESETS.map((p) => {
        const active = value === p.key;
        return (
          <TouchableOpacity
            key={p.key}
            onPress={() => onChange?.(p.key)}
            style={[
              S.rangeBtn,
              {
                borderColor: active ? '#6C63FF' : '#E2E8F0',
                backgroundColor: active ? '#EEF2FF' : '#FFFFFF',
              },
            ]}
          >
            <Text style={{ fontWeight: '900', color: active ? '#312E81' : '#0f172a' }}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ==== Cards ====
function WhatsAppServerCard({ name, meta, color, onReset, onToggle, rangeMs }) {
  const enabled = meta?.enabled !== false;

  const lastSeenTs = parseTs(meta?.lastSeen);
  const ageSec = lastSeenTs ? Math.floor((Date.now() - lastSeenTs) / 1000) : 999999;

  const statusRaw = String(meta?.status || '').toLowerCase();
  const statusByField = statusRaw === 'online';

  const onlineByHB = ageSec <= WA_SLA.heartbeatSecWarn;
  const offlineHard = ageSec >= WA_SLA.heartbeatSecCrit;

  const tone = offlineHard || !statusByField ? 'bad' : onlineByHB ? 'ok' : 'warn';

  const count = Number(meta?.count || 0);
  const date = String(meta?.date || '');
  const state = String(meta?.state || '');
  const reason = String(meta?.reason || '');
  const readyAtTs = parseTs(meta?.readyAt);

  const activeInRange = lastSeenTs && rangeMs ? (Date.now() - lastSeenTs <= rangeMs) : false;

  return (
    <View style={S.card}>
      <View style={S.cardTop}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: 0.9 }} />
          <Text style={S.cardTitle}>{name}</Text>
        </View>

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <DangerDot tone={tone} />
          <Chip label={tone === 'ok' ? 'ONLINE' : tone === 'warn' ? 'LAG' : 'OFFLINE'} tone={tone} />
        </View>
      </View>

      <View style={S.grid2}>
        <View style={S.kv}>
          <Text style={S.kvK}>Active (Range)</Text>
          <Text style={S.kvV}>{activeInRange ? 'כן' : 'לא'}</Text>
        </View>

        <View style={S.kv}>
          <Text style={S.kvK}>Last Seen</Text>
          <Text style={S.kvV}>
            {timeAgoHe(lastSeenTs)} <Text style={{ color: '#94A3B8', fontWeight: '800' }}>({prettyDT(lastSeenTs)})</Text>
          </Text>
        </View>

        <View style={S.kv}>
          <Text style={S.kvK}>Daily Count</Text>
          <Text style={S.kvV}>{count.toLocaleString('he-IL')}</Text>
        </View>

        <View style={S.kv}>
          <Text style={S.kvK}>Date</Text>
          <Text style={S.kvV}>{date || '—'}</Text>
        </View>

        <View style={S.kv}>
          <Text style={S.kvK}>Ready At</Text>
          <Text style={S.kvV}>{readyAtTs ? prettyDT(readyAtTs) : '—'}</Text>
        </View>
      </View>

      <View style={{ marginTop: 10, gap: 6 }}>
        <View style={S.lineRow}>
          <Text style={S.lineK}>state</Text>
          <Text style={S.lineV}>{state || '—'}</Text>
        </View>
        <View style={S.lineRow}>
          <Text style={S.lineK}>reason</Text>
          <Text style={S.lineV}>{reason || '—'}</Text>
        </View>
        <View style={S.lineRow}>
          <Text style={S.lineK}>enabled</Text>
          <Text style={S.lineV}>{enabled ? 'true' : 'false'}</Text>
        </View>
      </View>

      <View style={S.actionsRow}>
        <TouchableOpacity onPress={() => onReset?.(name)} style={[S.btn, { backgroundColor: '#111827', flex: 1 }]}>
          <Text style={S.btnTxt}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggle?.(name, !enabled)} style={[S.btn, { backgroundColor: enabled ? '#EF4444' : '#22C55E', flex: 1 }]}>
          <Text style={S.btnTxt}>{enabled ? 'Disable' : 'Enable'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SmsServerCard({ name, meta, rate, series, capPerMin, onReset, onToggle, color }) {
  const enabled = meta?.enabled !== false;

  const dayCount = Number(meta?.dayCount || 0);
  const lastSentTs = parseTs(meta?.last_sent);
  const ageSec = lastSentTs ? Math.floor((Date.now() - lastSentTs) / 1000) : 999999;

  const tone = !enabled ? 'neutral' : ageSec >= DEFAULT_SLA.heartbeatSecCrit ? 'bad' : ageSec >= DEFAULT_SLA.heartbeatSecWarn ? 'warn' : 'ok';
  const r = Number(rate) || 0;
  const rTxt = r > 0 && r < 0.1 ? '~0.1' : r.toFixed(2);

  const rArr = Array.isArray(series) ? series : [];
  const mean = avg(rArr);
  const peak = maxArr(rArr);
  const util = capPerMin ? Math.min(1, r / capPerMin) : 0;

  return (
    <View style={S.card}>
      <View style={S.cardTop}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: 0.9 }} />
          <Text style={S.cardTitle}>{name}</Text>
        </View>

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <DangerDot tone={tone} />
          <Chip label={!enabled ? 'DISABLED' : tone === 'ok' ? 'OK' : tone === 'warn' ? 'SLOW' : 'NO HB'} tone={tone} />
        </View>
      </View>

      <View style={S.grid2}>
        <View style={S.kv}>
          <Text style={S.kvK}>Rate</Text>
          <Text style={S.kvV}>
            {rTxt} <Text style={{ color: '#94A3B8', fontWeight: '800' }}>/ {capPerMin} per min</Text>
          </Text>
          <ProgressBar pct={util} tone={util > 0.9 ? 'bad' : util > 0.65 ? 'warn' : 'ok'} />
        </View>

        <View style={S.kv}>
          <Text style={S.kvK}>Last Sent</Text>
          <Text style={S.kvV}>
            {timeAgoHe(lastSentTs)} <Text style={{ color: '#94A3B8', fontWeight: '800' }}>({prettyDT(lastSentTs)})</Text>
          </Text>
        </View>

        <View style={S.kv}>
          <Text style={S.kvK}>Daily</Text>
          <Text style={S.kvV}>{dayCount.toLocaleString('he-IL')}</Text>
        </View>

        <View style={S.kv}>
          <Text style={S.kvK}>Window Mean/Peak</Text>
          <Text style={S.kvV}>
            {mean.toFixed(1)} / {Number.isFinite(peak) ? peak.toFixed(1) : '0.0'}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[S.kvK, { marginBottom: 6 }]}>ECG</Text>
          <Text style={[S.kvK, { marginBottom: 6, color: '#64748b' }]}>mini</Text>
        </View>
        <MiniSpark samples={rArr} color={color} height={44} />
      </View>

      <View style={S.actionsRow}>
        <TouchableOpacity onPress={() => onReset(name)} style={[S.btn, { backgroundColor: '#111827', flex: 1 }]}>
          <Text style={S.btnTxt}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggle(name, !enabled)} style={[S.btn, { backgroundColor: enabled ? '#EF4444' : '#22C55E', flex: 1 }]}>
          <Text style={S.btnTxt}>{enabled ? 'Disable' : 'Enable'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==== MAIN ====
export default function ServerMonitorsPane({
  serversCount = 6,
  hardDisabled = ['server_6'],
  defaultCapPerMin = 30,
  defaultWindowSec = 300,

  // ✅ Back button target
  backToRoute = 'OwnerDashboard', // אם אצלך שם המסך שונה – תחליף פה
}) {
  const nav = useNavigation();
  const { width } = useWindowDimensions();
  const cols = width >= 980 ? 3 : width >= 680 ? 2 : 1;
  const colW = cols === 1 ? '100%' : cols === 2 ? '49%' : '32%';

  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const [capPerMin, setCapPerMin] = useState(defaultCapPerMin);
  const [windowSec, setWindowSec] = useState(defaultWindowSec);

  // ✅ Range selection
  const [rangeKey, setRangeKey] = useState('1d');
  const preset = useMemo(() => getPreset(rangeKey), [rangeKey]);
  const rangeMs = preset.ms;

  // optional: when range changes, adjust chart window (but don't explode)
  useEffect(() => {
    if (preset?.chartWindowSec) {
      // שמור שה-ECG יראה יפה ולא "מטורף"
      setWindowSec((prev) => {
        const next = preset.chartWindowSec;
        // אל תשנה אם המשתמש כבר הגדיר ערך ידני אחר משמעותית (אפשר לשנות לפי הטעם)
        return next;
      });
    }
  }, [preset?.chartWindowSec]);

  const [rawDevice, setRawDevice] = useState({});
  const rawWA = useWhatsAppServers();

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

  // SMS rates
  const { rates, series } = useDeviceServerRates({
    windowMs: Math.max(5, windowSec) * 1000,
    pollMs: 2000,
    capPerMin: Math.max(1, capPerMin),
  });

  // SMS keys
  const smsKeys = Array.from({ length: serversCount }, (_, i) => `server_${i + 1}`);

  const smsMetaByName = useMemo(() => {
    const m = {};
    smsKeys.forEach((k) => (m[k] = rawDevice?.[k] || {}));
    return m;
  }, [rawDevice, smsKeys]);

  const smsEnabledList = smsKeys.filter((name) => !hardDisabled.includes(name) && smsMetaByName[name].enabled !== false);
  const smsDisabledList = smsKeys.filter((name) => !smsEnabledList.includes(name));

  // WhatsApp keys
  const waKeys = useMemo(() => {
    const ks = Object.keys(rawWA || {}).filter((k) => /^server\d+$/i.test(k) || /^server_\d+$/i.test(k));
    ks.sort((a, b) => (Number(String(a).replace(/\D+/g, '')) || 0) - (Number(String(b).replace(/\D+/g, '')) || 0));
    return ks;
  }, [rawWA]);

  const waMetaByName = useMemo(() => {
    const m = {};
    waKeys.forEach((k) => (m[k] = rawWA?.[k] || {}));
    return m;
  }, [rawWA, waKeys]);

  // ==== Range calculations ====

  // (A) SMS totals in range:
  // - rolling (1h/12h): estimate using rates series (avg rate * minutes)
  // - days (day/week/month/year): sum from day maps across last N days
  const smsTotalInRange = useMemo(() => {
    if (preset.kind === 'rolling') {
      const windowMin = preset.ms / 60000;
      const perServerEst = smsEnabledList.map((name) => avg(series[name] || []) * windowMin);
      const total = sumNum(perServerEst);
      return Math.max(0, Math.round(total));
    }

    // days
    const days = Math.max(1, preset.days || 1);
    const endTs = isoToTs(iso);
    const startTs = endTs - (days - 1) * 24 * 60 * 60 * 1000;

    let total = 0;
    for (const name of smsKeys) {
      const dayMap = rawDevice?.[name]?.day || {};
      for (const [dIso, val] of Object.entries(dayMap)) {
        const t = isoToTs(dIso);
        if (!t) continue;
        if (t >= startTs && t <= endTs) total += Number(val || 0);
      }
    }
    return Math.max(0, Math.round(total));
  }, [preset.kind, preset.days, preset.ms, smsEnabledList, series, rawDevice, smsKeys, iso]);

  // SMS Today (always)
  const smsDayTotalToday = useMemo(() => {
    return smsKeys.reduce((s, name) => s + Number(rawDevice?.[name]?.day?.[iso] || 0), 0);
  }, [rawDevice, smsKeys, iso]);

  // SMS live throughput
  const smsRateNowTotal = useMemo(() => smsEnabledList.reduce((s, name) => s + Number(rates[name] || 0), 0), [smsEnabledList, rates]);
  const smsTotalCapNow = Math.max(1, capPerMin) * Math.max(1, smsEnabledList.length);
  const smsUtil = smsTotalCapNow ? Math.min(1, smsRateNowTotal / smsTotalCapNow) : 0;

  const smsAlerts = useMemo(() => buildServerAlerts({ metaByName: smsMetaByName, rates, series, capPerMin, sla: DEFAULT_SLA }), [smsMetaByName, rates, series, capPerMin]);

  // (B) WA active servers in range by lastSeen
  const waActiveServersInRange = useMemo(() => {
    if (!rangeMs) return 0;
    return waKeys.reduce((acc, name) => {
      const lastSeenTs = parseTs(waMetaByName[name]?.lastSeen);
      const ok = lastSeenTs && (Date.now() - lastSeenTs <= rangeMs);
      return acc + (ok ? 1 : 0);
    }, 0);
  }, [waKeys, waMetaByName, rangeMs]);

  // WA online now (by status + heartbeat)
  const waEnabledCount = useMemo(() => waKeys.filter((k) => waMetaByName[k]?.enabled !== false).length, [waKeys, waMetaByName]);
  const waOnlineNowCount = useMemo(() => {
    return waKeys.reduce((acc, name) => {
      const meta = waMetaByName[name] || {};
      const enabled = meta.enabled !== false;
      const lastSeenTs = parseTs(meta.lastSeen);
      const ageSec = lastSeenTs ? Math.floor((Date.now() - lastSeenTs) / 1000) : 999999;
      const statusOk = String(meta.status || '').toLowerCase() === 'online';
      const ok = enabled && statusOk && ageSec <= WA_SLA.heartbeatSecWarn;
      return acc + (ok ? 1 : 0);
    }, 0);
  }, [waKeys, waMetaByName]);

  const waOfflineNowCount = Math.max(0, waEnabledCount - waOnlineNowCount);

  // (C) WA counts in range (best effort using meta.date/meta.count)
  // If meta.date is within days window -> include that count
  const waCountInRange = useMemo(() => {
    if (!waKeys.length) return 0;

    // rolling: treat as "today only" best effort
    if (preset.kind === 'rolling') {
      return waKeys.reduce((s, name) => {
        const meta = waMetaByName[name] || {};
        return s + (String(meta.date || '') === iso ? Number(meta.count || 0) : 0);
      }, 0);
    }

    const days = Math.max(1, preset.days || 1);
    const endTs = isoToTs(iso);
    const startTs = endTs - (days - 1) * 24 * 60 * 60 * 1000;

    return waKeys.reduce((s, name) => {
      const meta = waMetaByName[name] || {};
      const d = String(meta.date || '');
      const t = isoToTs(d);
      if (!t) return s;
      if (t >= startTs && t <= endTs) return s + Number(meta.count || 0);
      return s;
    }, 0);
  }, [waKeys, waMetaByName, preset.kind, preset.days, iso]);

  // Combined
  const combinedInRange = smsTotalInRange + waCountInRange;

  // Health score
  const smsCrit = smsAlerts.filter((a) => a.sev === 'critical').length;
  const smsWarn = smsAlerts.filter((a) => a.sev === 'warning').length;
  const healthScore = clamp(100 - (waOfflineNowCount * 12 + smsCrit * 15 + smsWarn * 6), 0, 100);
  const healthTone = healthScore >= 85 ? 'ok' : healthScore >= 65 ? 'warn' : 'bad';

  // lists
  const displaySmsKeys = onlyEnabled ? smsEnabledList : smsKeys;

  // ==== actions ====
  const resetSmsDaily = async (name) => {
    await firebase.database().ref(`device_server/${name}/day/${iso}`).set(0);
    await firebase.database().ref(`device_server/${name}/last_sent`).set(new Date().toISOString());
    Alert.alert('בוצע', `איפוס ספירת היום ל-${name}`);
  };

  const toggleSms = async (name, on) => {
    await firebase.database().ref(`device_server/${name}/enabled`).set(!!on);
    await firebase.database().ref(`device_server/${name}/updatedAt`).set(firebase.database.ServerValue.TIMESTAMP);
    Alert.alert('עודכן', on ? 'השרת הופעל' : 'השרת הושבת');
  };

  const resetWA = async (name) => {
    const ok = Platform.OS === 'web' ? window.confirm(`לאפס מונה ל-${name}?`) : true;
    if (!ok) return;
    await firebase.database().ref(`servers/${name}/count`).set(0);
    await firebase.database().ref(`servers/${name}/date`).set(todayISO());
    await firebase.database().ref(`servers/${name}/updatedAt`).set(firebase.database.ServerValue.TIMESTAMP);
    Alert.alert('בוצע', `איפוס בוצע ל-${name}`);
  };

  const toggleWA = async (name, on) => {
    await firebase.database().ref(`servers/${name}/enabled`).set(!!on);
    await firebase.database().ref(`servers/${name}/updatedAt`).set(firebase.database.ServerValue.TIMESTAMP);
    Alert.alert('עודכן', on ? 'WhatsApp הופעל' : 'WhatsApp הושבת');
  };

  // ==== UI ====
  return (
    <ScrollView style={S.page} contentContainerStyle={{ padding: 12, paddingBottom: 28 }}>
      {/* HERO */}
      <View style={S.hero}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={S.heroTitle}>Server Monitor • Pro Dashboard</Text>
            <Text style={S.heroSub}>WhatsApp + SMS • Range Analytics • Last Seen • Rates • Actions</Text>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                // אם תרצה: nav.navigate(backToRoute)
                // או פשוט: nav.goBack()
                try {
                  nav.navigate(backToRoute);
                } catch {
                  nav.goBack?.();
                }
              }}
              style={S.backBtn}
            >
              <Text style={S.backBtnTxt}>חזור לדשבורד</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
              <Chip label={`HEALTH ${healthScore}%`} tone={healthTone} />
              <Chip label={`RANGE ${preset.label}`} tone="info" />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={[S.heroMini, { marginBottom: 8 }]}>בחר טווח נתונים</Text>
          <RangeButtons
            value={rangeKey}
            onChange={(k) => {
              setRangeKey(k);
            }}
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={[S.heroMini, { marginBottom: 6 }]}>System Health</Text>
          <ProgressBar pct={healthScore / 100} tone={healthTone} />
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={S.heroMini}>WA offline now: {waOfflineNowCount}</Text>
            <Text style={S.heroMini}>SMS crit/warn: {smsCrit}/{smsWarn}</Text>
          </View>
        </View>
      </View>

      {/* OVERVIEW KPI */}
      <Panel
        title="Overview"
        subtitle={`סיכום לפי טווח: ${preset.label}`}
        right={
          <View style={{ flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' }}>
            <Chip label={`WA ONLINE ${waOnlineNowCount}/${waEnabledCount}`} tone={waOfflineNowCount ? 'warn' : 'ok'} />
            <Chip label={`SMS ACTIVE ${smsEnabledList.length}/${smsKeys.length}`} tone={smsDisabledList.length ? 'warn' : 'ok'} />
            <Chip label={`WA ACTIVE(${preset.label}) ${waActiveServersInRange}`} tone="info" />
          </View>
        }
      >
        <View style={S.kpiRow}>
          <KpiCard
            label={`סה״כ שימוש בטווח (${preset.label})`}
            value={combinedInRange.toLocaleString('he-IL')}
            hint={`WA ${waCountInRange.toLocaleString('he-IL')} • SMS ${smsTotalInRange.toLocaleString('he-IL')}`}
            tone="info"
            wide
          />
          <KpiCard
            label="WA Active Servers (Range)"
            value={`${waActiveServersInRange}`}
            hint="לפי lastSeen"
            tone={waActiveServersInRange ? 'ok' : 'warn'}
          />
          <KpiCard
            label="SMS Throughput (Live)"
            value={`${smsRateNowTotal.toFixed(1)}/min`}
            hint={`Cap ${smsTotalCapNow}/min • Util ${(smsUtil * 100).toFixed(0)}%`}
            tone={smsUtil > 0.9 ? 'bad' : smsUtil > 0.65 ? 'warn' : 'ok'}
          />
          <KpiCard
            label="SMS Alerts"
            value={`${smsCrit}/${smsWarn}`}
            hint="crit / warn"
            tone={smsCrit ? 'bad' : smsWarn ? 'warn' : 'ok'}
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={S.blockTitle}>Usage Breakdown (Range)</Text>
          <View style={S.breakRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.breakK}>WhatsApp</Text>
              <Text style={S.breakV}>{waCountInRange.toLocaleString('he-IL')}</Text>
              <ProgressBar pct={combinedInRange ? waCountInRange / combinedInRange : 0} tone="info" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={S.breakK}>SMS</Text>
              <Text style={S.breakV}>{smsTotalInRange.toLocaleString('he-IL')}</Text>
              <ProgressBar pct={combinedInRange ? smsTotalInRange / combinedInRange : 0} tone="ok" />
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={S.noteTxt}>
              הערה: ל־WhatsApp יש כרגע count/date ליום האחרון. כדי לקבל סכימות אמיתיות לשבוע/חודש/שנה מומלץ לשמור היסטוריה יומית.
            </Text>
          </View>
        </View>
      </Panel>

      {/* WhatsApp */}
      <Panel
        title="WhatsApp Servers"
        subtitle="Heartbeat (lastSeen) + סטטוס + פעולות"
        right={
          <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
            <Chip label={`ONLINE NOW ${waOnlineNowCount}`} tone="ok" />
            <Chip label={`OFFLINE NOW ${waOfflineNowCount}`} tone={waOfflineNowCount ? 'bad' : 'neutral'} />
          </View>
        }
      >
        <View style={S.actionsTopRow}>
          <TouchableOpacity
            onPress={async () => {
              const ok = Platform.OS === 'web' ? window.confirm('להפעיל את כל שרתי WhatsApp?') : true;
              if (!ok) return;
              await Promise.all(waKeys.map((k) => firebase.database().ref(`servers/${k}/enabled`).set(true)));
              Alert.alert('בוצע', 'כל שרתי WhatsApp הופעלו');
            }}
            style={[S.btnTop, { backgroundColor: '#22C55E' }]}
          >
            <Text style={S.btnTxt}>Enable All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              const ok = Platform.OS === 'web' ? window.confirm('להשבית את כל שרתי WhatsApp?') : true;
              if (!ok) return;
              await Promise.all(waKeys.map((k) => firebase.database().ref(`servers/${k}/enabled`).set(false)));
              Alert.alert('בוצע', 'כל שרתי WhatsApp הושבתו');
            }}
            style={[S.btnTop, { backgroundColor: '#EF4444' }]}
          >
            <Text style={S.btnTxt}>Disable All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              const ok = Platform.OS === 'web' ? window.confirm('לאפס מונים לכל שרתי WhatsApp?') : true;
              if (!ok) return;
              await Promise.all(
                waKeys.map(async (k) => {
                  await firebase.database().ref(`servers/${k}/count`).set(0);
                  await firebase.database().ref(`servers/${k}/date`).set(todayISO());
                  await firebase.database().ref(`servers/${k}/updatedAt`).set(firebase.database.ServerValue.TIMESTAMP);
                })
              );
              Alert.alert('בוצע', 'כל המונים אופסו (WA)');
            }}
            style={[S.btnTop, { backgroundColor: '#111827' }]}
          >
            <Text style={S.btnTxt}>Reset Counts</Text>
          </TouchableOpacity>
        </View>

        <View style={S.cardsWrap}>
          {waKeys.length ? (
            waKeys.map((name, idx) => (
              <View key={name} style={{ width: colW }}>
                <WhatsAppServerCard
                  name={name}
                  meta={waMetaByName[name] || {}}
                  color={serverColor(name, idx)}
                  onReset={resetWA}
                  onToggle={toggleWA}
                  rangeMs={rangeMs}
                />
              </View>
            ))
          ) : (
            <View style={S.emptyBox}>
              <Text style={S.emptyText}>לא נמצאו שרתי WhatsApp תחת servers/*</Text>
            </View>
          )}
        </View>
      </Panel>

      {/* SMS */}
      <Panel
        title="SMS Device Servers"
        subtitle="קצב + last_sent + פעולות"
        right={
          <View style={{ flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' }}>
            <Chip label={`UTIL ${(smsUtil * 100).toFixed(0)}%`} tone={smsUtil > 0.9 ? 'bad' : smsUtil > 0.65 ? 'warn' : 'ok'} />
            <Chip label={`TODAY ${smsDayTotalToday.toLocaleString('he-IL')}`} tone="ok" />
          </View>
        }
      >
        {/* Settings */}
        <View style={S.settingsRow}>
          <View style={S.settingItem}>
            <Text style={S.settingLabel}>Cap / min</Text>
            <TextInput
              value={String(capPerMin)}
              onChangeText={(t) => setCapPerMin(Math.max(1, Number(t || 0)))}
              keyboardType="numeric"
              style={S.input}
              placeholder="30"
              placeholderTextColor="#9AA3AC"
            />
          </View>

          <View style={S.settingItem}>
            <Text style={S.settingLabel}>Chart Window (sec)</Text>
            <TextInput
              value={String(windowSec)}
              onChangeText={(t) => setWindowSec(Math.max(5, Number(t || 0)))}
              keyboardType="numeric"
              style={S.input}
              placeholder="300"
              placeholderTextColor="#9AA3AC"
            />
          </View>

          <TouchableOpacity
            onPress={() => setOnlyEnabled((v) => !v)}
            style={[S.toggle, { borderColor: onlyEnabled ? '#6C63FF' : '#E2E8F0', backgroundColor: onlyEnabled ? '#EEF2FF' : '#fff' }]}
          >
            <Text style={{ fontWeight: '900', color: onlyEnabled ? '#312E81' : '#0f172a' }}>{onlyEnabled ? 'Only Enabled' : 'Show All'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={S.actionsTopRow}>
          <TouchableOpacity
            onPress={async () => {
              const ok = Platform.OS === 'web' ? window.confirm('לאפס את המונה היומי לכל שרתי SMS?') : true;
              if (!ok) return;
              await Promise.all(smsKeys.map((k) => firebase.database().ref(`device_server/${k}/day/${iso}`).set(0)));
              Alert.alert('בוצע', 'כל המונים אופסו להיום.');
            }}
            style={[S.btnTop, { backgroundColor: '#111827' }]}
          >
            <Text style={S.btnTxt}>Reset All Daily</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Promise.all(smsKeys.filter((k) => !hardDisabled.includes(k)).map((k) => firebase.database().ref(`device_server/${k}/enabled`).set(true)));
              Alert.alert('בוצע', 'כל השרתים הופעלו.');
            }}
            style={[S.btnTop, { backgroundColor: '#22C55E' }]}
          >
            <Text style={S.btnTxt}>Enable All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Promise.all(smsKeys.filter((k) => !hardDisabled.includes(k)).map((k) => firebase.database().ref(`device_server/${k}/enabled`).set(false)));
              Alert.alert('בוצע', 'כל השרתים הושבתו.');
            }}
            style={[S.btnTop, { backgroundColor: '#EF4444' }]}
          >
            <Text style={S.btnTxt}>Disable All</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts chips */}
        {!!smsAlerts.length && (
          <View style={{ marginTop: 10 }}>
            <Text style={S.blockTitle}>Active Alerts</Text>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
              {smsAlerts.slice(0, 14).map((a, i) => (
                <Chip key={i} label={`${a.name}: ${a.msg}`} tone={a.sev === 'critical' ? 'bad' : 'warn'} />
              ))}
            </View>
          </View>
        )}

        {/* Cards */}
        <View style={[S.cardsWrap, { marginTop: 12 }]}>
          {displaySmsKeys.map((name, idx) => {
            const isHardDisabled = hardDisabled.includes(name);
            const meta = rawDevice?.[name] || {};
            const enabled = isHardDisabled ? false : meta.enabled !== false;

            const dayCount = Number(meta?.day?.[iso] || 0);
            const lastSent = meta?.last_sent || null;

            const color = serverColor(name, idx);

            return (
              <View key={name} style={{ width: colW }}>
                <SmsServerCard
                  name={name}
                  meta={{
                    enabled,
                    dayCount,
                    last_sent: lastSent,
                  }}
                  rate={rates[name] || 0}
                  series={series[name] || []}
                  capPerMin={capPerMin}
                  onReset={resetSmsDaily}
                  onToggle={(n2, on) => (isHardDisabled ? Alert.alert('Locked', `${name} נעול לפי דרישה.`) : toggleSms(n2, on))}
                  color={color}
                />
              </View>
            );
          })}
        </View>
      </Panel>
    </ScrollView>
  );
}

// ==== styles ====
const S = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F7FF' },

  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E9F5',
    backgroundColor: '#0B1020',
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 3 },
      default: {},
    }),
  },
  heroTitle: { fontSize: 18, fontWeight: '900', textAlign: 'right', color: '#FFFFFF' },
  heroSub: { marginTop: 4, fontSize: 12, fontWeight: '700', textAlign: 'right', color: '#B6C2FF' },
  heroMini: { fontSize: 11, fontWeight: '800', color: '#CBD5E1', textAlign: 'right' },

  backBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnTxt: { fontWeight: '900', color: '#0f172a' },

  rangeWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  rangeBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E9F5',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginTop: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 },
      default: {},
    }),
  },
  panelHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  panelTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', textAlign: 'right' },
  panelSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'right' },

  kpiRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  kpi: { minWidth: 160, flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 12 },
  kpiLabel: { fontSize: 12, fontWeight: '900', textAlign: 'right' },
  kpiValue: { fontSize: 22, fontWeight: '900', textAlign: 'right', marginTop: 4 },
  kpiHint: { fontSize: 11, fontWeight: '800', textAlign: 'right', marginTop: 6, opacity: 0.9 },

  blockTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginBottom: 8 },

  breakRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginTop: 6 },
  breakK: { fontSize: 11, fontWeight: '900', color: '#334155', textAlign: 'right' },
  breakV: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginTop: 2 },

  noteTxt: { textAlign: 'right', color: '#94A3B8', fontWeight: '800', fontSize: 11 },

  progressBg: { height: 10, backgroundColor: '#EEF2FF', borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%' },

  actionsTopRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  btnTop: { paddingHorizontal: 12, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btn: { paddingHorizontal: 12, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '900' },

  settingsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 },
  settingItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  settingLabel: { fontSize: 12, fontWeight: '900', color: '#334155' },
  input: {
    width: 92,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    textAlign: 'center',
    fontWeight: '900',
    color: '#0f172a',
  },
  toggle: { height: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  cardsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 1 },
      default: {},
    }),
  },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },

  grid2: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  kv: { flexGrow: 1, minWidth: 170, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2FF', backgroundColor: '#F8FAFF', padding: 10 },
  kvK: { fontSize: 11, fontWeight: '900', color: '#334155', textAlign: 'right' },
  kvV: { marginTop: 4, fontSize: 13, fontWeight: '900', color: '#0f172a', textAlign: 'right' },

  lineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  lineK: { fontWeight: '900', color: '#334155' },
  lineV: { fontWeight: '900', color: '#0f172a', maxWidth: '72%', textAlign: 'left' },

  actionsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },

  spark: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    backgroundColor: '#F8FAFF',
    overflow: 'hidden',
  },

  emptyBox: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFF', width: '100%' },
  emptyText: { textAlign: 'right', fontWeight: '900', color: '#64748b' },
});
