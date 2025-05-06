import React, { useState, useEffect } from 'react';
import { View, Text, StatusBar, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import 'firebase/compat/auth';
import 'firebase/compat/database'; // Import the Realtime Database module
import * as Progress from 'react-native-progress';
import 'firebase/database'; // Import the Realtime Database module
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

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
      //console.error("Failed to load images:", error.message);
    }
  };

  const handleNameChange = (index, text) => {
    const newNames = [...names];
    newNames[index] = text;
    setNames(newNames);
    saveData();
  };

  const handleButtonPress = async (index) => {
    // בדיקה אם מספר התמונות הכולל הוא 5 או יותר
    const totalImages = imageUrls.length + images.filter((img) => img !== null).length;
    if (totalImages >= 10) {
      Alert.alert('הגבלת כמות', 'לא ניתן להעלות יותר מ-10 תמונות.');
      return;
    }
  // פתיחת הגלריה לבחירת תמונה
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    
    // אם המשתמש בחר תמונה ולא ביטל
    if (!result.canceled) {
      const timestamp = new Date().getTime(); // חותמת זמן ייחודית
      const imageName = `image_${timestamp}.jpg`;
  
      // העלאת התמונה
      uploadImage(result.assets[0].uri, imageName, index);
  
      // חישוב גודל התמונה במגה-בייט
      let sizeOfimageMB = sizeOfimage / 1048576;
      let temp = eventDetails.NumberofSizeimage + sizeOfimageMB;
  
      // עדכון גודל התמונות בפיירבייס
      const databaseRefNumberofSizeimag = ref(
        database,
        `Events/${user.uid}/${eventDetails.eventName}/NumberofSizeimage/`
      );
      set(databaseRefNumberofSizeimag, temp);
  
      console.log('sizeOfimage2:', sizeOfimage);
      console.log('sizeOfimageMB2:', sizeOfimageMB);
  
      // הצגת כל התמונות עם הגדלים שלהן
      const userId = firebase.auth().currentUser.uid;
      const imageDetails = await getAllImagesAndSizes(userId);
  
      imageDetails.forEach((image) => {
        console.log(`Image Name: ${image.name}, Size: ${image.sizeMB} MB`);
      });
    }
  };
  
  const confirmAndDownloadImage = (url) => {
    Alert.alert(
      "אישור הורדה",
      "האם אתה בטוח שברצונך להוריד את התמונה למכשיר?",
      [
        {
          text: "ביטול",
          style: "cancel", // פעולה שמבטלת את ההורדה
        },
        {
          text: "הורד",
          onPress: () => downloadImage(url), // מפעיל את ההורדה אם המשתמש מאשר
        },
      ],
      { cancelable: true } // מאפשר לסגור את הדיאלוג בלחיצה מחוץ לחלון
    );
  };
  
  const downloadImage = async (url) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('שגיאה', 'לא ניתנה הרשאה לשמירת קבצים');
        return;
      }
  
      const fileName = url.split('/').pop();
      const fileUri = FileSystem.documentDirectory + fileName;
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
  
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
      Alert.alert('הצלחה', 'התמונה נשמרה בהצלחה במכשיר');
    } catch (error) {
      console.error('שגיאה בהורדת התמונה:', error);
      Alert.alert('שגיאה', 'התרחשה שגיאה במהלך ההורדה');
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
    const totalImages = names.length + imageUrls.length;
    const maxImages = 10;
    
    // בדיקה האם ניתן להוסיף עוד תמונות
    if (totalImages < maxImages) {
      setNames([...names, '']);
      setImages([...images, null]);
      setProgress([...progress, 0]);
    } else {
      const remaining = maxImages - imageUrls.length;
      Alert.alert('הגבלת כמות', `לא ניתן להעלות יותר מ-${remaining} תמונות.`);
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
    Alert.alert(
      'אישור מחיקה',
      'האם ברצונך למחוק את התמונה?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'מחק',
          onPress: async () => {
            try {
              if (!userId) {
                Alert.alert('שגיאה', 'משתמש לא מחובר');
                return;
              }
  
              // חילוץ שם התמונה מה-URL
              const imageName = url.split('%2F').pop().split('?')[0];
              const ref = storage.ref().child(`users/${userId}/${id}/images/${imageName}`);
  
              // מחיקת התמונה מה-Storage
              await ref.delete();
  
              // עדכון ה-state לאחר מחיקה
              const newImageUrls = imageUrls.filter((imageUrl) => imageUrl !== url);
              setImageUrls(newImageUrls);
  
              Alert.alert('התמונה נמחקה בהצלחה');
            } catch (error) {
              console.error('שגיאה בעת מחיקה:', error.message);
              Alert.alert('שגיאה', 'התרחשה שגיאה במהלך המחיקה');
            }
          },
          style: 'destructive', // סגנון אדום לכפתור מחיקה
        },
      ],
      { cancelable: true }
    );
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
          <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
            <View style={[styles.header2, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>ניהול קבצים</Text>
            </View>
          <View style={styles.buttonRow}>

          <Modal visible={modalVisible} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>X</Text>
              </TouchableOpacity>
              <Image source={{ uri: currentImage }} style={styles.fullImage} />
            </View>
          </Modal>


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

                      </View>
                    )}
                    <Progress.Bar 
                        progress={progress[index]} 
                        width={345} 
                        height={12}
                        color='rgba(108, 99, 255, 0.9)' // צבע ה-Progress Bar עצמו
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
            <Text style={styles.noItemsText}>מספר הקבצים: {imageUrls.length} </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imageUrls.map((url, index) => (
                <View key={index} style={styles.itemContainer}>
                  {/* כפתור X למחיקה */}
                  <TouchableOpacity onPress={() => deleteStoredImage(url)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>X</Text>
                  </TouchableOpacity>

                  {/* תמונה */}
                  <TouchableOpacity onPress={() => openImageModal(url)}>
                    <Image source={{ uri: url }} style={styles.selectedImage} />
                  </TouchableOpacity>

                  {/* כפתור הורדה */}
                  <TouchableOpacity onPress={() => confirmAndDownloadImage(url)} style={styles.downloadButton}>
                    <Text style={styles.downloadButtonText}>הורד</Text>
                  </TouchableOpacity>

                </View>
              ))}
            </ScrollView>


          </View>

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
        marginTop: -15,
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
        marginTop: -12,
        marginBottom: 20,

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
        borderRadius: 10,
        marginBottom: 10,         // ריווח בין התמונה לכפתור
      },
      deleteButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'red',
        width: 25,
        height: 25,
        borderRadius: 12.5, // עיגול מושלם
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1, // כדי להבטיח שהכפתור יהיה מעל התמונה
      },
      deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
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
        marginTop: -40, // Add some space from the top
        marginRight: 10, // Space between buttons
        marginBottom: 5,

      },
      addButton: {
        borderRadius: 5,
        alignItems: 'center',
        marginLeft: 10, // Space between buttons

        padding: 3,
      },
      removeButton: {
        borderRadius: 5,
        alignItems: 'center',
        marginLeft: 5, // Space between buttons
  
        padding: 3,

      },
      addButtonText: {
        color: '#fff',
        fontSize: 30,

      },
      removeButtonText: {
        color: '#fff',
        fontSize: 30,
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
      },
      fullImage: {
        width: '100%',
        height: '80%',
        resizeMode: 'contain',
      },
      closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'red',
        width: 30,            // רוחב הכפתור
        height: 30,           // גובה הכפתור
        borderRadius: 20,     // רדיוס הפינות חצי מהרוחב/גובה לעיגול מושלם
        justifyContent: 'center',  // למרכז את הטקסט אנכית
        alignItems: 'center',      // למרכז את הטקסט אופקית
        zIndex: 1,
      },
      closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
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
      downloadButton: {
        backgroundColor: '#000', // צבע ירוק
        width: 80,
        height: 30,
        borderRadius: 15,
        marginTop: 5,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
      },
      downloadButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
      },
      header2: {
        width: '100%',
        backgroundColor: 'rgba(108, 99, 255, 0.9)',
        paddingTop: 50, // מרווח עליון מתחשב ב-Safe Area
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
        bottom: 20, // ממקם את הכפתור בתחתית ה-`header`
      },
      backButtonText: {
        fontSize: 29,
        color: 'white',
      },
      title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
      },
    });
    
    export default Document;