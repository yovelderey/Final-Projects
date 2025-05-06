import React, { useState, useEffect } from 'react';
import { View, Text,StatusBar,Image, TextInput,ImageBackground, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { getDatabase, ref, set, get } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { Modal } from 'react-native';

const Providers = ({ route, navigation }) => {
  const { id } = route.params;
  const database = getDatabase();
  const user = firebase.auth().currentUser;
  const [showRecommendations, setShowRecommendations] = useState(false);

  // יצירת טבלה בגודל 3x3
  const createNewTable = () => ({
     // שינוי ברירת המחדל של שם הטבלה
    data: Array.from({ length: 5 }, () => Array(3).fill('')),
  });
  
  

  const [tables, setTables] = useState([createNewTable()]);

  // שמירת הנתונים ב-Firebase
  const saveToFirebase = (updatedTables) => {
    if (!user) {
      Alert.alert('שגיאה', 'המשתמש אינו מחובר.');
      return;
    }

    const databaseRef = ref(database, `Events/${user.uid}/${id}/Providers`);
    set(databaseRef, updatedTables)
      .then(() => console.log('הנתונים נשמרו בהצלחה!'))
      .catch(error => Alert.alert('Error', error.message));
  };

  // טעינת הנתונים מ-Firebase
  const loadFromFirebase = () => {
    if (!user) {
      Alert.alert('שגיאה', 'המשתמש אינו מחובר.');
      return;
    }

    const databaseRef = ref(database, `Events/${user.uid}/${id}/Providers`);
    get(databaseRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setTables(snapshot.val());
        }
      })
      .catch((error) => {
        Alert.alert('Error', error.message);
      });
  };

  useEffect(() => {
    loadFromFirebase();
  }, []);

  const handleAddTable = () => {
    const newTables = [...tables, createNewTable()];
    setTables(newTables);
    saveToFirebase(newTables);
  };
  const showAlert = () => {
    Alert.alert(
      'ניהול ספקים',
      'השוואה בין ספקים שונים בקטגוריות שונות כגון: אולמות, צלמים, אלכוהול וכו..\n\n' +
      'ניתן להוסיף ספקים להשוואה על ידי כפתור ה- + או להסרה על ידי כפתור ה- -.\n\n' +
      'ניתן להיכנס למרכז הספקים לצורך קבלת מידע או המלצות על ספק ולקבל חוות דעת.\n\n' +
      'תמיד נשמח להוסיף ספק חדש למאגר שלנו.\n\nתודה,\nצוות EasyVent.',
      [{ text: 'סגור' }]
    );
  };
  
  const handleRemoveLastTable = () => {
    if (tables.length > 1) {
      const newTables = tables.slice(0, -1);
      setTables(newTables);
      saveToFirebase(newTables);
    } else {
      Alert.alert('שגיאה', 'לא ניתן להסיר את הטבלה.');
    }
  };

  const handleClearAllTables = () => {
    Alert.alert(
      'אישור מחיקה',
      'האם אתה בטוח שברצונך למחוק את כל הטבלאות?',
      [
        { text: 'ביטול', style: 'cancel' },
        { 
          text: 'הסר', 
          style: 'destructive',
          onPress: () => {
            const newTables = [createNewTable()];
            setTables(newTables);
            saveToFirebase(newTables);
            Alert.alert('הצלחה', 'כל הטבלאות נמחקו בהצלחה.');
          }
        }
      ],
      { cancelable: true }
    );
  };
  

  // שינוי ערכי התא
  const handleInputChange = (text, tableIndex, rowIndex, colIndex) => {
    const newTables = [...tables];
    newTables[tableIndex].data[rowIndex][colIndex] = text;
    setTables(newTables);
    saveToFirebase(newTables);
  };

  // שינוי שם הטבלה
  const handleTableNameChange = (text, tableIndex) => {
    const newTables = [...tables];
    newTables[tableIndex].name = text;
    setTables(newTables);
    saveToFirebase(newTables);
  };

  const renderTable = (table, tableIndex) => (
    <View key={tableIndex} style={styles.tableContainer}>
      <TextInput
        style={styles.tableNameInput}
        value={table.name}
        onChangeText={(text) => handleTableNameChange(text, tableIndex)}
        placeholder="שם ספקים להשוואה"  // הוספת hint לשם הטבלה
      />

      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>מחיר</Text>
        <Text style={styles.headerCell}>תוכן</Text>
        <Text style={styles.headerCell}>שם</Text>

      </View>
      {table.data.map((row, rowIndex) => (
  <View key={rowIndex} style={styles.row}>
        {row.map((cell, colIndex) => (
          <TextInput
              key={`${tableIndex}-${rowIndex}-${colIndex}`}
              style={[styles.cell, colIndex === 2 && styles.smallText]} // הוספת הסגנון רק לעמודה השלישית
              value={cell || ''}
              onChangeText={(text) => handleInputChange(text, tableIndex, rowIndex, colIndex)}
              placeholder={
                colIndex === 2
                  ? tableIndex === 0
                    ? `אולם ${rowIndex + 1}`           // לטבלה הראשונה
                    : tableIndex === 1
                    ? `ספק אלכוהול ${rowIndex + 1}`    // לטבלה השנייה
                    : `ספקים נוספים ${rowIndex + 1}`   // לטבלה השלישית ומעלה
                  : ''
              }
            />

        ))}
      </View>
    ))}


    </View>
  );
  
