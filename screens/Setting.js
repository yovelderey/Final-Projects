import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';

const settingsOptions = [

  { id: 4,
     title: 'תנאי שימוש',
      icon: require('../assets/document.png'),
      onPress: () => setTermsModalVisible(true) },
  { id: 5,
     title: 'עזרה & ,תמיכה',
    icon: require('../assets/question.png'),
     onPress: () => setHelpModalVisible(true) },
   
    
  { id: 6,
      title: 'אודות',
      icon: require('../assets/info.png'),
      onPress: () => setModalVisible(true),
   },
  { id: 7, title: 'אפס סיסמה', icon: require('../assets/reset-password.png') },
  {
    id: 8,
    title: 'מחק חשבון',
    icon: require('../assets/remove-user.png'),
    onPress: () => setIsModalVisible(true), // פותח את המודל למחיקת החשבון
  },  { id: 1, title: 'חזור למסך הראשי', icon: require('../assets/return.png') },

];

const Setting = () => {
  const navigation = useNavigation();
  const [displayText, setDisplayText] = useState('');
  const [password, setPassword] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false); // State לניהול המודאל של תנאי השימוש

  
  useEffect(() => {
    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        setDisplayText(authUser.email);
      } else {
        setDisplayText('Not logged in');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await firebase.auth().signOut();
      navigation.navigate('Main');
    } catch (error) {
      console.log('Sign out error:', error.message);
    }
  };
  const reauthenticateAndDelete = () => {
    const user = firebase.auth().currentUser; // שליפת המשתמש המחובר
  
    if (!user) {
      Alert.alert('שגיאה', 'אין משתמש מחובר.');
      return;
    }
  
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      password
    );
  
    user
      .reauthenticateWithCredential(credential)
      .then(() => {
        user
          .delete()
          .then(() => {
            Alert.alert('החשבון נמחק בהצלחה');
            navigation.navigate('LoginEmail'); // חזרה למסך ההתחברות
          })
          .catch((error) => {
            Alert.alert('שגיאה במחיקת החשבון', error.message);
          });
      })
      .catch((error) => {
        Alert.alert('שגיאה באימות', 'אימות מחדש נכשל: ' + error.message);
      });
  };
  
  
  

  const confirmDeleteAccount = () => {
    setIsModalVisible(true); // פתיחת החלון להזנת הסיסמה
  };

  const handleDeleteAccount = async () => {
    const user = firebase.auth().currentUser;

    if (!user) {
      Alert.alert('Error', 'No user is logged in.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await user.delete();
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              navigation.navigate('Login');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    const user = firebase.auth().currentUser;

    if (!user) {
      Alert.alert('Error', 'No user is logged in.');
      return;
    }

    Alert.alert(
      'איפוס סיסמה',
      'דוא"ל לאיפוס סיסמה יישלח לכתובת הדוא"ל הרשומה שלך.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'איפוס סיסמה',
          onPress: async () => {
            try {
              await firebase.auth().sendPasswordResetEmail(user.email);
              Alert.alert('האימייל נשלח', 'ברגעים אלו נשלח אליך מייל לאיפוס סיסמה, נא להיכנס לקישור עד 5 דקות מהודעה זו.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderSettingOption = ({ item }) => (
    <TouchableOpacity
      style={styles.optionContainer}
      onPress={() => {
        if (item.id === 8) {
          // אם נבחר מחק חשבון
          confirmDeleteAccount(); 
        } else if (item.id === 7) {
          // אם נבחר אפס סיסמה
          handleChangePassword();
        } else if (item.id === 1) {
          // חזרה למסך הראשי
          navigation.navigate('Main');
        } 
         else if (item.id === 6) {
          // חזרה למסך הראשי
          setModalVisible(true);
        } 
        else if (item.id === 5) {
          // חזרה למסך הראשי
          setHelpModalVisible(true)
        } 
        else if (item.id === 4) {
          // חזרה למסך הראשי
          setTermsModalVisible(true)
        } 
        else {
          Alert.alert('Error', `No action defined for ${item.title}`);
        }
      }}
    >

      <Image source={require('../assets/left-arrow.png')} style={styles.arrowIcon} />
      <View style={styles.optionContent}>
      <Text style={styles.optionText}>{item.title}</Text>

        <Image source={item.icon} style={styles.optionIcon} />
      </View>
    </TouchableOpacity>
  );
  
  

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={require('../assets/settings.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הגדרות</Text>
      </View>

      {/* User Info */}
      <Text style={styles.userInfo}>שלום, {displayText}</Text>

      {/* Settings List */}
      <FlatList
        data={settingsOptions}
        renderItem={renderSettingOption}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>התנתק</Text>
      </TouchableOpacity>

    {/* Modal להזנת הסיסמה */}
<Modal
  visible={isModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setIsModalVisible(false)} // סגירת המודל כשמבטלים
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>אימות סיסמה</Text>
      <TextInput
        style={styles.passwordInput}
        secureTextEntry
        placeholder="הזן סיסמה"
        value={password}
        onChangeText={setPassword}
        placeholderTextColor="#aaa"
      />
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setIsModalVisible(false)} // סוגר את המודל
        >
          <Text style={styles.cancelButtonText}>ביטול</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => {
            reauthenticateAndDelete(); // מפעיל את פונקציית מחיקת החשבון
            setIsModalVisible(false); // סוגר את המודל אחרי הפעולה
          }}
        >
          <Text style={styles.confirmButtonText}>אישור</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


  {/* Modal להצגת המידע */}
  <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>אודות</Text>
            <ScrollView>
              <Text style={styles.modalText}>
                החברה – יובל טכנולוגיות מכבדת את פרטיות המשתמשים באתר
                האינטרנט שהיא מנהלת ומפעילה. על כן החליטה החברה לפרסם את
                מדיניותה ביחס להגנת הפרטיות באתר, והיא מתחייבת כלפי המשתמש
                לקיים מדיניות זו.
                {"\n\n"}
                מטרת המדיניות היא להסביר מהם נוהגי בעל האתר ביחס לפרטיות
                המשתמשים באתר, וכיצד משתמש בעל האתר במידע, הנמסר לו על-ידי
                המשתמשים באתר או הנאסף בעת השימוש באתר.
                {"\n\n"}
                מדיניות הפרטיות הינה בהתאם לאמור בסעיף 11 לחוק הגנת הפרטיות
                התשמ"א 1981.
                {"\n\n"}
                <Text style={styles.subHeader}>כללי</Text>
                {"\n"}
                בעת שימוש בשירותי האתר נאסף מידע אודות המשתמש. חלק מהמידע מזהה
                אותך באופן אישי, כלומר בשמך ובכתובתך. זהו המידע שאתה מוסר
                ביודעין, לדוגמה בעת שתירשם לשירותים באתרים תידרש למסור פרטי
                יצירת קשר, פרטים אישיים מזהים, סוג האירוע וכיוב'.
                {"\n\n"}
                <Text style={styles.subHeader}>רישום לשירותים</Text>
                {"\n"}
                ככל שתידרש מסירת פרטים אישיים בעת רישום לשירותים באתר, או בעת
                רכישת מוצרים, בעל האתר יבקש ממך מידע הנחוץ במישרין לאספקת
                השירותים ו/או לרכישת המוצרים. בנוסף יתבקש ממך לאשר קבלת תכנים
                שיווקיים הנוגעים לפעילות האתר.
                {"\n\n"}
                <Text style={styles.subHeader}>Cookies</Text>
                {"\n"}
                האתר משתמש ב"עוגיות" (Cookies) לצורך תפעולו השוטף והתקין,
                ובכלל זה כדי לאסוף נתונים סטטיסטיים על המשתמש אודות השימוש
                באתר, לאימות פרטים, כדי להתאים את האתר להעדפותיך האישיות
                ולצורכי אבטחת מידע.
                {"\n\n"}
                <Text style={styles.subHeader}>אבטחת מידע</Text>
                {"\n"}
                באתר מיושמות מערכות ונהלים עדכניים לאבטחת מידע. בעוד שמערכות
                ונהלים אלה מצמצמים את הסיכונים לחדירה בלתי-מורשית, אין הם
                מעניקים בטחון מוחלט. לכן, בעל האתר לא מתחייב ששירותיו יהיו
                חסינים באופן מוחלט מפני גישה בלתי-מורשית למידע המאוחסן בהם
                והמשתמש מצהיר כי הוא מודע ומסכים לכך.
                {"\n\n"}
              </Text>
            </ScrollView>

            {/* כפתור לסגירת ה-Modal */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
  visible={helpModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setHelpModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>עזרה ותמיכה</Text>
      <ScrollView style={styles.modalScrollView}>
        <Text style={styles.modalText}>
          אם אתה נתקל בבעיות או זקוק לעזרה, אנו כאן כדי לסייע לך!
          {"\n\n"}
          <Text style={styles.subHeader}>צור קשר:</Text>
          {"\n"}
          אנו זמינים בשעות הפעילות שלנו:
          {"\n"}- ימים א'-ה': 09:00 - 18:00
          {"\n"}- יום ו': 09:00 - 13:00
          {"\n\n"}
          <Text style={styles.subHeader}>דרכי יצירת קשר:</Text>
          {"\n"}
          - דוא"ל: yovelderey@gmail.com

          {"\n"}
          - וואטסאפ: 054-2455869
          {"\n\n"}
          <Text style={styles.subHeader}>שאלות נפוצות:</Text>
          {"\n"}
          <Text style={styles.boldText}>1. שכחתי את הסיסמה שלי, מה לעשות?</Text>
          {"\n"}תוכל לאפס את הסיסמה שלך דרך כפתור "איפוס סיסמה" באפליקציה.
          {"\n\n"}
          <Text style={styles.boldText}>2. כיצד אני עורך את פרטי האירוע?</Text>
          {"\n"}עבור למסך "ניהול אירועים" ותוכל לערוך את הפרטים שלך.
          {"\n\n"}
          <Text style={styles.boldText}>3. נתקלתי בבעיה טכנית, מה לעשות?</Text>
          {"\n"}אנא צור קשר עם התמיכה הטכנית שלנו, ונשמח לעזור לך.
          {"\n\n"}
          אנו כאן כדי לעזור בכל נושא!
        </Text>
      </ScrollView>
      {/* כפתור לסגירת ה-Modal */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setHelpModalVisible(false)}
      >
        <Text style={styles.closeButtonText}>סגור</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

<Modal
  visible={termsModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setTermsModalVisible(false)} // סוגר את ה-Modal אם לוחצים על כפתור החזרה
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>תנאי שימוש</Text>
      <ScrollView style={styles.modalScrollView}>
        <Text style={styles.modalText}>
          <Text style={styles.subHeader}>ברוכים הבאים לאפליקציה שלנו!</Text>
          {"\n\n"}
          האפליקציה מיועדת לספק פתרונות חכמים ונוחים לניהול ותכנון אירועים. 
          בין השירותים הזמינים:
          {"\n\n"}
          <Text style={styles.bulletPoint}>● </Text>שליחת הזמנות לאירועים דרך וואטסאפ.
          {"\n"}
          <Text style={styles.bulletPoint}>● </Text>ניהול אישורי הגעה של אורחים בזמן אמת.
          {"\n"}
          <Text style={styles.bulletPoint}>● </Text>סידור שולחנות אינטואיטיבי עם ממשק גרפי.
          {"\n"}
          <Text style={styles.bulletPoint}>● </Text>ניהול ספקים והוצאות כספיות.
          {"\n"}
          <Text style={styles.bulletPoint}>● </Text>מעקב וניהול מתנות שהתקבלו באירוע.
          {"\n"}
          {"\n"}
          <Text style={styles.subHeader}>שימוש באפליקציה</Text>
          {"\n"}
          כל שימוש באפליקציה כפוף לתנאים הבאים:
          {"\n"}
          1. האפליקציה נועדה לשימוש אישי בלבד, ולא למטרות מסחריות או שיווקיות.
          {"\n"}
          2. על המשתמש להתחייב למסור פרטים מדויקים ולכבד את פרטיות האורחים.
          {"\n"}
          3. חל איסור להשתמש באפליקציה לצורך הטרדה או שימוש בלתי חוקי.
          {"\n"}
          {"\n"}
          <Text style={styles.subHeader}>מדיניות פרטיות</Text>
          {"\n"}
          אנו מחויבים לשמירה על פרטיות המשתמשים. המידע שנאסף ישמש לצורכי ניהול האירוע בלבד ולא יועבר לצדדים שלישיים ללא הסכמתך המפורשת.
          {"\n\n"}
          <Text style={styles.subHeader}>אחריות ושיפוי</Text>
          {"\n"}
          השימוש באפליקציה נעשה על אחריות המשתמש בלבד. בעל האפליקציה אינו נושא באחריות לכל נזק שייגרם משימוש לא נכון באפליקציה.
          {"\n\n"}
          <Text style={styles.subHeader}>שינויים בתנאים</Text>
          {"\n"}
          אנו שומרים לעצמנו את הזכות לשנות את תנאי השימוש בכל עת. עדכון על שינויים יופיע באפליקציה, ומומלץ לעיין בהם מעת לעת.
          {"\n\n"}
          <Text style={styles.subHeader}>תודה שהשתמשתם באפליקציה שלנו!</Text>
        </Text>
      </ScrollView>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setTermsModalVisible(false)} // סוגר את ה-Modal
      >
        <Text style={styles.closeButtonText}>סגור</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
header: {
  flexDirection: 'row',
  justifyContent: 'flex-end', // מיישר את האלמנטים לצד ימין

  alignItems: 'flex-start', // יישור אלמנטים לתחילת השורה (למעלה)
  paddingHorizontal: 20,
  paddingVertical: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
  marginTop: 50, // מרווח מעל הכותרת
},

  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
    textAlign: 'right', // מיישר את הטקסט לימין

  },
  userInfo: {
    fontSize: 16,
    color: '#555',
    padding: 15,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,

  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',

  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 24,
    height: 24,
    marginLeft: 10, // מרווח בין האייקון לטקסט
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  arrowIcon: {
    width: 16,
    height: 16,
    tintColor: '#aaa',
  },
  signOutButton: {
    marginBottom: 30,
    marginHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF5252',
    borderRadius: 5,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '80%',
    maxHeight: '70%', // מגביל את גובה המודל

    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    textAlign: 'right',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    width: '100%',
    padding: 10,
    marginBottom: 20,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: 'gray',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginRight: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Setting;
