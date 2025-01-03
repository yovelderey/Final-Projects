import React, { useState, useEffect } from 'react';
import { View, Text,Image, ImageBackground,TextInput, TouchableOpacity,Modal, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
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

  const startTimer_2 = () => {
    setTimer(eventDetails.counter_contacts*10);
    setIsRunning(true);
  };

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
    
    const startTimer = () => {
      setTimer(10);
      setIsRunning(true);
    };

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
      startTimer();
  
      // שליפת ההודעה מ-Firebase
      const messageRef = ref(database, `Events/${user.uid}/${id}/message`);
      const messageSnapshot = await get(messageRef);
      const messageFromFirebase = messageSnapshot.val();
  
      if (!messageFromFirebase) {
        Alert.alert('Error', 'No message found in Firebase.');
        setModalVisible(false);
        return;
      }
  
      const apiUrl = 'http://localhost:3000/webhook';
  
      // הפקת מספרי הטלפון מאנשי הקשר
      const recipients = contacts.map((contact) => contact.phoneNumbers).filter((num) => num.trim() !== '');
      const formattedContacts = recipients.map(formatPhoneNumber);
  
      // שליחת הנתונים לשרת
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formattedContacts,
          message: messageFromFirebase,
          imageUrl: invitationImageUrl || '', // שימוש ב-URL של התמונה או ערך ריק אם לא זמין

        }),
      });
  
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
  const handlemessage = () => {
    Alert.alert(
      "שליחת הודעות",
      "האם אתה בטוח לשלוח את ההודעה לנמענים?",
      [
        {
          text: "ביטול",
          style: "cancel",
        },
        {
          text: "אישור",
          onPress: () => {
            handleReset();
            sendMessageToRecipients();
          },
        },
      ]
    );
  };


  const handleRefresh = () => {
    Alert.alert(
      "רענון",
      " שים לב, פעולה זו מרעננת את הנותונים הקיימים בחדשים",
      [
        {
          text: "ביטול",
          style: "cancel",
        },
        {
          text: "אישור",
          onPress: () => {
            sendMessageToRecipients();
            //triggerWaitForResponse();
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.itemContainer, { backgroundColor: index % 2 === 0 ? '#f5f5f5' : '#ffffff' }]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.itemText}>{item.displayName}</Text>
          <Text style={styles.itemText}>{item.phoneNumbers}</Text>
        </View>
      </View>
    </View>
  );

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

      <View style={styles.counterContainer}>
        <View style={styles.counterItemGreen}>
          <Text style={styles.counterText}>{eventDetails.yes_caming}</Text>
          <Text style={styles.counterLabel}>כן</Text>
        </View>
        <View style={styles.counterItemYellow}>
          <Text style={styles.counterText}>{eventDetails.maybe}</Text>
          <Text style={styles.counterLabel}>ללא מענה</Text>
        </View>
        <View style={styles.counterItemRed}>
          <Text style={styles.counterText}>{eventDetails.no_cuming}</Text>
          <Text style={styles.counterLabel}>לא</Text>
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
      </View>
      <Text style={styles.header3}>ניתן לשלוח הודעה נוספת עכשיו למוזמנים, ההודעה תשלח בזה הרגע עם כיתוב שלכם </Text>

      <View style={styles.container2}>
        <TouchableOpacity onPress={handleRefresh} style={styles.triggerButton}>
          <Text style={styles.buttonText}>שלח הודעה עכשיו</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => props.navigation.navigate('ResponsesScreen', { id, responses })}
          style={styles.triggerButton2}
        >
          <Text style={styles.buttonText}>הצג תגובות</Text>
        </TouchableOpacity>
      </View>



      <Modal
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text>אנא המתן לשליחת ההודעות</Text>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.timerText}>{timer > 0 ? `${timer} seconds remaining` : 'Time is up!'}</Text>
      
      {/* כפתור ביטול פעולה */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => {
          // הוספת פונקציה לביטול שליחת ההודעות
          setModalVisible(false);
        }}
      >
        <Text style={styles.cancelButtonText}>ביטול</Text>
      </TouchableOpacity>
      
    </View>
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
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#343a40',
    marginTop: 10, // הוסף מרווח מעל התיבה
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
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterItemYellow: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterItemRed: {
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterItemblack: {
    backgroundColor: 'rgba(59, 187, 155, 0.9)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterItemblack1: {
    backgroundColor: 'rgba(152, 116, 153, 0.9)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterItemblack2: {
    backgroundColor: '#DEE2E6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 16,
    color: '#495057',
  },
  
  tableContainer: {
    marginTop: -5,

    borderRadius: 18,
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
      fontSize: 16,
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
      marginBottom: 10,
    },
    cardButton: {
      backgroundColor: 'rgba(108, 99, 255, 0.1)', // צבע רקע בהיר תואם לסגנון העמוד
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 15,
      marginVertical: 20,
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
    },
});

export default RSVPs;