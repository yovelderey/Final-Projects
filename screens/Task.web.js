// Task.js — Theme from Firebase (dark/light/auto) + Header like Management

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
  UIManager,
  LayoutAnimation,
  useColorScheme, // ✅ חשוב
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase, ref, set, get, push, remove, onValue } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';

// הפעלת אנימציות באנדרואיד
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- Theme palettes ---
const COLORS = {
  light: {
    bg: '#F8FAFC',
    headerBg: '#FFFFFF',
    card: '#FFFFFF',
    text: '#0F172A',
    subText: '#64748B',
    accent: '#4F46E5',
    success: '#22C55E',
    danger: '#EF4444',
    shadow: '#000',
    input: '#F1F5F9',
    border: '#E2E8F0',
    glass: 'rgba(2,6,23,0.06)',
    glassBorder: 'rgba(2,6,23,0.10)',
  },
  dark: {
    bg: '#0B1220',
    headerBg: '#0F172A',
    card: '#111827',
    text: '#F8FAFC',
    subText: '#94A3B8',
    accent: '#6C63FF',
    success: '#22C55E',
    danger: '#EF4444',
    shadow: '#000',
    input: '#0B1220',
    border: '#1F2937',
    glass: 'rgba(255,255,255,0.08)',
    glassBorder: 'rgba(255,255,255,0.12)',
  },
};

