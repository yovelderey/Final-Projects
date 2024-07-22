import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import 'firebase/compat/auth';
import 'firebase/compat/database'; // Import the Realtime Database module
import * as Progress from 'react-native-progress';

const firebaseConfig = {
  // Config here
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const storage = firebase.storage();
const database = firebase.database();

const Document = (props) => {
    const [names, setNames] = useState(Array(10).fill(''));
    const [images, setImages] = useState(Array(10).fill(null));
    const [imageUrls, setImageUrls] = useState([]);
    const [progress, setProgress] = useState(Array(10).fill(0));
    const [userId, setUserId] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const navigation = useNavigation();
    const id = props.route.params.id; // Accessing the passed id
  
    useEffect(() => {
      const fetchUserId = async () => {
        const user = firebase.auth().currentUser;
        if (user) {
          setUserId(user.uid);
          // Load saved data from Firebase
          loadSavedData(user.uid);
          // Load images from Firebase Storage
          loadImagesFromStorage(user.uid);
        } else {
          Alert.alert("משתמש לא מחובר");
        }
      };
      fetchUserId();
    }, []);
  
    const loadSavedData = async (userId) => {
      try {
        const snapshot = await database.ref(`users/${userId}/${id}/documents`).once('value');
        const data = snapshot.val() || {};
        
        const names = [];
        const images = [];
        const progress = [];
        
        for (let key in data) {
          if (data[key].name) names.push(data[key].name);
          if (data[key].image) images.push(data[key].image);
          if (data[key].progress) progress.push(data[key].progress);
        }
        
        setNames(names);
        setImages(images);
        setProgress(progress);
      } catch (error) {
        console.error("Failed to load saved data:", error.message);
      }
    };
  
    const loadImagesFromStorage = async (userId) => {
      try {
        const listRef = storage.ref().child(`users/${userId}/${id}/images`);
        const res = await listRef.listAll();
        const urls = await Promise.all(res.items.map(itemRef => itemRef.getDownloadURL()));
        setImageUrls(urls);
      } catch (error) {
        console.error("Failed to load images:", error.message);
      }
    };
  
    const handleNameChange = (index, text) => {
      const newNames = [...names];
      newNames[index] = text;
      setNames(newNames);
      saveData();
    };
  
    const handleButtonPress = async (index) => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled) {
        uploadImage(result.assets[0].uri, `image_${index}.jpg`, index);
      }
    };
  
    const uploadImage = async (uri, imageName, index) => {
      if (!userId) {
        Alert.alert("User ID not found. Please log in.");
        return;
      }
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const ref = storage.ref().child(`users/${userId}/${id}/images/${imageName}`);
        
        const uploadTask = ref.put(blob);
    
        uploadTask.on(
          'state_changed',
          snapshot => {
            const progressValue = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const newProgress = [...progress];
            newProgress[index] = progressValue / 100; // Convert to a value between 0 and 1
            setProgress(newProgress);
          },
          error => {
            console.error("Image upload failed:", error.message);
            Alert.alert("Image upload failed:", error.message);
          },
          () => {
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
              const newImages = [...images];
              newImages[index] = downloadURL;
              setImages(newImages);
              Alert.alert("Image uploaded successfully!");
              saveData(); // Ensure to save data after upload
            });
          }
        );
      } catch (error) {
        console.error("Image upload failed:", error.message);
        Alert.alert("Image upload failed:", error.message);
      }
    };
  
    const saveData = async () => {
      if (!userId) return;
      
      const updates = {};
      names.forEach((name, index) => {
        updates[`users/${userId}/${id}/documents/${index}`] = {
          name,
          image: images[index],
          progress: progress[index],
        };
      });
  
      try {
        await database.ref().update(updates);
      } catch (error) {
        console.error("Failed to save data:", error.message);
      }
    };
  
    const addField = () => {
        if (names.length < 10) { // מגבלה של 10 פריטים
          setNames([...names, '']);
          setImages([...images, null]);
          setProgress([...progress, 0]);
        }
      };
      
      const removeField = () => {
        if (names.length > 1) { // להבטיח שיהיה לפחות פריט אחד
          setNames(names.slice(0, -1));
          setImages(images.slice(0, -1));
          setProgress(progress.slice(0, -1));
        }
      };
      
  
    const openImageModal = (image) => {
      setCurrentImage(image);
      setModalVisible(true);
    };
  
    const deleteImage = async (index) => {
      if (!userId) {
        Alert.alert("User ID not found. Please log in.");
        return;
      }
    
      try {
        // Get the image name
        const imageName = `image_${index}.jpg`;
        const ref = storage.ref().child(`users/${userId}/${id}/images/${imageName}`);
        
        // Delete the image from Firebase Storage
        await ref.delete();
        
        // Clear image URL from state and Firebase Database
        const newImages = [...images];
        newImages[index] = null;
        setImages(newImages);
        
        const updates = {};
        updates[`users/${userId}/${id}/documents/${index}/image`] = null;
        await database.ref().update(updates);
        
        Alert.alert("Image deleted successfully!");
      } catch (error) {
        console.error("Image delete failed:", error.message);
        Alert.alert("Image delete failed:", error.message);
      }
    };
  
    const deleteStoredImage = async (url) => {
        if (!userId) {
          Alert.alert("User ID not found. Please log in.");
          return;
        }
      
        try {
          // Extract image name from URL
          const imageName = url.split('%2F').pop().split('?')[0];
          const ref = storage.ref().child(`users/${userId}/${id}/images/${imageName}`);
          
          // Delete the image from Firebase Storage
          await ref.delete();
          
          // Update state
          const newImageUrls = imageUrls.filter(imageUrl => imageUrl !== url);
          setImageUrls(newImageUrls);
          
          Alert.alert("Image deleted successfully!");
        } catch (error) {
          console.error("Image delete failed:", error.message);
          Alert.alert("Image delete failed:", error.message);
        }
      };
      
    const navigateBack = () => {
      navigation.goBack();
    };
  
    return (
        <View style={styles.container}>

      
          <View style={styles.headerContainer}>
            <Text style={styles.header}>קבלות ומסמכים</Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={addField} style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={removeField} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>-</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollViewContainer} style={styles.scrollContainer}>
            {names.length === 0 ? (
              <Text style={styles.noItemsText}>אין מסמכים להצגה</Text>
            ) : (
              names.map((name, index) => (
                <View key={index} style={styles.itemBackground}>
                  <View style={styles.itemContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={(text) => handleNameChange(index, text)}
                      placeholder={`מסמך ${index + 1}`}
                    />
                    <TouchableOpacity onPress={() => handleButtonPress(index)} style={styles.button}>
                      <Text style={styles.buttonText}>בחר תמונה</Text>
                    </TouchableOpacity>
                    {images[index] && (
                      <View style={styles.imageContainer}>
                        <TouchableOpacity onPress={() => openImageModal(images[index])}>
                          <Image source={{ uri: images[index] }} style={styles.selectedImage} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteImage(index)} style={styles.deleteButton}>
                          <Text style={styles.deleteButtonText}>מחק</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <Progress.Bar 
                      progress={progress[index]} 
                      width={300} 
                      style={styles.progressBar} 
                    />
                  </View>
                </View>
              ))
            )}
          </ScrollView>
      
          <View style={styles.storedImagesContainer}>
            <Text style={styles.header}>תמונות מאוחסנות</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imageUrls.map((url, index) => (
                <View key={index} style={styles.itemContainer}>
                  <TouchableOpacity onPress={() => openImageModal(url)}>
                    <Image source={{ uri: url }} style={styles.selectedImage} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteStoredImage(url)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>מחק</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
      
          <TouchableOpacity 
        onPress={() => props.navigation.navigate('ListItem', { id })}
        style={[styles.showPasswordButton, { position: 'absolute', top: '92%', left: '4%' }]}
      >
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
        </View>
      );
      
      
    };
    
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
      },
      contentContainer: {
        flex: 1,
      },
      headerContainer: {
        padding: 15,
        height: 100,
        marginTop: 0,
        backgroundColor: '#ff69b4',
        alignItems: 'center',
      },
      header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
        marginTop: 40,

      },

      backIcon: {
        width: 50,
        height: 50,
    
      },
      backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
      },
      documentsContainer: {
        flex: 1,
        padding: 10,
      },
      noItemsText: {
        fontSize: 18,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
      },
      itemBackground: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
      },
      itemContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      textInput: {
        borderColor: 'gray',
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginBottom: 10,
        fontSize: 16,
      },
      button: {
        backgroundColor: '#007BFF',
        padding: 12,
        borderRadius: 5,
        marginBottom: 10,
        alignItems: 'center',
      },
      buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
      },
      imageContainer: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
      },
      selectedImage: {
        width: 100,
        height: 100,
        borderRadius: 5,
        marginRight: 10,
      },
      deleteButton: {
        backgroundColor: '#FF4C4C',
        padding: 10,
        borderRadius: 5,
      },
      deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
      },
      progressBar: {
        marginTop: 10,
      },
      buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 10,
      },
      addButton: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 5,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
      },
      removeButton: {
        backgroundColor: '#dc3545',
        padding: 12,
        borderRadius: 5,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
      },
      addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
      },
      removeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
      },
      storedImagesContainer: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingBottom: 20,
      },
      horizontalScroll: {
        flexDirection: 'row',
      },
      modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
      },
      fullImage: {
        width: '100%',
        height: '80%',
        resizeMode: 'contain',
      },
      closeButton: {
        position: 'absolute',
        bottom: 30,
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 5,
      },
      closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
      },
      backButton: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
      },
      backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
      },
    });
    
    export default Document;