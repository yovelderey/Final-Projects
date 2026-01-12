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
  SafeAreaView
} from 'react-native';
import { getDatabase, ref, set, onValue, get } from 'firebase/database';
import firebase from 'firebase/compat/app';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- קבועים ---
const RESOLUTIONS = [0.75, 1, 1.25, 1.5, 2];
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const TablePlanningScreen = ({ navigation, route }) => {
  const database = getDatabase();
  const user = firebase.auth().currentUser?.uid;
  const insets = useSafeAreaInsets();

  // גובה דינמי לאזור העבודה
  const stageHeight = Math.round(SCREEN_HEIGHT * 0.75);

  // ---- סטייט ----
  const [size, setSize] = useState(55);
  const [textSize, setTextSize] = useState(9);
  const [color, setColor] = useState('#4CAF50');
  const [rotation, setRotation] = useState(0);
  const [isLocked, setIsLocked] = useState(true); // מתחיל נעול למניעת תזוזות לא רצויות
  const [showLockMessage, setShowLockMessage] = useState(false);
  const [responses, setResponses] = useState({});
  const [blinkAnim] = useState(new Animated.Value(0));
  const [imageLoaded, setImageLoaded] = useState(false);
  const [bgScaleIndex, setBgScaleIndex] = useState(1);

  const { id, selectedImage, tableData } = route.params || {};
  const screenRef = useRef(null);

  const [tables, setTables] = useState(
    (tableData || []).map((table) => ({
      ...table,
      x: SCREEN_WIDTH / 2 - 50,
      y: stageHeight / 2 - 50,
    }))
  );

  // ---- סטייט למודאל ----
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [sizeTableData, setSizeTableData] = useState(null);
  const [guests, setGuests] = useState([]);

  // ===== CSS להדפסה (Web Only) =====
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.id = 'print-css';
    style.innerHTML = `
      @page { size: A4; margin: 0; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        #print-ui-controls, #print-header { display: none !important; }
        #print-root { background: white; height: 100vh; width: 100vw; }
        #print-bg { transform: none !important; width: 100% !important; height: 100% !important; object-fit: contain !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const s = document.getElementById('print-css');
      if (s) document.head.removeChild(s);
    };
  }, []);

  // ===== אנימציית אזהרה =====
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [blinkAnim]);

  // ===== סנכרון נתונים (Firebase) =====
  useEffect(() => {
    if (!user) return;
    
    // טעינת הגדרות
    onValue(ref(database, `Events/${user}/${id}/settings`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSize(data.size || 55);
        setTextSize(data.textSize || 9);
        setColor(data.color || '#4CAF50');
        setRotation(data.rotation || 0);
      }
    });

    // טעינת תגובות
    onValue(ref(database, `Events/${user}/${id}/responses`), (snapshot) => {
      setResponses(snapshot.val() || {});
    });

    // טעינת ומיזוג שולחנות
    const tablesPlaceRef = ref(database, `Events/${user}/${id}/tablesPlace`);
    const tablesRef = ref(database, `Events/${user}/${id}/tables`);

    let positions = [];
    let metadata = {};

    const mergeData = () => {
        const merged = Object.entries(metadata).map(([key, tData]) => {
            const pos = positions.find(p => String(p.id) === String(key));
            const guestsList = tData?.guests ? Object.values(tData.guests) : [];
            return {
                id: key,
                name: tData.name || tData.displayName || `שולחן ${key}`,
                size: tData.size || null,
                guestsList,
                guests: guestsList.length,
                muteWarning: !!tData.muteWarning,
                x: pos ? pos.x : SCREEN_WIDTH / 2 - 50,
                y: pos ? pos.y : stageHeight / 2 - 50,
            };
        });
        setTables(merged);
    };

    onValue(tablesPlaceRef, (snap) => { positions = snap.val() || []; mergeData(); });
    onValue(tablesRef, (snap) => { 
        const val = snap.val();
        metadata = val ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k, { ...v }])) : {};
        mergeData();
    });

  }, [user, id]);

  // ===== פונקציות לוגיקה =====
  const saveTables = () => {
    if (!user) return;
    set(ref(database, `Events/${user}/${id}/tablesPlace`), tables).catch(e => console.error(e));
  };

  const saveSettings = (newSettings) => {
    if (!user) return;
    set(ref(database, `Events/${user}/${id}/settings`), newSettings);
  };

  const handleResize = (direction) => {
    let newSize = size;
    let newText = textSize;
    if (direction === 'up' && size < 115) {
        newSize += 5; newText += 1;
    } else if (direction === 'down' && size > 25) {
        newSize -= 5; newText -= 1;
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
    setIsLocked(!isLocked);
    if (isLocked) { // אם היה נעול ועכשיו פתחנו
      setShowLockMessage(true);
      setTimeout(() => setShowLockMessage(false), 3000);
    }
  };

  // ===== PanResponder לגרירה =====
  const panResponders = tables.map((table) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLocked,
      onMoveShouldSetPanResponder: (_, g) => !isLocked && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
      onPanResponderMove: (_, g) => {
        if (isLocked) return;
        setTables(prev => prev.map(t => {
            if (t.id === table.id) {
                return {
                    ...t,
                    x: Math.max(-20, Math.min(t.x + g.dx, SCREEN_WIDTH - 20)),
                    y: Math.max(-20, Math.min(t.y + g.dy, stageHeight - 20))
                };
            }
            return t;
        }));
      },
      onPanResponderRelease: () => saveTables(),
    })
  );

  // ===== ניהול מודאל ואורחים =====
  const openTableModal = (table) => {
    if (!user) return;
    setSelectedTable(table);
    
    // האזנה לאורחים בשולחן ספציפי
    onValue(ref(database, `Events/${user}/${id}/tables/${table.id}/guests`), (snap) => {
        setGuests(snap.val() ? Object.values(snap.val()) : []);
    });
    // קבלת גודל שולחן עדכני
    get(ref(database, `Events/${user}/${id}/tables/${table.id}`)).then(snap => {
        setSizeTableData(snap.val()?.size || 'לא מוגדר');
    });

    setModalVisible(true);
  };

  const deleteGuest = async (recordID) => {
    Alert.alert('מחיקת אורח', 'האם למחוק את האורח מהשולחן?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: async () => {
            try {
                const guestsRef = ref(database, `Events/${user}/${id}/tables/${selectedTable.id}/guests`);
                const snap = await get(guestsRef);
                if (snap.exists()) {
                    const data = snap.val();
                    let updated = null;
                    if (Array.isArray(data)) updated = data.filter(g => g.recordID !== recordID);
                    else updated = Object.fromEntries(Object.entries(data).filter(([_, v]) => v.recordID !== recordID));
                    
                    // אם ריק, נשלח null למחיקת הצומת או מערך ריק
                    await set(guestsRef, updated && Object.keys(updated).length ? updated : null);
                }
            } catch (e) { Alert.alert('שגיאה', e.message); }
        }}
    ]);
  };

  const toggleMute = async () => {
      if(!selectedTable) return;
      const newVal = !selectedTable.muteWarning;
      await set(ref(database, `Events/${user}/${id}/tables/${selectedTable.id}/muteWarning`), newVal);
      setSelectedTable(prev => ({...prev, muteWarning: newVal}));
  };

  // ===== רנדור אייקונים לשולחן =====
  const getTableImage = (tSize) => {
      // כאן ניתן להחזיר את ה-Require המתאים
      // לצורך הדוגמה אני משתמש באותם נתיבים שלך
      switch(Number(tSize)) {
          case 12: return require('../assets/meroba-removebg-preview.png');
          case 14: return require('../assets/malben1-removebg-preview.png');
          case 18: return require('../assets/malben2-removebg-preview.png');
          case 16: return require('../assets/igol1-removebg-preview.png');
          case 10: return require('../assets/igol2-removebg-preview.png');
          case 24: return require('../assets/malben4-removebg-preview.png');
          default: return null; 
      }
  };

  return (
    <View style={styles.container} nativeID="print-root">
      <StatusBar barStyle="dark-content" backgroundColor="#f2f2f2" />

      {/* --- Header --- */}
      <SafeAreaView style={styles.header} nativeID="print-header">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← חזור</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>סידור שולחנות</Text>
        <TouchableOpacity onPress={() => alert('הוראות: גרור שולחנות, לחץ לעריכה')} style={styles.infoBtn}>
            <Text style={{fontSize: 20}}>ℹ️</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* --- Main Canvas (Stage) --- */}
      <View style={[styles.stageContainer, { height: stageHeight, borderWidth: isLocked ? 0 : 2, borderColor: '#2196F3' }]}>
        {selectedImage ? (
            <Image
                nativeID="print-bg"
                source={{ uri: selectedImage }}
                style={[styles.bgImage, { transform: [{ scale: RESOLUTIONS[bgScaleIndex] }] }]}
                resizeMode="contain"
                onLoad={() => setImageLoaded(true)}
            />
        ) : (
            <Text style={styles.placeholderText}>לא נבחרה תמונת רקע</Text>
        )}

        {/* --- Tables --- */}
        {imageLoaded && tables.map((table, i) => {
            const tableImgSource = getTableImage(table.size);
            const isOverCapacity = (table.guests || 0) > (table.size || 0);
            const hasWarning = !table.muteWarning && table.guestsList?.some(g => ['לא מגיע', 'אולי'].includes(responses[g.recordID]?.response));

            return (
                <View
                    key={table.id}
                    {...(!isLocked ? panResponders[i].panHandlers : {})}
                    style={[styles.tableWrapper, {
                        left: 0, top: 0, 
                        transform: [
                            { translateX: table.x }, 
                            { translateY: table.y }, 
                            { rotate: `${rotation}deg` }
                        ],
                        width: size, height: size
                    }]}
                >
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        onPress={() => isLocked && openTableModal(table)}
                        style={styles.tableInner}
                    >
                        {/* Table Shape/Image */}
                        {tableImgSource ? (
                            <Image source={tableImgSource} style={styles.tableAsset} />
                        ) : (
                            <View style={[styles.defaultShape, { backgroundColor: color }]} />
                        )}

                        {/* Labels */}
                        <View style={styles.tableLabelContainer}>
                            <Text numberOfLines={1} style={[styles.tableName, { fontSize: size * 0.22 }]}>{table.name}</Text>
                            <Text style={[styles.tableCount, { fontSize: size * 0.18, color: isOverCapacity ? '#ff4444' : '#fff' }]}>
                                {table.guests || 0}/{table.size || '?'}
                            </Text>
                        </View>

                        {/* Warnings */}
                        {hasWarning && (
                             <Animated.Text style={[styles.warningIcon, { opacity: blinkAnim }]}>⚠️</Animated.Text>
                        )}
                    </TouchableOpacity>
                </View>
            );
        })}
        
        {/* הודעה צפה במצב פתיחה */}
        {!isLocked && (
             <View style={styles.editModeBadge}>
                 <Text style={styles.editModeText}>מצב עריכה: גרור שולחנות</Text>
             </View>
        )}
      </View>


      {/* --- Floating Toolbar (Controls) --- */}
      <View style={styles.floatingToolbar} nativeID="print-ui-controls">
        
        {/* Left Group: View Controls */}
        <View style={styles.toolGroup}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setBgScaleIndex(i => (i + 1) % RESOLUTIONS.length)}>
                 <Text style={styles.toolText}>🔍 x{RESOLUTIONS[bgScaleIndex]}</Text>
            </TouchableOpacity>
        </View>

        {/* Center Group: Edit Controls */}
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

        {/* Right Group: Lock */}
        <TouchableOpacity 
            style={[styles.lockBtn, isLocked ? styles.locked : styles.unlocked]} 
            onPress={toggleLock}
        >
             <Image 
                source={isLocked ? require('../assets/lock.png') : require('../assets/lockopen.png')} 
                style={styles.lockIcon} 
             />
        </TouchableOpacity>
      </View>


      {/* --- Bottom Sheet Modal for Guests --- */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
         <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.bottomSheet} onPress={() => {}}>
                <View style={styles.sheetHandle} />
                
                {selectedTable && (
                    <>
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={styles.sheetTitle}>{selectedTable.name}</Text>
                                <Text style={styles.sheetSubtitle}>
                                    {guests.length} אורחים • קיבולת: {sizeTableData}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={toggleMute} style={[styles.muteChip, selectedTable.muteWarning && styles.mutedChip]}>
                                <Text style={styles.muteText}>{selectedTable.muteWarning ? '🔔 הפעל התראות' : '🔕 השתק'}</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={guests}
                            keyExtractor={(item, i) => item.recordID || String(i)}
                            style={styles.guestList}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            ListEmptyComponent={<Text style={styles.emptyText}>השולחן ריק</Text>}
                            renderItem={({ item }) => {
                                const status = responses[item.recordID]?.response;
                                let statusColor = '#9E9E9E';
                                if (status === 'מגיע') statusColor = '#4CAF50';
                                if (status === 'לא מגיע') statusColor = '#F44336';
                                if (status === 'אולי') statusColor = '#FFC107';

                                return (
                                    <View style={styles.guestItem}>
                                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                        <Text style={styles.guestNameItem}>{item.displayName || 'ללא שם'}</Text>
                                        <TouchableOpacity onPress={() => deleteGuest(item.recordID)} style={styles.trashBtn}>
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

      {/* הודעת טוסט קטנה */}
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
  
  // Header
  header: { 
      backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  backBtn: { padding: 8 },
  backBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  infoBtn: { padding: 8 },

  // Stage
  stageContainer: { 
      width: '100%', overflow: 'hidden', backgroundColor: '#eef2f5', 
      position: 'relative', marginTop: 10, alignSelf: 'center'
  },
  bgImage: { width: '100%', height: '100%' },
  placeholderText: { alignSelf: 'center', marginTop: 100, color: '#999', fontSize: 16 },
  editModeBadge: {
      position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: 'rgba(33, 150, 243, 0.9)',
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
  },
  editModeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Table Component
  tableWrapper: { position: 'absolute', zIndex: 10 },
  tableInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tableAsset: { width: '100%', height: '100%', resizeMode: 'contain' },
  defaultShape: { width: '100%', height: '100%', borderRadius: 8, opacity: 0.8 },
  tableLabelContainer: { position: 'absolute', alignItems: 'center' },
  tableName: { color: '#fff', fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  tableCount: { fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  warningIcon: { position: 'absolute', top: -10, right: -10, fontSize: 22, zIndex: 20 },

  // Floating Toolbar
  floatingToolbar: {
      position: 'absolute', bottom: 30, left: 20, right: 20,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  toolGroup: {
      flexDirection: 'row', backgroundColor: '#fff', borderRadius: 30,
      padding: 5, elevation: 5, shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.1, shadowRadius: 8
  },
  mainTools: { paddingHorizontal: 15, gap: 10, alignItems: 'center' },
  divider: { width: 1, height: 20, backgroundColor: '#eee' },
  toolBtn: { padding: 10, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  toolText: { fontSize: 14, fontWeight: '600', color: '#555' },
  iconText: { fontSize: 24, lineHeight: 26, fontWeight: '400', color: '#333' },
  iconImg: { width: 22, height: 22, tintColor: '#333' },
  lockBtn: {
      width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      elevation: 6, shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.2
  },
  locked: { backgroundColor: '#fff' },
  unlocked: { backgroundColor: '#2196F3' }, // Blue when unlocked (active)
  lockIcon: { width: 24, height: 24 },

  // Bottom Sheet Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: {
      backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, maxHeight: '60%', minHeight: '40%'
  },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  sheetSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  muteChip: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  mutedChip: { backgroundColor: '#FFE0B2' }, // Orange tint
  muteText: { fontSize: 12, fontWeight: '600', color: '#444' },

  guestList: { marginTop: 5 },
  guestItem: { 
      flexDirection: 'row', alignItems: 'center', paddingVertical: 12, 
      borderBottomWidth: 1, borderBottomColor: '#f0f0f0' 
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  guestNameItem: { flex: 1, fontSize: 16, color: '#333', textAlign: 'right' },
  trashBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8, marginLeft: 10 },
  trashText: { fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999' },

  toast: {
      position: 'absolute', bottom: 100, alignSelf: 'center', 
      backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20
  },
  toastText: { color: '#fff', fontSize: 14 },
});

export default TablePlanningScreen;