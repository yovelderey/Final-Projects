import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity,Modal, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push,get, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

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
    setTimer(eventDetails.counter_contacts*40);
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

  const sendMessageToRecipients = async () => {
    try {
      setModalVisible(true);
      startTimer();
      const apiUrl = 'http://192.168.1.213:5000/send-messages';
      const recipients = contacts.map(contact => contact.phoneNumbers).filter(num => num.trim() !== '');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          message,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Response JSON:', result);
        if (result.success) {
          setResponses(result.responses);
          countResponses(result.responses);

          setTimeout(() => {
            setModalVisible(false);
          }, 0); // טוען למשך 10 שניות
        } else {
          Alert.alert('Error', 'Failed to send messages.');
          setTimeout(() => {
            setModalVisible(false);
          }, 0); // טוען למשך 10 שניות
        }
      } else {
        Alert.alert('Error', `Server returned status: ${response.status}`);
        setTimeout(() => {
          setModalVisible(false);
        }, 0); // טוען למשך 10 שניות
      }
    } catch (error) {
      console.error('Error:', error);
      setTimeout(() => {
        setModalVisible(false);
      }, 0); // טוען למשך 10 שניות
      Alert.alert('Error', 'Something went wrong.');
    }
  };


  const triggerWaitForResponse = async () => {
    try {
      setModalVisible(true);
      startTimer_2();
      const apiUrl = 'http://192.168.1.213:5000/trigger-wait-for-response';
  
      const recipients = contacts.map(contact => contact.phoneNumbers).filter(num => num.trim() !== '');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
        }),
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log('Response JSON:', result);
        if (result.success) {
          setResponses(result.responses);
          countResponses(result.responses);
          setTimeout(() => {
          setModalVisible(false);
          }, 0); // טוען למשך 10 שניות
        } else {
          Alert.alert('Error', 'Failed to trigger response wait.');
          setTimeout(() => {
          setModalVisible(false);
          }, 0); // טוען למשך 10 שניות
        }
      } else {
        Alert.alert('Error', `Server returned status: ${response.status}`);
        setTimeout(() => {
        setModalVisible(false);
        }, 0); // טוען למשך 10 שניות
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong.');
      setTimeout(() => {
      setModalVisible(false);
      }, 0); // טוען למשך 10 שניות
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

      const no_cuming = ref(database, `Events/${user.uid}/${id}/yes_caming/`);
      set(no_cuming, 0);
    }
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
            console.log('מרענן נתונים');
            handleReset();
            triggerWaitForResponse();
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
    <View style={styles.container}>
      <Text style={styles.header2}>הכנס הודעה לשליחה</Text>
      <TextInput
        style={styles.input}
        placeholder="הכנס את ההודעה שלך"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <TouchableOpacity onPress={handlemessage} style={styles.sendButton}>
        <Text style={styles.buttonText}>שלח הודעה</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => props.navigation.navigate('ResponsesScreen', { id, responses })}
        style={styles.viewResponsesButton}
      >
        <Text style={styles.buttonText}>הצג תגובות</Text>
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

      <TouchableOpacity onPress={handleRefresh} style={styles.triggerButton}>
        <Text style={styles.buttonText}>רענן נתונים</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => props.navigation.navigate('ListItem', { id })} style={styles.backButton}>
        <Text style={styles.buttonText}>חזור</Text>
      </TouchableOpacity>

      <View style={styles.tableContainer}>
        <Text style={styles.tableHeader}>מספרי טלפון שנשלחה אליהם הודעה</Text>
        <FlatList
          data={filteredContacts}
          renderItem={renderItem}
          keyExtractor={(item) => item.recordID}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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

    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  header2: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    marginTop: 40, // הוסף מרווח מעל התיבה
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
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
  counterText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 16,
    color: '#495057',
  },
  tableContainer: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
    // שאר הסגנונות שלך
    triggerButton: {
      backgroundColor: '#17a2b8',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 16,
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
});

export default RSVPs;