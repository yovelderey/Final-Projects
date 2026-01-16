// TablePlanningScreen.js — NORMALIZED PLACEMENT (nx/ny) + Tables-only right panel
// ✅ Same placement on every device/screen (stores nx/ny in Firebase)
// ✅ Uses exact fitRect math for contain + RESOLUTIONS zoom
// ✅ Right panel: tables only, shows guests colored by responses status
// ✅ Fix: drag math (no accumulating dx every frame) + safer modal cleanup

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Alert,
  StatusBar,
  Modal,
  Animated,
  Platform,
  FlatList,
  SafeAreaView,
  TextInput,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { getDatabase, ref, set, onValue, get, update, off } from 'firebase/database';
import firebase from 'firebase/compat/app';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- zoom choices ---
const RESOLUTIONS = [0.75, 1, 1.25, 1.5, 2];

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

const TablePlanningScreen = ({ navigation, route }) => {
  const database = getDatabase();
  const user = firebase.auth().currentUser?.uid;
  const insets = useSafeAreaInsets();

  const { width: screenW } = useWindowDimensions();
  const { id, selectedImage } = route.params || {};

  // stage size (measured)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // image real size
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // ---- settings ----
  const [size, setSize] = useState(55);
  const [textSize, setTextSize] = useState(9);
  const [color, setColor] = useState('#4CAF50');
  const [rotation, setRotation] = useState(0);

  const [isLocked, setIsLocked] = useState(true);
  const [showLockMessage, setShowLockMessage] = useState(false);

  const [responses, setResponses] = useState({});
  const [blinkAnim] = useState(new Animated.Value(0));
  const [bgScaleIndex, setBgScaleIndex] = useState(1);

  // wide panel / drawer
  const isWide = Platform.OS === 'web' && screenW >= 980;
  const SIDE_W = isWide ? Math.min(380, Math.max(300, Math.round(screenW * 0.26))) : 0;
  const [sideOpen, setSideOpen] = useState(isWide);
  useEffect(() => setSideOpen(isWide), [isWide]);

  // table data
  const [tables, setTables] = useState([]); // each: {id,name,size,guestsList,guestsCount,nx,ny,muteWarning}
  const tablesRef = useRef([]);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);