const Task = ({ route }) => {
  const { id } = route.params || {};
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  // --- State ---
  const [selectedTab, setSelectedTab] = useState('table');

  // Data
  const [tableData, setTableData] = useState([]);
  const [notes, setNotes] = useState([]);

  // Modals & Inputs
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState('');

  // Notes Editing
  const [currentNote, setCurrentNote] = useState('');
  const [currentNoteName, setCurrentNoteName] = useState('');
  const [editNoteId, setEditNoteId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Theme mode from DB
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const [dbMode, setDbMode] = useState('auto'); // 'light' | 'dark' | 'auto'

  // Animations Refs
  const scrollY = useRef(new Animated.Value(0)).current;

  const database = getDatabase();
  const user = firebase.auth().currentUser;

  // ===== Theme Listener (Firebase) =====
  useEffect(() => {
    if (!user || !id) return;

    const applyMode = (raw) => {
      let mode = String(raw ?? 'auto').toLowerCase();
      if (raw === true) mode = 'dark';
      if (raw === false) mode = 'light';
      if (!['light', 'dark', 'auto'].includes(mode)) mode = 'auto';
      setDbMode(mode);
    };

    const adminRef = ref(database, `Events/${user.uid}/${id}/__admin/ui/theme/mode`);
    const legacyRef = ref(database, `Events/${user.uid}/${id}/ui/theme/mode`);

    let hasAdminTheme = false;

    const unsubAdmin = onValue(adminRef, (snap) => {
      const v = snap.val();
      hasAdminTheme = v !== null && v !== undefined;
      if (hasAdminTheme) applyMode(v);
    });

    const unsubLegacy = onValue(legacyRef, (snap) => {
      if (!hasAdminTheme) applyMode(snap.val());
    });

    return () => {
      unsubAdmin();
      unsubLegacy();
    };
  }, [user, id]);

  const isDarkMode = useMemo(() => {
    if (dbMode === 'dark') return true;
    if (dbMode === 'light') return false;
    // auto
    return systemScheme === 'dark';
  }, [dbMode, systemScheme]);

  const colors = useMemo(() => (isDarkMode ? COLORS.dark : COLORS.light), [isDarkMode]);

  // ===== Data Load =====
  useEffect(() => {
    if (!user || !id) return;

    // Task load
    get(ref(database, `Events/${user.uid}/${id}/task`)).then((snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.val())) {
        setTableData(snapshot.val());
      } else {
        setTableData(getInitialTasks());
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    });

    // Notes listener
    const notesRef = ref(database, `Events/${user.uid}/${id}/notes`);
    const unsub = onValue(notesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedNotes = Object.entries(data).map(([key, value]) => ({ id: key, ...(value || {}) }));
        setNotes(loadedNotes);
      } else {
        setNotes([]);
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });

    return () => unsub();
  }, [user, id]);

  // ✅ ensure initial 65 tasks exist, merge if needed
  useEffect(() => {
    if (!user || !id) return;

    const taskRef = ref(database, `Events/${user.uid}/${id}/task`);

    get(taskRef).then((snapshot) => {
      const initial = getInitialTasks();

      let next = initial;
      let shouldSave = false;

      if (snapshot.exists()) {
        const val = snapshot.val();

        if (Array.isArray(val)) {
          const byId = new Map(val.map((t) => [t.id, t]));
          next = initial.map((t) => {
            const old = byId.get(t.id);
            return old ? { ...t, ...old } : t;
          });
          shouldSave = val.length !== next.length;
        } else {
          next = initial;
          shouldSave = true;
        }
      } else {
        next = initial;
        shouldSave = true;
      }

      setTableData(next);
      if (shouldSave) set(taskRef, next);
    });
  }, [user, id]);

  // ===== Logic =====
  const handleCheckBoxChange = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    const newData = [...tableData];
    newData[index].checked = !newData[index].checked;
    setTableData(newData);
    if (user) set(ref(database, `Events/${user.uid}/${id}/task`), newData);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);

    const maxId = tableData.length > 0 ? Math.max(...tableData.map((t) => t.id)) : 0;
    const newTaskItem = { id: maxId + 1, text: newTask.trim(), checked: false, custom: true };
    const updatedData = [newTaskItem, ...tableData];

    setTableData(updatedData);
    setNewTask('');
    setModalVisible(false);

    if (user) set(ref(database, `Events/${user.uid}/${id}/task`), updatedData);
  };

  const deleteTask = (taskId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    const newData = tableData.filter((item) => item.id !== taskId);
    setTableData(newData);
    if (user) set(ref(database, `Events/${user.uid}/${id}/task`), newData);
  };

  const startEditNote = (note) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditMode(true);
    setEditNoteId(note.id);
    setCurrentNoteName(String(note.name || ''));
    setCurrentNote(String(note.content || ''));
  };

  const resetNoteForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditNoteId(null);
    setCurrentNote('');
    setCurrentNoteName('');
    setIsEditMode(false);
  };

  const saveNote = () => {
    if (!user || !id) return;
    if (!currentNote.trim()) return;

    const notePayload = {
      name: (currentNoteName || 'פתק כללי').trim(),
      content: currentNote.trim(),
      lastUpdated: new Date().toLocaleString('he-IL'),
    };

    if (isEditMode && editNoteId) {
      set(ref(database, `Events/${user.uid}/${id}/notes/${editNoteId}`), notePayload).then(resetNoteForm);
    } else {
      push(ref(database, `Events/${user.uid}/${id}/notes`), notePayload).then(resetNoteForm);
    }
  };

  const deleteNote = (noteId) => {
    if (!user || !id) return;
    remove(ref(database, `Events/${user.uid}/${id}/notes/${noteId}`));
  };

  // ===== UI =====
  const BigHeader = () => {
    const total = tableData.length;
    const done = tableData.filter((t) => t.checked).length;
    const progress = total > 0 ? done / total : 0;

    return (
      <View
        style={[
          styles.bigHeaderContainer,
          {
            backgroundColor: colors.headerBg,
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : insets.top,
            borderBottomColor: colors.accent,
            shadowColor: colors.accent,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.iconBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.iconBtnText, { color: colors.text }]}>חזור ←</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerTitleMain, { color: colors.text }]} numberOfLines={1}>
            תכנון האירוע שלך
          </Text>

          <View style={styles.headerSide} />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statGlassItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{total}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>משימות</Text>
          </View>

          <View style={[styles.statGlassItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{done}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>הושלמו</Text>
          </View>

          <View style={[styles.statGlassItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{Math.round(progress * 100)}%</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>התקדמות</Text>
          </View>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(2,6,23,0.06)', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              selectedTab === 'table' && { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSelectedTab('table');
            }}
          >
            <Text style={[styles.tabText, { color: colors.subText }, selectedTab === 'table' && { color: colors.accent }]}>
              צ'ק ליסט
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              selectedTab === 'notes' && { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSelectedTab('notes');
            }}
          >
            <Text style={[styles.tabText, { color: colors.subText }, selectedTab === 'notes' && { color: colors.accent }]}>
              פתקים
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTaskItem = ({ item, index }) => (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowColor: colors.shadow,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.checkboxContainer,
          { borderColor: colors.border, backgroundColor: colors.bg },
          item.checked && { backgroundColor: colors.success, borderColor: colors.success },
        ]}
        onPress={() => handleCheckBoxChange(index)}
        activeOpacity={0.75}
      >
        {item.checked && <Text style={styles.checkIcon}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.taskText,
            { color: colors.text },
            item.checked && { textDecorationLine: 'line-through', color: colors.subText, opacity: 0.75 },
          ]}
          numberOfLines={2}
        >
          {item.text}
        </Text>
      </View>

      {item.custom && (
        <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.deleteBtn} activeOpacity={0.7}>
          <Text style={{ fontSize: 16, color: colors.subText }}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBg}
        translucent={false}
      />

      <BigHeader />

      <View style={styles.contentArea}>
        {selectedTab === 'table' ? (
          <>
            <FlatList
              data={tableData}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.narrowList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<View style={{ height: 110 }} />}
            />

            <TouchableOpacity
              style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.fabText}>＋</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.notesContainer}>
            <View style={[styles.noteEditor, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.inputTitle, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
                placeholder="כותרת הפתק"
                placeholderTextColor={colors.subText}
                value={currentNoteName}
                onChangeText={setCurrentNoteName}
              />

              <TextInput
                style={[styles.inputBody, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
                placeholder="הקלד כאן..."
                placeholderTextColor={colors.subText}
                value={currentNote}
                onChangeText={setCurrentNote}
                multiline
              />

              <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                {isEditMode && (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={resetNoteForm}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: colors.subText, fontWeight: '800' }}>ביטול עריכה</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.saveNoteBtn, { backgroundColor: colors.accent }]} onPress={saveNote} activeOpacity={0.85}>
                  <Text style={styles.saveNoteText}>{isEditMode ? 'עדכן' : 'שמור'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={notes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.narrowList}
              renderItem={({ item }) => (
                <View style={[styles.noteCard, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: colors.border }]}>
                  <View style={styles.noteHeaderRow}>
                    <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <View style={styles.noteActions}>
                      <TouchableOpacity onPress={() => startEditNote(item)} activeOpacity={0.8}>
                        <Text style={{ color: colors.accent, marginHorizontal: 6, fontWeight: '800' }}>ערוך</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteNote(item.id)} activeOpacity={0.8}>
                        <Text style={{ color: colors.danger, marginHorizontal: 6, fontWeight: '800' }}>מחק</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.noteBody, { color: colors.subText }]}>{item.content}</Text>
                  <Text style={[styles.noteDate, { color: colors.subText }]}>{item.lastUpdated}</Text>
                </View>
              )}
            />
          </View>
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>משימה חדשה 🚀</Text>

            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
              placeholder="מה צריך לעשות?"
              placeholderTextColor={colors.subText}
              value={newTask}
              onChangeText={setNewTask}
              autoFocus
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCancel} activeOpacity={0.85}>
                <Text style={{ color: colors.subText, fontWeight: '800' }}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={addTask} style={[styles.modalAdd, { backgroundColor: colors.accent }]} activeOpacity={0.85}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>הוסף לרשימה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// --- Initial Data ---
