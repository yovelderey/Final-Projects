import React, { useState,useEffect,useRef } from 'react';
import { View, ActivityIndicator,Text,FlatList,Image, ScrollView,ImageBackground, TouchableOpacity,Modal,TextInput, StyleSheet,Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set,get, update, onValue } from 'firebase/database';
import ColorPicker from 'react-native-wheel-color-picker';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";

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

const RSVPsfive = (props) => {
  const insets = useSafeAreaInsets();
  const id = props.route.params.id; // Accessing the passed id
  const [eventDetails, setEventDetails] = useState({});
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState("לא נגיע");
  const [numGuests, setNumGuests] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bgColor, setBgColor] = useState('rgba(104, 90, 90, 0.6)');
  const [buttonTextColor, setButtonTextColor] = useState('black');
  const [buttonBgColor, setButtonBgColor] = useState('white');
  const [eventTitleColor, setEventTitleColor] = useState('white');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [currentColorType, setCurrentColorType] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [submitBtnBgColor, setSubmitBtnBgColor] = useState('#000000');  // צבע רקע לכפתור שלח
  const [attendanceBtnBgColor, setAttendanceBtnBgColor] = useState('#FFFFFF'); // רקע לכפתורי נגיע/אולי/לא נגיע
  const [attendanceBtnSelectedColor, setAttendanceBtnSelectedColor] = useState('#000000'); // ✅ צבע רקע לכפתור נבחר
  const scaleAnim = useRef(new Animated.Value(1)).current; // ✅ יצירת אנימציה של קנה מידה (Scale)
  const [attendanceBtnTextColor, setAttendanceBtnTextColor] = useState('black'); // ✅ צבע ברירת מחדל
  const [isUploading, setIsUploading] = useState(false);
  const [progress] = useState(new Animated.Value(0));
  const [backgroundImage, setBackgroundImage] = useState(null); // תמונת רקע להזמנה
  const [isEditing, setIsEditing] = useState(false);

  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = contacts.filter((contact) =>
      contact.displayName.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredContacts(filtered);
  };
  useEffect(() => {
    if (user && eventDetails.message_date_hour?.date) {
      const firstRowRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/0`);

      // עדכון col1 בתאריך החדש
      update(firstRowRef, { col1: eventDetails.message_date_hour.date })
        .then(() => {
          console.log('First row date updated successfully:', eventDetails.message_date_hour.date);
        })
        .catch((error) => {
          console.error('Error updating first row date:', error);
        });

    }
  }, [user, id, eventDetails.message_date_hour?.date]);
  
// ✅ פונקציה לבחירת תמונה ולהעלאתה ל-Firebase
const uploadBackgroundImage = async () => {
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
      const folderPath = `users/${user.uid}/${id}/background/`;
      const listRef = storageRef(storage, folderPath);

      // ✅ מחיקת תמונת רקע קיימת
      const files = await listAll(listRef);
      if (files.items.length > 0) {
        for (const fileRef of files.items) {
          await deleteObject(fileRef);
        }
      }

      // ✅ העלאת התמונה החדשה
      const storageReference = storageRef(storage, `${folderPath}${Date.now()}.jpg`);
      const response = await fetch(uri);

      if (!response.ok) {
        throw new Error('Failed to fetch image data.');
      }

      const blob = await response.blob();
      
      Animated.timing(progress, {
        toValue: 1, // קביעת ערך סופי של 1
        duration: 3000, // זמן האנימציה
        useNativeDriver: false,
      }).start();

      await uploadBytes(storageReference, blob);

      // ✅ קבלת URL ושמירתו ב-Firebase
      const downloadURL = await getDownloadURL(storageReference);
      setBackgroundImage(downloadURL); // עדכון התמונה בסטייט
      const colorRef = ref(database, `Events/${user.uid}/${id}/customColors`);
      await update(colorRef, { bgImageUrl: downloadURL });

      alert('🎉 תמונת הרקע עודכנה בהצלחה!');
    }
  } catch (error) {
    console.error('❌ שגיאה בהעלאת התמונה:', error);
    alert('❌ שגיאה בהעלאת התמונה.');
  } finally {
    setIsUploading(false);
    progress.setValue(0);
  }
};


// ✅ פונקציה להעלאת התמונה ל-Firebase Storage ושמירת הקישור ב-Firebase Database
const uploadImageToFirebase = async (uri) => {
    if (!user) return;

    try {
        const storage = getStorage();
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileRef = storageRef(storage, `users/${user.uid}/events/${id}/background.jpg`);

        await uploadBytes(fileRef, blob);
        const downloadURL = await getDownloadURL(fileRef);

        // עדכון כתובת התמונה בפיירבייס תחת customColors.bgImageUrl
        const colorRef = ref(database, `Events/${user.uid}/${id}/customColors`);
        await update(colorRef, { bgImageUrl: downloadURL });

        console.log("✅ תמונת רקע נשמרה בהצלחה:", downloadURL);
        setBackgroundImage(downloadURL); // עדכון הסטייט

    } catch (error) {
        console.error("❌ שגיאה בהעלאת התמונה:", error);
    }
};

  useEffect(() => {
    if (user) {
      const eventRef = ref(database, `Events/${user.uid}/${id}`);

      get(eventRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setEventDetails(data);
          setImageUrl(data.imageUrl || null);

          // 🔽 טעינת צבעים מה-DB גם לכפתורים שלא התעדכנו קודם
          if (data.customColors) {
            setBgColor(data.customColors.bgColor || 'rgba(104, 90, 90, 0.6)');
            setButtonTextColor(data.customColors.buttonTextColor || 'black');
            setButtonBgColor(data.customColors.buttonBgColor || 'white');
            setEventTitleColor(data.customColors.eventTitleColor || 'white');
            setSubmitBtnBgColor(data.customColors.submitBtnBgColor || '#000000'); // ✅ כפתור שלח
            setAttendanceBtnBgColor(data.customColors.attendanceBtnBgColor || '#FFFFFF'); // ✅ רקע כפתורי "נגיע/אולי/לא נגיע"
            setAttendanceBtnSelectedColor(data.customColors.attendanceBtnSelectedColor || '#000000'); // ✅ צבע כפתור נבחר
            setAttendanceBtnTextColor(data.attendanceBtnTextColor || 'black'); // ✅ טוען צבע טקסט

          }
        }
        setLoading(false);
      }).catch((error) => {
        console.error("❌ שגיאה בשליפת נתוני האירוע:", error);
        setLoading(false);
      });
    }
  }, [user, id]);

// פונקציה שבודקת אם צבע הרקע כהה או בהיר ומחליטה על צבע טקסט מתאים
const getContrastTextColor = (bgColor) => {
  if (!bgColor) return 'black'; // ברירת מחדל
  const hex = bgColor.replace('#', '');

  // ממיר HEX ל- RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // חישוב בהירות הצבע לפי תקן WCAG
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? 'black' : 'white'; // אם הבהירות גבוהה → שחור, אחרת → לבן
};


  
  // ✅ פונקציה לשמירת צבעים ב-Firebase
  const saveColorToDB = (colorType, colorValue) => {
    if (!user) return;
    
    const colorRef = ref(database, `Events/${user.uid}/${id}/customColors`);

    get(colorRef)
        .then((snapshot) => {
            const existingColors = snapshot.exists() ? snapshot.val() : {};

            // עדכון הערך החדש ושמירתו בפיירבייס
            return set(colorRef, { ...existingColors, [colorType]: colorValue });
        })
        .then(() => {
            console.log(`✅ צבע ${colorType} עודכן ל- ${colorValue}`);

            // עדכון הצבע בהתאם לסוגו
            const colorMapping = {
                bgColor: setBgColor,
                buttonTextColor: setButtonTextColor,
                buttonBgColor: setButtonBgColor,
                eventTitleColor: setEventTitleColor,
                submitBtnBgColor: setSubmitBtnBgColor, // הוספנו גם צבע לכפתור שלח
                attendanceBtnBgColor: setAttendanceBtnBgColor, // צבע לכפתורי אישור הגעה
                attendanceBtnSelectedColor: setAttendanceBtnSelectedColor, // ✅ שמירת צבע הכפתור הנבחר
                attendanceBtnTextColor: setAttendanceBtnTextColor, // ✅ הוספנו צבע טקסט לכפתורים

            };

            if (colorMapping[colorType]) {
                colorMapping[colorType](colorValue);
            }
        })
        .catch((error) => console.error("❌ שגיאה בעדכון הצבעים:", error));
};


  useEffect(() => {
    if (user) {
      const settingsRef = ref(database, `Events/${user.uid}/${id}/settings`);
      get(settingsRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setSubmitBtnBgColor(data.submitBtnBgColor || '#000000');
          setAttendanceBtnBgColor(data.attendanceBtnBgColor || '#FFFFFF');
          setAttendanceBtnSelectedColor(data.attendanceBtnSelectedColor || '#000000'); // ✅ טוען צבע נבחר מהדאטהבייס

        }
      });
    }
  }, [user, id]);
  
  useEffect(() => {
    if (user && eventDetails.message_date_hour?.date) {
      // המרת התאריך ל- Date Object
      const currentDate = new Date(eventDetails.message_date_hour.date);
  
      // הוספת יומיים
      currentDate.setDate(currentDate.getDate() + 2);
  
      // המרת התאריך חזרה לפורמט שרוצים, לדוגמה: 'YYYY-MM-DD'
      const updatedDate = currentDate.toISOString().split('T')[0];
  
      const firstRowRef2 = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/1`);
  
      // עדכון col1 בתאריך החדש
      update(firstRowRef2, { col1: updatedDate })
        .then(() => {
          console.log('First row date updated successfully:', updatedDate);
        })
        .catch((error) => {
          console.error('Error updating first row date:', error);
        });
    }
  }, [user, id, eventDetails.message_date_hour?.date]);
  

