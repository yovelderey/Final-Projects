// Document.js (Delete Confirmation MODAL)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Platform,
  LayoutAnimation,
  UIManager,
  useColorScheme,
  ActivityIndicator
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { auth, database, storage } from '../firebase';
import { ref, set, onValue, get, remove } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ref as storageRef,
  listAll,
  getDownloadURL,
  uploadBytesResumable,
  deleteObject,
} from 'firebase/storage';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_FILES = 10;

// Helper: Format Bytes
function bytesToHuman(bytes) {
  const b = Number(bytes || 0);
  if (!b) return '0 KB';
  const kb = b / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

// Helper: Format Date
const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

// Fallback: try extract filename from URL (only if no storagePath)
function extractFileNameFromDownloadUrl(url) {
  try {
    const decoded = decodeURIComponent(url);
    const marker = '/images/';
    const i = decoded.lastIndexOf(marker);
    if (i === -1) return null;
    const start = i + marker.length;
    const q = decoded.indexOf('?', start);
    const end = q === -1 ? decoded.length : q;
    const name = decoded.substring(start, end);
    return name || null;
  } catch {
    return null;
  }
}

const Document = (props) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const id = props.route.params.id; // eventId

  // ===== Theme Engine =====
  const systemScheme = useColorScheme();
  const [dbMode, setDbMode] = useState('auto');

  const isDark = useMemo(() => {
    if (dbMode === 'dark') return true;
    if (dbMode === 'light') return false;
    return systemScheme === 'dark';
  }, [dbMode, systemScheme]);

  const C = useMemo(() => ({
    bg: isDark ? '#0F172A' : '#F8FAFC',
    header: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    subText: isDark ? '#94A3B8' : '#64748B',
    card: isDark ? '#1E293B' : '#FFFFFF',
    border: isDark ? '#334155' : '#E2E8F0',
    primary: isDark ? '#6366F1' : '#4F46E5',
    danger: '#EF4444',
    soft: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    modalOverlay: 'rgba(0,0,0,0.65)',
  }), [isDark]);

  // ===== State =====
  const [userId, setUserId] = useState(null);

  const [slots, setSlots] = useState([{
    slotId: `slot_${Date.now()}_0`,
    status: 'empty',
    url: null,
    name: '',
    sizeBytes: 0,
    uploadedAt: null,
    progress: 0,
    dbKey: null,
    storagePath: null,
  }]);

  const [imageUrls, setImageUrls] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Delete Confirmation Modal
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // ===== Listeners =====
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) { setUserId(null); return; }
      setUserId(u.uid);

      const themeRef = ref(database, `Events/${u.uid}/${id}/__admin/ui/theme/mode`);
      onValue(themeRef, (snap) => {
        const val = snap.val();
        setDbMode(val || 'auto');
      });
    });
    return () => unsubAuth && unsubAuth();
  }, [id]);

  // ===== Load Data =====
  useEffect(() => {
    if (!userId) return;
    loadSavedSlots(userId);
    loadImagesFromStorage(userId);
  }, [userId]);

  const ensureTrailingEmptySlot = (arr) => {
    const validFiles = arr.filter(s => s.status === 'done');
    if (validFiles.length >= MAX_FILES) return validFiles;

    return [...validFiles, {
      slotId: `slot_${Date.now()}_new`,
      status: 'empty',
      url: null,
      name: '',
      sizeBytes: 0,
      uploadedAt: null,
      progress: 0,
      dbKey: null,
      storagePath: null,
    }];
  };

  const loadSavedSlots = async (uid) => {
    try {
      const snap = await get(ref(database, `users/${uid}/${id}/documents`));
      const data = snap.val() || {};

      let loadedSlots = [];
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (!item) return;

        loadedSlots.push({
          slotId: item.slotId || `loaded_${key}`,
          status: item.url ? 'done' : 'empty',
          url: item.url || null,
          name: item.name || '',
          sizeBytes: item.sizeBytes || 0,
          uploadedAt: item.uploadedAt || null,
          progress: 1,
          dbKey: key,
          storagePath: item.storagePath || null,
        });
      });

      loadedSlots.sort((a, b) => (a.uploadedAt || 0) - (b.uploadedAt || 0));
      setSlots(ensureTrailingEmptySlot(loadedSlots));
    } catch (e) {
      console.log('Error loading slots', e);
    }
  };

  const loadImagesFromStorage = async (uid) => {
    try {
      const listRef = storageRef(storage, `users/${uid}/${id}/images`);
      const res = await listAll(listRef);
      const urls = await Promise.all(res.items.map((item) => getDownloadURL(item)));
      setImageUrls(urls);
    } catch (e) {
      setImageUrls([]);
    }
  };

  // ===== Upload =====
  const handlePickImage = async (index) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (res.canceled) return;

      const asset = res.assets[0];
      const fileName = asset.fileName || `doc_${Date.now()}.jpg`;
      const fileSize = asset.fileSize || 0;

      uploadFile(asset.uri, fileName, fileSize, index);
    } catch {
      // no alert spam
    }
  };

  const uploadFile = async (uri, name, size, index) => {
    if (!userId) return;

    setSlots(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: 'uploading', name, sizeBytes: size, progress: 0.1 };
      return copy;
    });

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storagePath = `users/${userId}/${id}/images/${name}`;
      const sRef = storageRef(storage, storagePath);
      const task = uploadBytesResumable(sRef, blob);

      task.on('state_changed',
        (snap) => {
          const p = snap.bytesTransferred / snap.totalBytes;
          setSlots(prev => {
            const copy = [...prev];
            if (copy[index]) copy[index] = { ...copy[index], progress: p };
            return copy;
          });
        },
        () => {
          setSlots(prev => {
            const copy = [...prev];
            copy[index] = {
              slotId: `slot_${Date.now()}_empty`,
              status: 'empty',
              url: null,
              name: '',
              sizeBytes: 0,
              uploadedAt: null,
              progress: 0,
              dbKey: null,
              storagePath: null,
            };
            return ensureTrailingEmptySlot(copy);
          });
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          const now = Date.now();

          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

          const dbKey = index.toString();
          const newSlot = {
            slotId: `doc_${index}`,
            status: 'done',
            url,
            name,
            sizeBytes: size || blob.size,
            uploadedAt: now,
            progress: 1,
            dbKey,
            storagePath,
          };

          setSlots(prev => {
            const copy = [...prev];
            copy[index] = newSlot;
            return ensureTrailingEmptySlot(copy);
          });

          await set(ref(database, `users/${userId}/${id}/documents/${dbKey}`), {
            slotId: `doc_${index}`,
            url,
            name,
            sizeBytes: size || blob.size,
            uploadedAt: now,
            storagePath,
          });

          loadImagesFromStorage(userId);
        }
      );
    } catch {
      // ignore
    }
  };

  // ===== Delete (Modal flow) =====
  const askDelete = (index) => {
    setDeleteIndex(index);
    setConfirmDeleteVisible(true);
  };

  const doDelete = async () => {
    if (deleteIndex === null || deleteIndex === undefined) {
      setConfirmDeleteVisible(false);
      return;
    }

    try {
      if (!userId) return;

      setDeleteBusy(true);
      const slot = slots[deleteIndex];
      if (!slot) {
        setConfirmDeleteVisible(false);
        setDeleteBusy(false);
        return;
      }

      const dbKey = slot.dbKey || deleteIndex.toString();

      // optimistic UI
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSlots(prev => {
        const copy = [...prev];
        copy[deleteIndex] = {
          slotId: `slot_${Date.now()}_empty`,
          status: 'empty',
          url: null,
          name: '',
          sizeBytes: 0,
          uploadedAt: null,
          progress: 0,
          dbKey: null,
          storagePath: null,
        };
        return ensureTrailingEmptySlot(copy);
      });

      // 1) delete from DB
      await remove(ref(database, `users/${userId}/${id}/documents/${dbKey}`));

      // 2) delete from Storage by storagePath
      let path = slot.storagePath;
      if (!path && slot.url) {
        const fileName = extractFileNameFromDownloadUrl(slot.url);
        if (fileName) path = `users/${userId}/${id}/images/${fileName}`;
      }

      if (path) {
        const fileRef = storageRef(storage, path);
        await deleteObject(fileRef);
      }

      await loadSavedSlots(userId);
      await loadImagesFromStorage(userId);

      setConfirmDeleteVisible(false);
      setDeleteIndex(null);
    } catch (e) {
      console.log('DELETE ERROR:', e);
      try { await loadSavedSlots(userId); } catch {}
      try { await loadImagesFromStorage(userId); } catch {}
      setConfirmDeleteVisible(false);
      setDeleteIndex(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleDownload = async (url) => {
    if (!url) return;

    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      const fileUri = FileSystem.documentDirectory + `file_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch { }
  };

  // ===== UI =====
  const renderSlot = (slot, index) => {
    const isDone = slot.status === 'done';
    const isUploading = slot.status === 'uploading';

    return (
      <View key={slot.slotId || index} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardIndex, { color: C.subText }]}>#{index + 1}</Text>

          {(isDone || slot.dbKey) && (
            <TouchableOpacity
              onPress={() => askDelete(index)}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 16, color: C.danger }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>

        {isDone ? (
          <View style={styles.doneContent}>
            <TouchableOpacity onPress={() => { setCurrentImage(slot.url); setModalVisible(true); }} style={styles.imageWrap}>
              <Image source={{ uri: slot.url }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.zoomOverlay}><Text style={{ fontSize: 20 }}>🔍</Text></View>
            </TouchableOpacity>

            <View style={[styles.metaFooter, { backgroundColor: C.soft }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileName, { color: C.text }]} numberOfLines={1}>{slot.name || 'קובץ'}</Text>
                <Text style={[styles.fileMeta, { color: C.subText }]}>{bytesToHuman(slot.sizeBytes)} • {formatDate(slot.uploadedAt)}</Text>
              </View>

              <TouchableOpacity onPress={() => handleDownload(slot.url)} style={[styles.actionIcon, { backgroundColor: C.card }]}>
                <Text>📥</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.emptyZone, { borderColor: isUploading ? C.primary : C.border, backgroundColor: C.soft }]}
            onPress={() => !isUploading && handlePickImage(index)}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={{ alignItems: 'center', gap: 10, width: '100%', paddingHorizontal: 20 }}>
                <ActivityIndicator color={C.primary} size="large" />
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${slot.progress * 100}%`, backgroundColor: C.primary }]} />
                </View>
                <Text style={[styles.uploadText, { color: C.primary }]}>מעלה... {Math.round(slot.progress * 100)}%</Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>☁️</Text>
                <Text style={[styles.uploadText, { color: C.text }]}>לחץ להעלאת מסמך / תמונה</Text>
                <Text style={[styles.uploadSub, { color: C.subText }]}>תומך JPG, PNG, PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.header} />

      <View style={[styles.header, { backgroundColor: C.header, paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.soft }]}>
            <Text style={[styles.backBtnText, { color: C.subText }]}>חזור ←</Text>
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: C.text }]}>העלאת מסמכים</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={[styles.headerSubtitle, { color: C.subText }]}>
          סה"כ קבצים: {slots.filter(s => s.status === 'done').length}/{MAX_FILES}
        </Text>
      </View>


      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.responsiveContainer, { opacity: fadeAnim }]}>
          {slots.map((slot, index) => renderSlot(slot, index))}

          {imageUrls.length > 0 && (
            <View style={styles.gallerySection}>
              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: C.text }]}>📂 גלריה ({imageUrls.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {imageUrls.map((url, i) => (
                  <TouchableOpacity key={i} onPress={() => { setCurrentImage(url); setModalVisible(true); }}>
                    <Image source={{ uri: url }} style={[styles.galleryThumb, { borderColor: C.border }]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal visible={modalVisible} transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.95)' }]}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Image source={{ uri: currentImage }} style={styles.fullImage} resizeMode="contain" />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ Delete Confirmation Modal */}
      <Modal visible={confirmDeleteVisible} transparent animationType="fade" onRequestClose={() => !deleteBusy && setConfirmDeleteVisible(false)}>
        <View style={[styles.confirmOverlay, { backgroundColor: C.modalOverlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !deleteBusy && setConfirmDeleteVisible(false)}
          />
          <View style={[styles.confirmCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.confirmTitle, { color: C.text }]}>האם אתה בטוח?</Text>
            <Text style={[styles.confirmDesc, { color: C.subText }]}>
              הפעולה תמחק את הקובץ מהמערכת (וגם מה־Storage).
            </Text>

            <View style={styles.confirmRow}>
              <TouchableOpacity
                disabled={deleteBusy}
                onPress={() => setConfirmDeleteVisible(false)}
                style={[styles.confirmBtn, { backgroundColor: C.soft, borderColor: C.border }]}
              >
                <Text style={[styles.confirmBtnText, { color: C.text }]}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={doDelete}
                disabled={deleteBusy}
                style={[styles.confirmBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
              >
                {deleteBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: '#fff' }]}>מחק</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { textAlign: 'center', marginTop: 5, fontSize: 13, fontWeight: '600' },

  scrollContent: { padding: 20, paddingBottom: 120 },
  responsiveContainer: { width: '100%', maxWidth: 600, alignSelf: 'center' },

  card: { borderRadius: 16, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 0 },
  cardIndex: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  deleteBtn: { padding: 6 },

  emptyZone: { margin: 12, height: 140, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontSize: 16, fontWeight: '700' },
  uploadSub: { fontSize: 12, marginTop: 4 },

  progressBarBg: { width: '100%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%' },

  doneContent: { padding: 12 },
  imageWrap: { height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  zoomOverlay: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 6 },

  metaFooter: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10 },
  fileName: { fontSize: 14, fontWeight: '700', textAlign: 'left' },
  fileMeta: { fontSize: 12, marginTop: 2, textAlign: 'left' },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  gallerySection: { marginTop: 20 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 20, width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, textAlign: 'right' },
  galleryThumb: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, backgroundColor: '#eee' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalCloseArea: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  modalContent: { width: '90%', height: '80%', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%', borderRadius: 8 },
  closeBtn: { marginTop: 20, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  closeBtnText: { color: '#000', fontWeight: 'bold' },

  // ✅ Confirm Delete Modal
  confirmOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  confirmCard: { width: '100%', maxWidth: 420, borderRadius: 18, borderWidth: 1, padding: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '900', textAlign: 'right' },
  confirmDesc: { marginTop: 8, fontSize: 13, lineHeight: 18, textAlign: 'right' },
  confirmRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '800' },
    backBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  backBtnText: { fontSize: 14, fontWeight: 'bold' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
});

export default Document;
