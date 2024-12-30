import React, { useState,useEffect } from 'react';
import { View, Text,FlatList, ImageBackground, TouchableOpacity,Modal,TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set, onValue } from 'firebase/database';

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
  
  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = contacts.filter((contact) =>
      contact.displayName.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredContacts(filtered);
  };
  

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
        <Text style={styles.text1}>סיכום</Text>
        <Text style={styles.text2}>תודה שהגדרתם את תהליך שליחת ההזמנה, כעת ניתן לאשר את הפרטים הסופיים לפני שאנחנו ממשיכים בתכנון האירוע</Text>

        <Text style={styles.text3}>ההזמנה שלנו תוצג כך לאורחים</Text>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{eventDetails.message || "הודעה לא זמינה"}</Text>
        </View>

        <Text style={styles.text3}>ההזמנה שלנו תשלח לאורחים בתאריך:</Text>
        <Text style={styles.text4}>
          {eventDetails.message_date_hour?.date || "תאריך לא זמין"}
        </Text>

        <Text style={styles.text3}>בשעה:</Text>
        <Text style={styles.text5}>
          {eventDetails.message_date_hour?.time || "השעה לא זמינה"}
        </Text>

        <TouchableOpacity
          style={styles.viewGuestsButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.viewGuestsButtonText}>לחץ לצפיית ברשימת המוזמנים</Text>
        </TouchableOpacity>


        <Text style={styles.text3}>לאישור הפרטים נא ללחוץ ״אישור״</Text>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => props.navigation.navigate('RSVPs', { id })}
        >
          <Text style={styles.confirmButtonText}>אישור</Text>
        </TouchableOpacity>

      </View>

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
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
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
  justifyContent: 'center',
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
  alignItems: 'center',
  justifyContent: 'center',
  width: '60%',
},
viewGuestsButtonText: {
  color: 'white',
  fontSize: 15,
  fontWeight: 'bold',
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


});

export default RSVPsfive;