//
  return (
  <ImageBackground source={require('../assets/backgruondcontact.png')} style={styles.background}>

    <StatusBar backgroundColor="rgba(108, 99, 255, 0.9)" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>ניהול ספקים</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate('ProvidersScreen')}>
        <View style={styles.cardContent}>
          <Text style={styles.arrow}>←</Text>
          <View style={styles.separator} />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>מאגר ספקים</Text>
            <Text style={styles.cardSubtitle}>רשימת ספקים מומלצת</Text>
          </View>
        </View>
      </TouchableOpacity>



      <View style={styles.buttonContainer}>

        <TouchableOpacity onPress={showAlert} style={styles.button}>
          <Image source={require('../assets/info.png')} style={styles.imageback2} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleClearAllTables} style={styles.button}>
          <Image source={require('../assets/broom.png')} style={styles.deleteIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddTable} style={styles.button}>
          <Image source={require('../assets/plus.png')} style={styles.icon2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRemoveLastTable} style={styles.button}>
         <Image source={require('../assets/minus-sign.png')} style={styles.icon2} />
        </TouchableOpacity>

      </View>



      <ScrollView>
        {tables.map((table, index) => renderTable(table, index))}
      </ScrollView>
     
    </ImageBackground>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  title: {
    marginTop: 25,
    color: '#fff', // טקסט כהה
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: -20,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    color: '#000', // טקסט כהה

  },

  
  buttonText: {
    color: '#000', // צבע טקסט סגול
    fontSize: 20,    
    fontWeight: 'bold',
    // גודל טקסט גדול יותר
  },
  
  tableContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // צבע רקע עם שקיפות
    padding: 15,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    width: '95%', // מקטין את הרוחב ל-90% מהרוחב הזמין
    alignSelf: 'center', // ממקם את הטבלה במרכז
  },
  
  
  tableNameInput: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#d1d1d1',
    paddingBottom: 5,
    color: '#333',
    textAlign: 'right', // יישור הטקסט לימין
  },
  
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(108, 99, 255, 0.9)', // סגול עם אטימות של 90%
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  imageback2: {
    width: 28,
    height: 28,
    marginRight: -7,

  },
  
  headerCell: {
    flex: 1,
    fontWeight: '600',
    color: '#fff', // טקסט לבן
    textAlign: 'center',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // יישור הכפתורים לצד ימין
    alignItems: 'center',
    marginVertical: 15,
    marginRight: 0, // הצמדת הכפתורים יותר לצד ימין
    marginBottom: 0,
    marginTop: -15,

  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 4, // הקטנת הרווח בין הכפתורים
    alignItems: 'center',
  },
  
  headerButtons: {
    marginBottom: -23,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    
  },
  backButtonText: {
    fontSize: 29,
    color: '#fff',
    marginBottom: 20,

  },
  backButtonText2: {
    fontSize: 36,
    color: '#fff',
    marginRight: -12, // מרווח מימין לכפתור חזרה


  },
  
  cell: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
    marginRight: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 249, 249, 0.7)', // רקע אפור בהיר עם אטימות של 70%
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
  },
  deleteIcon: {
    width: 28,
    height: 28,
    marginRight: -5,
  },
  navButton: {
    backgroundColor: '#ff6f61', // צבע אדום מודרני
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  icon2: {
    width: 20,
    height: 20,

  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  background: {
    flex: 1,
    resizeMode: 'cover', // התאמת התמונה לגודל המסך
    justifyContent: 'center',
  },
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  imageback: {
    width: 40,
    height: 40,
    position: 'absolute',
    top: 30, 
    left: -180, 
    zIndex: 0, 
  },
  smallText: {
    fontSize: 14, // גודל הכתב הרצוי
    color: '#000', // צבע אפור להבלטת ה-Hint
  },
 
  
  
  
  closeButton: {
    backgroundColor: '#FF4C4C',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  cardButton: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)', // צבע רקע בהיר תואם לסגנון העמוד
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginVertical: 20,
    width: '90%',
    alignSelf: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  textContainer: {
    flex: 1,
  },
  
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6c63ff', // צבע כותרת
    textAlign: 'right',
  },
  
  cardSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
  },
  
  separator: {
    width: 1,
    height: '100%',
    backgroundColor: '#ccc', // צבע הקו המפריד
    marginHorizontal: 15,
  },
  
  arrow: {
    fontSize: 36,
    color: '#6c63ff', // צבע החץ
    fontWeight: 'bold',
  },
  
});


export default Providers;
