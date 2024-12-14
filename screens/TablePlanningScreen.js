import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Alert,
  Dimensions,
  FlatList,
  Modal,
} from 'react-native';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import firebase from 'firebase/compat/app';

const TablePlanningScreen = ({ navigation, route }) => {

  const database = getDatabase();
  const user = firebase.auth().currentUser?.uid; // מזהה המשתמש הנוכחי
  const [size, setSize] = useState(55);       // גודל ברירת מחדל של הכפתור
  const [textSize, setTextSize] = useState(9); // גודל ברירת מחדל של הטקסט
  const [color, setColor] = useState('#4CAF50'); // צבע ברירת מחדל ירוק
  const [rotation, setRotation] = useState(0); // סיבוב ברירת מחדל של 0 מעלות
  
  const { id, selectedImage, tableData } = route.params || {}; // קבלת הנתונים
  const [tables, setTables] = useState(
    tableData.map((table) => ({
      ...table,
      x: Dimensions.get('window').width / 2 - 50, // מיקום ברירת מחדל
      y: Dimensions.get('window').height / 2 - 50,
    }))
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  // שמירת מיקומי השולחנות בפיירבייס

  const saveTablesToFirebase = () => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }

    const tablesRef = ref(database, `Events/${user}/${id}/tablesPlace`);
    set(tablesRef, tables).catch((error) =>
      Alert.alert('שגיאה בשמירת השולחנות:', error.message)
    );
  };

// פונקציה כללית לשמירת כל ההגדרות בפיירבייס
const saveSettingsToFirebase = (updatedSettings) => {
    if (!user) return;
  
    const settingsRef = ref(database, `Events/${user}/${id}/settings`);
    set(settingsRef, {
      ...updatedSettings,
    }).catch((error) => Alert.alert('שגיאה בשמירת ההגדרות:', error.message));
  };
  
  // פונקציה להגדלת גודל השולחנות
  const increaseSize = () => {
    const newSize = size + 10;
    const newTextSize = textSize + 2;
    setSize(newSize);
    setTextSize(newTextSize);
    saveSettingsToFirebase({ size: newSize, textSize: newTextSize, color, rotation });
  };
  
  // פונקציה להקטנת גודל השולחנות
  const decreaseSize = () => {
    const newSize = size > 20 ? size - 10 : size;
    const newTextSize = textSize > 8 ? textSize - 2 : textSize;
    setSize(newSize);
    setTextSize(newTextSize);
    saveSettingsToFirebase({ size: newSize, textSize: newTextSize, color, rotation });
  };
  
  // פונקציה לשינוי צבע השולחנות
  const changeColor = () => {
    const colors = ['red', 'green', 'black'];
    const newColor = colors[(colors.indexOf(color) + 1) % colors.length];
    setColor(newColor);
    saveSettingsToFirebase({ size, textSize, color: newColor, rotation });
  };
  
  // פונקציה לסיבוב השולחנות
  const rotateTables = () => {
    const newRotation = rotation + 90;
    setRotation(newRotation);
    saveSettingsToFirebase({ size, textSize, color, rotation: newRotation });
  };
  

  useEffect(() => {
    if (!user) return;
  
    const settingsRef = ref(database, `Events/${user}/${id}/settings`);
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSize(data.size || 55);
        setTextSize(data.textSize || 9);
        setColor(data.color || '#4CAF50');
        setRotation(data.rotation || 0); // טעינת הסיבוב
      }
    });
  }, [user, id]);
    

  // טעינת מיקומי השולחנות מהפיירבייס
  useEffect(() => {
    if (!user) return;
  
    const tablesPlaceRef = ref(database, `Events/${user}/${id}/tablesPlace`);
    const tablesRef = ref(database, `Events/${user}/${id}/tables`);
  
    let tablePositions = [];
    let tableNames = {};
  
    // פונקציה למיזוג הנתונים
    const mergeData = () => {
      const mergedTables = tableNames
        ? Object.entries(tableNames).map(([key, name], index) => {
            const position = tablePositions.find((table) => table.id === key);
            return {
              id: key,
              name,
              x: position ? position.x : Dimensions.get('window').width / 2 - 50,
              y: position ? position.y : Dimensions.get('window').height / 2 - 50,
            };
          })
        : [];
  
      setTables(mergedTables);
    };


    // מאזין לנתוני המיקומים
    onValue(tablesPlaceRef, (snapshot) => {
      const data = snapshot.val();
      tablePositions = data || [];
      mergeData();
    });
  
    // מאזין לשמות השולחנות ומעדכן אוטומטית בעת שינוי
    onValue(tablesRef, (snapshot) => {
      const data = snapshot.val();
      tableNames = data
        ? Object.fromEntries(
            Object.entries(data).map(([key, table]) => [
              key,
              table.displayName || `שולחן ${key}`,
            ])
          )
        : {};
      mergeData();
    });
  }, [user, id]);
  
  

  
  

  // יצירת PanResponder לכל שולחן
  const panResponders = tables.map((table) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        setTables((prevTables) =>
          prevTables.map((t) =>
            t.id === table.id
              ? { ...t, x: t.x + gestureState.dx, y: t.y + gestureState.dy }
              : t
          )
        );
      },
      onPanResponderRelease: () => {
        saveTablesToFirebase(); // שמור את המיקום בפיירבייס לאחר שחרור
      },
    })
  );
  const [selectedTableGuests, setSelectedTableGuests] = useState([]);
  const [maxTablesFromSeatedAtTable, setMaxTablesFromSeatedAtTable] = useState(0);