useEffect(() => {
  if (user) {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts`);

    const unsubscribe = onValue(databaseRef, (snapshot) => {
      const fetchedContacts = snapshot.val();
      if (fetchedContacts) {
        const contactsArray = Object.values(fetchedContacts);
        setContacts(contactsArray);
        setFilteredContacts(contactsArray); // עדכון רשימה מסוננת
      }
    });

    return () => unsubscribe();
  }
}, [user, id]);

const deleteBackgroundImage = async () => {
  try {
    if (!user) return;
    
    const storage = getStorage();
    const folderPath = `users/${user.uid}/${id}/background/`;
    const listRef = storageRef(storage, folderPath);

    // מחיקת כל התמונות בתוך התיקייה
    const files = await listAll(listRef);
    if (files.items.length > 0) {
      for (const fileRef of files.items) {
        await deleteObject(fileRef);
      }
    }

    // מחיקת ה-URL מה- Firebase
    const colorRef = ref(database, `Events/${user.uid}/${id}/customColors`);
    await update(colorRef, { bgImageUrl: null });

    // עדכון הסטייט
    setBackgroundImage(null);
    alert('🗑️ תמונת הרקע נמחקה בהצלחה!');
  } catch (error) {
    console.error('❌ שגיאה במחיקת תמונת הרקע:', error);
    alert('❌ שגיאה במחיקת תמונת הרקע.');
  }
};


useEffect(() => {
  if (user) {
    const colorRef = ref(database, `Events/${user.uid}/${id}/customColors`);

    get(colorRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.bgImageUrl) {
          console.log("✅ תמונת רקע נטענה:", data.bgImageUrl);
          setBackgroundImage(data.bgImageUrl); // ✅ עדכון הסטייט עם כתובת התמונה
        } else {
          console.warn("⚠️ לא נמצאה תמונת רקע");
          setBackgroundImage(null); // אם אין תמונה, השאר רקע ברירת מחדל
        }
      }
    }).catch((error) => {
      console.error("❌ שגיאה בטעינת תמונת הרקע:", error);
    });
  }
}, [user, id]);


const openWaze = () => {

};

// ✅ פונקציה להוספת האירוע ליומן
const addToCalendar = () => {
  // **כאן אפשר להוסיף לוגיקה לפתיחת היומן בהתאם לפלטפורמה**
};
useEffect(() => {
  if (user) {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/`);

    const unsubscribe = onValue(databaseRef, (snapshot) => {
      const fetchedData = snapshot.val();
      if (fetchedData) {
        setEventDetails(fetchedData);
      }
    });

    return () => unsubscribe();
  }
}, [user, id]);


  return (
    <ImageBackground
    
      source={require('../assets/bavk4.png')}
      style={styles.backgroundImage}
    >

      <View style={styles.container}>
      
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => props.navigation.navigate('RSVPsfour', { id })} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>אשיורי הגעה</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContainer2}>

        <Text style={styles.text1}>סיכום</Text>

      <View style={styles.container}>


        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.text10}>ההזמנה שלנו תוצג כך לאורחים</Text>

          <ImageBackground
  source={backgroundImage ? { uri: backgroundImage } : null}
  style={[
    styles.invitationContainer, 
    backgroundImage ? { backgroundColor: 'transparent' } : { backgroundColor: bgColor }
  ]}
  imageStyle={{ resizeMode: 'cover', alignSelf: 'center', width: '120%', height: '110%', borderRadius: 15 }}
