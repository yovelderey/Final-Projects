// TablePlanningViewScreen.js — NORMALIZED PLACEMENT (nx/ny) + Responsive + Per-table Guest Manage
// ✅ Guests colored by status (name colored, no pill)
// ✅ Per table: "הוסף/מחק" opens modal to add/remove guests (writes to tables/{tableId}/guests ARRAY)
// ✅ Table updatedAt + guest last update (from responses timestamp if exists)
// ✅ Mobile: sidebar becomes bottom-sheet modal so the map fills the screen

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated,
  useWindowDimensions,
} from 'react-native';

import { getDatabase, ref, onValue, off, get, update } from 'firebase/database';

// --- assets (static requires for RN) ---
const IMG_MEROBA_12 = require('../assets/meroba-removebg-preview.png');
const IMG_MALBEN_14 = require('../assets/malben1-removebg-preview.png');
const IMG_MALBEN_18 = require('../assets/malben2-removebg-preview.png');
const IMG_IGOL_16 = require('../assets/igol1-removebg-preview.png');
const IMG_IGOL_10 = require('../assets/igol2-removebg-preview.png');
const IMG_MALBEN_24 = require('../assets/malben4-removebg-preview.png');

// --- UI helper ---
const IconButton = ({ icon, onPress, disabled, label, active }) => (
  <TouchableOpacity
    style={[styles.iconBtn, active && styles.iconBtnActive, disabled && styles.iconBtnDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[styles.iconBtnText, active && { color: '#F97316' }]}>{icon}</Text>
    {label && <Text style={styles.iconBtnLabel}>{label}</Text>}
  </TouchableOpacity>
);

// ---------- math helpers ----------
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const getFitRect = (cw, ch, iw, ih, zoom = 1) => {
  if (!cw || !ch || !iw || !ih) return { x: 0, y: 0, w: cw || 0, h: ch || 0, zoom: zoom || 1 };
  const s = Math.min(cw / iw, ch / ih);
  const w0 = iw * s;
  const h0 = ih * s;

  const z = zoom || 1;
  const w = w0 * z;
  const h = h0 * z;

  const cx = cw / 2;
  const cy = ch / 2;

  return { x: cx - w / 2, y: cy - h / 2, w, h, zoom: z };
};

const safeStr = (v) => (v === null || v === undefined ? '' : String(v));
const toArr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);

