import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Image,ImageBackground, TouchableOpacity, StyleSheet,Alert, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { Animated } from 'react-native';

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
  const [tempMessage, setTempMessage] = useState(message);
  const user = firebase.auth().currentUser;
  const id = props.route.params.id; // Accessing the passed id
  const [isSaved, setIsSaved] = useState(false);
  const [eventDetails, setEventDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const fixedText = "לאישור הגעה נא להיכנס לקישור שמופיע:";
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
      setMessage(
`משפחה וחברים יקרים, אנו שמחים להזמינכם לחגוג עימנו את החתונה של ${eventDetails.secondOwnerName || 'שם החתן'} ו${eventDetails.firstOwnerName || 'שם הכלה'} שתיערך בתאריך ${eventDetails.eventDate || 'תאריך החתונה'} ב${eventDetails.eventLocation || 'מיקום האירוע'}${eventDetails.Address ? `, בכתובת ${eventDetails.Address}` : ''}. קבלת פנים בשעה ${eventDetails.eventTime || 'שעת האירוע'}.

*👇* ‏נשלח באמצעות EasyVent אישורי הגעה. לאישור הגעה נא להיכנס לקישור שמופיע:`      );
      setIsInitialLoad(false); // סמן שהטעינה הראשונית הסתיימה
    }
  }, [loading, eventDetails, isInitialLoad]);
  
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

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      const storage = getStorage();
      const folderPath = `users/${user.uid}/${id}/invitation/`;
      const listRef = storageRef(storage, folderPath);

      // מחיקת תמונה קיימת
      const files = await listAll(listRef);
      if (files.items.length > 0) {
        for (const fileRef of files.items) {
          await deleteObject(fileRef);
        }
      }

      // העלאת התמונה החדשה
      const storageReference = storageRef(storage, `${folderPath}${Date.now()}.jpg`);
      const response = await fetch(uri);

      if (!response.ok) {
        throw new Error('Failed to fetch image data.');
      }

      const blob = await response.blob();
      
      Animated.timing(progress, {
        toValue: 1, // קביעת ערך סופי של 1
        duration: 3000, // זמן האנימציה (לפי משך העלאת התמונה)
        useNativeDriver: false, // חובה ב-Animated.timing עבור width
      }).start();
      await uploadBytes(storageReference, blob);



      // קבלת URL
      const downloadURL = await getDownloadURL(storageReference);
      setUploadedImageUrl(downloadURL); // עדכון URL להצגת התמונה
      setInvitationImageUrl(downloadURL); // הצגת התמונה מיידית
      console.log('downloadURL', downloadURL);

      alert('התמונה הועלתה בהצלחה!');
      console.log("התמונה הועלתה בהצלחה!");

      const imageUrlss = ref(database, `Events/${user.uid}/${id}/imageUrl/`);
      set(imageUrlss, downloadURL);

      setModalVisible(false);
    }



  } catch (error) {
    console.error('Error uploading image:', error);
    alert('שגיאה בהעלאת התמונה.');
  } finally {
    setIsUploading(false);
    progress.setValue(0);
  }
};

