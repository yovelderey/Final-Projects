import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Alert,
  Dimensions,
  StatusBar,
  Modal,
  Animated,
  Easing,
  Platform,
  FlatList,
} from 'react-native';
import { getDatabase, ref, set, onValue, remove, get } from 'firebase/database';
import firebase from 'firebase/compat/app';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RESOLUTIONS = [0.75, 1, 1.25, 1.5, 2]; // רמות "רזולוציה" (סקייל) לתמונת הרקע

const TablePlanningScreen = ({ navigation, route }) => {
  const database = getDatabase();
  const user = firebase.auth().currentUser?.uid;

  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;

  // ---- גובה הבמה (אזור התמונה והשולחנות) ----
  const TOP_UI_OFFSET = 80;              // מקום לטופ-בר
  const TOOLBAR_HEIGHT = 72;             // גובה הסרגל בתחתית
  const stageHeight = Math.max(
    300,
    Math.min(
      Math.round(screenHeight * 0.65),
      screenHeight - (TOP_UI_OFFSET + TOOLBAR_HEIGHT + insets.top + insets.bottom + 24)
    )
  );

  // ---- סטייט ----
  const [size, setSize] = useState(55);
  const [textSize, setTextSize] = useState(9);
  const [color, setColor] = useState('#4CAF50');
  const [rotation, setRotation] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showLockMessage, setShowLockMessage] = useState(false);
  const [responses, setResponses] = useState({});
  const [blinkAnim] = useState(new Animated.Value(0));
  const [imageLoaded, setImageLoaded] = useState(false);

  // רזולוציית תמונת רקע (סקייל)
  const [bgScaleIndex, setBgScaleIndex] = useState(1); // התחל ב-x1 (האיבר השני במערך)

  const { id, selectedImage, tableData } = route.params || {};
  const screenRef = useRef(null);

  // טבלאות – אתחול לפי מרכז ה-stage (לא מרכז חלון מלא)
  const [tables, setTables] = useState(
    (tableData || []).map((table) => ({
      ...table,
      x: screenWidth / 2 - 50,
      y: stageHeight / 2 - 50,
    }))
  );

  // ===== CSS להדפסה + מניעת חסימת לחיצות =====
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const style = document.createElement('style');
    style.id = 'print-css';
    style.innerHTML = `
      @page { size: A4; margin: 10mm; }

      @media screen {
        #print-root { position: relative !important; }
        #print-stage { position: relative !important; overflow: hidden !important; }
        #print-bg {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          z-index: -1 !important;
          pointer-events: none !important;
        }
      }

      @media print {
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        #print-toolbar, #print-topbar, #print-back, #print-lockmsg, #print-instructions { display: none !important; }
        #print-root { position: relative !important; background: transparent !important; }
        #print-stage { position: relative !important; overflow: hidden !important; }
        #print-bg {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          z-index: 0 !important;
          pointer-events: none !important;
          transform: none !important; /* הדפסה תמיד בקנה מידה 1 */
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const s = document.getElementById('print-css');
      if (s) document.head.removeChild(s);
    };
  }, [insets.top, insets.bottom]);

  // ===== אנימציית אזהרה =====
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
  }, [blinkAnim]);

  // ===== פונקציות עזר =====
  const saveTablesToFirebase = () => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }
    const tablesRef = ref(database, `Events/${user}/${id}/tablesPlace`);
    set(tablesRef, tables).catch((error) =>
      Alert.alert('שגיאה בשמירת השולחנות:', error.message)
    );
  };

  const saveSettingsToFirebase = (updatedSettings) => {
    if (!user) return;
    const settingsRef = ref(database, `Events/${user}/${id}/settings`);
    set(settingsRef, { ...updatedSettings }).catch((error) =>
      Alert.alert('שגיאה בשמירת ההגדרות:', error.message)
    );
  };

  const renderTableIcon = (sizeVal) => {
    switch (sizeVal) {
      case 12: return <Image pointerEvents="none" source={require('../assets/meroba-removebg-preview.png')} style={styles.tableIcon} />;
      case 14: return <Image pointerEvents="none" source={require('../assets/malben1-removebg-preview.png')} style={styles.tableIcon} />;
      case 18: return <Image pointerEvents="none" source={require('../assets/malben2-removebg-preview.png')} style={styles.tableIcon} />;
      case 16: return <Image pointerEvents="none" source={require('../assets/igol1-removebg-preview.png')} style={styles.tableIcon} />;
      case 10: return <Image pointerEvents="none" source={require('../assets/igol2-removebg-preview.png')} style={styles.tableIcon} />;
      case 24: return <Image pointerEvents="none" source={require('../assets/malben4-removebg-preview.png')} style={styles.tableIcon} />;
      default : return <View pointerEvents="none" style={[styles.shapeFill, { backgroundColor: color }]} />;
    }
  };

  const increaseSize = () => {
    if (size < 115) {
      const newSize = size + 10;
      const newTextSize = textSize + 2;
      setSize(newSize);
      setTextSize(newTextSize);
      saveSettingsToFirebase({ size: newSize, textSize: newTextSize, color, rotation });
    } else {
      Alert.alert('גודל מקסימלי', 'לא ניתן להגדיל את השולחן מעבר');
    }
  };

  const decreaseSize = () => {
    const newSize = size > 20 ? size - 10 : size;
    const newTextSize = textSize > 8 ? textSize - 2 : textSize;
    setSize(newSize);
    setTextSize(newTextSize);
    saveSettingsToFirebase({ size: newSize, textSize: newTextSize, color, rotation });
  };

  const changeColor = () => {
    const colors = ['red', 'green', 'black', '#4CAF50'];
    const newColor = colors[(colors.indexOf(color) + 1) % colors.length];
    setColor(newColor);
    saveSettingsToFirebase({ size, textSize, color: newColor, rotation });
  };

  const rotateTables = () => {
    const newRotation = rotation + 90;
    setRotation(newRotation);
    saveSettingsToFirebase({ size, textSize, color, rotation: newRotation });
  };

  const toggleLock = () => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    if (newLockState) {
      setShowLockMessage(true);
      setTimeout(() => setShowLockMessage(false), 5000);
    }
  };

  const cycleResolution = () => {
    setBgScaleIndex((i) => (i + 1) % RESOLUTIONS.length);
  };

  // ===== טעינת הגדרות =====
  useEffect(() => {
    if (!user) return;
    const settingsRef = ref(database, `Events/${user}/${id}/settings`);
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSize(data.size || 55);
        setTextSize(data.textSize || 9);
        setColor(data.color || '#4CAF50');
        setRotation(data.rotation || 0);
      }
    });
  }, [user, id]);

  // ===== טעינת שולחנות + מיקומים =====
  useEffect(() => {
    if (!user) return;

    const tablesPlaceRef = ref(database, `Events/${user}/${id}/tablesPlace`);
    const tablesRef = ref(database, `Events/${user}/${id}/tables`);

    let tablePositions = [];
    let tableNames = {};

    const mergeData = () => {
      const mergedTables = tableNames
        ? Object.entries(tableNames).map(([key, table]) => {
            const position = (tablePositions || []).find(
              (tablePos) => String(tablePos.id) === String(key)
            );

            const guestsList = table?.guests ? Object.values(table.guests) : [];
            const guestsCount = guestsList.length;

            return {
              id: key,
              name: table.name || table.displayName || `שולחן ${key}`,
              size:
                typeof table.size === 'number'
                  ? table.size
                  : Number(table.size) || table.size || null,
              guestsList,
              guests: guestsCount,
              muteWarning: !!table.muteWarning,
              x: position ? position.x : screenWidth / 2 - 50,
              y: position ? position.y : stageHeight / 2 - 50,
            };
          })
        : [];

      setTables(mergedTables);
    };

    onValue(tablesPlaceRef, (snapshot) => {
      const data = snapshot.val();
      tablePositions = data || [];
      mergeData();
    });

    onValue(tablesRef, (snapshot) => {
      const data = snapshot.val();
      tableNames = data
        ? Object.fromEntries(
            Object.entries(data).map(([key, table]) => [
              key,
              {
                name: table.name || table.displayName || `שולחן ${key}`,
                size: table.size ?? null,
                guests: table.guests || {},
                muteWarning: !!table.muteWarning,
              },
            ])
          )
        : {};
      mergeData();
    });
  }, [user, id, stageHeight]);

  // ===== גרירת שולחנות (יתחיל רק כשלא נעול) =====
  const panResponders = tables.map((table) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLocked,
      onMoveShouldSetPanResponder: (_, g) =>
        !isLocked && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
      onPanResponderMove: (e, g) => {
        if (isLocked) return;
        setTables((prevTables) =>
          prevTables.map((t) => {
            if (t.id === table.id) {
              const newX = t.x + g.dx;
              const newY = t.y + g.dy;
              const limitedX = Math.max(0, Math.min(newX, screenWidth - size));
              const limitedY = Math.max(0, Math.min(newY, stageHeight - size));
              return { ...t, x: limitedX, y: limitedY };
            }
            return t;
          })
        );
      },
      onPanResponderRelease: () => {
        if (!isLocked) saveTablesToFirebase();
      },
    })
  );

  // ===== מודאל שולחן =====
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [SizeTable, setSizeTable] = useState(null);
  const [guests, setGuests] = useState([]);

  const toggleMuteWarning = async (table) => {
    if (!user || !table?.id) return;
    try {
      const tableRef = ref(database, `Events/${user}/${id}/tables/${table.id}/muteWarning`);
      await set(tableRef, !table.muteWarning);
      setSelectedTable((prev) => (prev ? { ...prev, muteWarning: !prev.muteWarning } : prev));
    } catch (e) {
      Alert.alert('שגיאה', e?.message || 'לא ניתן לעדכן השתקה');
    }
  };

  const openTableModal = (table) => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }
    setSelectedTable(table);

    const guestsRef = ref(database, `Events/${user}/${id}/tables/${table.id}/guests`);
    onValue(guestsRef, (snapshot) => {
      const data = snapshot.val();
      setGuests(data ? Object.values(data) : []);
      setModalVisible(true);
    });

    const tableRef = ref(database, `Events/${user}/${id}/tables/${table.id}`);
    onValue(tableRef, (snapshot) => {
      const data = snapshot.val();
      setSizeTable(data ? data.size || 'אין נתונים' : 'אין נתונים');
    });
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTable(null);
    setGuests([]);
  };
// ✅ מחיקת מוזמן ששורדת רענון: קורא את כל guests, מסנן ושומר חזרה

const notify = (title, message) => {
  if (Platform.OS === 'web') window.alert(message || title);
  else Alert.alert(title || '', message || '');
};

const confirmAsync = (title, message, okText = 'מחק', cancelText = 'בטל') => {
  if (Platform.OS === 'web') {
    // ב-Web נעשה confirm קלאסי שמחזיר true/false
    return Promise.resolve(window.confirm(message || title));
  }
  // במובייל – Alert עם כפתורי אישור/ביטול
  return new Promise((resolve) => {
    Alert.alert(title || '', message || '', [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
};


// מחיקת מוזמן ששורדת רענון (עובד Web/Native)
const deleteSpecificGuest = async (recordID) => {
  if (!user || !selectedTable?.id) return;

  const ok = await confirmAsync('מחיקת אורח', 'למחוק את האורח מהשולחן?');
  if (!ok) return;

  try {
    const guestsRef = ref(database, `Events/${user}/${id}/tables/${selectedTable.id}/guests`);
    const snap = await get(guestsRef);

    let newValue = null;
    if (snap.exists()) {
      const data = snap.val();

      if (Array.isArray(data)) {
        const filtered = data.filter((g) => g && g.recordID !== recordID);
        newValue = filtered.length ? filtered : null;
      } else if (data && typeof data === 'object') {
        const kept = Object.entries(data).filter(
          ([, v]) => v && v.recordID !== recordID
        );
        newValue = kept.length ? Object.fromEntries(kept) : null;
      }
    }

    await set(guestsRef, newValue);

    // עדכון לוקאלי מיידי
    setGuests((prev) => prev.filter((g) => g.recordID !== recordID));
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? {
              ...t,
              guests: Math.max(0, (t.guests || 0) - 1),
              guestsList: (t.guestsList || []).filter((g) => g?.recordID !== recordID),
            }
          : t
      )
    );
  } catch (e) {
    notify?.('שגיאה', e?.message || 'מחיקה נכשלה');
  }
};


  // ===== תגובות =====
  useEffect(() => {
    if (!user) return;
    const responsesRef = ref(database, `Events/${user}/${id}/responses`);
    onValue(responsesRef, (snapshot) => {
      const data = snapshot.val();
      setResponses(data || {});
    });
  }, [user, id]);

  return (
    <View nativeID="print-root" ref={screenRef} style={styles.container}>
      <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />

      {/* טופ־בר (מוסתר בפרינט) */}
      <View nativeID="print-topbar" style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>ניהול שולחנות</Text>
      </View>

      {/* אזור הבמה: תמונת רקע + שולחנות */}
      <View nativeID="print-stage" style={[styles.stage, { height: stageHeight, marginTop: TOP_UI_OFFSET }]}>
        {selectedImage ? (
          <Image
            nativeID="print-bg"
            source={{ uri: selectedImage }}
            pointerEvents="none"
            onLoad={() => setImageLoaded(true)}
            style={[
              styles.printBg,
              { transform: [{ scale: RESOLUTIONS[bgScaleIndex] }] } // ⬅️ רזולוציה/סקייל שניתן לדפדף
            ]}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.noImageText}>נא להעלות תמונה</Text>
        )}

        {/* שולחנות (מעל הרקע) */}
        {imageLoaded &&
          tables.map((table, index) => {
            const isFull =
              typeof table.size === 'number' && typeof table.guests === 'number'
                ? table.guests >= table.size
                : false;

            const hasWarningGuest = table.guestsList?.some(
              (g) =>
                responses[g.recordID]?.response === 'לא מגיע' ||
                responses[g.recordID]?.response === 'אולי'
            );

            const shouldWarn = hasWarningGuest && !table.muteWarning;

            return (
              <View
                key={table.id}
                {...(!isLocked ? panResponders[index]?.panHandlers : {})}
                style={[
                  styles.table,
                  {
                    transform: [
                      { translateX: table.x },
                      { translateY: table.y },
                      { rotate: `${rotation}deg` },
                    ],
                    width: size,
                    height: size,
                  },
                ]}
              >
                <View style={styles.fullSizeTouchable}>
                  {/* טקסט מעל הכול, לא תופס קליקים */}
                  <View pointerEvents="none" style={styles.textOverlay}>
                    <Text style={[styles.tableText, { fontSize: size * 0.2 }]}>
                      {table.name || `שולחן ${index + 1}`}
                    </Text>
                    <Text
                      style={[
                        styles.modalTitle2,
                        { color: isFull ? 'rgb(195, 23, 51)' : 'rgb(144, 238, 144)' },
                      ]}
                    >
                      {table.size ? `${table.guests ?? 0}/${table.size}` : 'אין נתונים על גודל השולחן'}
                    </Text>
                  </View>

                  {/* אזהרה/אייקון – לא תופס קליקים */}
                  {shouldWarn ? (
                    <View pointerEvents="none" style={styles.warningOverlay}>
                      <Animated.Text
                        style={[
                          styles.warningText,
                          {
                            fontSize: Math.min(96, Math.max(28, size * 0.9)),
                            opacity: blinkAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 1],
                            }),
                          },
                        ]}
                      >
                        ⚠️
                      </Animated.Text>
                    </View>
                  ) : (
                    renderTableIcon(table.size)
                  )}

                  {/* שכבת לחיצה שקופה – תופסת לחיצות רק כשהנעול פעיל */}
                  <TouchableOpacity
                    style={styles.touchOverlay}
                    pointerEvents={isLocked ? 'auto' : 'none'}
                    activeOpacity={1}
                    onPress={() => { if (isLocked) openTableModal(table); }}
                  />
                </View>
              </View>
            );
          })}
      </View>

      {/* מודאל */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { width: screenWidth > 800 ? '40%' : '92%' }]}>
            {selectedTable && (
              <>
                <Text style={styles.modalTitle}>{selectedTable.name || 'פרטי שולחן'}</Text>
                <Text style={styles.modalSubTitle}>{`מספר אורחים: ${guests.length}`}</Text>
                <Text style={styles.modalSubTitle}>
                  {SizeTable ? `גודל השולחן: ${SizeTable}` : 'אין נתונים על גודל השולחן'}
                </Text>

                <View style={styles.muteRow}>
                  <Text style={styles.explainText}>
                    ההתראה מופיעה כי אחד או יותר מהמוזמנים סימנו "אולי" או "לא מגיע".
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.muteBtn,
                      selectedTable?.muteWarning ? styles.muteOff : styles.muteOn,
                    ]}
                    onPress={() => toggleMuteWarning(selectedTable)}
                  >
                    <Text style={styles.muteBtnText}>
                      {selectedTable?.muteWarning ? 'בטל השתקה' : 'השתק התראה'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ✅ רשימת מוזמנים עם גלילה וגובה מקסימלי */}
                <View style={{ maxHeight: Math.min(380, Math.round(screenHeight * 0.5)) }}>
                  <FlatList
                    data={guests}
                    keyExtractor={(item, i) => item?.recordID || String(i)}
                    showsVerticalScrollIndicator
                    renderItem={({ item, index }) => {
                      const responseStatus = responses[item.recordID]?.response;
                      let bgColor = '#9e9e9e';   // default grey
                      let nameColor = '#fff';     // default white text

                      if (responseStatus === 'מגיע')  { bgColor = '#4CAF50'; nameColor = '#fff'; }
                      else if (responseStatus === 'לא מגיע') { bgColor = '#FF6F61'; nameColor = '#fff'; }
                      else if (responseStatus === 'אולי') { bgColor = '#FFD700'; nameColor = '#000'; }

                      return (
                        <View key={index.toString()} style={[styles.guestRow, { backgroundColor: bgColor }]}>
                          {/* כפתור מחיקה תמידי לכל מוזמן */}
                          <TouchableOpacity
                            style={styles.deleteGuestButton}
                            onPress={() => deleteSpecificGuest(item.recordID)}
                          >
                            <Text style={styles.deleteButtonText}>מחק</Text>
                          </TouchableOpacity>
                          <Text style={[styles.guestName, { color: nameColor }]}>
                            {item.displayName || 'ללא שם'}
                          </Text>
                        </View>
                      );
                    }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 10 }}>אין אורחים בשולחן</Text>}
                  />
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <Text style={styles.closeButtonText}>סגור</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* סרגל כפתורים בתחתית (מוסתר בפרינט) */}
      <View
        nativeID="print-toolbar"
        style={[styles.toolbar, { paddingBottom: Math.max(8, insets.bottom) }]}
      >

        {/* כפתור חזור (מוסתר בפרינט) */}
        <TouchableOpacity nativeID="print-back" style={styles.toolbarIcon2} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>חזור ←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={increaseSize}>
          <Image source={require('../assets/zoomin.png')} style={styles.toolbarIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={decreaseSize}>
          <Image source={require('../assets/zoomout.png')} style={styles.toolbarIcon} />
        </TouchableOpacity>

        {/* 🔁 כפתור "רזולוציה" במקום המירכוז */}
        <TouchableOpacity style={styles.button} onPress={cycleResolution}>
          {/* אם יש לך אייקון ייעודי – החלף כאן; זמנית משתמש באותו פלס-הולדר */}
          <Image source={require('../assets/rezolo.png')} style={styles.toolbarIcon} />
        </TouchableOpacity>
        <Text style={styles.resLabel}>x{RESOLUTIONS[bgScaleIndex].toFixed(2)}</Text>

        <TouchableOpacity style={styles.button} onPress={rotateTables}>
          <Image source={require('../assets/rotating.png')} style={styles.toolbarIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={toggleLock}>
          <Image
            source={isLocked ? require('../assets/lock.png') : require('../assets/lockopen.png')}
            style={styles.toolbarIcon}
          />
        </TouchableOpacity>

        {/* כפתור הדפסה (Web) */}
        <TouchableOpacity style={styles.button} onPress={() => {
          if (Platform.OS !== 'web') { Alert.alert('הדפסה נתמכת רק ב-Web'); return; }
          window.print();
        }}>
          <Image source={require('../assets/printing.png')} style={styles.toolbarIcon} />
        </TouchableOpacity>
      </View>

      {/* הודעת נעילה (מוסתר בפרינט) */}
      {showLockMessage && (
        <View nativeID="print-lockmsg" style={styles.lockMessage}>
          <Text style={styles.lockMessageText}>🔒 נעילת רשימת אורחים - מופעל</Text>
        </View>
      )}

      {/* הוראות שימוש (מוסתר בפרינט) */}
      <View nativeID="print-instructions" style={{ marginBottom: TOOLBAR_HEIGHT + 12 }}>
        <Text style={styles.centeredText}>הוראות שימוש</Text>
        <Text style={styles.centeredText2}>
          לפניך 6 כלים: נעילה – נועל הזזה, סיבוב – מסובב את השולחנות, רזולוציה – מדפדף בין גדלים שונים של תמונת הרקע,
          זכוכיות מגדלת – זום אין/אאוט. ניתן להזיז ולמקם את השולחנות על פני התרשים לקבלת התאמה לסקיצה.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', position: 'relative' },

  // אזור במה מוקטן (הרקע + השולחנות יושבים כאן)
  stage: {
    width: '100%',
    alignSelf: 'stretch',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },

  // תמונת רקע בתוך ה-stage
  printBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
  },

  noImageText: { textAlign: 'center', fontSize: 18, color: '#888', marginTop: 20 },

  table: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    overflow: 'hidden',
    minWidth: 30,
    minHeight: 30,
    zIndex: 10, // מעל הרקע
  },
  fullSizeTouchable: { flex: 1, width: '100%', height: '100%' },

  // שכבה שממלאת את כל משטח השולחן (ברירת מחדל לצורה)
  shapeFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 7,
    zIndex: 10,
  },

  // שכבת הלחיצה השקופה – הכי גבוהה
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },

  tableText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
    maxWidth: '90%',
  },

  // טופ-בר
  title: { fontSize: 24, fontWeight: 'bold' },
  topBar: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'absolute',
    top: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },

  backButtonText: { fontSize: 18, color: '#000', marginBottom: 0 },

  // סרגל כפתורים בתחתית
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: '#ffffffee',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 200,
  },
  button: { padding: 6, borderRadius: 8 },
  toolbarIcon: { width: 28, height: 28 },
  toolbarIcon2: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  resLabel: { fontSize: 14, color: '#333', fontWeight: '700' },

  modalContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 20,
  },
  modalContent: {
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center',
    marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 10,
  },
  modalTitle2: { fontSize: 16, fontWeight: 'bold' },
  modalSubTitle: { fontSize: 18, color: '#555', textAlign: 'center', marginBottom: 15 },

  muteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  explainText: { flex: 1, color: '#444', fontSize: 14, textAlign: 'right' },
  muteBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  muteOn: { backgroundColor: '#FFB74D' },
  muteOff: { backgroundColor: '#90CAF9' },
  muteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  guestRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    padding: 12, borderRadius: 10, marginVertical: 5,
    shadowColor: '#ccc', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  guestName: { fontSize: 16, textAlign: 'right', flex: 1 },
  deleteGuestButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginRight: 'auto'
  },
  deleteButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  closeButton: {
    backgroundColor: '#808080', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 25, marginTop: 20, alignSelf: 'center', width: '50%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  closeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  centeredText: { fontSize: 20, textAlign: 'center', marginTop: 12, fontWeight: 'bold' },
  centeredText2: { fontSize: 15, textAlign: 'center', marginHorizontal: 12 },

  lockMessage: {
    position: 'absolute',
    bottom: 90, // מעל הסרגל
    left: 0, right: 0,
    backgroundColor: '#000',
    padding: 10, marginHorizontal: 20,
    borderRadius: 10, alignItems: 'center',
    opacity: 0.8, zIndex: 300,
  },
  lockMessageText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  tableIcon: {
    width: '100%', height: '100%', resizeMode: 'contain',
    position: 'absolute', zIndex: 10,
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 2,
  },
  warningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  warningText: {
    fontSize: 30, fontWeight: 'bold', color: '#fff',
    textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center',
  },
});

export default TablePlanningScreen;
