import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Image, ImageBackground, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const RSVPsfour = (props) => {
  const insets = useSafeAreaInsets();
  const database = getDatabase();
  const user = firebase.auth().currentUser;
  const id = props.route.params.id;

  const [isSaved, setIsSaved] = useState(false);
  const [eventDetails, setEventDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  // ✨ טקסט ברירת מחדל והוספת משפט "במידה והקישור לא נלחץ..."
  const [message, setMessage] = useState('');
  const [messageReset, setmessageReset] = useState('');
  const confirmationText =
    "לאישור הגעה נא להיכנס לקישור שמופיע. במידה והקישור לא נלחץ, אנא הוסיפו אותנו כאיש קשר.";

  // תמונת ההזמנה + הנתיב למחיקה בטוחה
  const [invitationImageUrl, setInvitationImageUrl] = useState(null);
  const [invitationImagePath, setInvitationImagePath] = useState(null);

  useEffect(() => {
    if (user) {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/`);
      const unsubscribe = onValue(databaseRef, (snapshot) => {
        const fetchedData = snapshot.val();
        if (fetchedData) {
          setEventDetails(fetchedData);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    }
  }, [user, id]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (!loading && isInitialLoad && eventDetails.secondOwnerName && eventDetails.firstOwnerName) {
      const def =
`משפחה וחברים יקרים, אנו שמחים להזמינכם לחגוג עימנו את החתונה של ${eventDetails.secondOwnerName || 'שם החתן'} ו${eventDetails.firstOwnerName || 'שם הכלה'} שתיערך בתאריך ${eventDetails.eventDate || 'תאריך החתונה'} ב${eventDetails.eventLocation || 'מיקום האירוע'}${eventDetails.Address ? `, בכתובת ${eventDetails.Address}` : ''}. קבלת פנים בשעה ${eventDetails.eventTime || 'שעת האירוע'}.

*👇* ‏נשלח באמצעות EasyVent אישורי הגעה. ${confirmationText}`;
      setMessage(def);
      setIsInitialLoad(false);
    }
  }, [loading, eventDetails, isInitialLoad]);

  // העלאת תמונה
  const uploadImage = async () => {
    try {
      setIsUploading(true);
      progress.setValue(0);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const storage = getStorage();
      const folderPath = `users/${user.uid}/${id}/invitation/`;
      const listRef = storageRef(storage, folderPath);

      // מחיקת קבצים קיימים בתיקיה
      const files = await listAll(listRef);
      if (files.items.length > 0) {
        for (const fileRef of files.items) {
          await deleteObject(fileRef);
        }
      }

      // העלאת התמונה החדשה
      const storageReference = storageRef(storage, `${folderPath}${Date.now()}.jpg`);
      const response = await fetch(uri);
      if (!response.ok) throw new Error('Failed to fetch image data.');
      const blob = await response.blob();

      Animated.timing(progress, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      await uploadBytes(storageReference, blob);

      // קבלת URL ו־path למחיקה עתידית
      const downloadURL = await getDownloadURL(storageReference);
      setUploadedImageUrl(downloadURL);
      setInvitationImageUrl(downloadURL);
      setInvitationImagePath(storageReference.fullPath);

      const imageUrlss = ref(database, `Events/${user.uid}/${id}/imageUrl/`);
      await set(imageUrlss, downloadURL);

      Alert.alert('הצלחה', 'התמונה הועלתה בהצלחה!');
      setModalVisible(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('שגיאה', 'שגיאה בהעלאת התמונה.');
    } finally {
      setIsUploading(false);
      progress.setValue(0);
    }
  };

  const deleteImage = async () => {
    try {
      if (!invitationImagePath) {
        Alert.alert('אין תמונה למחיקה.');
        return;
      }
      const storage = getStorage();
      await deleteObject(storageRef(storage, invitationImagePath));
      setUploadedImageUrl(null);
      setInvitationImageUrl(null);
      setInvitationImagePath(null);
      Alert.alert('הצלחה', 'התמונה נמחקה בהצלחה!');
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('שגיאה', 'שגיאה במחיקת התמונה.');
    }
  };

  // טעינת תמונה קיימת (URL + path)
  useEffect(() => {
    const fetchInvitationImage = async () => {
      try {
        const storage = getStorage();
        const folderPath = `users/${user.uid}/${id}/invitation/`;
        const listRef = storageRef(storage, folderPath);
        const files = await listAll(listRef);

        if (files.items.length > 0) {
          const first = files.items[0];
          const imageUrl = await getDownloadURL(first);
          setInvitationImageUrl(imageUrl);
          setInvitationImagePath(first.fullPath);
        } else {
          setInvitationImageUrl(null);
          setInvitationImagePath(null);
        }
      } catch (error) {
        if (error.code === 'storage/object-not-found') {
          setInvitationImageUrl(null);
          setInvitationImagePath(null);
        } else {
          console.error('Error fetching invitation image:', error);
        }
      }
    };
    if (user && id) fetchInvitationImage();
  }, [user, id, uploadedImageUrl]);

  // הודעת Reset ברירת־מחדל
  useEffect(() => {
    if (eventDetails && !isSaved) {
      setmessageReset(
`משפחה וחברים יקרים, אנו שמחים להזמינכם לחגוג עימנו את החתונה של ${eventDetails.secondOwnerName || 'שם החתן'} ו${eventDetails.firstOwnerName || 'שם הכלה'} שתיערך בתאריך ${eventDetails.eventDate || 'תאריך החתונה'} ב${eventDetails.eventLocation || 'מיקום האירוע'}${eventDetails.Address ? `, בכתובת ${eventDetails.Address}` : ''}. קבלת פנים בשעה ${eventDetails.eventTime || 'שעת האירוע'}.

*👇* ‏נשלח באמצעות EasyVent אישורי הגעה. ${confirmationText}`
      );
    }
  }, [eventDetails, isSaved]);

  // טקסט לתצוגה מקדימה – דואג שהמשפט יופיע תמיד בתצוגה
  const combinedText = message.includes(confirmationText)
    ? message
    : `${message}\n${confirmationText}`;

  // שמירה לפיירבייס (תמיד כולל המשפט)
  const handleSave = async () => {
    if (!user) return;
    try {
      const toSave = message.includes(confirmationText)
        ? message
        : `${message}\n${confirmationText}`;
      await set(ref(database, `Events/${user.uid}/${id}/message`), toSave);
      setMessage(toSave);
      setIsSaved(true);
      Alert.alert('הצלחה', 'ההודעה נשמרה בהצלחה!');
    } catch (error) {
      console.error("Error saving message to Firebase ", error);
      Alert.alert('שגיאה', 'שגיאה בשמירת ההודעה. נסה שוב.');
    }
  };

  // קריאת הודעה שמורה
  useEffect(() => {
    if (!user) return;
    const messageRef = ref(database, `Events/${user.uid}/${id}/message`);
    const unsubscribe = onValue(messageRef, (snapshot) => {
      const savedMessage = snapshot.val();
      if (savedMessage) {
        setMessage(savedMessage);
        setIsSaved(true);
      }
    });
    return () => unsubscribe();
  }, [user, id]);

  const handleReset = () => {
    setMessage(messageReset);
    setIsSaved(false);
  };

  const handleNext = () => {
    if (!isSaved) {
      Alert.alert('שימו לב', 'נא לשמור את ההודעה לפני המעבר!');
    } else if (!invitationImageUrl) {
      setModalVisible(true);
    } else {
      props.navigation.navigate('RSVPsfive', { id });
    }
  };

  return (
    <ImageBackground
      source={require('../assets/back3web.png')}
      style={styles.backgroundImage}
      imageStyle={styles.bgImage}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => props.navigation.navigate('RSVPsthree', { id })}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>אישורי הגעה</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}>
        {loading ? (
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        ) : (
          <>
            <Text style={styles.text1}>
              לפניך מוצגת ההודעה כפי שתופיע למוזמנים, ניתן לערוך אותה בהתאמה אישית
            </Text>

            <ScrollView contentContainerStyle={styles.container2}>
              <ImageBackground
                source={require('../assets/whatsup_resized_smaller.png')}
                style={styles.box}
              >
                {/* תיבה להצגת התמונה */}
                {invitationImageUrl && (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: invitationImageUrl }} style={styles.invitationImage} />
                  </View>
                )}

                {/* תיבה להצגת ההודעה */}
                <View style={styles.textContainer}>
                  <Text style={styles.previewText}>{combinedText}</Text>
                  <Text style={styles.timeText}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </ImageBackground>

              <View style={{ position: 'relative', width: '100%' }}>
                <TextInput
                  style={styles.textInput}
                  value={message}
                  onChangeText={(text) => {
                    if (text.length <= 400) setMessage(text);
                  }}
                  placeholder="ערוך את ההודעה כאן"
                  multiline
                />
                <Text style={styles.charCounter}>{`${message.length}/400`}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>שמור</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resetButton, message.length === 249 && styles.disabledButton]}
                  onPress={handleReset}
                  disabled={message.length === 249}
                >
                  <Text style={styles.saveButtonText}>איפוס</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resetButton, !invitationImageUrl && styles.disabledButton]}
                  onPress={deleteImage}
                  disabled={!invitationImageUrl}
                >
                  <Text style={styles.saveButtonText}>מחק תמונה</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.uploadButton, isUploading && { backgroundColor: '#d3d3d3' }]}
                onPress={!isUploading ? uploadImage : null}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Animated.View
                    style={[
                      styles.progressBarInside,
                      { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                    ]}
                  />
                ) : (
                  <Text style={styles.uploadButtonText}>העלה תמונה</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextButton, { opacity: isSaved ? 1 : 0.5 }]}
                onPress={handleNext}
                disabled={!isSaved}
              >
                <Text style={styles.nextButtonText}>הבא</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalText}>לא העלת הזמנה, האם ברצונך להמשיך מבלי להעלות הזמנה?</Text>
              <View className="modalButtons" style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => {
                    setModalVisible(false);
                    props.navigation.navigate('RSVPsfive', { id });
                  }}
                >
                  <Text style={styles.skipButtonText}>המשך בכל זאת</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton2} onPress={uploadImage}>
                  <Text style={styles.uploadButtonText}>העלה תמונה</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>סגור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    minHeight: '100vh',
    resizeMode: 'cover',
    justifyContent: 'flex-start',
  },
  bgImage: {
    resizeMode: 'cover',
    transform: [{ scale: 1.15 }],
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: { position: 'absolute', left: 20, bottom: 20 },
  backButtonText: { fontSize: 29, color: 'white' },
  title: { fontSize: 20, color: 'white', fontWeight: 'bold', marginBottom: 10 },
  text1: {
    fontSize: 16,
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 70,
  },
  box: {
    padding: 20,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    resizeMode: 'cover',
    width: 350,
    height: 800,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'black',
    marginTop: -170,
  },
  container2: {
    width: 350,
    height: 1330,
    justifyContent: 'center',
    alignItems: 'center',
    resizeMode: 'cover',
  },
  previewText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    maxWidth: '80%',
    position: 'relative',
    left: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    position: 'absolute',
    bottom: 10,
    left: 80,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    paddingBottom: 30,
    width: '100%',
    marginBottom: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    textAlign: 'right',
    minHeight: 100,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    width: '32%',
  },
  resetButton: {
    backgroundColor: '#808080',
    padding: 10,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    width: '32%',
  },
  disabledButton: { backgroundColor: '#d3d3d3' },
  nextButton: {
    marginTop: 35,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 350,
    height: 40,
    elevation: 5,
  },
  nextButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  charCounter: {
    fontSize: 12,
    color: '#555',
    position: 'absolute',
    bottom: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 5,
  },
  loadingText: { fontSize: 16, color: '#555', textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: 'white', borderRadius: 15, padding: 20, alignItems: 'center' },
  modalText: { fontSize: 18, color: 'black', textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  modalButtons: { flexDirection: 'column', width: '100%', alignItems: 'center', marginTop: 15 },
  closeButton: {
    backgroundColor: '#ff4d4d',
    padding: 15,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    marginBottom: 10,
  },
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  skipButton: { backgroundColor: '#000', padding: 15, borderRadius: 10, width: '90%', alignItems: 'center', marginBottom: 10 },
  skipButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  uploadButton2: { backgroundColor: '#6c63ff', padding: 15, borderRadius: 10, marginBottom: 10, width: '90%', alignItems: 'center' },
  uploadButton: {
    backgroundColor: '#000',
    height: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginVertical: 10,
    alignSelf: 'center',
  },
  uploadButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', zIndex: 1 },
  progressBarInside: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'green', zIndex: 0 },
  invitationImage: { width: 180, height: 270, resizeMode: 'contain', borderRadius: 5, marginBottom: 10 },
  imageContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: -30,
    borderRadius: 10,
    marginTop: 70,
  },
  textContainer: { width: '90%', alignItems: 'flex-end' },
});

export default RSVPsfour;
