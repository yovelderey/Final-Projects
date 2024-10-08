import React, { useEffect, useState } from 'react';
import { View, TextInput, ImageBackground,ScrollView, StatusBar, TouchableOpacity, Image, Text, Alert, StyleSheet, Modal, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';



function Setting(props) {
  const navigation = useNavigation();
  const [displayText, setDisplayText] = useState('Hello!');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        console.log("The user is logged in:", authUser.email);
        setDisplayText(authUser.email);
      } else {
        console.log("The user is not logged in");
        setDisplayText('Not logged in');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'יציאה מהחשבון',
      'האם אתה בטוח שברצונך לצאת מהחשבון?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'צא',
          onPress: async () => {
            try {
              await firebase.auth().signOut();
              props.navigation.navigate('Main');
            } catch (e) {
              console.log(e);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleAddressBookPress = () => {
    setModalVisible(true);
  };

  const handleNeedHelpPress = () => {
    Alert.alert('מידע משפטי חשוב:    ', 'המידע באפליקציה זו מסופק כמידע כללי בלבד ואינו מהווה ייעוץ משפטי, פיננסי או מקצועי. השימוש באפליקציה אינו יוצר מערכת יחסים של עורך דין-לקוח או כל יחסים חוזיים אחרים עם המשתמשים.האפליקציה אינה אחראית לדיוק, לשלמות או לעדכניות של המידע המופיע בה, ולא תישא באחריות על נזקים כלשהם שנגרמו עקב הסתמכות על המידע שנמסר. המשתמש אחראי לוודא כל מידע מול מקורות מוסמכים לפני כל פעולה משפטית, פיננסית או מקצועית.', [{ text: 'סגור' }]);
  };

  const handleRateAppPress = () => {
    setRatingModalVisible(true);
  };

  const handleRating = (star) => {
    setRating(star);
    setRatingModalVisible(false);
    Alert.alert('תודה רבה', `אתה דרגת ב-  ${star} כוכבים!`);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <View style={styles.innerContainer}>
      <ImageBackground
          source={require('../assets/ezorishi.png')} // טוען את ה-GIF מהתיקייה המקומית
          style={styles.gif}
          resizeMode="cover" // כדי שה-GIF יכסה את כל המסך
        />          
       <Text style={{ marginTop: -620, marginHorizontal: 25, fontSize: 18 }}>שלום, {displayText}</Text>


        <View style={styles.toolbar_bag}>
          <TouchableOpacity onPress={handleAddressBookPress} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>עדכן כתובת</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNeedHelpPress} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>מידע משפטי</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRateAppPress} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>דרג אותנו</Text>
          </TouchableOpacity>



          <TouchableOpacity onPress={() => navigation.navigate('Manager')} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>איפוס סיסמה</Text>
          </TouchableOpacity>



        </View>

        <TouchableOpacity 
        onPress={handleSignOut}
        style={[styles.showPasswordButton, { position: 'absolute', top: '84%', left: '70%' }]}>
          <Text style={styles.text2}>התנתק</Text>
        </TouchableOpacity>

        <TouchableOpacity 
        onPress={() => navigation.navigate('Main')}
        style={[styles.showPasswordButton, { position: 'absolute', top: '93%', left: '61%' }]}>
          <Text style={styles.text}>חזור</Text>
        </TouchableOpacity>

        {/* Address Book Modal */}
        <Modal
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TextInput
                style={styles.modalInput}
                placeholder="שם רחוב"
                onChangeText={(text) => setStreet(text)}
                value={street}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="מספר בית"
                onChangeText={(text) => setHouseNumber(text)}
                value={houseNumber}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Zip קוד"
                onChangeText={(text) => setZipCode(text)}
                value={zipCode}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="כתובת"
                onChangeText={(text) => setAddress(text)}
                value={address}
              />
              <Button title="עדכן" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </Modal>

        {/* Rating Modal */}
        <Modal
          transparent={true}
          visible={ratingModalVisible}
          onRequestClose={() => setRatingModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>דרג את האפליקציה</Text>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                  <Text style={styles.star}>{star} כוכבים{star > 1 ? '' : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',

  },
  title: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  toolbar_bag: {
    width: '100%',
    alignItems: 'center',
  },
  toolbar_down: {
    width: '80%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: '#000', // Black border
    borderWidth: 2, // Thickness of the border
    borderRadius: 5, // Round corners (optional)
    alignItems: 'center', // Center the text horizontally
    justifyContent: 'center', // Center the text vertically
  },
  signOutButton: {
    backgroundColor: 'red',
  },
  text: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  text2: {
    fontSize: 20,
    color: '#000',
    fontWeight: '600',
  },
  img: {
    borderRadius: 50,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalInput: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  star: {
    fontSize: 18,
    marginVertical: 5,
  },
  gif: {
    width: '100%',
    height: '100%',

  },
});

export default Setting;
