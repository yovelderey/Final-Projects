import React, { useEffect, useRef,useState } from 'react';
import { View, Text,Animated, ImageBackground,TextInput, TouchableOpacity,Modal, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push,get, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStorage, ref as storageRef, listAll, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}



const RSVPs = (props) => {
  const [message, setMessage] = useState('שלום, הוזמנתם לחתונה של יובל וליאור בתאריך 15.9.2024 לפרטים ואישורי הגעה, לחץ *כן* לאישור, לחץ *לא* לסרוב, תודה צוות EasyVent');
  const [phoneNumbers, setPhoneNumbers] = useState(['']);
  const [responses, setResponses] = useState([]);
  const [yesCount, setYesCount] = useState(0);
  const [noCount, setNoCount] = useState(0);
  const [noResponseCount, setNoResponseCount] = useState(0);
  const id = props.route.params.id; // Accessing the passed id
  const [contacts, setContacts] = useState([]);
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [eventDetails, setEventDetails] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const auth = getAuth();
  const database = getDatabase();
  const [invitationImageUrl, setInvitationImageUrl] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [message2, setMessage2] = useState('אין כעת עדכונים'); // ברירת מחדל מעודכנת
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [isHelpModalVisible, setHelpModalVisible] = useState(false); // הוספת state עבור המודל


  useEffect(() => {

    const fetchData = async () => {
      if (user) {
        try {
          const databaseRef = ref(database, `Events/${user.uid}/${id}/`);
          const snapshot = await get(databaseRef);
          const fetchedData = snapshot.val();

          if (fetchedData) {
            setEventDetails(fetchedData); // Set the fetched event details
          }


          
          return () => clearInterval(intervalId);

        } catch (error) {
          //console.error("Error fetching data: ", error);
        }
      }
    };
    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        
        
        const databaseRef = ref(database, `Events/${currentUser.uid}/${id}/contacts`);
        onValue(databaseRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const contactsArray = Object.values(data);
            setContacts(contactsArray);
          } else {
            setContacts([]);
          }
        });
      } else {
        setUser(null);
        setContacts([]);
      }
    });

    fetchData();

  }, [user, id]);
  useEffect(() => {
    if (user) {
      const eventRef = ref(database, `Events/${user.uid}/${id}/`);
      
      const handleValueChange = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEventDetails(data);
        }
      };
      
      // Attach listener
      const unsubscribe = onValue(eventRef, handleValueChange);
      
      // Cleanup function
      return () => {
        unsubscribe(); // Call unsubscribe to remove the listener
      };
    }
  }, [user, id]);

  useEffect(() => {
    let interval = null;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const startTimer = () => {
    setTimer(eventDetails.counter_contacts*25);
    setIsRunning(true);
  };

  const animation = useRef(new Animated.Value(0)).current;

  const targetDate = new Date(eventDetails.message_date_hour?.date);


  useEffect(() => {
    // חישוב הימים שנותרו עד לתאריך היעד
    const interval = setInterval(() => {
      const currentDate = new Date();
      const timeDiff = targetDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (timeDiff > 0) {
        // מחשב ימים ושעות שנותרו
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        const hoursDiff = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
        const minutesDiff = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));
        
        if (daysDiff > 0) {
          setDaysLeft(`ההזמנות ישלחו עוד ${daysDiff} ימים ו-${hoursDiff} שעות`);
        } else {
          setDaysLeft(`ההזמנות ישלחו היום בעוד ${hoursDiff} שעות ו-${minutesDiff} דקות`);
        }
      } else if (timeDiff === 0) {
        setDaysLeft(`ההזמנות נשלחות היום בשעה ${eventDetails.message_date_hour?.time || "לא זמין"}`);
      } else {
        const daysPassed = Math.abs(Math.floor(timeDiff / (1000 * 3600 * 24)));
        const hoursPassed = Math.abs(Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600)));
        setDaysLeft(`ההזמנות נשלחו לפני ${daysPassed} ימים ו-${hoursPassed} שעות`);
      }

    }, 1000);

    // אנימציה חד-פעמית שמופיעה עם טעינת המסך
    Animated.timing(animation, {
      toValue: 1,
      duration: 4000, // זמן האנימציה
      useNativeDriver: true,
    }).start(); // מפעילים את האנימציה פעם אחת בלבד

    return () => clearInterval(interval);
  }, [eventDetails.eventDate]);

  const animatedStyle = {
    opacity: animation,
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.2],
        }),
      },
    ],
  };

  useEffect(() => {
    const fetchMessage = async () => {
      const database = getDatabase();
      const messageRef = ref(database, `notification/mesageRSVPs`); // הנתיב המעודכן

      try {
        setLoading(true); // התחלת טעינה
        const snapshot = await get(messageRef);

        if (snapshot.exists()) {
          setMessage2(snapshot.val()); // עדכון הטקסט מהנתיב
        }
      } catch (error) {
        console.error('Error fetching message:', error); // הדפסת השגיאה
      } finally {
        setLoading(false); // סיום הטעינה
      }
    };

    fetchMessage();
  }, []);

  const countResponses = (responses) => {
    let yes = 0;
    let no = 0;
    let noResponse = 0;

    responses.forEach(response => {
      if (response.response === 'כן') {
        yes += 1;
      } else if (response.response === 'לא') {
        no += 1;
      } else  {
        noResponse += 1;
      }
    });

    responses.forEach(response => {
      if (user) {
        let messages_status;
        if (response.response === 'כן') {
          messages_status = ref(database, `Events/${user.uid}/${id}/messages_status/yes/`);
        } else if (response.response === 'לא') {
          messages_status = ref(database, `Events/${user.uid}/${id}/messages_status/no/`);
        } else  {
          messages_status = ref(database, `Events/${user.uid}/${id}/messages_status/maybe/`);
        }
    
        if (messages_status) {
          push(messages_status, response.recipient);
        }
      }
    });
    

  

    setYesCount(yes);
    setNoCount(no);
    setNoResponseCount(noResponse);
    const yes_caming = ref(database, `Events/${user.uid}/${id}/yes_caming`);
    set(yes_caming, yes);

    const maybe = ref(database, `Events/${user.uid}/${id}/maybe`);
    set(maybe, noResponse);

    const no_cuming = ref(database, `Events/${user.uid}/${id}/no_cuming`);
    set(no_cuming, no);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumbers.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.newPrice && contact.newPrice.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function formatPhoneNumber(phoneNumber) {
    // Remove any non-numeric characters except for the plus sign
    phoneNumber = phoneNumber.replace(/[^0-9+]/g, '');
  
    // אם המספר מתחיל ב-0, מחליף את הקידומת ב-+972
    if (phoneNumber.startsWith('0')) {
      phoneNumber = `+972${phoneNumber.slice(1)}`;
    }
  
    // אם המספר לא מתחיל ב-+972, הוסף את הקידומת
    if (!phoneNumber.startsWith('+972')) {
      phoneNumber = `+972${phoneNumber}`;
    }
  
    return phoneNumber;
  }
  
  const fetchInvitationImage = async () => {
    try {
      const storage = getStorage();
      const folderPath = `users/${user.uid}/${id}/invitation/`;
      const listRef = storageRef(storage, folderPath);
  
      // קבלת רשימת הקבצים בתיקיית `invitation`
      const files = await listAll(listRef);
  
      if (files.items.length > 0) {
        // קבלת ה-URL של התמונה הראשונה
        const imageUrl = await getDownloadURL(files.items[0]);
        setInvitationImageUrl(imageUrl); // שמירת ה-URL של התמונה
      } else {
        console.log('No image found in invitation folder.');
        setInvitationImageUrl(null); // אין תמונה זמינה
      }
    } catch (error) {
      console.error('Error fetching invitation image:', error);
    }
  };
  
  useEffect(() => {
    if (user && id) {
      fetchInvitationImage();
    }
  }, [user, id]); // הטעינה מתבצעת כאשר `user` או `id` משתנים
  
  const sendMessageToRecipients = async () => {

    try {

      setModalVisible(true);
      const messageRef = ref(database, `Events/${user.uid}/${id}/message`);

      const messageSnapshot = await get(messageRef);
      const messageFromFirebase = messageSnapshot.val();
      console.log('-------1');

      if (!messageFromFirebase) {
        Alert.alert('Error', 'No message found in Firebase.');
        setModalVisible(false);
        return;
      }
      console.log('-------2');

      const apiUrl = 'http://localhost:3000/webhook';
      console.log('-------3');

      // הפקת מספרי הטלפון מאנשי הקשר
      const recipients = contacts.map((contact) => contact.phoneNumbers).filter((num) => num.trim() !== '');
      const formattedContacts = recipients.map(formatPhoneNumber);
  
      const currentDate = new Date().toISOString().split('T')[0];

      const eventDateRef = ref(database, `Events/${user.uid}/${id}/message_date_hour`);
      await set(eventDateRef, { ...eventDetails.message_date_hour, date: currentDate});

      const firstRowDateRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/0/col1`);
      await set(firstRowDateRef, currentDate);
      // שליחת הנתונים לשרת
      console.log('-------4');
      console.log('Formatted Contacts:', formattedContacts); // הדפסת רשימת אנשי הקשר המעובדים
      console.log('Message from Firebase:', messageFromFirebase); // הדפסת ההודעה שנשלפה מ-Firebase
      console.log('Image URL:', invitationImageUrl || ''); // הדפסת כתובת התמונה (או ערך ריק אם לא זמין)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          {
          formattedContacts,
          message: messageFromFirebase,
          imageUrl: invitationImageUrl || '', // שימוש ב-URL של התמונה או ערך ריק אם לא זמין

        }
      ),
      });
      console.log('-------5');

  
      if (response.ok) {
        const result = await response.json();
        console.log('Response JSON:', result);
  
        if (result.success) {
          setResponses(result.responses);
          countResponses(result.responses);
          setTimeout(() => setModalVisible(false), 0);
        } else {
          Alert.alert('Error', 'Failed to send messages.');
          setTimeout(() => setModalVisible(false), 0);
        }
      } else {
        Alert.alert('Error', `Server returned status: ${response.status}`);
        setTimeout(() => setModalVisible(false), 0);
      }
    } catch (error) {
      console.error('Error:', error);
      setTimeout(() => setModalVisible(false), 0);
      Alert.alert('Error', 'Something went wrong.');
    }
  };
  
  useEffect(() => {
    if (user && id) {
      const tableRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs`);
  
      // מאזין לשינויים בנתונים ב-Firebase
      const unsubscribe = onValue(tableRef, (snapshot) => {
        const data = snapshot.val();
  
        if (data) {
          // בדיקה אם הנתונים הם אובייקט והמרתם למערך במידת הצורך
          const formattedData = Array.isArray(data)
            ? data
            : Object.keys(data).map((key) => ({
                id: key,
                ...data[key],
              }));
  
  
          // עדכון ה-state עם הנתונים המעובדים
          setTableData(formattedData);
        } else {
          console.log('No data found in Firebase for Table_RSVPs');
          setTableData([]); // ניקוי ה-state אם אין נתונים
        }
      });
  
      // ביטול המאזין כשעוזבים את המסך
      return () => unsubscribe();
    }
  }, [user, id]);
  
  const handleReset = () => {
    if (user) {
      console.log('Refresh button handleReset');

      const yesRef = ref(database, `Events/${user.uid}/${id}/messages_status/yes/`);
      set(yesRef, {});

      const noRef = ref(database, `Events/${user.uid}/${id}/messages_status/no/`);
      set(noRef, {});

      const maybeRef = ref(database, `Events/${user.uid}/${id}/messages_status/maybe/`);
      set(maybeRef, {});

      const yes_caming = ref(database, `Events/${user.uid}/${id}/yes_caming/`);
      set(yes_caming, 0);

      const maybe = ref(database, `Events/${user.uid}/${id}/maybe/`);
      set(maybe, 0);

      const no_cuming = ref(database, `Events/${user.uid}/${id}/no_cuming/`);
      set(no_cuming, 0);
    }
    console.log('Refresh button finish');

  };

  const closeHelpModal = () => {
    setHelpModalVisible(false);
  };

  const handleRefresh = () => {
    const scheduledDate = eventDetails.message_date_hour?.date || "תאריך לא זמין"; // קבלת התאריך מהנתונים
    Alert.alert(
      "שלח הזמנות",
      `שים לב, פעולה זו תשלח את ההזמנות עכשיו לאורחים ותבטל את מועד ההזמנה הצפוי בתאריך ${scheduledDate}, מרגע השליחה אין אפשרות לחזור לאחור.`,
      [
        {
          text: "ביטול",
          style: "destructive", // הופך את הכפתור לאדום
        },
        {
          text: "שלח",
          onPress: () => {

            sendMessageToRecipients();
          },
        },
      ]
    );
  };
  

  useEffect(() => {
    if (user && id) {
      const tableRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs`);
  
      const unsubscribe = onValue(tableRef, (snapshot) => {
        const data = snapshot.val();
  
        if (data) {
          // אם הנתונים הם אובייקט, המרה למערך
          const formattedData = Array.isArray(data)
            ? data
            : Object.keys(data).map((key) => ({
                id: key,
                ...data[key],
              }));
  
          setTableData(formattedData);
        } else {
          console.log('No data found in Firebase for Table_RSVPs');
          setTableData([]); // אם אין נתונים, נקה את ה-state
        }
      });
  
      return () => unsubscribe(); // ביטול המאזין
    }
  }, [user, id]);
  


  return (
    

    <ImageBackground
      source={require('../assets/send_mesege_back.png')}
      style={styles.backgroundImage}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => props.navigation.navigate('ListItem', { id })}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>אישורי הגעה</Text>
      </View>


      <TouchableOpacity style={styles.cardButton} onPress={() => props.navigation.navigate('RSVPstwo', { id })}>
        <View style={styles.cardContent}>
          <Text style={styles.arrow}>←</Text>
          <View style={styles.separator} />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>עריכת הודעה</Text>
            <Text style={styles.cardSubtitle}>
              {eventDetails.message_date_hour?.date || "תאריך לא זמין"} בשעה {eventDetails.message_date_hour?.time || "השעה לא זמינה"}
            </Text>
            <Text style={styles.cardSubtitle}>ההודעה תשלח למוזמנים</Text>

          </View>
        </View>
      </TouchableOpacity>

    
      <View style={styles.container}>
        <Animated.Text style={[styles.countdownText, animatedStyle]}>
          {daysLeft || "לא זמין"}
        </Animated.Text>
      </View>



      <View style={styles.counterContainer}>
  <View style={styles.counterItemGreen}>
    <Text style={styles.counterText}>{eventDetails.yes_caming}</Text>
    <Text style={styles.counterLabel}>מגיעים</Text>
  </View>

  <View style={styles.counterItemMaybe}>
    <Text style={styles.counterText}>0</Text>
    <Text style={styles.counterLabel}>אולי</Text>
  </View>
  <View style={styles.counterItemRed}>
    <Text style={styles.counterText}>{eventDetails.no_cuming}</Text>
    <Text style={styles.counterLabel}>לא מגיעים</Text>
  </View>
  <View style={styles.counterItemYellow}>
    <Text style={styles.counterText}>{eventDetails.maybe}</Text>
    <Text style={styles.counterLabel}>ללא מענה</Text>
  </View>
</View>

<View style={styles.counterContainer}>
  <View style={styles.counterItemblack}>
    <Text style={styles.counterText}>{contacts.length}</Text>
    <Text style={styles.counterLabel}>מוזמנים</Text>
  </View>
  <View style={styles.counterItemblack1}>
    <Text style={styles.counterText}>{eventDetails.maybe}</Text>
    <Text style={styles.counterLabel}>נשלח</Text>
  </View>
  <View style={styles.counterItemblack2}>
    <Text style={styles.counterText}>{eventDetails.no_cuming}</Text>
    <Text style={styles.counterLabel}>לא נשלח</Text>
  </View>
  <TouchableOpacity
  style={styles.counterItemSMS}
  onPress={() => props.navigation.navigate('TabsScreen', { eventDetails, contacts })}
>
  <Text style={styles.counterLabelTop}>הצג</Text>
  <Text style={styles.counterLabelBottom}>הכל</Text>
</TouchableOpacity>


</View>


      <View style={styles.container2}>
        <TouchableOpacity onPress={handleRefresh} style={styles.triggerButton}>
          <Text style={styles.buttonText}>שלח הודעה עכשיו</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setHelpModalVisible(true)}
          style={styles.triggerButton2}
        >
          <Text style={styles.buttonText}>קבל מידע / עזרה</Text>
        </TouchableOpacity>



        
      </View>


      <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6c63ff" />
      ) : (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message2}</Text>
        </View>
      )}

      
    </View>

{/* טבלה מתחת לטקסט העדכונים */}
<View style={styles.tableContainer}>
  <View style={styles.headerRow}>
    <Text style={[styles.headerCell, styles.col3]}>שומש</Text>
    <Text style={[styles.headerCell, styles.col2]}>מכסה</Text>
    <Text style={[styles.headerCell, styles.col1]}>תאריך שליחה</Text>
    <Text style={[styles.headerCell, styles.col4]}>שם פעולה</Text>
    <Text style={[styles.headerCell, styles.col5]}>מספר</Text>

  </View>

  {tableData.length > 0 ? (
    <FlatList
  data={tableData}
  renderItem={({ item }) => {
    const currentDate = new Date();
    const itemDate = new Date(item.col1); // הנחת המבנה של `col1` הוא תאריך בפורמט נתמך
    
    // בדיקה אם התאריך חלף
    const isPastDate = itemDate <= currentDate;

    return (
      <View style={[styles.row, isPastDate && styles.pastDateRow]}>
        <Text style={[styles.cell, styles.col3]}>{item.col3}</Text>
        <Text style={[styles.cell, styles.col2]}>{item.col2}</Text>
        <Text style={[styles.cell, styles.col1]}>{item.col1}</Text>
        <Text style={[styles.cell, styles.col4]}>{item.col4}</Text>
        <Text style={[styles.cell, styles.col5]}>{item.col5}</Text>

      </View>
    );
  }}
  keyExtractor={(item) => item.id}
/>

  ) : (
    <Text style={{ textAlign: 'center', marginVertical: 20 }}>
      אין נתונים להצגה
    </Text>
  )}
</View>


<Modal
        visible={isHelpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeHelpModal}
      >
        <View style={styles.helpModalContainer}>
          <ImageBackground
            source={require('/Users/yovelderey/check_fp/my-classic-project/assets/backgruondcontact.png')}
            style={styles.helpModalBackground}
          >
            <TouchableOpacity
              onPress={closeHelpModal}
              style={styles.helpModalButton}
            >
              <Text style={styles.helpModalButtonText}>הבנתי</Text>
            </TouchableOpacity>
          </ImageBackground>
        </View>
      </Modal>

    </ImageBackground>
  );
};


const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',

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
  header2: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    marginTop: -775, // הוסף מרווח מעל התיבה
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  header3: {
    fontSize: 15,
    fontWeight: 'bold',

    marginBottom: -5,
    color: '#343a40',
    marginTop: -5, // הוסף מרווח מעל התיבה
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  input: {
    height: 100, // גובה של 8 שורות
    minHeight: 100,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top', // מאפשר כתיבה מהחלק העליון של השדה
  },
  input2: {
    height: 50, // גובה של 8 שורות
    minHeight: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top', // מאפשר כתיבה מהחלק העליון של השדה
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#ff5733',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },

  responseItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  responseText: {
    fontSize: 16,
    color: '#495057',
  },
  responsesHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#343a40',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
counterItemGreen: {
  backgroundColor: '#d4edda',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemYellow: {
  backgroundColor: '#D2B48C',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemRed: {
  backgroundColor: '#f8d7da',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemblack: {
  backgroundColor: 'rgba(59, 187, 155, 0.9)',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
 counterItemblack1: {
  backgroundColor: 'rgba(152, 116, 153, 0.9)',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemblack2: {
  backgroundColor: '#DEE2E6',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
  counterText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 16,
    color: '#495057',
  },
  counterLabel2: {
    fontSize: 16,
    color: '#495057',
  },

  tableHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  phoneNumberItem: {
    padding: 12,
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  oddRow: {
    backgroundColor: '#ffffff',
  },
  phoneNumberText: {
    fontSize: 16,
  },
  viewResponsesButton: {
    backgroundColor: '#ff69b4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
    // שאר הסגנונות שלך
    triggerButton: {
      flex: 1, // כל כפתור יתפוס שטח שווה
      backgroundColor: 'rgba(108, 99, 255, 0.9)', // צבע הרקע
      paddingVertical: 10, // גובה הכפתור
      marginHorizontal: 5, // רווח בין הכפתורים
      borderRadius: 10, // פינות מעוגלות
      alignItems: 'center', // יישור הטקסט למרכז
      justifyContent: 'center', // יישור הטקסט למרכז
    },
    triggerButton2: {
      flex: 1, // כל כפתור יתפוס שטח שווה
      backgroundColor: 'rgba(108, 99, 255, 0.9)', // צבע הרקע
      paddingVertical: 10, // גובה הכפתור
      marginHorizontal: 5, // רווח בין הכפתורים
      borderRadius: 10, // פינות מעוגלות
      alignItems: 'center', // יישור הטקסט למרכז
      justifyContent: 'center', // יישור הטקסט למרכז
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      width: 200,
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timerText: {
      fontSize: 16,
      marginTop: 10,
    },
    cancelButton: {
      marginTop: 20,
      padding: 10,
      backgroundColor: 'red',
      borderRadius: 5,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: 'white',
      fontSize: 16,
    },
    imageback: {
      width: 40,
      height: 40,
      marginTop: -810,
      marginRight: 300,
    },
    list: {
      flexGrow: 0, // כדי לאפשר גלילה
    },
    separator: {
      height: 1,
      backgroundColor: '#dddddd',
    },
    gif: {
      width: '101%',
      height: '101%',
  
    },
    itemContainer: {
      borderRadius: 5, // מוסיף פינות מעוגלות
      shadowColor: '#000', // מוסיף צל
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2, // הגדרה עבור Android
      marginBottom: 12,

    },
    itemText: {
      fontSize: 16,
      color: '#000',

    },
    title: {
      fontSize: 20,
      color: 'white',
      fontWeight: 'bold',
      marginBottom: -10,
    },
    cardButton: {
      backgroundColor: 'rgba(108, 99, 255, 0.1)', // צבע רקע בהיר תואם לסגנון העמוד
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 15,
      marginVertical: 10,
      width: '90%',
      alignSelf: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#6c63ff', // צבע כותרת
      textAlign: 'right',
    },
    
    cardSubtitle: {
      fontSize: 14,
      color: '#555',
      textAlign: 'right',
    },
    
    separator: {
      width: 1,
      height: '100%',
      backgroundColor: '#ccc', // צבע הקו המפריד
      marginHorizontal: 15,
    },
    
    arrow: {
      fontSize: 36,
      color: '#6c63ff', // צבע החץ
      fontWeight: 'bold',
    },
    textContainer: {
      flex: 1,
    },
    container2: {
      flexDirection: 'row', // מסדר את הילדים בשורה
      justifyContent: 'space-between', // רווח שווה בין הכפתורים
      alignItems: 'center',
      marginVertical: 20, // רווח מעל ומתחת לשורה
      width: '100%', // מוודא שכל הכפתורים יתיישרו לרוחב המסך
      paddingHorizontal: 20, // ריווח פנימי משני הצדדים
      marginBottom: 0,

    },

    countdownText: {
      width: '80%', // מוודא שהטקסט לא תופס את כל הרוחב
      fontSize: 16,
      fontWeight: 'bold',
      color: 'rgba(108, 99, 255, 0.9)',
      textAlign: 'center',
      padding: 8,
      backgroundColor: '#fff0f5',
      borderRadius: 7,
      shadowColor: 'rgba(108, 99, 255, 0.9)',
      shadowOpacity: 0.8,
      shadowRadius: 15,
      elevation: 10,
      marginTop: -5,
      marginBottom: 0,
    },
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
      marginBottom: -10,

    },
    messageBox: {
      backgroundColor: '#fff0f5', // רקע לתיבה
      padding: 12,
      borderRadius: 10, // פינות מעוגלות
      shadowColor: '#000', // צל
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3, // הצללה לאנדרואיד
      width: '100%',
    },
    messageText: {
      fontSize: 14,
      color: '000', // צבע הטקסט
      textAlign: 'center',
    },
tableContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,

  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#6c63ff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    
  },
  headerCell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right', // יישור לימין

  },
  list: {
    maxHeight: 180, // מגביל את הגובה של הרשימה
  },
  listContent: {
    paddingBottom: 60, // ריווח בתחתית הרשימה
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    
  },
  cell: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#333',
    
  },
  col1: {
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#333',
    flex: 2, // הקצאת רוחב גדול יותר לעמודה זו

  },
  col2: {

    textAlign: 'center',
    color: '#333',
  },
  col3: {
    textAlign: 'center',
    color: '#333',
    
  },
  col4: {
    textAlign: 'center',
    color: '#333',
    flex: 1.5, // הקצאת רוחב גדול יותר לעמודה זו

  },
  col5: {
    textAlign: 'center',
    color: '#333',
    flex: 0.7, // הקצאת רוחב גדול יותר לעמודה זו

  },
  greenText: {
  color: 'green',
  fontWeight: 'bold',
},
pastDateRow: {
  backgroundColor: 'green', // צבע רקע ירוק
},
helpModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // רקע חצי שקוף
  },
  helpModalBackground: {
    width: '90%',
    height: '70%',
    justifyContent: 'flex-end', // הכפתור בתחתית המודל
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden', // מונע תוכן שיוצא מהתמונה
  },
  helpModalButton: {
    backgroundColor: '#6c63ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20, // מרווח מתחתית המודל
    width: '50%',
    alignItems: 'center',
  },
  helpModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
counterItemMaybe: {
  backgroundColor: '#f0e68c', // צבע ייחודי
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemSMS: {
  backgroundColor: '#87ceeb', // צבע ייחודי
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
  alignItems: 'center',
  justifyContent: 'center', // יישור תוכן למרכז
},
counterLabelBottom: {
  fontSize: 16, // גודל הטקסט התחתון
  color: '#000', // צבע הטקסט

},

});

export default RSVPs;