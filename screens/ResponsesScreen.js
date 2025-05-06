import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, remove, onValue, get, push } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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



const ResponsesScreen = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  const { navigation, route } = props;
  const { responses } = route.params;
  const [user, setUser] = useState(null);
  const [yesResponses, setYesResponses] = useState([]);
  const [noResponses, setNoResponses] = useState([]);
  const [maybeResponses, setMaybeResponses] = useState([]);
  const auth = getAuth();
  const database = getDatabase();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchResponses(currentUser.uid);
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  const fetchResponses = (userId) => {
    const yesRef = ref(database, `Events/${userId}/${id}/messages_status/yes/`);
    const noRef = ref(database, `Events/${userId}/${id}/messages_status/no/`);
    const maybeRef = ref(database, `Events/${userId}/${id}/messages_status/maybe/`);

    onValue(yesRef, (snapshot) => {
      const data = snapshot.val();
      setYesResponses(data ? Object.values(data) : []);
    });

    onValue(noRef, (snapshot) => {
      const data = snapshot.val();
      setNoResponses(data ? Object.values(data) : []);
    });

    onValue(maybeRef, (snapshot) => {
      const data = snapshot.val();
      setMaybeResponses(data ? Object.values(data) : []);
    });
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
  };

  const handleRefresh = () => {
    Alert.alert(
      "אישור מחיקה",
      "האם אתה בטוח שברצונך למחוק את הנתונים?",
      [
        {
          text: "ביטול",
          style: "cancel",
        },
        {
          text: "אישור",
          onPress: () => {
            console.log('הנתונים נמחקו');
            handleReset();
          },
        },
      ]
    );
  };

  
  const renderItem = ({ item }) => (
    <View style={styles.responseContainer}>
      <Text style={styles.responseText}>{item}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>תגובות</Text>

      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>כן</Text>
        <FlatList
          data={yesResponses}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>לא</Text>
        <FlatList
          data={noResponses}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>אין תגובה</Text>
        <FlatList
          data={maybeResponses}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.buttonText}>איפוס נתונים</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.buttonText}>חזור</Text>
        </TouchableOpacity>
      </View>


    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
    
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    textAlign: 'center',
    marginTop: 35,
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderColor: '#ced4da',
    borderWidth: 1,
    padding: 16,
    marginBottom: 6,
    height: 180, // גובה קבוע עבור כל טבלה
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: '#ff69b4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  responseContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  responseText: {
    fontSize: 16,
    color: '#495057',
  },
  separator: {
    height: 1,
    backgroundColor: '#ced4da',
    marginVertical: 16,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center', // מרכז את הכפתורים באמצע
    justifyContent: 'center', // וודא שהכפתורים מיושרים בצורה אנכית
    marginTop: 20, // רווח מהטבלאות לכפתורים
  },
  refreshButton: {
    backgroundColor: '#ff5733',
    padding: 8, // הגדלת גובה הכפתור
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',
    marginBottom: 12, // רווח בין הכפתורים
  },
  backButton: {
    backgroundColor: '#000',
    padding: 8, // הגדלת גובה הכפתור
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',

  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18, // הגדלת גודל הטקסט בכפתורים
  },
});

export default ResponsesScreen;