// ✅ refs כדי שלא יהיו ערכים "ישנים" בתוך PanResponder



  // modal table
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [sizeTableData, setSizeTableData] = useState(null);
  const [guests, setGuests] = useState([]);

  // search (tables only)
  const [tableQuery, setTableQuery] = useState('');
  const tableInputRef = useRef(null);

  // highlight table
  const [highlightTableId, setHighlightTableId] = useState(null);
  const highlightTimeoutRef = useRef(null);

  // ----- print CSS (optional) -----
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.id = 'print-css';
    style.innerHTML = `
      @page { size: A4; margin: 0; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        #print-ui-controls, #print-header, #right-panel { display: none !important; }
        #print-root { background: white; height: 100vh; width: 100vw; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const s = document.getElementById('print-css');
      if (s) document.head.removeChild(s);
    };
  }, []);

  // blink animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [blinkAnim]);

  // image size
  useEffect(() => {
    if (!selectedImage) return;
    Image.getSize(
      selectedImage,
      (w, h) => setImgSize({ w, h }),
      () => setImgSize({ w: 0, h: 0 })
    );
  }, [selectedImage]);

  // fit rect = contain + RESOLUTIONS zoom
const zoom = RESOLUTIONS[bgScaleIndex] || 1;
const fit = useMemo(
  () => getFitRect(stageSize.w, stageSize.h, imgSize.w, imgSize.h, zoom),
  [stageSize, imgSize, zoom]
);

// ✅ refs כדי שלא יהיו ערכים "ישנים" בתוך PanResponder
const isLockedRef = useRef(true);
useEffect(() => {
  isLockedRef.current = isLocked;
}, [isLocked]);

const fitRef = useRef({ w: 1, h: 1 });
useEffect(() => {
  fitRef.current = { w: fit.w || 1, h: fit.h || 1 };
}, [fit.w, fit.h]);

// ✅ responders cache לפי id
const respondersRef = useRef({});

// ✅ drag state per gesture
const dragStateRef = useRef({
  k: null,
  startNx: 0.5,
  startNy: 0.5,
  lastNx: 0.5,
  lastNy: 0.5,
  moved: false,
  fitW: 1,
  fitH: 1,
});

const getPanHandlers = (id) => {
  const key = String(id);

  if (!respondersRef.current[key]) {
    respondersRef.current[key] = PanResponder.create({
      onStartShouldSetPanResponder: () => !isLockedRef.current,
      onMoveShouldSetPanResponder: () => !isLockedRef.current,

      // ✅ בווב קריטי כדי שלא יחתוך את הגרירה
      onStartShouldSetPanResponderCapture: () => !isLockedRef.current,
      onMoveShouldSetPanResponderCapture: () => !isLockedRef.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: () => {
        if (isLockedRef.current) return;

        const cur = (tablesRef.current || []).find((x) => String(x.id) === key);
        const baseNx = typeof cur?.nx === 'number' ? cur.nx : 0.5;
        const baseNy = typeof cur?.ny === 'number' ? cur.ny : 0.5;

        const fw = fitRef.current.w || 1;
        const fh = fitRef.current.h || 1;

        dragStateRef.current = {
          k: key,
          startNx: baseNx,
          startNy: baseNy,
          lastNx: baseNx,
          lastNy: baseNy,
          moved: false,
          fitW: fw,
          fitH: fh,
        };
      },

      onPanResponderMove: (_, g) => {
        if (isLockedRef.current) return;
        const st = dragStateRef.current;
        if (st.k !== key) return;

        const dnx = (g.dx || 0) / (st.fitW || 1);
        const dny = (g.dy || 0) / (st.fitH || 1);

        const nnx = clamp01(st.startNx + dnx);
        const nny = clamp01(st.startNy + dny);

        st.moved = true;
        st.lastNx = nnx;
        st.lastNy = nny;

        setTables((prev) => prev.map((t) => (String(t.id) === key ? { ...t, nx: nnx, ny: nny } : t)));
      },

      onPanResponderRelease: async () => {
        const st = dragStateRef.current;
        if (st.k !== key || !st.moved) return;
        try {
          if (!user || !id || !TABLES_PLACE_PATH) return;
          await update(ref(database, `${TABLES_PLACE_PATH}/${key}`), {
            nx: clamp01(st.lastNx),
            ny: clamp01(st.lastNy),
          });
        } catch (e) {
          console.log('save drag error', e);
        }
      },

      onPanResponderTerminate: async () => {
        const st = dragStateRef.current;
        if (st.k !== key || !st.moved) return;
        try {
          if (!user || !id || !TABLES_PLACE_PATH) return;
          await update(ref(database, `${TABLES_PLACE_PATH}/${key}`), {
            nx: clamp01(st.lastNx),
            ny: clamp01(st.lastNy),
          });
        } catch (e) {
          console.log('save drag term error', e);
        }
      },
    });
  }

  return respondersRef.current[key].panHandlers;
};


  // helpers: safe guest
  const pickPhone = (g) => {
    const direct = g?.phoneNumber || g?.phone || g?.phone_number || g?.phoneNumbers;
    if (!direct) return '';
    if (typeof direct === 'string') return direct;
    if (Array.isArray(direct)) {
      const first = direct[0];
      if (!first) return '';
      if (typeof first === 'string') return first;
      if (typeof first === 'object') return String(first.number || first.value || first.phone || '');
      return '';
    }
    if (typeof direct === 'object') {
      const vals = Object.values(direct);
      const first = vals?.[0];
      return first ? String(first) : '';
    }
    return String(direct);
  };

  const safeName = (g) => String(g?.displayName || g?.name || 'ללא שם');

  // status color by response
  const getStatusColor = (resp) => {
    const s = String(resp || '').trim();
    if (s === 'מגיע' || s === 'כן') return '#16a34a';
    if (s === 'לא מגיע' || s === 'לא') return '#dc2626';
    if (s === 'אולי') return '#f59e0b';
    if (s === 'ממתין' || s === 'טרם השיבו' || !s) return '#64748b';
    return '#111827';
  };

  // firebase paths
  const TABLES_PLACE_PATH = useMemo(() => (user && id ? `Events/${user}/${id}/tablesPlace` : null), [user, id]);
  const TABLES_META_PATH = useMemo(() => (user && id ? `Events/${user}/${id}/tables` : null), [user, id]);

  // normalize tablesPlace -> map
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

  // sync settings / responses / tables
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

    const merged = keys.map((key, idx) => {
      const p = placeMap[key] || {};
      const m = metaMap[key] || {};

      // legacy conversion x/y -> nx/ny (if exists)
      const nx =
        typeof p.nx === 'number'
          ? p.nx
          : typeof p.x === 'number' && fit.w
          ? clamp01((p.x - fit.x) / fit.w)
          : 0.5;

      const ny =
        typeof p.ny === 'number'
          ? p.ny
          : typeof p.y === 'number' && fit.h
          ? clamp01((p.y - fit.y) / fit.h)
          : 0.5;

      const name = String(m.name || m.displayName || p.name || p.displayName || `שולחן ${idx + 1}`);
      const sizeSeats = m.size || p.size || null;

      const guestsList = m?.guests ? Object.values(m.guests) : [];

      return {
        id: String(key),
        name,
        size: sizeSeats,
        guestsList,
        guests: guestsList.length,
        muteWarning: !!m.muteWarning,
        nx,
        ny,
      };
    });

    setTables(merged);
  }, [fit.x, fit.y, fit.w, fit.h]);

  useEffect(() => {
    if (!user || !id) return;

    const unsubs = [];

    // settings
    const sRef = ref(database, `Events/${user}/${id}/settings`);
    const uSettings = onValue(sRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSize(data.size || 55);
        setTextSize(data.textSize || 9);
        setColor(data.color || '#4CAF50');
        setRotation(data.rotation || 0);
      }
    });
    unsubs.push(() => {
      try {
        off(sRef);
        uSettings && uSettings();
      } catch {}
    });

    // responses
    const rRef = ref(database, `Events/${user}/${id}/responses`);
    const uResp = onValue(rRef, (snapshot) => setResponses(snapshot.val() || {}));
    unsubs.push(() => {
      try {
        off(rRef);
        uResp && uResp();
      } catch {}
    });

    // tablesPlace
    const tpRef = ref(database, TABLES_PLACE_PATH);
    const uPlace = onValue(tpRef, (snap) => {
      placeMapRef.current = normalizePlaceMap(snap.val());
      rebuildMerged();
    });
    unsubs.push(() => {
      try {
        off(tpRef);
        uPlace && uPlace();
      } catch {}
    });

    // tables meta
    const tmRef = ref(database, TABLES_META_PATH);
    const uMeta = onValue(tmRef, (snap) => {
      const v = snap.val();
      metaMapRef.current = v ? Object.fromEntries(Object.entries(v).map(([k, obj]) => [String(k), { ...obj }])) : {};
      rebuildMerged();
    });
    unsubs.push(() => {
      try {
        off(tmRef);
        uMeta && uMeta();
      } catch {}
    });

    return () => unsubs.forEach((fn) => fn());
  }, [database, user, id, TABLES_PLACE_PATH, TABLES_META_PATH, rebuildMerged]);

  // save settings
  const saveSettings = (newSettings) => {
    if (!user || !id) return;
    set(ref(database, `Events/${user}/${id}/settings`), newSettings);
  };

  const handleResize = (direction) => {
    let newSize = size;
    let newText = textSize;
    if (direction === 'up' && size < 115) {
      newSize += 5;
      newText += 1;
    } else if (direction === 'down' && size > 25) {
      newSize -= 5;
      newText -= 1;
    }
    setSize(newSize);
    setTextSize(newText);
    saveSettings({ size: newSize, textSize: newText, color, rotation });
  };

  const handleRotate = () => {
    const newRot = rotation + 90;
    setRotation(newRot);
    saveSettings({ size, textSize, color, rotation: newRot });
  };

const toggleLock = () => {
  setIsLocked((prev) => {
    const next = !prev;
    if (!next) {
      setShowLockMessage(true);
      setTimeout(() => setShowLockMessage(false), 3000);
    }
    return next;
  });
};


  const blinkTable = (tableId) => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    setHighlightTableId(String(tableId));
    highlightTimeoutRef.current = setTimeout(() => setHighlightTableId(null), 4500);
  };

  // SAVE placements: nx/ny only (object keyed)
  const savePlacements = async () => {
    if (!user || !id || !TABLES_PLACE_PATH) return;
    const patch = {};
    tablesRef.current.forEach((t) => {
      patch[`${TABLES_PLACE_PATH}/${t.id}/nx`] = clamp01(t.nx ?? 0.5);
      patch[`${TABLES_PLACE_PATH}/${t.id}/ny`] = clamp01(t.ny ?? 0.5);
    });
    await update(ref(database), patch);
  };

  // ---- PanResponders (normalized) ----

  // modal cleanup
  const modalCleanupRef = useRef(null);

  const openTableModal = (table) => {
    if (!user || !id) return;

    // clear any previous listener
    if (modalCleanupRef.current) {
      try {
        modalCleanupRef.current();
      } catch {}
      modalCleanupRef.current = null;
    }

    setSelectedTable(table);

    const gRef = ref(database, `Events/${user}/${id}/tables/${table.id}/guests`);
    const unsub = onValue(gRef, (snap) => {
      const v = snap.val();
      const list = v ? Object.values(v) : [];
      setGuests(Array.isArray(list) ? list : []);
    });

    get(ref(database, `Events/${user}/${id}/tables/${table.id}`)).then((snap) => {
      setSizeTableData(snap.val()?.size || 'לא מוגדר');
    });

    modalCleanupRef.current = () => {
      try {
        unsub && unsub();
        off(gRef);
      } catch {}
    };

    setModalVisible(true);
  };

  const closeModal = () => {
    if (modalCleanupRef.current) {
      try {
        modalCleanupRef.current();
      } catch {}
      modalCleanupRef.current = null;
    }
    setModalVisible(false);
  };

  const deleteGuest = async (recordID) => {
    Alert.alert('מחיקת אורח', 'האם למחוק את האורח מהשולחן?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            const guestsRef = ref(database, `Events/${user}/${id}/tables/${selectedTable.id}/guests`);
            const snap = await get(guestsRef);
            if (snap.exists()) {
              const data = snap.val();
              let updated = null;
              if (Array.isArray(data)) updated = data.filter((g) => String(g?.recordID) !== String(recordID));
              else
                updated = Object.fromEntries(
                  Object.entries(data).filter(([_, v]) => String(v?.recordID) !== String(recordID))
                );

              const hasAny = Array.isArray(updated) ? updated.length > 0 : updated && Object.keys(updated).length > 0;
              await set(guestsRef, hasAny ? updated : null);
            }
          } catch (e) {
            Alert.alert('שגיאה', e.message);
          }
        },
      },
    ]);
  };

  const toggleMute = async () => {
    if (!selectedTable) return;
    const newVal = !selectedTable.muteWarning;
    await set(ref(database, `Events/${user}/${id}/tables/${selectedTable.id}/muteWarning`), newVal);
    setSelectedTable((prev) => ({ ...prev, muteWarning: newVal }));
  };

  // table images
  const getTableImage = (tSize) => {
    switch (Number(tSize)) {
      case 12:
        return require('../assets/meroba-removebg-preview.png');
      case 14:
        return require('../assets/malben1-removebg-preview.png');
      case 18:
        return require('../assets/malben2-removebg-preview.png');
      case 16:
        return require('../assets/igol1-removebg-preview.png');
      case 10:
        return require('../assets/igol2-removebg-preview.png');
      case 24:
        return require('../assets/malben4-removebg-preview.png');
      default:
        return null;
    }
  };

  // ---- filter tables only ----
  const filteredTables = useMemo(() => {
    const q = String(tableQuery || '').trim().toLowerCase();
    const arr = Array.isArray(tables) ? tables : [];

    const sorted = [...arr].sort((a, b) => {
      const na = Number(String(a?.id || '').replace(/\D/g, '')) || 999999;
      const nb = Number(String(b?.id || '').replace(/\D/g, '')) || 999999;
      return na - nb;
    });

    if (!q) return sorted;
    return sorted.filter((t) => {
      const nm = String(t?.name || '').toLowerCase();
      const id2 = String(t?.id || '').toLowerCase();
      return nm.includes(q) || id2.includes(q);
    });
  }, [tables, tableQuery]);

  // right panel
  const RightPanel = (
    <View style={styles.sidePanel} nativeID="right-panel">
      <View style={styles.sideSearchWrap}>
        <TextInput
          ref={tableInputRef}
          value={tableQuery}
          onChangeText={setTableQuery}
          placeholder="חפש שולחן"
          placeholderTextColor="#8A93A3"
          style={styles.sideSearchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.sideTop}>
        <Text style={styles.sideMeta}>{`כמות שולחנות: ${tables?.length || 0}`}</Text>
        <Text style={styles.sideHint}>לחיצה: הבהוב שולחן • לחיצה ארוכה: פרטי שולחן</Text>
      </View>

      <FlatList
        data={filteredTables}
        keyExtractor={(t) => String(t?.id)}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.sideEmpty}>אין שולחנות</Text>}
        contentContainerStyle={{ paddingBottom: 18 }}
        renderItem={({ item: t }) => {
          const over = (t?.guests || 0) > (t?.size || 0);

          const list = Array.isArray(t?.guestsList) ? t.guestsList : [];
          const MAX_SHOW = 18;
          const shown = list.slice(0, MAX_SHOW);
          const moreCount = Math.max(0, list.length - shown.length);

          return (
            <TouchableOpacity
              style={styles.tableCard}
              activeOpacity={0.9}
              onPress={() => {
                if (!isWide) setSideOpen(false);
                blinkTable(t?.id);
              }}
              onLongPress={() => isLocked && openTableModal(t)}
            >
              <View style={styles.tableCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableCardTitle} numberOfLines={1}>
                    {String(t?.name || `שולחן ${t?.id}`)}
                  </Text>

                  <Text style={[styles.tableCardSub, over && { color: '#dc2626', fontWeight: '900' }]} numberOfLines={1}>
                    {`מוזמנים: ${Number(t?.guests || 0)}   |   קיבולת: ${t?.size || '?'}`}
                  </Text>
                </View>
              </View>

              <View style={styles.guestNamesWrap}>
                {shown.length === 0 ? (
                  <Text style={styles.noGuestsText}>אין מוזמנים בשולחן</Text>
                ) : (
                  shown.map((g, idx) => {
                    const rid = String(g?.recordID || g?.id || `${t.id}-${idx}`);
                    const resp = responses?.[rid]?.response;
                    const c = getStatusColor(resp);

                    return (
                      <View key={`${rid}-${idx}`} style={styles.guestChip}>
                        <Text style={[styles.guestChipText, { color: c }]} numberOfLines={1}>
                          {safeName(g)}
                        </Text>
                      </View>
                    );
                  })
                )}

                {moreCount > 0 && (
                  <View style={styles.moreChip}>
                    <Text style={styles.moreChipText}>{`ועוד ${moreCount}`}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  return (
    <View style={styles.container} nativeID="print-root">
      <StatusBar barStyle="dark-content" backgroundColor="#f2f2f2" />

      {/* Header */}
      <SafeAreaView style={styles.header} nativeID="print-header">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← חזור</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>סידור שולחנות</Text>

        <View style={styles.headerRight}>
          {!isWide && (
            <TouchableOpacity
              onPress={() => {
                setSideOpen(true);
                setTimeout(() => tableInputRef.current?.focus?.(), 80);
              }}
              style={styles.iconBtn}
            >
              <Text style={styles.iconBtnText}>📋</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Body */}
      <View style={[styles.bodyRow, { paddingBottom: 8 }]}>
        {/* Stage */}
        <View style={[styles.stageWrap, isWide && { flex: 1 }]}>
          <View
            style={[
              styles.stageContainer,
              {
                borderWidth: isLocked ? 0 : 2,
                borderColor: '#2196F3',
              },
                Platform.OS === 'web' && !isLocked ? { touchAction: 'none' } : null,

            ]}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setStageSize({ w: width, h: height });
            }}
          >
            {/* Background image EXACT by fitRect (contain) */}
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={[
                  styles.bgImage,
                  {
                    left: fit.x,
                    top: fit.y,
                    width: fit.w,
                    height: fit.h,
                  },
                ]}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.placeholderText}>לא נבחרה תמונת רקע</Text>
            )}

            {/* Tables */}
            {tables.map((table, i) => {
              const tableImgSource = getTableImage(table.size);
              const isOverCapacity = (table.guests || 0) > (table.size || 0);
const guestsCount = Number(table?.guests || 0);
const capacity = table?.size ? Number(table.size) : null;
const label = `${String(table?.name || `שולחן ${table?.id}`)}\n${guestsCount}${capacity ? `/${capacity}` : ''}`;

              const hasWarning =
                !table.muteWarning &&
                (table.guestsList || []).some((g) => ['לא מגיע', 'אולי'].includes(responses?.[g?.recordID]?.response));

              const isHighlighted = String(table.id) === String(highlightTableId);

              const sx = fit.x + (table.nx ?? 0.5) * (fit.w || 1);
              const sy = fit.y + (table.ny ?? 0.5) * (fit.h || 1);

              return (
<View
  key={String(table.id)}
  {...(!isLocked ? getPanHandlers(table.id) : {})}
  style={[
    styles.tableWrapper,
    {
      left: sx,
      top: sy,
      width: size,
      height: size,
      transform: [{ rotate: `${rotation}deg` }],
    },
    Platform.OS === 'web'
      ? { touchAction: 'none', userSelect: 'none', cursor: isLocked ? 'pointer' : 'grab' }
      : null,
  ]}
>
  {isLocked ? (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openTableModal(table)}
      style={styles.tableInner}
    >
      {tableImgSource ? (
        <Image source={tableImgSource} style={styles.tableAsset} />
      ) : (
        <View style={[styles.defaultShape, { backgroundColor: color }]} />
      )}

      {/* ✅ שם שולחן + כמה/כמה */}
      <View style={styles.tableLabelContainer} pointerEvents="none">
        <Text style={[styles.tableName, { fontSize: textSize }]} numberOfLines={1}>
          {String(table?.name || `שולחן ${table?.id}`)}
        </Text>

        <Text style={[styles.tableCount, { fontSize: Math.max(10, textSize + 2) }]} numberOfLines={1}>
          {Number(table?.guests || 0)}
          {table?.size ? `/${Number(table.size)}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  ) : (
    <View style={styles.tableInner} pointerEvents="none">
      {tableImgSource ? (
        <Image source={tableImgSource} style={styles.tableAsset} />
      ) : (
        <View style={[styles.defaultShape, { backgroundColor: color }]} />
      )}

      {/* ✅ גם במצב עריכה - לא תופס גרירה */}
      <View style={styles.tableLabelContainer} pointerEvents="none">
        <Text style={[styles.tableName, { fontSize: textSize }]} numberOfLines={1}>
          {String(table?.name || `שולחן ${table?.id}`)}
        </Text>

        <Text style={[styles.tableCount, { fontSize: Math.max(10, textSize + 2) }]} numberOfLines={1}>
          {Number(table?.guests || 0)}
          {table?.size ? `/${Number(table.size)}` : ''}
        </Text>
      </View>
    </View>
  )}