const fmtTime = (ts) => {
  const n = Number(ts || 0);
  if (!n) return '';
  try {
    const d = new Date(n);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${mi}`;
  } catch {
    return '';
  }
};

const isoToMs = (iso) => {
  if (!iso) return 0;
  const s = String(iso);
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
};

export default function TablePlanningViewScreen({ route, navigation }) {
  const uid = route?.params?.uid;
  const eventId = route?.params?.eventId || route?.params?.id;
  const eventName = route?.params?.eventName || '';
  const passedSelectedImage = route?.params?.selectedImage || null;

  const { width: winW } = useWindowDimensions();
  const isMobile = winW < 900; // works for web+native
  const db = useMemo(() => getDatabase(), []);

  const [loading, setLoading] = useState(true);

  // stage (canvas)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // image uri + real size
  const [diagramUri, setDiagramUri] = useState(passedSelectedImage);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // zoom (visual)
  const [zoom, setZoom] = useState(1);

  // data
  const [tables, setTables] = useState([]); // merged objects
  const [selectedKey, setSelectedKey] = useState(null);

  // edit lock
  const [editMode, setEditMode] = useState(false);

  // history/undo
  const [history, setHistory] = useState([]);
  const HISTORY_MAX = 35;

  // search (tables only)
  const [searchText, setSearchText] = useState('');

  // Sidebar expand per table
  const [expandedMap, setExpandedMap] = useState({}); // { [tableKey]: boolean }

  // blink
  const blinkAnim = useRef(new Animated.Value(0)).current;
  const [blinkKey, setBlinkKey] = useState(null);
  const blinkTimerRef = useRef(null);

  // mobile list bottom sheet
  const [listModalVisible, setListModalVisible] = useState(false);

  // manage guests modal
  const [manageVisible, setManageVisible] = useState(false);
  const [manageTableKey, setManageTableKey] = useState(null);
  const [manageSearch, setManageSearch] = useState('');

  const triggerBlink = useCallback(
    (key) => {
      const k = String(key || '');
      if (!k) return;

      setBlinkKey(k);

      try {
        blinkAnim.stopAnimation();
      } catch {}
      blinkAnim.setValue(0);

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]),
        { iterations: 6 }
      );

      loop.start();

      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = setTimeout(() => setBlinkKey(null), 2200);
    },
    [blinkAnim]
  );

  useEffect(
    () => () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    },
    []
  );

  const blinkOpacity = blinkAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
  const blinkScale = blinkAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  // ---------- Firebase paths ----------
  const TABLES_PLACE_PATH = useMemo(() => (uid && eventId ? `Events/${uid}/${eventId}/tablesPlace` : null), [uid, eventId]);
  const TABLES_META_PATH = useMemo(() => (uid && eventId ? `Events/${uid}/${eventId}/tables` : null), [uid, eventId]);
  const RESPONSES_PATH = useMemo(() => (uid && eventId ? `Events/${uid}/${eventId}/responses` : null), [uid, eventId]);
  const CONTACTS_PATH = useMemo(() => (uid && eventId ? `Events/${uid}/${eventId}/contacts` : null), [uid, eventId]);

  const placeRef = useMemo(() => (TABLES_PLACE_PATH ? ref(db, TABLES_PLACE_PATH) : null), [db, TABLES_PLACE_PATH]);
  const metaRef = useMemo(() => (TABLES_META_PATH ? ref(db, TABLES_META_PATH) : null), [db, TABLES_META_PATH]);
  const respRef = useMemo(() => (RESPONSES_PATH ? ref(db, RESPONSES_PATH) : null), [db, RESPONSES_PATH]);
  const contactsRef = useMemo(() => (CONTACTS_PATH ? ref(db, CONTACTS_PATH) : null), [db, CONTACTS_PATH]);

  // ---------- helpers ----------
  const cloneTables = (arr) => JSON.parse(JSON.stringify(arr || []));

  const pushHistorySnapshot = useCallback((snapshotTables) => {
    setHistory((prev) => {
      const next = [cloneTables(snapshotTables), ...prev];
      return next.slice(0, HISTORY_MAX);
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const [last, ...rest] = prev;
      setTables(cloneTables(last));
      return rest;
    });
  }, []);

  const getTableImage = (tSize) => {
    switch (Number(tSize)) {
      case 12:
        return IMG_MEROBA_12;
      case 14:
        return IMG_MALBEN_14;
      case 18:
        return IMG_MALBEN_18;
      case 16:
        return IMG_IGOL_16;
      case 10:
        return IMG_IGOL_10;
      case 24:
        return IMG_MALBEN_24;
      default:
        return null;
    }
  };

  // -------- statuses ----------
  const guestRid = (g) => String(g?.recordID || g?.id || g?.guestId || g?.rid || '').trim();

  const getGuestRespRaw = (g, responses) => {
    const direct = safeStr(g?.status ?? g?.response ?? g?.rsvp ?? '').trim();
    if (direct) return direct;
    const rid = guestRid(g);
    const fromResp = rid ? safeStr(responses?.[rid]?.response ?? responses?.[rid]?.status ?? '').trim() : '';
    return fromResp;
  };

  const displayStatus = (g, responses) => {
    const raw = getGuestRespRaw(g, responses);
    return raw || 'ממתין';
  };

  const statusColor = (sLower) => {
    const s = (sLower || '').toLowerCase();
    if (!s || s.includes('ממתין') || s.includes('pending') || s.includes('טרם')) return '#64748b'; // אפור
    if (s.includes('מגיע') || s === 'כן' || s === 'yes' || s.includes('coming')) return '#16a34a'; // ירוק
    if (s.includes('אולי') || s.includes('maybe')) return '#f59e0b'; // כתום
    if (s.includes('לא מגיע') || s === 'לא' || s === 'no' || s.includes('not')) return '#ef4444'; // אדום
    return '#334155';
  };

  const safeStatusLower = (g, responses) => displayStatus(g, responses).toLowerCase();

  const guestDisplayName = (g) => {
    const name = safeStr(g?.name ?? g?.displayName ?? g?.guestName ?? g?.fullName ?? '').trim();
    if (name) return name;
    const ph = safeStr(g?.phone ?? g?.phoneNumber ?? g?.phoneNumbers ?? '').trim();
    return ph || 'מוזמן';
  };

  const countComing = (list, responses) => {
    const arr = toArr(list);
    return arr.filter((g) => {
      const s = safeStatusLower(g, responses);
      return s.includes('מגיע') || s === 'yes' || s.includes('coming');
    }).length;
  };

  const isBadStatus = (sLower) => {
    if (!sLower) return false;
    if (sLower.includes('אולי')) return true;
    if (sLower.includes('לא')) return true;
    if (sLower.includes('no')) return true;
    if (sLower.includes('maybe')) return true;
    return false;
  };

  const hasWarning = (t, responses) => {
    const list = toArr(t?.guestsList);
    return list.some((g) => isBadStatus(safeStatusLower(g, responses)));
  };

  const toggleExpand = useCallback((k) => {
    const key = String(k);
    setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ---------- image size ----------
  useEffect(() => {
    if (!diagramUri) return;
    Image.getSize(
      diagramUri,
      (w, h) => setImgSize({ w, h }),
      () => setImgSize({ w: 0, h: 0 })
    );
  }, [diagramUri]);

  // ---------- load diagram if not passed ----------
  useEffect(() => {
    if (diagramUri) return;
    if (!uid || !eventId) return;

    const candidates = [
      `Events/${uid}/${eventId}/selectedImage`,
      `Events/${uid}/${eventId}/diagramUrl`,
      `Events/${uid}/${eventId}/layoutImage`,
      `Events/${uid}/${eventId}/imageUrl`,
      `Events/${uid}/${eventId}/tablePlan/selectedImage`,
    ];

    (async () => {
      for (const path of candidates) {
        try {
          const snap = await get(ref(db, path));
          const vv = snap.val();
          if (typeof vv === 'string' && vv.trim()) {
            setDiagramUri(vv.trim());
            return;
          }
        } catch {}
      }
    })();
  }, [db, uid, eventId, diagramUri]);

  // ---------- fit rect ----------
  const fit = useMemo(
    () => getFitRect(stageSize.w, stageSize.h, imgSize.w, imgSize.h, zoom),
    [stageSize, imgSize, zoom]
  );

  // ---------- normalize tablesPlace to map ----------
  const normalizePlaceMap = (v) => {
    const map = {};
    if (!v) return map;

    if (Array.isArray(v)) {
      v.forEach((it, idx) => {
        if (!it) return;
        const key = String(it.id ?? it._k ?? it.key ?? idx);
        map[key] = { ...it };
      });
      return map;
    }

    Object.entries(v).forEach(([k, obj]) => {
      if (!obj) return;
      map[String(k)] = { ...obj };
    });
    return map;
  };

  // ---------- responses ----------
  const [responses, setResponses] = useState({});
  useEffect(() => {
    if (!respRef) return;
    const unsub = onValue(
      respRef,
      (snap) => setResponses(snap.val() || {}),
      () => setResponses({})
    );
    return () => {
      try {
        off(respRef);
        unsub && unsub();
      } catch {}
    };
  }, [respRef]);

  // ---------- contacts (all guests list for manage modal) ----------
  const [allGuests, setAllGuests] = useState([]);
  useEffect(() => {
    if (!contactsRef) return;
    const unsub = onValue(
      contactsRef,
      (snap) => {
        const v = snap.val();
        const arr = v ? Object.values(v) : [];
        setAllGuests(arr);
      },
      () => setAllGuests([])
    );
    return () => {
      try {
        off(contactsRef);
        unsub && unsub();
      } catch {}
    };
  }, [contactsRef]);

  // ---------- load & merge: tables (meta) + tablesPlace (placement) ----------
  const placeMapRef = useRef({});
  const metaMapRef = useRef({});

  const rebuildMerged = useCallback(() => {
    const placeMap = placeMapRef.current || {};
    const metaMap = metaMapRef.current || {};
    const keys = Array.from(new Set([...Object.keys(metaMap), ...Object.keys(placeMap)]));

    keys.sort((a, b) => {
      const na = Number(String(a).replace(/\D/g, '')) || 999999;
      const nb = Number(String(b).replace(/\D/g, '')) || 999999;
      return na - nb;
    });

    const merged = keys.map((k, idx) => {
      const p = placeMap[k] || {};
      const m = metaMap[k] || {};

      let nx = typeof p.nx === 'number' ? p.nx : typeof p.x === 'number' && fit.w ? clamp01((p.x - fit.x) / fit.w) : 0.5;
      let ny = typeof p.ny === 'number' ? p.ny : typeof p.y === 'number' && fit.h ? clamp01((p.y - fit.y) / fit.h) : 0.5;

      const title = safeStr(m.name ?? m.displayName ?? p.name ?? p.displayName ?? `שולחן ${idx + 1}`).trim() || `שולחן ${idx + 1}`;
      const size = typeof m.size === 'number' ? m.size : typeof p.size === 'number' ? p.size : 12;

      // IMPORTANT: in your DB tables/{id}/guests is ARRAY :contentReference[oaicite:2]{index=2}
      const guestsList =
        m?.guests ? toArr(m.guests) :
        Array.isArray(p?.guestsList) ? p.guestsList :
        [];

      const capacity = Number(m?.size || p?.guests || guestsList.length || 0) || 0;
      const updatedAt = Number(m?.updatedAt || m?.lastUpdated || p?.updatedAt || 0) || 0;

      return {
        _k: String(k),
        id: String(k),
        title,
        name: title,
        size,
        guestsList,
        guests: capacity,
        rot: typeof p.rot === 'number' ? p.rot : 0,
        scale: typeof p.scale === 'number' ? p.scale : 1,
        nx,
        ny,
        muteWarning: !!m?.muteWarning,
        updatedAt,
      };
    });

    setTables(merged);
    setLoading(false);
    if (!selectedKey && merged.length) setSelectedKey(String(merged[0]._k));
  }, [fit.x, fit.y, fit.w, fit.h, selectedKey]);

  useEffect(() => {
    if (!placeRef && !metaRef) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubs = [];

    if (placeRef) {
      const u1 = onValue(
        placeRef,
        (snap) => {
          placeMapRef.current = normalizePlaceMap(snap.val());
          rebuildMerged();
        },
        () => {
          placeMapRef.current = {};
          rebuildMerged();
        }
      );
      unsubs.push(() => {
        try {
          off(placeRef);
          u1 && u1();
        } catch {}
      });
    }

    if (metaRef) {
      const u2 = onValue(
        metaRef,
        (snap) => {
          const v = snap.val();
          metaMapRef.current = v ? Object.fromEntries(Object.entries(v).map(([k, obj]) => [String(k), { ...obj }])) : {};
          rebuildMerged();
        },
        () => {
          metaMapRef.current = {};
          rebuildMerged();
        }
      );
      unsubs.push(() => {
        try {
          off(metaRef);
          u2 && u2();
        } catch {}
      });
    }

    return () => unsubs.forEach((fn) => fn());
  }, [placeRef, metaRef, rebuildMerged]);

  // ---------- tablesRef for fast find ----------
  const tablesRef = useRef([]);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  const findByKey = (k) => tablesRef.current.find((t) => String(t._k) === String(k));

  // ---------- tables-only search ----------
  const matchedKeys = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return new Set();
    const set = new Set();
    for (const t of tables) {
      const tableName = safeStr(t?.title || '').toLowerCase();
      const id2 = safeStr(t?._k).toLowerCase();
      if (tableName.includes(q) || id2.includes(q)) set.add(String(t._k));
    }
    return set;
  }, [tables, searchText]);

  const visibleTables = useMemo(() => {
    const q = searchText.trim();
    if (!q) return tables;
    return tables.filter((t) => matchedKeys.has(String(t._k)));
  }, [tables, searchText, matchedKeys]);

  // ---------- edit/zoom refs ----------
  const editModeRef = useRef(false);
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!searchText.trim()) return;
    const first = [...matchedKeys][0];
    if (first) {
      setSelectedKey(String(first));
      triggerBlink(String(first));
    }
  }, [matchedKeys, searchText, triggerBlink]);

  // ---------- drag logic: updates nx/ny ----------
  const respondersRef = useRef({});
  const dragStateRef = useRef({
    k: null,
    startNx: 0.5,
    startNy: 0.5,
    moved: false,
    fitW: 1,
    fitH: 1,
    lastNx: 0.5,
    lastNy: 0.5,
  });

  const getPanHandlers = (k) => {
    const key = String(k);

    if (!respondersRef.current[key]) {
      respondersRef.current[key] = PanResponder.create({
        onStartShouldSetPanResponder: () => !!editModeRef.current,
        onMoveShouldSetPanResponder: () => !!editModeRef.current,
        onStartShouldSetPanResponderCapture: () => !!editModeRef.current,
        onMoveShouldSetPanResponderCapture: () => !!editModeRef.current,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: () => {
          if (!editModeRef.current) return;

          setSelectedKey(key);
          const t = findByKey(key);

          dragStateRef.current = {
            k: key,
            startNx: typeof t?.nx === 'number' ? t.nx : 0.5,
            startNy: typeof t?.ny === 'number' ? t.ny : 0.5,
            moved: false,
            fitW: fit.w || 1,
            fitH: fit.h || 1,
            lastNx: typeof t?.nx === 'number' ? t.nx : 0.5,
            lastNy: typeof t?.ny === 'number' ? t.ny : 0.5,
          };
        },

        onPanResponderMove: (_, gesture) => {
          if (!editModeRef.current) return;

          const st = dragStateRef.current;
          if (st.k !== key) return;

          const dnx = (gesture.dx || 0) / (st.fitW || 1);
          const dny = (gesture.dy || 0) / (st.fitH || 1);

          const nnx = clamp01(st.startNx + dnx);
          const nny = clamp01(st.startNy + dny);

          st.moved = true;
          st.lastNx = nnx;
          st.lastNy = nny;

          setTables((prev) => prev.map((p) => (String(p._k) === key ? { ...p, nx: nnx, ny: nny } : p)));
        },

        // ✅ single release handler (saves!)
        onPanResponderRelease: async () => {
          if (!editModeRef.current) return;
          const st = dragStateRef.current;
          if (!st.moved) return;

          pushHistorySnapshot(tablesRef.current.map((x) => x));

          try {
            if (!uid || !eventId || !TABLES_PLACE_PATH) return;

            const nnx = clamp01(typeof st.lastNx === 'number' ? st.lastNx : st.startNx);
            const nny = clamp01(typeof st.lastNy === 'number' ? st.lastNy : st.startNy);

            await update(ref(db), {
              [`${TABLES_PLACE_PATH}/${key}/nx`]: nnx,
              [`${TABLES_PLACE_PATH}/${key}/ny`]: nny,
            });
          } catch (e) {
            console.log('save drag error', e);
          }
        },
      });
    }

    return respondersRef.current[key].panHandlers;
  };

  const saveAllSilent = useCallback(async () => {
    if (!uid || !eventId || !TABLES_PLACE_PATH) return false;

    try {
      const patch = {};
      tablesRef.current.forEach((t) => {
        const k = String(t._k);
        const base = `${TABLES_PLACE_PATH}/${k}`;
        patch[`${base}/nx`] = clamp01(t.nx ?? 0.5);
        patch[`${base}/ny`] = clamp01(t.ny ?? 0.5);
        patch[`${base}/rot`] = Number(t.rot || 0) || 0;
        patch[`${base}/scale`] = Number(t.scale || 1) || 1;
      });

      await update(ref(db), patch);
      return true;
    } catch (e) {
      console.log('auto saveAll error:', e);
      Alert.alert('שגיאה', 'שמירה אוטומטית נכשלה');
      return false;
    }
  }, [db, uid, eventId, TABLES_PLACE_PATH]);

  const toggleEditModeAutoSave = useCallback(async () => {
    if (editModeRef.current) {
      const ok = await saveAllSilent();
      if (!ok) return;
    }
    setEditMode((p) => !p);
  }, [saveAllSilent]);

  // ---------- selected ----------
  const selected = useMemo(() => tables.find((t) => String(t._k) === String(selectedKey)) || null, [tables, selectedKey]);

  // ---------- delete table ----------
  const deleteTable = useCallback(
    (k) => {
      const key = String(k);
      const t = findByKey(key);
      const name = t?.title || t?.name || 'שולחן';

      Alert.alert('מחיקת שולחן', `למחוק את "${name}"?\nהמחיקה היא מהאירוע (Firebase) ובלתי הפיכה.`, [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            if (!uid || !eventId) return;

            try {
              pushHistorySnapshot(tablesRef.current.map((x) => x));

              await update(ref(db), {
                [`${TABLES_PLACE_PATH}/${key}`]: null,
                [`${TABLES_META_PATH}/${key}`]: null,
              });

              setTables((prev) => prev.filter((x) => String(x._k) !== key));
              setSelectedKey((prevSel) => {
                if (String(prevSel) !== key) return prevSel;
                const remaining = tablesRef.current.filter((x) => String(x._k) !== key);
                return remaining.length ? String(remaining[0]._k) : null;
              });
            } catch (e) {
              console.log('deleteTable error:', e);
              Alert.alert('שגיאה', 'לא הצלחתי למחוק את השולחן');
            }
          },
        },
      ]);
    },
    [db, uid, eventId, TABLES_PLACE_PATH, TABLES_META_PATH, pushHistorySnapshot]
  );

  // ---------- rotate/scale ----------
  const rotateSelected = useCallback(
    async (delta) => {
      if (!selectedKey) return;
      const key = String(selectedKey);

      const t = findByKey(key);
      const newRot = ((Number(t?.rot || 0) + delta) % 360 + 360) % 360;

      pushHistorySnapshot(tablesRef.current.map((x) => x));
      setTables((prev) => prev.map((x) => (String(x._k) === key ? { ...x, rot: newRot } : x)));

      try {
        if (!uid || !eventId || !TABLES_PLACE_PATH) return;
        await update(ref(db, `${TABLES_PLACE_PATH}/${key}`), { rot: newRot });
      } catch (e) {
        console.log('save rot error', e);
      }
    },
    [selectedKey, uid, eventId, TABLES_PLACE_PATH, db, pushHistorySnapshot]
  );

  const scaleSelected = useCallback(
    async (delta) => {
      if (!selectedKey) return;
      const key = String(selectedKey);

      const t = findByKey(key);
      const newScale = clamp(Number(t?.scale || 1) + delta, 0.5, 2.2);

      pushHistorySnapshot(tablesRef.current.map((x) => x));
      setTables((prev) => prev.map((x) => (String(x._k) === key ? { ...x, scale: newScale } : x)));

      try {
        if (!uid || !eventId || !TABLES_PLACE_PATH) return;
        await update(ref(db, `${TABLES_PLACE_PATH}/${key}`), { scale: newScale });
      } catch (e) {
        console.log('save scale error', e);
      }
    },
    [selectedKey, uid, eventId, TABLES_PLACE_PATH, db, pushHistorySnapshot]
  );

  // ---------- ✅ REAL add/remove (writes to tables/{id}/guests ARRAY) ----------
  const upsertGuestPayload = (g) => ({
    createdAt: g?.createdAt || Date.now(),
    displayName: safeStr(g?.displayName ?? g?.name ?? g?.guestName ?? '').trim(),
    phoneNumbers: safeStr(g?.phoneNumbers ?? g?.phone ?? g?.phoneNumber ?? '').trim(),
    recordID: safeStr(g?.recordID ?? g?.id ?? g?.guestId ?? '').trim(),
    newPrice: g?.newPrice ?? g?.price ?? '',
  });

  const openManageForTable = useCallback((tableKey) => {
    setManageTableKey(String(tableKey));
    setManageSearch('');
    setManageVisible(true);
  }, []);

  const saveGuestsForTable = useCallback(
    async (tableKey, nextGuestsArr) => {
      if (!uid || !eventId || !TABLES_META_PATH) return;

      const key = String(tableKey);
      const now = Date.now();

      // update local immediately
      setTables((prev) =>
        prev.map((t) => (String(t._k) === key ? { ...t, guestsList: nextGuestsArr, updatedAt: now } : t))
      );

      // write to Firebase (the REAL place in your export) :contentReference[oaicite:3]{index=3}
      try {
        await update(ref(db), {
          [`${TABLES_META_PATH}/${key}/guests`]: nextGuestsArr,
          [`${TABLES_META_PATH}/${key}/updatedAt`]: now,
        });
      } catch (e) {
        console.log('saveGuestsForTable error', e);
        Alert.alert('שגיאה', 'שמירה של השולחן נכשלה');
      }
    },
    [db, uid, eventId, TABLES_META_PATH]
  );

  const toggleGuestInTable = useCallback(
    async (g) => {
      const key = String(manageTableKey || '');
      if (!key) return;

      const rid = guestRid(g);
      if (!rid) return;

      const target = findByKey(key);
      const targetList = toArr(target?.guestsList);

      const exists = targetList.some((x) => guestRid(x) === rid);

      // policy: guest can be only in one table -> remove from all other tables
      const now = Date.now();
      const patch = {};
      const nextTablesLocal = cloneTables(tablesRef.current);

      nextTablesLocal.forEach((t) => {
        const tk = String(t._k);
        const cur = toArr(t.guestsList);
        const filtered = cur.filter((x) => guestRid(x) !== rid);

        let finalArr = filtered;

        // if adding to target, append there
        if (tk === key && !exists) {
          finalArr = [...filtered, upsertGuestPayload(g)];
        }

        // if removing from target, keep filtered (already removed)
        if (tk === key && exists) {
          finalArr = filtered;
        }

        // only write if changed
        const changed =
          cur.length !== finalArr.length ||
          cur.some((x, i) => guestRid(x) !== guestRid(finalArr[i] || {}));

        if (changed) {
          patch[`${TABLES_META_PATH}/${tk}/guests`] = finalArr;
          patch[`${TABLES_META_PATH}/${tk}/updatedAt`] = now;
          t.guestsList = finalArr;
          t.updatedAt = now;
        }
      });

      // optimistic UI
      setTables(nextTablesLocal);

      try {
        await update(ref(db), patch);
      } catch (e) {
        console.log('toggleGuestInTable error', e);
        Alert.alert('שגיאה', 'לא הצלחתי לעדכן את השיבוץ');
      }
    },
    [manageTableKey, TABLES_META_PATH, db]
  );

  const manageTable = useMemo(() => (manageTableKey ? findByKey(manageTableKey) : null), [manageTableKey, tables]);

  const manageAssignedSet = useMemo(() => {
    const set = new Set();
    const list = toArr(manageTable?.guestsList);
    list.forEach((g) => set.add(guestRid(g)));
    return set;
  }, [manageTable]);

  const filteredAllGuests = useMemo(() => {
    const q = manageSearch.trim().toLowerCase();
    const arr = toArr(allGuests);
    if (!q) return arr;

    return arr.filter((g) => {
      const n = guestDisplayName(g).toLowerCase();
      const p = safeStr(g?.phoneNumbers ?? '').toLowerCase();
      return n.includes(q) || p.includes(q);
    });
  }, [allGuests, manageSearch]);

  // ---------- render helpers ----------
  const renderSidebarContent = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.sidebarHeader}>
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 חיפוש שולחן (שם/מספר)..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#94A3B8"
        />
      </View>

      <Text style={styles.sidebarTitle}>
        רשימת שולחנות ({visibleTables.length}
        {searchText.trim() ? ` מתוך ${tables.length}` : ''})
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {loading ? (
          <Text style={{ color: '#94A3B8', fontWeight: '800', textAlign: 'center', marginTop: 12 }}>טוען…</Text>
        ) : visibleTables.length === 0 ? (
          <Text style={{ color: '#94A3B8', fontWeight: '800', textAlign: 'center', marginTop: 12 }}>אין תוצאות</Text>
        ) : (
          visibleTables.map((t) => {
            const isSel = String(t._k) === String(selectedKey);
            const warn = hasWarning(t, responses);

            const list = toArr(t?.guestsList);
            const assigned = list.length;

            const cap = Number(t?.guests || 0) || assigned;
            const coming = countComing(list, responses);

            const showAll = !!expandedMap[String(t._k)];
            const MAX_SHOW = 6;
            const shown = showAll ? list : list.slice(0, MAX_SHOW);
            const more = Math.max(0, list.length - shown.length);

            return (
              <View
                key={String(t._k)}
                style={[
                  styles.tableCard,
                  isSel && styles.tableCardSelected,
                  warn && styles.tableCardWarnBorder,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedKey(String(t._k));
                    triggerBlink(String(t._k));
                  }}
                  style={styles.tableCardHeader}
                >
                  <View style={styles.tableCardHeaderLeft}>
                    <View style={[styles.listDot, warn && styles.listWarn]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tableCardName, isSel && { fontWeight: '900' }]} numberOfLines={1}>
                        {t.title || 'שולחן'}
                      </Text>

                      <View style={styles.tableCardMetaLine}>
                        <Text style={styles.tableCardMetaText}>
                          שובצו: <Text style={styles.bold}>{assigned}</Text>/<Text style={styles.bold}>{cap}</Text>
                        </Text>
                        <Text style={styles.dotSep}>•</Text>
                        <Text style={styles.tableCardMetaText}>
                          מגיעים: <Text style={styles.bold}>{coming}</Text>/{assigned || 0}
                        </Text>
                      </View>

                      {!!t.updatedAt && (
                        <Text style={styles.updatedAtTxt}>עודכן: {fmtTime(t.updatedAt)}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.tableCardHeaderRight}>
                    <TouchableOpacity
                      style={styles.manageBtn}
                      onPress={() => openManageForTable(t._k)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.manageBtnText}>הוסף/מחק</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => toggleExpand(t._k)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.expandBtnText}>{showAll ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.trashBtn}
                      onPress={() => deleteTable(t._k)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.trashBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                <View style={styles.guestsBox}>
                  {shown.length ? (
                    shown.map((g, idx) => {
                      const sRaw = displayStatus(g, responses);
                      const sLower = sRaw.toLowerCase();
                      const clr = statusColor(sLower);
                      const rid = guestRid(g);
                      const respTs = rid ? isoToMs(responses?.[rid]?.timestamp) : 0;

                      return (
                        <View key={`${t._k}-g-${idx}`} style={styles.gLine}>
                          <View style={[styles.statusDot, { backgroundColor: clr }]} />
                          <View style={{ flex: 1 }}>
                            {/* ✅ only colored name */}
                            <Text style={[styles.gLineName, { color: clr }]} numberOfLines={1}>
                              {guestDisplayName(g)}
                            </Text>
                            {!!respTs && (
                              <Text style={styles.gSub} numberOfLines={1}>
                                עודכן סטטוס: {fmtTime(respTs)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noGuestsText}>אין מוזמנים בשולחן</Text>
                  )}

                  {!showAll && more > 0 && (
                    <TouchableOpacity style={styles.moreBtn} onPress={() => toggleExpand(t._k)}>
                      <Text style={styles.moreBtnText}>הצג עוד {more}…</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  // ---------- render ----------
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.body, isMobile && { flexDirection: 'column' }, editMode && styles.bodyEditMode]}>
        {/* --- STAGE --- */}
        <View style={[styles.canvasArea, isMobile && { flex: 1 }]}>
          {/* Floating header */}
          <View style={styles.floatingHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>

            <View style={styles.headerTitles}>
              <Text style={styles.headerTitle}>תכנון שולחנות</Text>
              <Text style={styles.headerSub}>{eventName}</Text>
            </View>

            <View style={styles.headerActions}>
              {isMobile && (
                <TouchableOpacity
                  style={[styles.mobileListBtn]}
                  onPress={() => setListModalVisible(true)}
                >
                  <Text style={styles.mobileListBtnText}>רשימה</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.toggleBtn, editMode ? styles.toggleBtnOn : styles.toggleBtnOff]}
                onPress={toggleEditModeAutoSave}
              >
                <Text style={[styles.toggleBtnText, editMode && { color: '#fff' }]}>
                  {editMode ? 'עריכה: ON' : 'נעול'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stage */}
          <View
            style={[styles.canvasWrapper, isMobile && { flex: 1 }]}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setStageSize({ w: width, h: height });
            }}
          >
            {!diagramUri ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>🖼️</Text>
                <Text style={styles.emptyText}>לא נמצאה תמונה</Text>
              </View>
            ) : (
              <View style={styles.canvasCard}>
                <View style={styles.stageAbs}>
                  <Image
                    source={{ uri: diagramUri }}
                    style={[
                      styles.bgImg,
                      {
                        left: fit.x,
                        top: fit.y,
                        width: fit.w,
                        height: fit.h,
                      },
                    ]}
                    resizeMode="contain"
                  />

                  {/* tables overlay */}
                  {tables.map((t) => {
                    const isSel = String(t._k) === String(selectedKey);
                    const isMatch = matchedKeys.has(String(t._k));
                    const warn = hasWarning(t, responses);

                    const sx = fit.x + (t.nx ?? 0.5) * (fit.w || 1);
                    const sy = fit.y + (t.ny ?? 0.5) * (fit.h || 1);

                    const basePx = 64;
                    const s = t.scale || 1;
                    const nodePx = basePx * s;
                    const img = getTableImage(t.size);

                    const isBlink = String(t._k) === String(blinkKey);
                    const blinkStyle = isBlink ? { opacity: blinkOpacity, transform: [{ scale: blinkScale }] } : null;

                    return (
                      <Animated.View
                        key={String(t._k)}
                        {...(editMode ? getPanHandlers(t._k) : {})}
                        style={[
                          styles.tableNode,
                          { left: sx, top: sy, width: nodePx, height: nodePx },
                          Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none' } : null,
                          isSel && styles.tableSelected,
                          isMatch && styles.tableMatch,
                          blinkStyle,
                          !editMode && (Platform.OS === 'web' ? { cursor: 'pointer' } : null),
                        ]}
                      >
                        {!editMode && (
                          <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            onPress={() => {
                              setSelectedKey(String(t._k));
                              triggerBlink(String(t._k));
                            }}
                            onLongPress={() => openManageForTable(t._k)}
                          />
                        )}

                        {warn && (
                          <View style={styles.warnBadge}>
                            <Text style={styles.warnText}>!</Text>
                          </View>
                        )}

                        {img ? (
                          <Image
                            source={img}
                            pointerEvents="none"
                            draggable={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              transform: [{ rotate: `${t.rot || 0}deg` }],
                            }}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.fallbackCircle}>
                            <Text>?</Text>
                          </View>
                        )}

                        <View style={styles.metaWrap}>
                          <Text style={[styles.metaName, isSel && { borderColor: '#F97316' }]} numberOfLines={1}>
                            {t.title}
                          </Text>
                          <Text style={styles.metaGuests}>{toArr(t.guestsList).length}</Text>
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Bottom toolbar */}
          <View style={styles.floatingToolbar}>
            <View style={styles.toolSection}>
              <IconButton icon="−" onPress={() => setZoom((z) => clamp(z - 0.1, 0.5, 3))} />
              <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
              <IconButton icon="+" onPress={() => setZoom((z) => clamp(z + 0.1, 0.5, 3))} />
            </View>

            <View style={styles.divider} />

            <View style={[styles.toolSection, !selectedKey && { opacity: 0.4 }]}>
              <IconButton icon="↺" disabled={!selectedKey} onPress={() => rotateSelected(-15)} />
              <IconButton icon="↻" disabled={!selectedKey} onPress={() => rotateSelected(15)} />
              <View style={{ width: 8 }} />
              <IconButton icon="S−" label="קטן" disabled={!selectedKey} onPress={() => scaleSelected(-0.1)} />
              <IconButton icon="S+" label="גדל" disabled={!selectedKey} onPress={() => scaleSelected(0.1)} />
            </View>

            <View style={styles.divider} />
            <IconButton icon="⟲" label="Undo" disabled={!history.length} onPress={undo} />
          </View>
        </View>

        {/* --- SIDEBAR (desktop) --- */}
        {!isMobile && <View style={styles.sidebar}>{renderSidebarContent()}</View>}
      </View>

      {/* --- Mobile list bottom-sheet --- */}
      <Modal visible={listModalVisible} transparent animationType="slide" onRequestClose={() => setListModalVisible(false)}>
        <View style={styles.sheetBg}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>רשימת שולחנות</Text>
              <TouchableOpacity onPress={() => setListModalVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>{renderSidebarContent()}</View>
          </View>
        </View>
      </Modal>

      {/* --- Manage guests modal --- */}
      <Modal visible={manageVisible} transparent animationType="fade" onRequestClose={() => setManageVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.manageBox}>
            <View style={styles.modalHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>הוסף/מחק מוזמנים • {manageTable?.title || 'שולחן'}</Text>
                {!!manageTable?.updatedAt && (
                  <Text style={styles.updatedAtTxt}>עודכן: {fmtTime(manageTable.updatedAt)}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setManageVisible(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 12 }}>
              <TextInput
                style={styles.manageSearch}
                placeholder="חפש מוזמן לפי שם/טלפון…"
                placeholderTextColor="#94A3B8"
                value={manageSearch}
                onChangeText={setManageSearch}
              />
              <Text style={styles.manageHint}>
                לחיצה על מוזמן תוסיף/תמחק אותו מהשולחן (ומסירה אותו משולחנות אחרים).
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 12 }}>
              {filteredAllGuests.length ? (
                filteredAllGuests.map((g, idx) => {
                  const rid = guestRid(g);
                  const inTable = manageAssignedSet.has(rid);

                  const sRaw = displayStatus(g, responses);
                  const clr = statusColor(sRaw.toLowerCase());

                  const respTs = rid ? isoToMs(responses?.[rid]?.timestamp) : 0;

                  return (
                    <TouchableOpacity
                      key={`${rid || idx}`}
                      style={[styles.manageRow, inTable && styles.manageRowOn]}
                      onPress={() => toggleGuestInTable(g)}
                      activeOpacity={0.9}
                    >
                      <View style={[styles.statusDot, { backgroundColor: clr }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.manageName, { color: clr }]} numberOfLines={1}>
                          {guestDisplayName(g)}
                        </Text>
                        {!!respTs && (
                          <Text style={styles.gSub} numberOfLines={1}>
                            עודכן סטטוס: {fmtTime(respTs)}
                          </Text>
                        )}
                      </View>

                      <View style={[styles.checkPill, inTable ? styles.checkPillOn : styles.checkPillOff]}>
                        <Text style={[styles.checkPillText, inTable ? { color: '#16a34a' } : { color: '#64748b' }]}>
                          {inTable ? 'בשולחן' : 'לא משובץ'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyTxt}>אין מוזמנים להצגה.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F5F9' },
  body: { flex: 1, flexDirection: 'row' },
  bodyEditMode: { borderWidth: 3, borderColor: '#F97316' },

  // --- Stage ---
  canvasArea: { flex: 1, backgroundColor: '#E2E8F0', position: 'relative', overflow: 'hidden' },
  canvasWrapper: { flex: 1, padding: 0 },
  canvasCard: { flex: 1, backgroundColor: '#fff', overflow: 'hidden' },
  stageAbs: { flex: 1, position: 'relative' },

  bgImg: { position: 'absolute' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 10, fontSize: 16, color: '#64748b', fontWeight: '700' },

  // Header
  floatingHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#fff',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnText: { fontSize: 20, fontWeight: 'bold', color: '#334155' },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748b' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  toggleBtn: { height: 36, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', borderWidth: 1 },
  toggleBtnOn: { backgroundColor: '#F97316', borderColor: '#F97316' },
  toggleBtnOff: { backgroundColor: '#fff', borderColor: '#CBD5E1' },
  toggleBtnText: { fontWeight: '700', fontSize: 13, color: '#475569' },

  mobileListBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileListBtnText: { color: '#fff', fontWeight: '900' },

  // Tables nodes
  tableNode: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  tableSelected: { zIndex: 999 },
  tableMatch: { shadowColor: '#0EA5E9', shadowOpacity: 0.5, shadowRadius: 10 },

  fallbackCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  warnBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  warnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  metaWrap: { position: 'absolute', top: '100%', alignItems: 'center', marginTop: 2 },
  metaName: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1E293B',
    marginBottom: 2,
  },
  metaGuests: {
    backgroundColor: '#334155',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Toolbar
  floatingToolbar: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1,
    borderColor: '#fff',
  },
  toolSection: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { width: 1, height: 24, backgroundColor: '#CBD5E1', marginHorizontal: 12 },
  zoomText: { width: 44, textAlign: 'center', fontWeight: '700', color: '#334155' },

  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  iconBtnActive: { backgroundColor: '#FFF7ED' },
  iconBtnDisabled: { opacity: 0.3 },
  iconBtnText: { fontSize: 18, fontWeight: '700', color: '#475569' },
  iconBtnLabel: { fontSize: 8, position: 'absolute', bottom: 2, fontWeight: '600', color: '#64748b' },

  // Sidebar
  sidebar: { width: 360, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#E2E8F0', padding: 16 },
  sidebarHeader: { marginBottom: 12 },
  searchBar: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'right',
    fontSize: 14,
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  tableCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  tableCardSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  tableCardWarnBorder: { borderColor: '#F59E0B' },

  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    justifyContent: 'space-between',
  },
  tableCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tableCardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  listDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E2E8F0' },
  listWarn: { backgroundColor: '#EF4444' },

  tableCardName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  tableCardMetaLine: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  tableCardMetaText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  dotSep: { marginHorizontal: 6, color: '#CBD5E1', fontWeight: '900' },
  bold: { fontWeight: '900', color: '#0F172A' },

  updatedAtTxt: { marginTop: 4, fontSize: 11, fontWeight: '800', color: '#94A3B8' },

  manageBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnText: { fontWeight: '900', color: '#16a34a', fontSize: 12 },

  expandBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtnText: { fontWeight: '900', color: '#334155' },

  trashBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashBtnText: { fontSize: 16 },

  guestsBox: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  gLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gLineName: { fontWeight: '900', fontSize: 14 },
  gSub: { marginTop: 2, fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  noGuestsText: { textAlign: 'center', color: '#94A3B8', fontWeight: '800', paddingVertical: 6 },

  moreBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moreBtnText: { fontWeight: '900', color: '#0F172A' },

  statusDot: { width: 10, height: 10, borderRadius: 5 },

  // Sheets / Modals
  sheetBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheetCard: {
    height: '82%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    padding: 14,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  manageBox: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },

  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  closeX: { fontSize: 22, color: '#94A3B8', padding: 4 },

  manageSearch: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'right',
    fontSize: 14,
  },
  manageHint: { marginTop: 8, color: '#64748b', fontWeight: '800', fontSize: 11 },

  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  manageRowOn: { backgroundColor: '#F0FDF4' },
  manageName: { fontWeight: '900', fontSize: 14 },

  checkPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 2 },
  checkPillOn: { borderColor: '#86EFAC', backgroundColor: '#DCFCE7' },
  checkPillOff: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  checkPillText: { fontWeight: '900', fontSize: 12 },

  emptyTxt: { textAlign: 'center', padding: 20, color: '#94A3B8', fontWeight: '800' },
});
