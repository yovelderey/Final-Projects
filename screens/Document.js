import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage'; // Ensure this import for Firebase Storage
import 'firebase/compat/auth'; // Ensure this import for Firebase Authentication

// Firebase configuration
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

// Get Firebase storage reference
const storage = firebase.storage();

const Document = (props) => {
  const [names, setNames] = useState(Array(10).fill(''));
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();
  const id = props.route.params.id; // Accessing the passed id

  useEffect(() => {
    const fetchUserId = async () => {
      const user = firebase.auth().currentUser;
      if (user) {
        setUserId(user.uid);
        console.log(`User ID: ${user.uid}`);
      } else {
        // Handle user not logged in
        Alert.alert("User not logged in");
      }
    };
    fetchUserId();
  }, []);

  const handleNameChange = (index, text) => {
    const newNames = [...names];
    newNames[index] = text;
    setNames(newNames);
  };

  const handleButtonPress = async (index) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(`ImagePicker result: ${JSON.stringify(result)}`);

    if (!result.canceled) {
      uploadImage(result.assets[0].uri, `image_${index}.jpg`);
    }
  };

  const uploadImage = async (uri, imageName) => {
    if (!userId) {
      Alert.alert("User ID not found. Please log in.");
      return;
    }
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ref = storage.ref().child(`users/${userId}/${id}/images/${imageName}`);
      
      const snapshot = await ref.put(blob);
      const downloadURL = await snapshot.ref.getDownloadURL();
      console.log(`Image uploaded successfully! URL: ${downloadURL}`);
      Alert.alert("Image uploaded successfully!");
    } catch (error) {
      console.error("Image upload failed:", error.message);
      Alert.alert("Image upload failed:", error.message);
    }
  };

  const addField = () => {
    setNames([...names, '']);
  };

  const removeField = () => {
    if (names.length > 1) {
      setNames(names.slice(0, -1));
    }
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Documents</Text>
      {names.map((name, index) => (
        <View key={index} style={styles.row}>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={(text) => handleNameChange(index, text)}
            placeholder={`Document ${index + 1}`}
          />
          <TouchableOpacity onPress={() => handleButtonPress(index)} style={styles.button}>
            <Text style={styles.buttonText}>Select Image</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={addField} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={removeField} style={styles.removeButton}>
          <Text style={styles.removeButtonText}>-</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    top: 30,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 50,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    borderColor: 'gray',
    borderWidth: 1,
    padding: 10,
    marginRight: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  removeButton: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 5,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  backButton: {
    position: 'absolute',
    bottom: 30,
    left: 10,
  },
  backIcon: {
    width: 50,
    height: 50,
  },
});

export default Document;