>

  {loading ? (
    <ActivityIndicator size="large" color="#fff" />
  ) : (
    <Image source={{ uri: imageUrl }} style={styles.eventImage} />
  )}

  <Text style={[styles.eventTitle, { color: eventTitleColor }]}>{eventDetails.eventName || "שם האירוע"}</Text>
  <Text style={[styles.eventDate, { color: eventTitleColor }]}>{eventDetails.eventDate || "תאריך לא זמין"}</Text>

  <View style={[styles.buttonsContainer, { backgroundColor: attendanceBtnBgColor }]}>
    {["נגיע", "אולי", "לא נגיע"].map((response) => (
      <TouchableOpacity
        key={response}
        style={[
          styles.btnDefault,
          selectedResponse === response && { backgroundColor: attendanceBtnSelectedColor },
        ]}
        onPress={() => {
          setSelectedResponse(response);
          setShowGuestInput(response === "נגיע");
        }}>
        <Text style={[styles.btnText, { color: attendanceBtnTextColor }, selectedResponse === response && { color: 'white' }]}>
          {response}
        </Text>
      </TouchableOpacity>
    ))}
  </View>

  {/* ✅ שדה הכנסת מספר מוזמנים */}
  {showGuestInput && (
    <View style={styles.guestsContainer}>
      <TextInput
        style={styles.guestsInput}
        keyboardType="numeric"
        placeholder="כמה מוזמנים מגיעים?"
        value={numGuests}
        onChangeText={setNumGuests}
      />
    </View>
  )}

  {/* ✅ כפתור שלח */}
  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: submitBtnBgColor }]}>
    <Text style={styles.submitBtnText}>שלח</Text>
  </TouchableOpacity>

  {/* ✅ הצגת פרטי האירוע */}
  <View style={styles.eventDetails}>
    <View style={styles.detailsRow}>
      <View style={styles.detailItem}>
        <Text style={[styles.detailLabel, { color: buttonTextColor }]}>כתובת</Text>
        <Text style={[styles.detailValue, { color: buttonTextColor }]}>{eventDetails.Address || "לא זמין"}</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={[styles.detailLabel, { color: buttonTextColor }]}>אולם</Text>
        <Text style={[styles.detailValue, { color: buttonTextColor }]}>{eventDetails.eventLocation || "לא זמין"}</Text>
      </View>
    </View>
    <View style={styles.detailsRow}>
      <View style={styles.detailItem}>
        <Text style={[styles.detailLabel, { color: buttonTextColor }]}>קבלת פנים</Text>
        <Text style={[styles.detailValue, { color: buttonTextColor }]}>{eventDetails.eventTime || "לא זמין"}</Text>
      </View>
      <View style={styles.detailItem}>
        <Text style={[styles.detailLabel, { color: buttonTextColor }]}>טלפון</Text>
        <Text style={[styles.detailValue, { color: buttonTextColor }]}>{eventDetails.Phone_Number || "לא זמין"}</Text>
      </View>
    </View>
  </View>

  <View style={styles.eventButtons}>
    <TouchableOpacity style={styles.btn} onPress={openWaze}>
      <Image source={require('../assets/waze.png')} style={styles.icon} />
      <Text style={[styles.btnTextSmall, { color: buttonTextColor }]}>נווט לאירוע</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.btn} onPress={addToCalendar}>
      <Image source={require('../assets/calendar.png')} style={styles.icon} />
      <Text style={[styles.btnTextSmall, { color: buttonTextColor }]}>הוסף ליומן</Text>
    </TouchableOpacity>
  </View>

  <Text style={styles.btnTextSmall2}>EasyVent - מערכת לאישורי הגעה וסידורי הושבה</Text>
  <Text style={styles.btnTextSmall3}>פותח על ידי יובל טכנולוגיות, כל הזכויות שמורות ©</Text>