const deleteImage = async () => {
  try {
    if (!invitationImageUrl) {
      alert('אין תמונה למחיקה.');
      return;
    }

    const storage = getStorage();
    const fileRef = storageRef(storage, invitationImageUrl);
    await deleteObject(fileRef);

    setUploadedImageUrl(null); // איפוס ה-URL של התמונה
    setInvitationImageUrl(null); // עדכון שאין תמונה להצגה
    alert('התמונה נמחקה בהצלחה!');
  } catch (error) {
    console.error('Error deleting image:', error);
    alert('שגיאה במחיקת התמונה.');
  }
};

  
  const [invitationImageUrl, setInvitationImageUrl] = useState(null);

  useEffect(() => {
    const fetchInvitationImage = async () => {
      try {
        const storage = getStorage();
        const folderPath = `users/${user.uid}/${id}/invitation/`;
        const listRef = storageRef(storage, folderPath);
  
        // קבלת רשימת הקבצים
        const files = await listAll(listRef);
        if (files.items.length > 0) {
          // קבלת ה-URL של התמונה הראשונה
          const imageUrl = await getDownloadURL(files.items[0]);
          setInvitationImageUrl(imageUrl); // שמירת ה-URL להצגה
        } else {
          console.log('No files found in the folder');
          setInvitationImageUrl(null); // אין תמונה להצגה
        }
      } catch (error) {
        if (error.code === 'storage/object-not-found') {
          // אם התיקיה או האובייקט לא קיימים
          console.log('Folder or file does not exist. This is expected.');
          setInvitationImageUrl(null); // אין תמונה להצגה
        } else {
          console.error('Error fetching invitation image:', error);
        }
      }
    };
  
    if (user && id) {
      fetchInvitationImage();
    }
  }, [user, id, uploadedImageUrl]); // מעדכן כאשר ה-URL משתנה
  
  
  const [messageReset, setmessageReset] = useState('');
  useEffect(() => {
    if (eventDetails && !isSaved) {
      setmessageReset(
`משפחה וחברים יקרים, אנו שמחים להזמינכם לחגוג עימנו את החתונה של ${eventDetails.secondOwnerName || 'שם החתן'} ו${eventDetails.firstOwnerName || 'שם הכלה'} שתיערך בתאריך ${eventDetails.eventDate || 'תאריך החתונה'} ב${eventDetails.eventLocation || 'מיקום האירוע'}${eventDetails.Address ? `, בכתובת ${eventDetails.Address}` : ''}. קבלת פנים בשעה ${eventDetails.eventTime || 'שעת האירוע'}.

*👇* ‏נשלח באמצעות EasyVent אישורי הגעה. לאישור הגעה נא להיכנס לקישור שמופיע::`  )}
  }, [eventDetails, isSaved]);


  const [message, setMessage] = useState('');
  useEffect(() => {
    if (eventDetails && !isSaved) {
      setMessage(
`משפחה וחברים יקרים, אנו שמחים להזמינכם לחגוג עימנו את החתונה של ${eventDetails.secondOwnerName || 'שם החתן'} ו${eventDetails.firstOwnerName || 'שם הכלה'} שתיערך בתאריך ${eventDetails.eventDate || 'תאריך החתונה'} ב${eventDetails.eventLocation || 'מיקום האירוע'}${eventDetails.Address ? `, בכתובת ${eventDetails.Address}` : ''}. קבלת פנים בשעה ${eventDetails.eventTime || 'שעת האירוע'}.

*👇* ‏נשלח באמצעות EasyVent אישורי הגעה. לאישור הגעה נא להיכנס לקישור שמופיע:`      );
    }
  }, [eventDetails, isSaved]);
  //const combinedText = `${message}`;

  const confirmationText = "לאישור הגעה נא להיכנס לקישור שמופיע:";