</View>


              );
            })}

            {!isLocked && (
              <View style={styles.editModeBadge}>
                <Text style={styles.editModeText}>מצב עריכה: גרור שולחנות</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right Panel */}
        {isWide && <View style={{ width: SIDE_W }}>{RightPanel}</View>}
      </View>

      {/* Drawer (Mobile) */}
      {!isWide && (
        <Modal visible={sideOpen} transparent animationType="fade" onRequestClose={() => setSideOpen(false)}>
          <Pressable style={styles.drawerOverlay} onPress={() => setSideOpen(false)}>
            <Pressable style={[styles.drawerCard, { paddingTop: insets.top ? 12 : 10 }]} onPress={() => {}}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>ניהול שולחנות</Text>
                <TouchableOpacity style={styles.drawerClose} onPress={() => setSideOpen(false)}>
                  <Text style={styles.drawerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              {RightPanel}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Floating Toolbar */}
      <View style={styles.floatingToolbar} nativeID="print-ui-controls">
        <View style={styles.toolGroup}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setBgScaleIndex((i) => (i + 1) % RESOLUTIONS.length)}>
            <Text style={styles.toolText}>🔍 x{RESOLUTIONS[bgScaleIndex]}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.toolGroup, styles.mainTools]}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => handleResize('down')}>
            <Text style={styles.iconText}>−</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.toolBtn} onPress={() => handleResize('up')}>
            <Text style={styles.iconText}>+</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
            <Image source={require('../assets/rotating.png')} style={styles.iconImg} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.lockBtn, isLocked ? styles.locked : styles.unlocked]} onPress={toggleLock}>
          <Image source={isLocked ? require('../assets/lock.png') : require('../assets/lockopen.png')} style={styles.lockIcon} />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal for Guests */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeModal}>
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            {selectedTable && (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>{String(selectedTable.name)}</Text>
                    <Text style={styles.sheetSubtitle}>
                      {guests.length} אורחים • קיבולת: {String(sizeTableData || 'לא מוגדר')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={toggleMute} style={[styles.muteChip, selectedTable.muteWarning && styles.mutedChip]}>
                    <Text style={styles.muteText}>{selectedTable.muteWarning ? '🔔 הפעל התראות' : '🔕 השתק'}</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={guests}
                  keyExtractor={(item, i) => String(item?.recordID || item?.id || i)}
                  style={styles.guestList}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  ListEmptyComponent={<Text style={styles.emptyText}>השולחן ריק</Text>}
                  renderItem={({ item }) => {
                    const rid = String(item?.recordID || item?.id || '');
                    const status = responses?.[rid]?.response;

                    let statusColor = '#9E9E9E';
                    if (status === 'מגיע') statusColor = '#4CAF50';
                    if (status === 'לא מגיע') statusColor = '#F44336';
                    if (status === 'אולי') statusColor = '#FFC107';

                    return (
                      <View style={styles.guestItem}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={styles.guestNameItem} numberOfLines={1}>
                          {safeName(item)} {pickPhone(item) ? `• ${pickPhone(item)}` : ''}
                        </Text>
                        <TouchableOpacity onPress={() => deleteGuest(rid)} style={styles.trashBtn2}>
                          <Text style={styles.trashText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {showLockMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>🔓 מצב עריכה: ניתן להזיז שולחנות</Text>
        </View>
      )}
    </View>
  );
};

// ----- Styles -----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  backBtn: { padding: 8 },
  backBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 10, backgroundColor: '#F2F4F7' },
  iconBtnText: { fontSize: 18 },

  bodyRow: { flex: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 10, paddingTop: 10 },

  stageWrap: { flex: 1 },
  stageContainer: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#eef2f5',
    position: 'relative',
    borderRadius: 14,
  },

  bgImage: { position: 'absolute' },
  placeholderText: { alignSelf: 'center', marginTop: 100, color: '#999', fontSize: 16 },

  editModeBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editModeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  tableWrapper: { position: 'absolute', zIndex: 10 },
  tableInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tableAsset: { width: '100%', height: '100%', resizeMode: 'contain' },
  defaultShape: { width: '100%', height: '100%', borderRadius: 8, opacity: 0.8 },
  tableLabelContainer: { position: 'absolute', alignItems: 'center' },
  tableName: { color: '#fff', fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  tableCount: { fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  warningIcon: { position: 'absolute', top: -10, right: -10, fontSize: 22, zIndex: 20 },

  highlightRing: {
    position: 'absolute',
    left: -6,
    right: -6,
    top: -6,
    bottom: -6,
    borderWidth: 4,
    borderColor: '#00C2FF',
    shadowColor: '#00C2FF',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },

  floatingToolbar: {
    position: 'absolute',
    bottom: 22,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolGroup: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mainTools: { paddingHorizontal: 15, gap: 10, alignItems: 'center' },
  divider: { width: 1, height: 20, backgroundColor: '#eee' },
  toolBtn: { padding: 10, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  toolText: { fontSize: 14, fontWeight: '600', color: '#555' },
  iconText: { fontSize: 24, lineHeight: 26, fontWeight: '400', color: '#333' },
  iconImg: { width: 22, height: 22, tintColor: '#333' },
  lockBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
  },
  locked: { backgroundColor: '#fff' },
  unlocked: { backgroundColor: '#2196F3' },
  lockIcon: { width: 24, height: 24, tintColor: '#111827' },

  // Right panel
  sidePanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6EAF0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sideTop: { marginBottom: 10 },
  sideMeta: { marginTop: 2, fontSize: 12, color: '#64748b', textAlign: 'right', fontWeight: '700' },
  sideHint: { marginTop: 6, fontSize: 11, color: '#94a3b8', textAlign: 'right' },

  sideSearchWrap: { marginBottom: 10 },
  sideSearchInput: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6EAF0',
    textAlign: 'right',
    color: '#111827',
    fontSize: 14,
  },

  sideEmpty: { textAlign: 'center', marginTop: 12, color: '#6B7280' },

  tableCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tableCardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  tableCardTitle: { fontSize: 15, fontWeight: '900', color: '#111827', textAlign: 'right' },
  tableCardSub: { marginTop: 4, fontSize: 12, color: '#64748b', textAlign: 'right' },

  guestNamesWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  guestChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    maxWidth: '100%',
  },
  guestChipText: { fontSize: 12, fontWeight: '800' },
  moreChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  moreChipText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  noGuestsText: { fontSize: 12, color: '#94a3b8', textAlign: 'right' },

  // Drawer
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  drawerCard: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 10, maxHeight: '88%' },
  drawerHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  drawerTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  drawerClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  drawerCloseText: { fontSize: 16, color: '#111827' },

  // Bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%', minHeight: '40%' },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'right' },
  sheetSubtitle: { fontSize: 14, color: '#666', marginTop: 2, textAlign: 'right' },
  muteChip: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  mutedChip: { backgroundColor: '#FFE0B2' },
  muteText: { fontSize: 12, fontWeight: '600', color: '#444' },

  guestList: { marginTop: 5 },
  guestItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },
  guestNameItem: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right', fontWeight: '700' },
  trashBtn2: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F7F8FA' },
  trashText: { fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 12, color: '#6B7280' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 95,
    left: 18,
    right: 18,
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: { color: '#fff', fontWeight: '900' },
  tableLabelContainer: {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  alignItems: 'center',
  justifyContent: 'center',
},
tableName: {
  color: '#fff',
  fontWeight: '900',
  textAlign: 'center',
  textShadowColor: 'rgba(0,0,0,0.65)',
  textShadowRadius: 3,
},
tableCount: {
  marginTop: 2,
  color: '#fff',
  fontWeight: '900',
  textAlign: 'center',
  textShadowColor: 'rgba(0,0,0,0.65)',
  textShadowRadius: 3,
},

});

export default TablePlanningScreen;