</ImageBackground>

        </ScrollView>
      </View>


      <TouchableOpacity 
        style={styles.editInvitationButton} 
        onPress={() => setIsEditing(!isEditing)}
      >
        <Text style={styles.editInvitationButtonText}>
          {isEditing ? "✖️ סגור עריכה" : "🖊 עריכת הזמנה"}
        </Text>
      </TouchableOpacity>

      {isEditing && (
  <View style={styles.editContainer}>
    {/* ✅ כפתור בחירת צבע */}


    <View style={styles.backgroundCustomizationContainer}>
  <Text style={styles.sectionTitle}>🎨 התאמת רקע</Text>

  {/* ✅ העלאת תמונת רקע + מחיקה */}
  <View style={styles.imageUploadContainer}>
    <Text style={styles.imageUploadTitle}>📸 העלאת תמונת רקע</Text>
    <View style={styles.imageButtonRow}>
      <TouchableOpacity onPress={uploadBackgroundImage} style={styles.uploadImageBtn}>
        <Text style={styles.uploadImageText}>בחר תמונה</Text>
      </TouchableOpacity>

      {backgroundImage && (
        <TouchableOpacity onPress={deleteBackgroundImage} style={styles.deleteImageBtn}>
          <Text style={styles.deleteImageText}>🗑️ מחק תמונה</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>

  <Text style={styles.text3}>או בחר צבע רקע</Text>

  {/* ✅ בחירת צבע רקע */}
  <View style={styles.colorPickers2}>
    <View style={styles.colorRow}>
      {["#FFFFFF", "#808080", "#000000", "#FFD700", "#008000"].map((color) => (
        <TouchableOpacity
          key={color}
          style={[styles.colorBox, { backgroundColor: color }]}
          onPress={() => saveColorToDB("bgColor", color)}
        />
      ))}
      <TouchableOpacity onPress={() => { setColorPickerVisible(true); setCurrentColorType("bgColor"); }} style={styles.allColorsBtn}>
        <Text style={{ color: "white" }}>🎨 בחר גוון ספציפי</Text>
      </TouchableOpacity>
    </View>
  </View>
</View>


    {/* ✅ סרגלי שינוי צבעים */}
    {[
      { title: "🎨 צבע טקסט של הכפתורים", type: "buttonTextColor", colors: ["#FFFFFF", "#808080", "#000000", "#FFD700", "#008000"] },
      { title: "🎨 צבע שם האירוע", type: "eventTitleColor", colors: ["#FFFFFF", "#808080", "#000000", "#FFD700", "#008000"] },
      { title: "🎨 צבע רקע לכפתור 'שלח'", type: "submitBtnBgColor", colors: ["#FFFFFF", "#808080", "#000000", "#FFD700", "#008000"] },
      { title: "🎨 צבע רקע לכפתורי 'נגיע/אולי/לא נגיע'", type: "attendanceBtnBgColor", colors: ["#FFFFFF", "#808080", "#000000", "#FFD700", "#008000"] },
      { title: "🎨 צבע כפתור נבחר", type: "attendanceBtnSelectedColor", colors: ["#FFFFFF", "#808080", "#000000", "#FFD700", "#008000"] },
      { title: "🎨 צבע טקסט לכפתורי 'נגיע/אולי/לא נגיע'", type: "attendanceBtnTextColor", colors: ["#FFFFFF", "#808080", "#000000", "#FFD700", "#008000"] }
    ].map(({ title, type, colors }) => (
      <View key={type} style={styles.colorPickers}>
        <Text>{title}</Text>
        <View style={styles.colorRow}>
          {colors.map(color => (
            <TouchableOpacity key={color} style={[styles.colorBox, { backgroundColor: color }]} onPress={() => saveColorToDB(type, color)} />
          ))}
          <TouchableOpacity onPress={() => {
            setColorPickerVisible(true);
            setCurrentColorType(type);
          }} style={styles.allColorsBtn}>
            <Text style={{ color: "white" }}>🎨 בחר גוון ספציפי</Text>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
)}



        <Text style={styles.text5}>ההזמנה שלנו תשלח לאורחים בתאריך:</Text>
        <Text style={styles.text4}>
          {eventDetails.message_date_hour?.date || "תאריך לא זמין"}
        </Text>

        <Text style={styles.text5}>בשעה:</Text>
        <Text style={styles.text5}>
          {eventDetails.message_date_hour?.time || "השעה לא זמינה"}
        </Text>

        <TouchableOpacity
          style={styles.viewGuestsButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.viewGuestsButtonText}>לחץ לצפיית ברשימת המוזמנים</Text>
        </TouchableOpacity>


        <Text style={styles.text5}>לאישור הפרטים נא ללחוץ ״אישור״</Text>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => props.navigation.navigate('RSVPs', { id })}
        >
          <Text style={styles.confirmButtonText}>אישור</Text>
        </TouchableOpacity>
        <Text style={styles.text9}></Text>

        </ScrollView>

      </View>

{/* ✅ מודאל לבחירת צבע */}
<Modal
  visible={colorPickerVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setColorPickerVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.colorPickerModal}>
      {/* ✅ כותרת */}
      <Text style={styles.modalTitle}>🎨 בחר גוון צבע</Text>
      
      {/* ✅ גלגל בחירת צבע */}
      <View style={styles.colorPickerWrapper}>
        <ColorPicker
          onColorChange={(color) => setSelectedColor(color)}
          style={{ width: 250, height: 250 }}
        />
      </View>

      {/* ✅ כפתור שמירת צבע */}
      <TouchableOpacity
        style={styles.saveColorBtn}
        onPress={() => {
          saveColorToDB(currentColorType, selectedColor);
          setColorPickerVisible(false);
        }}
      >
        <Text style={styles.saveColorText}>שמירת צבע</Text>
      </TouchableOpacity>

      {/* ✅ כפתור סגירה */}
      <TouchableOpacity
        style={styles.closeModalBtn}
        onPress={() => setColorPickerVisible(false)}
      >
        <Text style={styles.closeModalText}>סגור</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="חפש מוזמן..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.phoneNumbers}
              renderItem={({ item }) => (
                <View style={styles.contactItem}>
                  <Text style={styles.contactName}>{item.displayName}</Text>
                  <Text style={styles.contactPhone}>{item.phoneNumbers}</Text>
                </View>
              )}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
        
      </Modal>

    </ImageBackground>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',

  },
  header: {
    width: '100%',
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
    
  },
  bottomButton: {
    position: 'absolute',
    bottom: 30,
    width: '80%',
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  bottomButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
text10: {
  fontSize: 16,
  color: 'black',
  marginTop: 0,
  textAlign: 'center',
  fontWeight: 'bold',
  marginBottom: 10,

},
  
text1: {
  fontSize: 25,
  color: 'black',
  marginTop: 75,
  textAlign: 'center',
  fontWeight: 'bold',
},
text2: {
  fontSize: 16,
  color: 'black',
  marginTop: 0,
  textAlign: 'center',
  fontWeight: 'bold',
  marginBottom: 30,

},

text3: {
  fontSize: 16,
  color: 'black',
  marginTop: 0,
  textAlign: 'center',
  fontWeight: 'bold',
  marginTop: 15,

},
text4: {
  fontSize: 16,
  color: 'black',
  marginBottom: 10,
  textAlign: 'center',
  fontWeight: 'bold',

},
text5: {
  fontSize: 16,
  color: 'black',
  marginBottom: 10,
  textAlign: 'center',
  fontWeight: 'bold',

},
text9: {
  fontSize: 16,
  color: 'black',
  marginBottom: 10,
  textAlign: 'center',
  fontWeight: 'bold',
  marginTop: 105, // מרווח עליון

},
messageBox: {
  marginTop: 20, // מרווח עליון
  padding: 15, // ריווח פנימי
  backgroundColor: '#fff', // רקע לבן
  borderRadius: 10, // פינות מעוגלות
  shadowColor: '#000', // הצללה
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 3, // הצללה לאנדרואיד
  width: '90%', // רוחב מותאם
  alignSelf: 'center', // מרכז את התיבה
},
messageText: {
  fontSize: 16, // גודל הטקסט
  color: '#333', // צבע טקסט כהה
  textAlign: 'right', // יישור לימין
  lineHeight: 22, // מרווח בין השורות
},
confirmButton: {
  marginTop: 5,
  backgroundColor: 'rgba(108, 99, 255, 0.9)', // צבע ירוק
  padding: 10,
  borderRadius: 10,
  alignItems: 'center',
  alignSelf: 'center', // ✅ מבטיח שהכפתור יהיה באמצע  justifyContent: 'center',
  width: 350,
  height: 40,
  elevation: 5,
},
confirmButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},
viewGuestsButton: {
  marginTop: 20,
  marginBottom: 25,
  backgroundColor: '#000',
  padding: 10,
  borderRadius: 10,
  width: '70%',
  alignItems: 'center',
  alignSelf: 'center', // ✅ מבטיח שהכפתור יהיה באמצע
},

viewGuestsButtonText: {
  color: 'white',
  fontSize: 15,
  fontWeight: 'bold',
  alignItems: 'center',

},
modalContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
modalContent: {
  width: '90%',
  backgroundColor: 'white',
  borderRadius: 10,
  padding: 20,
  alignItems: 'center',
},
searchInput: {
  width: '100%',
  padding: 10,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  marginBottom: 20,
  textAlign: 'right',
},
contactItem: {
  padding: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#ddd',
  width: '100%',
},
contactName: {
  fontSize: 16,
  fontWeight: 'bold',
},
contactPhone: {
  fontSize: 14,
  color: '#555',
},
closeModalButton: {
  marginTop: 20,
  backgroundColor: '#dc3545',
  padding: 10,
  borderRadius: 5,
  alignItems: 'center',
  justifyContent: 'center',
  width: '50%',
},
closeModalButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},

backgroundImage: {
  flex: 1,
  resizeMode: 'cover',

},

scrollContainer: {
  alignItems: 'center',
  paddingVertical: 10,
  
},
invitationContainer: {
  backgroundColor: 'rgba(104, 90, 90, 0.6)',
  padding: 25,
  borderRadius: 15,
  alignItems: 'center',
  shadowColor: '#545455',
  shadowOpacity: 0.6,
  shadowRadius: 15,
  width: '100%',
  
},
eventImage: {
  width: '100%',
  height: 400,
  borderRadius: 10,
  marginBottom: 15,
},

  eventDate: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 10,
    borderRadius: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 40,
    padding: 5,
    width: 'fit-content',
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'space-evenly', // ✅ רווח אחיד בין הכפתורים

  },
  btnDefault: {
    padding: 12,
    borderRadius: 30,
    textAlign: 'center',
    width: 100,

  },
  btnSelected: {
    backgroundColor: 'black',
    color: 'white',
    
  },
  btnText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
    alignItems: 'center',
    textAlign: 'center',
  },
  guestsContainer: {
    width: '100%',
    marginTop: 15,
    alignItems: 'center',
  },
  guestsInput: {
    width: '80%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'black',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: 'white',
    color: 'black',
  },
  submitBtn: {
    backgroundColor: 'black',
    padding: 12,
    borderRadius: 20,
    width: '85%',
    marginTop: 20,
    alignItems: 'center',
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 15,
  },
  btn: {
    alignItems: 'center',
    textAlign: 'center',
  },
  icon: {
    width: 30,
    height: 30,
    marginBottom: 5,
  },
  btnTextSmall: {
    fontSize: 12,
    color: 'black',
    fontWeight: 'bold',
  },
  btnTextSmall2: {
    fontSize: 10,
    marginTop: 20,
    color: 'black',
  },
  btnTextSmall3: {
    fontSize: 10,
    color: 'black',
  },
  footerText2: {
    fontSize: 12,
    color: 'black',
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'black',
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 10,
  },
  eventImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 10, 
    marginBottom: 15,
    backgroundColor: '#ccc', // ✅ מונע רקע שחור אם אין תמונה
    shadowColor: 'black',  // ✅ הצללה שחורה
    shadowOpacity: 1.6,
    shadowRadius: 10,
    elevation: 5, // ✅ הצללה לאנדרואיד
  },
  eventTitle: { 
    fontSize: 25, 
    color: '#000', 
    textAlign: 'center', 
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // ✅ צל שחור עדין לטקסט
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    fontStyle: 'italic', // ✅ טקסט נטוי

  },
    eventDate: { fontSize: 20, color: '#fff', textAlign: 'center', fontStyle: 'italic' },
  invitationContainer: {
    backgroundColor: 'rgba(104, 90, 90, 0.6)',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    width: '100%',
  },
  container: { width: '100%', maxWidth: 480, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: 'bold' },
  value: { fontSize: 14, color: '#333' },
  colorPickers: { alignItems: 'center', marginTop: 20 ,  borderWidth: 2, borderColor: 'gray', borderRadius: 15},
  colorRow: { flexDirection: 'row', marginVertical: 5 },
  colorBox: { width: 30, height: 30, marginHorizontal: 5, borderRadius: 5 },
  eventDetails: { width: '100%', marginTop: 20 },
  detailItem: { alignItems: 'center', marginBottom: 10 },