// בדיקה אם המחרוזת כבר קיימת בהודעה
const combinedText = message.includes(confirmationText)
  ? message
  : `${message}\n${confirmationText}`;


  const handleSave = async () => {
    if (user) {
      try {
        const databaseRef = ref(database, `Events/${user.uid}/${id}/message`);
        await set(databaseRef, message); // שמירת ההודעה בפיירבייס
        setIsSaved(true); // סימון ההודעה כ"שמורה"


        alert('ההודעה נשמרה בהצלחה!');
      } catch (error) {
        console.error("Error saving message to Firebase ", error);
        alert('שגיאה בשמירת ההודעה. נסה שוב.');
      }
    }
  };
  
  useEffect(() => {
    if (user) {
      const messageRef = ref(database, `Events/${user.uid}/${id}/message`);
      const unsubscribe = onValue(messageRef, (snapshot) => {
        const savedMessage = snapshot.val();
        if (savedMessage) {
          setMessage(savedMessage); // עדכון ההודעה עם מה שנשמר בפיירבייס
          setIsSaved(true); // סימון שההודעה נשמרה
        }
      });
  
      return () => unsubscribe(); // ניקוי מאזין הנתונים
    }
  }, [user, id]);
  
  const handleReset = () => {
    setMessage(messageReset);
    setIsSaved(false); // סימון ההודעה כ"לא שמורה"

  };
  useEffect(() => {
    if (invitationImageUrl) {
      console.log('!!!תמונה קיימת או נטענה:', invitationImageUrl);
    } else {
      console.log('אין תמונה קיימ!!ת');
    }
  }, [invitationImageUrl]);

  const handleNext = () => {
    if (!isSaved) {
      alert('נא לשמור את ההודעה לפני המעבר!');
    } else if (!invitationImageUrl) { // אם תמונה לא הועלתה, הצגת ה-Modal
      setModalVisible(true);
    } else {
      // אם תמונה כבר הועלתה, מעבר לדף הבא
      props.navigation.navigate('RSVPsfive', { id });
    }
  };
  

  
  
  return (
    <ImageBackground
      source={require('../assets/back3.png')}
      style={styles.backgroundImage}
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
      <View style={styles.container}>
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
                  <Image
                    source={{ uri: invitationImageUrl }}
                    style={styles.invitationImage}
                  />
                </View>
              )}

              {/* תיבה להצגת ההודעה */}
              <View style={styles.textContainer}>
              
                <Text style={styles.previewText}>{combinedText}</Text>
                <Text style={styles.timeText}>
                  {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </ImageBackground>

              
              <View style={{ position: 'relative', width: '100%' }}>
                <TextInput
                  style={styles.textInput}
                  value={message}
                  onChangeText={(text) => {
                    if (text.length <= 400) setMessage(text); // מגבלת תווים
                  }}
                  placeholder="ערוך את ההודעה כאן"
                  multiline
                />
                <Text style={styles.charCounter}>{`${message.length}/400`}</Text>
              </View>
  
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginTop: 10,
                }}
              >
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>שמור</Text>
                </TouchableOpacity>
                <TouchableOpacity
  style={[
    styles.resetButton,
    message.length === 249 && styles.disabledButton, // אפור אם אין תוכן
  ]}
  onPress={handleReset}
  disabled={message.length === 249} // לא פעיל אם אין תוכן
>
  <Text style={styles.saveButtonText}>איפוס</Text>
</TouchableOpacity>


                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    !invitationImageUrl && styles.disabledButton, // אפור אם אין תמונה
                  ]}
                  onPress={deleteImage}
                  disabled={!invitationImageUrl} // לא ניתן ללחוץ אם אין תמונה
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
      style={[styles.progressBarInside,{width: progress.interpolate({inputRange: [0, 1],outputRange: ['0%', '100%'],}),},
      ]}
      
    />
  ) : (
    <Text style={styles.uploadButtonText}>העלה תמונה</Text>
  )}
</TouchableOpacity>





              <TouchableOpacity

                style={[styles.nextButton, {opacity: isSaved ? 1 : 0.5 }]}
                onPress={handleNext}
                disabled={!isSaved} // מניעה לחיצה אם לא נשמר
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
      <View style={styles.modalButtons}>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            setModalVisible(false); // סגירת המודל
            props.navigation.navigate('RSVPsfive', { id }); // מעבר לדף הבא
          }}
        >
          <Text style={styles.skipButtonText}>המשך בכל זאת</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadButton2}
          onPress={uploadImage} // כפתור "העלה תמונה"
        >
          <Text style={styles.uploadButtonText}>העלה תמונה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setModalVisible(false)} // כפתור "סגור"
        >
          <Text style={styles.closeButtonText}>סגור</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


      </View>
    </ImageBackground>
  );
  
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',

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
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
  },
  backButtonText: {
    fontSize: 29,
    color: 'white',
  },
  title: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text1: {
    fontSize: 16,
    color: 'black',
    marginBottom: 20,
    marginTop: 20,
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
    height: 800, // גובה קבוע
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'black',
    marginTop: -170,
    marginBottom: 20,

  },
container2: {
    width: 350,
    height: 1330, // גובה קבוע
    justifyContent: 'center',
    alignItems: 'center',
    resizeMode: 'cover',

},

previewText: {
    fontSize: 16,
    color: '#000', // צבע טקסט שחור
    textAlign: 'right', // יישור טקסט לימין
    backgroundColor: '#fff', // רקע לבן כמו הודעה נכנסת בוואטסאפ
    padding: 10, // מרווח פנימי לטקסט
    borderRadius: 10, // פינות מעוגלות
    marginBottom: 5, // מרווח תחתון בין הודעות
    alignSelf: 'flex-end', // יישור הטקסט לצד ימין
    shadowColor: '#000', // הצללה עדינה
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1, // הצללה למכשירי אנדרואיד
    maxWidth: '80%', // מגבלת רוחב כמו בוואטסאפ
    position: 'relative',
    left: 20, // מרחק מהצד השמאלי (כי ההודעה מיושרת לימין)

  },
