import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet , TouchableOpacity, } from 'react-native';
import { getDatabase, set } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage,ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';


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
const SeatedAtTable = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  const userId = props.route.params.id; // Accessing the unique user ID

  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    // Load user's image upon component mount
    loadImage(userId);
  }, []);

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      const uri = result.assets[0]?.uri;
      if (!uri) {
        console.error('No URI returned from ImagePicker');
        return;
      }
      setSelectedImage(uri);
      await saveImageToLocal(uri, userId); // Save the image locally with user's ID
    }
  };

  const saveImageToLocal = async (uri, userId) => {
    try {
      const fileName = uri.split('/').pop();
      const localUri = `${FileSystem.documentDirectory}${userId}/${fileName}`;
      // Check if directory exists, if not create it
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}${userId}`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}${userId}`, { intermediates: true });
      }
      await FileSystem.copyAsync({
        from: uri,
        to: localUri,
      });
      console.log('Image saved to local storage at', localUri);
    } catch (error) {
      console.error('Error saving image to local storage: ', error);
      throw error;
    }
  };

  const loadImage = async (userId) => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}${userId}`);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(`${FileSystem.documentDirectory}${userId}`);
        if (files.length > 0) {
          const firstImageUri = `${FileSystem.documentDirectory}${userId}/${files[0]}`;
          setSelectedImage(firstImageUri);
        }
      }
    } catch (error) {
      console.error('Error loading image from local storage: ', error);
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>סידורי הושבה</Text>

      {selectedImage ? (
        <TouchableOpacity onPress={selectImage} style={styles.imagePlaceholder}>
          <Image source={{ uri: selectedImage }} style={styles.imageBackground2} />
        </TouchableOpacity>
              ) : (
        <TouchableOpacity onPress={selectImage} style={styles.imagePlaceholder}>
          <Image source={require('../assets/uploadimg.png')} style={styles.imageBackground} />
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        onPress={() => props.navigation.navigate('ListItem', { id })}
        style={[styles.showPasswordButton, { position: 'absolute', top: '94%', left: '3%' }]}
      >
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,

  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  backIcon: {
    width: 50,
    height: 50,

  },
  imageBackground: {
    width: '100%',
    height: '100%',
    marginBottom: 20,
  },
  imageBackground2: {
    width: '100%',
    height: '110%',
    marginBottom: 20,
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePlaceholder: {
    width: '100%',
    height: '30%',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 70,
  },

});

export default SeatedAtTable;