invitationContainer: { 
  padding: 25, 
  borderRadius: 15, 
  alignItems: 'center', 
  width: '90%', 
  borderWidth: 3, // עובי המסגרת
  borderColor: 'gray' // צבע המסגרת
},
  colorBox: {
    width: 30,
    height: 30,
    margin: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  allColorsBtn: {
    backgroundColor: 'black',
    padding: 8,
    borderRadius: 15,
    marginLeft: 10,
  },

  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5,
  },
  detailLabel: {
    fontWeight: "bold",
    fontSize: 16,
  },
  detailValue: {
    fontSize: 14,
    color: "#555",
    
  },
  saveColorText: {
  color: 'black', // ✅ טקסט לבן לנראות טובה
  fontSize: 16, // ✅ טקסט בינוני וברור
  fontWeight: 'bold', // ✅ מודגש
  textTransform: 'uppercase', // ✅ הופך את הטקסט לאותיות גדולות
  alignItems: 'center',
  textAlign: 'center',
  marginTop: 15,

},
uploadImageBtn: {
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
},
uploadImageText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
},editInvitationButton: {
  backgroundColor: '#000',
  padding: 12,
  borderRadius: 10,
  alignItems: 'center',
  alignSelf: 'center',
  width: '85%',
  marginTop: 20,
},

editInvitationButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},

editContainer: {
  backgroundColor: 'white', // ✅ רקע לבן לכל האלמנטים
  padding: 10,
  borderRadius: 15,
  marginTop: 20,
  width: '100%',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 3, // הצללה לאנדרואיד
},

backgroundCustomizationContainer: {
  padding: 0,

  borderRadius: 15,
  alignItems: 'center',
  marginTop: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.1,
  shadowRadius: 5,
  elevation: 2,
  borderColor: 'black',
  borderWidth: 2, // ✅ עובי המסגרת
  marginBottom: 15,

},

sectionTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 15,
  textAlign: 'center',
},

imageUploadContainer: {
  backgroundColor: '#f8f8f8',
  padding: 15,
  borderRadius: 10,
  width: '100%',
  alignItems: 'center',
  marginBottom: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
},

imageUploadTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#555',
  marginBottom: 10,
},

imageButtonRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 10,
},

uploadImageBtn: {
  backgroundColor: '#000',
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderRadius: 8,
  alignItems: 'center',
  flex: 1,
  marginHorizontal: 5,
  shadowColor: '#007bff',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 4,
},

uploadImageText: {
  color: 'white',
  fontSize: 14,
  fontWeight: 'bold',
},

deleteImageBtn: {
  backgroundColor: '#dc3545',
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderRadius: 8,
  alignItems: 'center',
  flex: 1,
  marginHorizontal: 5,
  shadowColor: '#dc3545',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 4,
},

