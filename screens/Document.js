import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import 'firebase/compat/auth';
import 'firebase/compat/database'; // Import the Realtime Database module
import * as Progress from 'react-native-progress';
import 'firebase/database'; // Import the Realtime Database module

import { getDatabase, ref, set, onValue } from 'firebase/database';

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

const storage = firebase.storage();

const Document = (props) => {
  const [names, setNames] = useState(Array(1).fill(''));
  const [images, setImages] = useState(Array(1).fill(null));
  const [imageUrls, setImageUrls] = useState([]);
  const [progress, setProgress] = useState(Array(1).fill(0));
  const [userId, setUserId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const navigation = useNavigation();
  const id = props.route.params.id; // Accessing the passed id
  const database = getDatabase();
  const user = firebase.auth().currentUser;
  const [eventDetails, setEventDetails] = useState({});
  const [sizeOfimage, setsizeOfimage] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const user = firebase.auth().currentUser;
      if (user) {
        setUserId(user.uid);
        // Load saved data from Firebase
        loadSavedData(user.uid);
        // Load images from Firebase Storage
        loadImagesFromStorage(user.uid);

        if(eventDetails.eventName && imageUrls.length !== eventDetails.Numberofimage ){
          const databaseRefNumberofimag = ref(database, `Events/${user.uid}/${eventDetails.eventName}/Numberofimage/`);
          set(databaseRefNumberofimag, imageUrls.length)
        }

      } else {
        Alert.alert("משתמש לא מחובר");
      }
    };
    fetchUserId();
  }, [imageUrls,imageUrls.length]);

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

  // const handleButtonPress = async (index) => {
  //   // בדיקה אם מספר התמונות הכולל הוא 5 או יותר
  //   const totalImages = imageUrls.length + images.filter((img) => img !== null).length;
  //   if (totalImages >= 5) {
  //     Alert.alert('הגבלת כמות', 'לא ניתן להעלות יותר מ-5 תמונות.');
  //     return;
  //   }
  // פתיחת הגלריה לבחירת תמונה
  //   let result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     allowsEditing: true,
  //     aspect: [4, 3],
  //     quality: 1,
  //   });
  
  //   // אם המשתמש בחר תמונה ולא ביטל
  //   if (!result.canceled) {
  //     const timestamp = new Date().getTime(); // חותמת זמן ייחודית
  //     const imageName = `image_${timestamp}.jpg`;
  
  //     // העלאת התמונה
  //     uploadImage(result.assets[0].uri, imageName, index);
  
  //     // חישוב גודל התמונה במגה-בייט
  //     let sizeOfimageMB = sizeOfimage / 1048576;
  //     let temp = eventDetails.NumberofSizeimage + sizeOfimageMB;
  
  //     // עדכון גודל התמונות בפיירבייס
  //     const databaseRefNumberofSizeimag = ref(
  //       database,
  //       `Events/${user.uid}/${eventDetails.eventName}/NumberofSizeimage/`
  //     );
  //     set(databaseRefNumberofSizeimag, temp);
  
  //     console.log('sizeOfimage2:', sizeOfimage);
  //     console.log('sizeOfimageMB2:', sizeOfimageMB);
  
  //     // הצגת כל התמונות עם הגדלים שלהן
  //     const userId = firebase.auth().currentUser.uid;
  //     const imageDetails = await getAllImagesAndSizes(userId);
  
  //     imageDetails.forEach((image) => {
  //       console.log(`Image Name: ${image.name}, Size: ${image.sizeMB} MB`);
  //     });
  //   }
  // };
  

  const handleButtonPress = async (index) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const timestamp = new Date().getTime(); // Unique timestamp
      const imageName = `image_${timestamp}.jpg`;
      uploadImage(result.assets[0].uri, imageName, index);

      let sizeOfimageMB = sizeOfimage / 1048576;  
      let temp = (eventDetails.NumberofSizeimage + sizeOfimageMB);
      const databaseRefNumberofSizeimag = ref(database, `Events/${user.uid}/${eventDetails.eventName}/NumberofSizeimage/`);
      set(databaseRefNumberofSizeimag,temp)
     // console.log("temp2:",temp);
      console.log("sizeOfimage2:",sizeOfimage);
     // console.log("sizeOfimageMB2:",sizeOfimageMB);

      const userId = firebase.auth().currentUser.uid;
      const imageDetails = await getAllImagesAndSizes(userId);
    
      imageDetails.forEach(image => {
        console.log(`Image Name: ${image.name}, Size: ${image.sizeMB} MB`);
      });
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
          console.log(`Image ${index + 1} size: ${snapshot.totalBytes} bytes`);
          setsizeOfimage(snapshot.totalBytes);
        },
        error => {
          Alert.alert("Image upload failed:", error.message);
        },
        () => {
          uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
            const newImages = [...images];
            newImages[index] = downloadURL;
            setImages(newImages);
            Alert.alert("התמונה עלתה בהצלחה");
            saveData(); // Ensure to save data after upload



          });
        }
      );


    } catch (error) {
      console.error("Image upload failed:", error.message);
      Alert.alert("התמונה נכשלה:", error.message);
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
    }
  };

  const addField = () => {
    // בדיקה האם מספר התמונות הכולל קטן מ-5
    if (names.length + imageUrls.length < 5) {
      setNames([...names, '']);
      setImages([...images, null]);
      setProgress([...progress, 0]);
    } else {
      Alert.alert('הגבלת כמות', 'לא ניתן להעלות יותר מ-5 תמונות.');
    }
  };
  
    
  const removeField = () => {
    if (names.length > 1) { // Ensure at least one item
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
      const imageName = `image_${images[index].split('%2F').pop().split('?')[0]}`;
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
      
      Alert.alert("התמונה נמחקה!");


    } catch (error) {
      console.error("שגיאה בעת מחיקה:", error.message);
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
      
      Alert.alert("התמונה נמחקה!");
    } catch (error) {
      console.error("שגיאה בעת מחיקה:", error.message);
      Alert.alert("Image delete failed:", error.message);
    }
  };
    
  const navigateBack = () => {
    navigation.goBack();
  };

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

  const getAllImagesAndSizes = async (userId, id) => {
    try {
      // הפניה לתיקיית התמונות של המשתמש ב-Firebase Storage
      const storageRef = firebase.storage().ref(); 
      const imagesRef = storageRef.child(`users/${userId}/${id}/images/`);
  
  
      
      const result = await imagesRef.listAll(); 
      const imagesData = [];

      const db = getDatabase();
      const docRef = ref(db, `users/${userId}/${id}/images/`);
      console.log("docRef",docRef);

      for (const itemRef of result.items) {
        const metadata = await itemRef.getMetadata(); 
        const imageSizeInBytes = metadata.size;
  
        // המרה למגה-בייט
        const imageSizeInMB = (imageSizeInBytes / (1024 * 1024)).toFixed(2);
  
        // הוספת שם הקובץ והמשקל שלו למערך
        imagesData.push({
          name: metadata.name,
          sizeMB: imageSizeInMB,
        });

      }
  
      // החזרת המידע על כל התמונות
      return imagesData;
  
    } catch (error) {
      console.error('Error fetching image metadata:', error);
      return [];
    }
  };
  
  
    return (
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>קבלות ומסמכים</Text>
          </View>
          <View style={styles.buttonRow}>
          <Text style={styles.noItemsText}>          מספר הקבצים: {imageUrls.length} </Text>

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

                    <TouchableOpacity onPress={() => handleButtonPress(index)} style={styles.button2}>
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
                        width={345} 
                        height={12}
                        color="#4caf50" // צבע ה-Progress Bar עצמו
                        unfilledColor="#e0e0e0" // צבע החלק הלא ממולא
                        borderWidth={0} // הסרת הגבול של ה-Progress Bar
                        borderRadius={6} // עיגול פינות של ה-Progress Bar עצמו
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
        style={[styles.showPasswordButton, { position: 'absolute', top: '7%', left: '4%' }]}
      >
        <Image source={require('../assets/back_icon2.png')} style={styles.backIcon} />
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
        height: 100,
        marginTop: 50,
        alignItems: 'center',
      },
      header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
        marginTop: 0,
        padding: 15,

        alignItems: 'center',
        textAlign: 'center',

      },
      backIcon: {
        width: 40,
        height: 40,
    
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
        alignItems: 'center',
        marginHorizontal: 5, // מוסיף רווח בין האיטמים בצדדים


      },
      textInput: {
        borderColor: 'gray',
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginBottom: 10,
        fontSize: 16,
        width: '100%',
        alignItems: 'center',
      },
      button: {
        backgroundColor: '#000',
        padding: 12,
        borderRadius: 5,
        marginBottom: 10,
        alignItems: 'center',
      },
      button2: {
        backgroundColor: '#000',
        padding: 12,
        borderRadius: 5,
        marginBottom: 10,
        width: '100%',
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
        width: 80,
        height: 30,
        borderRadius: 15,
        marginTop: 10,
        padding: 5,

      },
      deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',

      },
      progressBar: {
        borderRadius: 6, // עיגול פינות
        backgroundColor: '#e0e0e0', // צבע רקע מאחורי ה-Progress Bar
        marginVertical: 10, // רווח מעל ומתחת ל-Progress Bar
        shadowColor: '#000', // צבע הצל
        shadowOffset: { width: 0, height: 2 }, // מיקום הצל
        shadowOpacity: 0.25, // שקיפות הצל
        shadowRadius: 3.84, // רדיוס הצל
        elevation: 5, // גובה הצל למכשירי אנדרואיד
      },
      buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Align items to the right
        marginTop: -50, // Add some space from the top
        marginRight: 10, // Space between buttons
        marginBottom: 5,

      },
      addButton: {
        backgroundColor: '#000',
        borderRadius: 5,
        alignItems: 'center',
        marginLeft: 10, // Space between buttons
        width: 30,
        height: 30,
        padding: 3,
      },
      removeButton: {
        backgroundColor: '#000',
        borderRadius: 5,
        alignItems: 'center',
        marginLeft: 5, // Space between buttons
        width: 30,
        height: 30,
        padding: 3,

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
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingBottom: 0,
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