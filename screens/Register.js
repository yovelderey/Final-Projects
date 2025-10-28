import React, { useState } from 'react';
import { View, TextInput, Alert, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

function Register(props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [fullname, setFullname] = useState('');
  const [isChecked, setIsChecked] = useState(false); // state for checkbox

  const auth = getAuth();
  const navigation = useNavigation();

  const showAlert = () => {
    Alert.alert('מידע למשתמש', 'כללי אפליקציה זו נועדה לספק פלטפורמה נוחה לשימוש עבור הזמנות לחתונות, תוך שמירה על פרטיות המשתמשים והתאמה לחוקי ההגנה על מידע. השימוש באפליקציה מותנה בקבלת כלל תנאי התקנון המפורטים להלן. השימוש באפליקציה מהווה אישור כי קראתם והסכמתם לכלל התנאים המפורטים במסמך זה. הגדרת המשתמשים משתמשים באפליקציה הם כל אדם שהוריד והתקין את האפליקציה, וכן כל אדם המקבל או שולח הזמנות לאירועים באמצעותה. המשתמש מתחייב להיות בגיל 18 ומעלה ולהשתמש באפליקציה בהתאם לחוקי המדינה בה הוא מתגורר. מטרת האפליקציה מטרת האפליקציה היא לאפשר שליחה וקבלת הזמנות לאירועים, בדגש על חתונות, בצורה דיגיטלית ונוחה. המשתמש יכול להעלות פרטי אירוע, לשלוח הזמנות לאורחים, ולנהל את התשובות המתקבלות. פרטיות ושמירת מידע החברה המחזיקה באפליקציה מתחייבת לשמירה על פרטיות המשתמשים בהתאם לחוקי הגנת המידע. כל המידע הנמסר על ידי המשתמשים, כולל פרטי האורחים ומידע אישי אחר, ישמש אך ורק למטרות הקשורות לתפעול האפליקציה ולא יועבר לצד שלישי ללא אישור מפורש של המשתמש, אלא במקרים שהחוק מחייב זאת. שימוש במידע אישי המשתמש מתחייב כי כל המידע הנמסר לאפליקציה, כולל שמות האורחים, מספרי הטלפון ופרטי האירוע, ייעשה ברשותם של כל הנוגעים בדבר. המשתמש מתחייב שלא לעשות שימוש לרעה בפרטי המוזמנים ולא למסור מידע כוזב. אחריות המשתמש המשתמש אחראי בלעדית לתוכן המוזן לאפליקציה, כגון פרטי האירוע, תמונות והודעות. על המשתמש להימנע משימוש בתוכן פוגעני, משפיל או בלתי חוקי. במקרה של הפרת תנאים אלו, החברה רשאית להסיר את המשתמש מהשירות ללא התראה מוקדמת. הגבלת אחריות החברה החברה המפעילה את האפליקציה אינה נושאת באחריות לכל נזק ישיר או עקיף הנגרם למשתמש או לצד שלישי כתוצאה משימוש באפליקציה, לרבות עיכובים, שגיאות, תקלות טכניות, או שיבושים במערכת. האפליקציה מסופקת "כמות שהיא", והחברה אינה מתחייבת לפעילות רציפה ונטולת שגיאות. שימוש הוגן המשתמש מתחייב להשתמש באפליקציה לצרכים אישיים בלבד, ולא למטרות מסחריות או פרסומיות ללא הסכמת החברה. כל שימוש המנוגד לכך עשוי להוביל לחסימת המשתמש ולאי יכולתו להמשיך להשתמש בשירותי האפליקציה. שינויים ועדכונים באפליקציה החברה רשאית לשנות ולעדכן את האפליקציה, כולל ממשק המשתמש, תכונות ומדיניות הפרטיות, בכל עת וללא הודעה מוקדמת. מומלץ למשתמשים לעקוב אחר עדכונים ולהתעדכן בתנאי השימוש החדשים. תמיכה ושירות לקוחות החברה מציעה שירותי תמיכה טכנית דרך פלטפורמות התקשורת הרשמיות שלה. במקרה של תקלה טכנית או שאלה בנושא השימוש באפליקציה, ניתן לפנות לשירות הלקוחות ולקבל מענה בהתאם לשעות הפעילות המפורסמות. תנאים כספיים השימוש הבסיסי באפליקציה הוא חינמי. עם זאת, ייתכן שחלק מהשירותים באפליקציה יהיו כרוכים בתשלום נוסף, אשר יפורט בנפרד בהתאם לתוכנית השימוש שתבחר. משתמש המבצע רכישות או משלם עבור שירותים מיוחדים אינו זכאי להחזר כספי, אלא אם נקבע אחרת בחוק. זכויות יוצרים כל התכנים באפליקציה, לרבות עיצובים, טקסטים, קוד, ותמונות, הם רכוש החברה או צדדים שלישיים שקיבלו הרשאה לשימוש בתכנים אלו. חל איסור מוחלט להעתיק, להפיץ, לשנות או להשתמש בתכנים אלו ללא אישור מפורש של החברה. עדכון אחרון: אוגוסט 2024', [{ text: 'הבנתי' }]);
  };

  const handleRegister = () => {
    if (!isChecked) {
      Alert.alert('תקנון',"נא לאשר את התקנון.");
      return;
    }

    if (password !== passwordAgain) {
      alert("אין התאמה בין הסיסמאות");
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const database = getDatabase();
        const databaseRef = ref(database, 'users/' + user.uid);

        const userData = {
          email: user.email,
          displayName: fullname,
        };

        set(databaseRef, userData)
          .then(() => {
            console.log('Data written to the database successfully');
            props.navigation.navigate('Main');
          })
          .catch((error) => {
            console.error('Error writing data to the database:', error);
          });
      })
      .catch((error) => {
        alert(',ebui','ההרשמה נכשלה. ' + error.message);
      });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('LoginEmail')}>
        <Image source={require('../assets/backicontwo.png')} style={styles.imageback} />
      </TouchableOpacity>

      <Image source={require('../assets/shalom_oreah.png')} style={styles.loginText} />

      <View style={styles.container2}>
        <TextInput
          style={styles.input}
          placeholder="שם מלא"
          keyboardType="email-address"
          onChangeText={text => setFullname(text)}
        />
        <TextInput
          style={styles.input}
          placeholder="אימייל"
          keyboardType="email-address"
          onChangeText={text => setEmail(text)}
        />
        <TextInput
          style={styles.input}
          placeholder="סיסמה"
          onChangeText={text => setPassword(text)}
          textContentType="password"
          secureTextEntry={true}
        />
        <TextInput
          style={styles.input}
          placeholder="אימות סיסמה"
          onChangeText={text => setPasswordAgain(text)}
          textContentType="password"
          secureTextEntry={true}
        />

      </View>
      <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setIsChecked(!isChecked)}
        >
          <View style={styles.checkbox}>
            {isChecked && <View style={styles.checkboxChecked} />}
          </View>
          <Text style={styles.checkboxLabel}>קראתי ואני מסכים לתקנון</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={showAlert} style={styles.showPasswordButton}>
          <Image source={require('../assets/readtakanon.png')} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRegister} style={styles.phoneButton}>
          <Image source={require('../assets/button_reshum.png')} />
        </TouchableOpacity>

        <Text style={styles.footerText}>כל הזכויות שמורות EasyVent©</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  container2: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -100,
  },
  input: {
    width: '90%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'orange',
    textAlign: 'right',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -110,

  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    backgroundColor: 'orange',
  },
  checkboxLabel: {
    fontSize: 16,
    color: 'black',
    marginLeft: 10,
  },
  phoneButton: {
    marginBottom: 70,
  },
  showPasswordButton: {
    marginTop: 120,
    marginBottom: 90,

  },
  loginText: {
    marginTop: 10,
  },
  imageback: {
    width: 40,
    height: 40,
    marginTop: 50,
    marginRight: 300,
  },
  footerText: {
    position: 'absolute',
    bottom: 20, // מרחק מהתחתית
    fontSize: 13,
    color: 'gray',
    marginTop: 150  // לשמור על היחס המקורי של התמונה

  },
});

export default Register;
