import React, { useState } from 'react';
import { View, Text, TextInput, ImageBackground, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

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

const RSVPsfour = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('משפחה וחברים יקרים, אנו שמחים להזמינכם לחגוג עימנו את החתונה של חן פלנסיה ואמיר פוקמן שתיערך ביום שני 23/12/2024 בגן אירועים "White", תדהר, פרדס חנה כרכור. קבלת פנים בשעה 19:00. *לחצ/י על הכפתורים לאישור הגעה 👇* _‏נשלח באמצעות EasyVent אישורי הגעה. אם הודעה זו הגיעה אליך בטעות, נא השיבו טעות _'+ '\t\t');
  const [tempMessage, setTempMessage] = useState(message);

  const handleSave = () => {
    setMessage(tempMessage + '\t\t'); // הוספת 4 שורות ריקות בסוף ההודעה
  };
  const handleReset = () => {
    setTempMessage('משפחה וחברים יקרים, אנו שמחים להזמינכם לחגוג עימנו את החתונה של חן פלנסיה ואמיר פוקמן שתיערך ביום שני 23/12/2024 בגן אירועים "White", תדהר, פרדס חנה כרכור. קבלת פנים בשעה 19:00. *לחצ/י על הכפתורים לאישור הגעה 👇* _‏נשלח באמצעות EasyVent אישורי הגעה. אם הודעה זו הגיעה אליך בטעות, נא השיבו טעות _'+ '\t\t');
  };
  
  return (
    <ImageBackground
      source={require('../assets/back3.png')}
      style={styles.backgroundImage}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>אישורי הגעה</Text>
      </View>
      <View style={styles.container}>

      <Text style={styles.text1}>לפניך מוצגת ההודעה כפי שתופיע למוזמנים, ניתן לערוך אותה בהתאמה אישית</Text>
      <ScrollView contentContainerStyle={styles.container2}>

        <ImageBackground source={require('../assets/whatsup_resized_smaller.png')} style={styles.box}>
        <View style={{ alignSelf: 'flex-end', maxWidth: '80%' , marginTop: 20,}}>
          <Text style={styles.previewText}>{message}</Text>
          <Text style={styles.timeText}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        </ImageBackground>
        <View style={{ position: 'relative', width: '100%' }}>
          <TextInput
            style={styles.textInput}
            value={tempMessage}
            onChangeText={(text) => {
              if (text.length <= 400) setTempMessage(text); // מגבלת תווים
            }}
            placeholder="ערוך את ההודעה כאן"
            multiline
          />
          <Text style={styles.charCounter}>{`${tempMessage.length}/400`}</Text>
        </View>



        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>שמור</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.saveButtonText}>איפוס</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => navigation.navigate('RSVPsfive')}
        >
          <Text style={styles.nextButtonText}>הבא</Text>
        </TouchableOpacity>

        </ScrollView>
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
    marginTop: -250,
    marginBottom: 40,

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
    left: 10, // מרחק מהצד השמאלי (כי ההודעה מיושרת לימין)

  },
timeText: {
    fontSize: 12,
    color: '#999', // צבע הזמן לאפור
    position: 'absolute',
    bottom: 5, // מרחק מהתחתית
    left: 16, // מרחק מהצד השמאלי (כי ההודעה מיושרת לימין)

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
  borderRadius: 5,
  alignItems: 'center',
  justifyContent: 'center',
  width: '48%',
},
resetButton: {
  backgroundColor: '#808080',
  padding: 10,
  borderRadius: 5,
  alignItems: 'center',
  justifyContent: 'center',
  width: '48%',
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



});

export default RSVPsfour;
