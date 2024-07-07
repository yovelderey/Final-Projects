import React, { useEffect, useState } from 'react';
  import { View, ImageBackground, Button,Text, TouchableOpacity, StyleSheet } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { getDatabase, ref, remove,get } from 'firebase/database';
  import 'firebase/database'; // Import the Realtime Database module
  import  firebase from 'firebase/compat/app';
  import 'firebase/compat/auth';
  import 'firebase/compat/firestore';

  const firebaseConfig = {
    apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
    authDomain: "final-project-d6ce7.firebaseapp.com",
    projectId: "final-project-d6ce7",
    storageBucket: "final-project-d6ce7.appspot.com",
    messagingSenderId: "1056060530572",
    appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
    measurementId: "G-LD61QH3VVP"
  };

  if (!firebase.apps.length){
        firebase.initializeApp(firebaseConfig);
  }


  function ListItem(props) {

  const [displayText, setDisplayText] = useState('Click me');
  const database = getDatabase();
  const user = firebase.auth().currentUser;
  const id = props.route.params.id; // Accessing the passed id
  const [eventDetails, setEventDetails] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);


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
        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      }
    };

    fetchData();
  }, [user, id]);
  
  const selectImage = () => {
    launchImageLibrary({}, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.error('ImagePicker Error: ', response.error);
      } else {
        setSelectedImage(response.assets[0].uri);
      }
    });
  };

  return (
    <View style={styles.container}>
      {Object.keys(eventDetails).length > 0 ? (
        <>
          <Text style={styles.title}>{eventDetails.eventName}</Text>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.imageBackground} />
          ) : (
            <TouchableOpacity onPress={selectImage} style={styles.imagePlaceholder}>
              <Text style={styles.text}>Select an Image</Text>
            </TouchableOpacity>
          )}
          <View style={styles.buttonContainer}>
            {Array.from({ length: 6 }).map((_, index) => (
              <TouchableOpacity key={index} style={styles.button}>
                <Text style={styles.buttonText}>Button {index + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.text}>Loading...</Text>
      )}
      <Button title="Back" onPress={() => props.navigation.navigate('Main')} />
    </View>
  );
}
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Align items at the top
    alignItems: 'center',
    paddingTop: 50, // Add padding to the top
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  imageBackground: {
    width: '100%',
    height: '25%', // Adjusted height for a quarter of the screen
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: '100%',
    height: '25%',
    backgroundColor: '#d3d3d3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 50, // Adjusted to place buttons at the bottom of the screen
  },
  button: {
    width: '30%',
    height: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

  export default ListItem;
  