timeText: {
    fontSize: 12,
    color: '#999', // צבע הזמן לאפור
    position: 'absolute',
    bottom: 10, // מרחק מהתחתית
    left: 80, // מרחק מהצד השמאלי (כי ההודעה מיושרת לימין)

  },



textInput: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  padding: 10,
  paddingBottom: 30, // רווח נוסף לתחתית למניעת חפיפה
  width: '100%',
  marginBottom: 15,
  fontSize: 16,
  textAlignVertical: 'top',
  textAlign: 'right', // יישור הטקסט לימין
  minHeight: 100,
  maxHeight: 100,

  backgroundColor: '#fff',
},


  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
disabledButton: {
  backgroundColor: '#d3d3d3', // צבע אפור כשהכפתור לא פעיל
},

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
nextButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},

charCounter: {
  fontSize: 12,
  color: '#555',
  position: 'absolute',
  bottom: 5, // מיקום מעל השדה
  backgroundColor: '#fff', // רקע לבן למניעת חפיפה עם טקסט
  paddingHorizontal: 5, // רווח פנימי
},
loadingText: {
  fontSize: 16,
  color: '#555',
  textAlign: 'center',
  marginTop: 20,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContainer: {
  width: '85%',
  backgroundColor: 'white',
  borderRadius: 15,
  padding: 20,
  alignItems: 'center',
},
modalText: {
  fontSize: 18,
  color: 'black',
  textAlign: 'center',
  marginBottom: 20,
  fontWeight: 'bold',
},
modalButtons: {
  flexDirection: 'column',
  width: '100%',
  alignItems: 'center',
  marginTop: 15,
},
closeButton: {
  backgroundColor: '#ff4d4d', // צבע אדום
  padding: 15,
  borderRadius: 10,
  width: '90%',
  alignItems: 'center',
  marginBottom: 10,
},
closeButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},
skipButton: {
  backgroundColor: '#000', // צבע כתום
  padding: 15,
  borderRadius: 10,
  width: '90%',
  alignItems: 'center',
  marginBottom: 10,
},
skipButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},
uploadButton2: {
  backgroundColor: '#6c63ff', // צבע סגול
  padding: 15,
  borderRadius: 10,
  marginBottom: 10,

  width: '90%',
  alignItems: 'center',
},

uploadButton: {
  backgroundColor: '#000', // צבע רקע
  height: 40, // גובה קטן יותר
  borderRadius: 8, // פינות מעוגלות
  width: '100%', // 95% מרוחב המסך
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative', // למיקום יחסי של בר הטעינה
  overflow: 'hidden', // מניעת חריגה של הבר
  marginVertical: 10, // רווח אנכי בין אלמנטים
  alignSelf: 'center', // יישור הכפתור למרכז
},
uploadButtonText: {
  color: 'white', // צבע הטקסט
  fontSize: 16, // גודל טקסט קטן יותר
  fontWeight: 'bold', // טקסט מודגש
  zIndex: 1, // שמירה על הטקסט מעל בר הטעינה
},
progressBarInside: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: 'green',
  zIndex: 0,
},
invitationImage: {
  width: 180, // רוחב התמונה בפיקסלים
  height: 270, // גובה התמונה בפיקסלים
  resizeMode: 'contain', // התאמת התמונה למסגרת
  borderRadius: 5, // פינות מעוגלות
  marginBottom: 10,
},


imageContainer: {
  width: '100%',
  height: 200,
  justifyContent: 'center',
  alignItems: 'flex-end', // יישור התמונה לימין
  marginBottom: -30,
  padding: 0, // שוליים מסביב לתמונה
  borderRadius: 10, // פינות מעוגלות לשוליים
  marginTop: 70,

},

textContainer: {
  width: '90%',
  alignItems: 'flex-end', // טקסט מיושר לימין
},

disabledButton: {
  backgroundColor: '#d3d3d3', // צבע אפור כשהכפתור לא פעיל
},

});

export default RSVPsfour;