useEffect(() => {
  if (user) {
    const maxTablesRef = ref(database, `Events/${user}/${id}/tables`);
    onValue(maxTablesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMaxTablesFromSeatedAtTable(Object.keys(data).length);
      } else {
        setMaxTablesFromSeatedAtTable(0);
      }
    });
  }
}, [user, id]);


/////////////////////////////////////////////////

  // הוספת שולחן חדש
  const addTable = () => {
    const newTableId = tables.length + 1;
    const newTable = {
      id: newTableId,
      name: `שולחן ${newTableId}`,
      x: Dimensions.get('window').width / 2 - 50,
      y: Dimensions.get('window').height / 2 - 50,
    };
    setTables([...tables, newTable]);
  };
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [guests, setGuests] = useState([]);

// פונקציה לפתיחת ה-Modal עם המידע של השולחן שנבחר
const openTableModal = (table) => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }

    setSelectedTable(table);

    const guestsRef = ref(database, `Events/${user}/${id}/tables/${table.id}/guests`);
    onValue(guestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGuests(Object.values(data));
      } else {
        setGuests([]);
      }
      setModalVisible(true);
    });
  };

  // פונקציה לסגירת ה-Modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedTable(null);
    setGuests([]);
  };
  // הסרת שולחן
  const removeLastTable = () => {
    if (tables.length === 0) return;
    const updatedTables = tables.slice(0, -1);
    setTables(updatedTables);
    saveTablesToFirebase();
  };


  useEffect(() => {
    //console.log('Table Data received22:', tableData);
    
    // מעבר על המערך והצגת כל שם
    tableData.forEach((table, index) => {
      console.log(`Table ${index + 1} name:`, table.name);
    });
  }, []);
  
  return (
    <View style={styles.container}>

    
      {/* תצוגת התמונה או הודעה במקרה שאין */}
      {selectedImage ? (
        <Image
          source={{ uri: selectedImage }}
          style={styles.image}
          onLoad={() => setImageLoaded(true)}
        />
      ) : (
        <Text style={styles.noImageText}>נא להעלות תמונה</Text>
      )}
      <Text style={styles.limitText}>
  {`שולחנות נוכחיים: ${tables.length}/${maxTablesFromSeatedAtTable}`}
</Text>
 {/* Modal להצגת האורחים בשולחן */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedTable && (
              <>
                <Text style={styles.modalTitle}>{selectedTable.name || 'פרטי שולחן'}</Text>
                <Text style={styles.modalSubTitle}>
                  {`מספר אנשים: ${guests.length}`}
                </Text>

                <FlatList
                  data={guests}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.guestContainer}>
                      <Text style={styles.guestName}>{item.displayName || 'ללא שם'}</Text>
                    </View>
                  )}
                />

                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <Text style={styles.closeButtonText}>סגור</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

{/* הצגת השולחנות */}
{imageLoaded &&
  tables.map((table, index) => {
    return (
        <View
  key={table.id}
  {...(panResponders[index]?.panHandlers || {})}
  style={[
    styles.table,
    {
      transform: [
        { translateX: table.x },
        { translateY: table.y },
        { rotate: `${rotation}deg` }, // הוספת סיבוב
      ],
      width: size,               // הגדרת רוחב לפי ה-state של הגודל
      height: size,              // הגדרת גובה לפי ה-state של הגודל
      backgroundColor: color,    // הגדרת צבע לפי ה-state של הצבע
    },
  ]}
>
  <Text style={[styles.tableText, { fontSize: textSize }]}>
    {`שולחן ${index + 1}`}
  </Text>
  <Text style={[styles.tableText, { fontSize: textSize }]}>
    {table.name || `שולחן ${index + 1} ללא שם`}
  </Text>
  <TouchableOpacity style={styles.infoButton} onPress={() => openTableModal(table)}>
            <Text style={styles.buttonText}>פרטים</Text>
          </TouchableOpacity>
</View>

    );
  })}

  <View style={styles.buttonsContainer}>
  <TouchableOpacity style={styles.button} onPress={increaseSize}>
    <Text style={styles.buttonText}>הגדל</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.button} onPress={decreaseSize}>
    <Text style={styles.buttonText}>הקטן</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.button} onPress={changeColor}>
    <Text style={styles.buttonText}>שנה צבע</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.button} onPress={rotateTables}>
    <Text style={styles.buttonText}>סובב</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
    <Text style={styles.buttonText}>חזור</Text>
  </TouchableOpacity>
</View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  noImageText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#888',
    marginTop: 20,
  },
  table: {
    position: 'absolute',
    width: 55,
    height: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  tableText: {
    color: '#fff',
    fontSize: 9,

    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  guestContainer: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  guestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  guestPhone: {
    fontSize: 14,
    color: '#555',
  },
  guestPrice: {
    fontSize: 14,
    color: '#777',
  },
  noGuestsText: {
    fontSize: 16,
    color: '#888',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // רקע כהה עם שקיפות
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  guestContainer: {
    width: '100%',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    shadowColor: '#aaa',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  guestName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  guestPhone: {
    fontSize: 16,
    color: '#555',
  },
  guestPrice: {
    fontSize: 16,
    color: '#777',
  },
  noGuestsText: {
    fontSize: 18,
    color: '#999',
    marginVertical: 20,
  },
  closeButton: {
    marginTop: 25,
    backgroundColor: '#ff4d4d',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default TablePlanningScreen;