const getInitialTasks = () => ([
  { id: 1, text: 'האם סגרתם אולם אירועים?', checked: false },
  { id: 2, text: 'האם סגרתם גן אירועים?', checked: false },
  { id: 3, text: 'האם סגרתם צלם לאירוע?', checked: false },
  { id: 4, text: 'האם סגרתם צלם וידאו?', checked: false },
  { id: 5, text: 'האם סגרתם DJ לאירוע?', checked: false },
  { id: 6, text: 'האם סגרתם להקה חיה?', checked: false },
  { id: 7, text: 'האם סגרתם קייטרינג?', checked: false },
  { id: 8, text: 'האם סגרתם עיצוב שולחנות?', checked: false },
  { id: 9, text: 'האם סגרתם סידורי פרחים?', checked: false },
  { id: 10, text: 'האם סגרתם הסעות לאורחים?', checked: false },
  { id: 11, text: 'האם סגרתם שמלת כלה?', checked: false },
  { id: 12, text: 'האם סגרתם חליפת חתן?', checked: false },
  { id: 13, text: 'האם סגרתם תכשיטים לכלה?', checked: false },
  { id: 14, text: 'האם סגרתם חופה?', checked: false },
  { id: 15, text: 'האם סגרתם בר שתייה?', checked: false },
  { id: 16, text: 'האם סגרתם תא צילום?', checked: false },
  { id: 17, text: 'האם סגרתם בלונים מעוצבים?', checked: false },
  { id: 18, text: 'האם סגרתם קונפטי לאירוע?', checked: false },
  { id: 19, text: 'האם סגרתם מופע זיקוקים?', checked: false },
  { id: 20, text: 'האם סגרתם מפל שוקולד?', checked: false },
  { id: 21, text: 'האם סגרתם שירותי ניקיון?', checked: false },
  { id: 22, text: 'האם סגרתם שירותי אבטחה?', checked: false },
  { id: 23, text: 'האם סגרתם רקדנים מקצועיים?', checked: false },
  { id: 24, text: 'האם סגרתם מתופפים ושופרות?', checked: false },
  { id: 25, text: 'האם סגרתם מאפרת מקצועית?', checked: false },
  { id: 26, text: 'האם סגרתם מעצב שיער?', checked: false },
  { id: 27, text: 'האם סגרתם פינת יצירה לילדים?', checked: false },
  { id: 28, text: 'האם סגרתם בר קפה?', checked: false },
  { id: 29, text: 'האם סגרתם שולחן קינוחים?', checked: false },
  { id: 30, text: 'האם סגרתם עמדת שייקים?', checked: false },
  { id: 31, text: 'האם סגרתם בר קוקטיילים?', checked: false },
  { id: 32, text: 'האם סגרתם קרפ צרפתי?', checked: false },
  { id: 33, text: 'האם סגרתם דוכן גלידה?', checked: false },
  { id: 34, text: 'האם סגרתם מופע קסמים?', checked: false },
  { id: 35, text: 'האם סגרתם עיצוב חופה?', checked: false },
  { id: 36, text: 'האם סגרתם צלם מגנטים?', checked: false },
  { id: 37, text: 'האם סגרתם שירותי חניה?', checked: false },
  { id: 38, text: 'האם סגרתם פינת טעימות?', checked: false },
  { id: 39, text: 'האם סגרתם מנהל אירוע?', checked: false },
  { id: 40, text: 'האם סגרתם עיצוב כניסה לאולם?', checked: false },
  { id: 41, text: 'האם סגרתם צלם סטילס?', checked: false },
  { id: 42, text: 'האם סגרתם תאורת במה?', checked: false },
  { id: 43, text: 'האם סגרתם מערכת הגברה?', checked: false },
  { id: 44, text: 'האם סגרתם מפיק אירועים?', checked: false },
  { id: 45, text: 'האם סגרתם להקת נגנים?', checked: false },
  { id: 46, text: 'האם סגרתם מופע אומנותי?', checked: false },
  { id: 47, text: 'האם סגרתם קריינות לאירוע?', checked: false },
  { id: 48, text: 'האם סגרתם מתנות לאורחים?', checked: false },
  { id: 49, text: 'האם סגרתם פינת צילום עם אביזרים?', checked: false },
  { id: 50, text: 'האם סגרתם פינת צילום 360?', checked: false },
  { id: 51, text: 'האם סגרתם עיצוב כיסאות?', checked: false },
  { id: 52, text: 'האם סגרתם שף פרטי?', checked: false },
  { id: 53, text: 'האם סגרתם מופע לייזרים?', checked: false },
  { id: 54, text: 'האם סגרתם רכב חתונה?', checked: false },
  { id: 55, text: 'האם סגרתם תפאורה לחינה?', checked: false },
  { id: 56, text: 'האם סגרתם תלבושות לחינה?', checked: false },
  { id: 57, text: 'האם סגרתם תכשיטים לחינה?', checked: false },
  { id: 58, text: 'האם סגרתם מאפרת לחינה?', checked: false },
  { id: 59, text: 'האם סגרתם צלם לחינה?', checked: false },
  { id: 60, text: 'האם סגרתם הזמנות דיגיטליות?', checked: false },
  { id: 61, text: 'האם סגרתם חבילת צילום לחתונה?', checked: false },
  { id: 62, text: 'האם סגרתם חבילת צילום לחינה?', checked: false },
  { id: 63, text: 'האם סגרתם אולם קטן לאירוע משפחתי?', checked: false },
  { id: 64, text: 'האם סגרתם הפקת חינה?', checked: false },
  { id: 65, text: 'האם סגרתם תפאורה לאירוע?', checked: false },
]);

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },

  bigHeaderContainer: {
    width: '100%',
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 3,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    alignItems: 'center',
    zIndex: 10,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
    width: '100%',
  },
  headerSide: {
    width: 96,
    alignItems: 'flex-start',
  },
  iconBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },

  headerTitleMain: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
    gap: 12,
  },
  statGlassItem: {
    borderRadius: 16,
    width: 92,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  tabContainer: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    width: '70%',
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontWeight: '900',
    fontSize: 13,
  },

  contentArea: { flex: 1, marginTop: 14 },
  narrowList: { paddingHorizontal: 16, paddingBottom: 110, maxWidth: 620, alignSelf: 'center', width: '100%' },

  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
  },
  checkboxContainer: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  checkIcon: { color: '#fff', fontSize: 14, fontWeight: '900' },
  textContainer: { flex: 1 },
  taskText: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  deleteBtn: { padding: 6, marginRight: 2 },

  fab: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  fabText: { color: '#fff', fontSize: 34, marginTop: -4, fontWeight: '900' },

  notesContainer: { flex: 1 },
  noteEditor: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1,
    maxWidth: 620,
    alignSelf: 'center',
    width: '100%',
  },
  inputTitle: {
    borderRadius: 12,
    padding: 12,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 10,
    borderWidth: 1,
  },
  inputBody: {
    borderRadius: 12,
    padding: 12,
    textAlign: 'right',
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: 12,
    borderWidth: 1,
  },
  saveNoteBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  saveNoteText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  noteCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
  },
  noteHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
    gap: 10,
  },
  noteTitle: { fontSize: 16, fontWeight: '900', flex: 1, textAlign: 'right' },
  noteBody: { fontSize: 14, textAlign: 'right', marginBottom: 10, lineHeight: 22, fontWeight: '600' },
  noteDate: { fontSize: 12, textAlign: 'left', fontWeight: '700' },
  noteActions: { flexDirection: 'row' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    elevation: 14,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 14, textAlign: 'center' },
  modalInput: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 16,
    borderWidth: 1,
  },
  modalBtns: {
    flexDirection: 'row-reverse',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalCancel: { padding: 10 },
  modalAdd: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
});

export default Task;