deleteImageText: {
  color: 'white',
  fontSize: 14,
  fontWeight: 'bold',
},

text3: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 10,
},

colorPickers: {
  alignItems: 'center',
  width: '100%',
  borderColor: 'black',
  borderWidth: 2, // ✅ עובי המסגרת
  marginBottom: 15,
  borderRadius: 10,

},
colorPickers2: {
  alignItems: 'center',
  width: '100%',
  marginBottom: 15,
  borderRadius: 10,

},
colorRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 5,
  justifyContent: 'center',
},

colorBox: {
  width: 35,
  height: 35,
  margin: 5,
  borderRadius: 5,
  borderWidth: 1,
  borderColor: '#ccc',
},

allColorsBtn: {
  backgroundColor: 'black',
  padding: 8,
  borderRadius: 15,
  marginLeft: 10,
},
modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)', // ✅ רקע כהה חצי שקוף
},

colorPickerModal: {
  backgroundColor: 'white',
  paddingVertical: 20,
  paddingHorizontal: 25,
  borderRadius: 15,
  alignItems: 'center',
  width: '85%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 5,
  elevation: 5,
},

modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  marginBottom: 15,
  textAlign: 'center',
  color: '#333',
},

colorPickerWrapper: {
  width: 250,
  height: 250,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 40, // ✅ נותן ריווח בין ColorPicker לכפתורים
},

saveColorBtn: {
  backgroundColor: 'black',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
  width: '100%',
  marginBottom: 10, // ✅ ריווח בין כפתור שמירה לכפתור סגירה
},

saveColorText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},

closeModalBtn: {
  backgroundColor: '#dc3545',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
  width: '100%',
},

closeModalText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},



});

export default RSVPsfive;
