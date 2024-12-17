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
  StatusBar,
  Modal,
} from 'react-native';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import firebase from 'firebase/compat/app';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TablePlanningScreen = ({ navigation, route }) => {

  const database = getDatabase();
  const user = firebase.auth().currentUser?.uid; // מזהה המשתמש הנוכחי
  const [size, setSize] = useState(55);       // גודל ברירת מחדל של הכפתור
  const [textSize, setTextSize] = useState(9); // גודל ברירת מחדל של הטקסט
  const [color, setColor] = useState('#4CAF50'); // צבע ברירת מחדל ירוק
  const [rotation, setRotation] = useState(0); // סיבוב ברירת מחדל של 0 מעלות
  const insets = useSafeAreaInsets();
  const [isLocked, setIsLocked] = useState(false); // מצב נעילה

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
      <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>ניהול שולחנות</Text>
      </View>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Image source={require('../assets/back_icon2.png')} style={styles.imageback} />
      </TouchableOpacity>

    <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={increaseSize}>
            <Image source={require('../assets/zoomin.png')} style={styles.imageback2} />

        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={decreaseSize}>
            <Image source={require('../assets/zoomout.png')} style={styles.imageback2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={changeColor}>
            <Image source={require('../assets/colorpalette.png')} style={styles.imageback2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={rotateTables}>
            <Image source={require('../assets/rotating.png')} style={styles.imageback2} />
        </TouchableOpacity>

          {/* כפתור נעילה */}
      <TouchableOpacity style={styles.button} onPress={() => setIsLocked(!isLocked)}>
        <Image
          source={isLocked ? require('../assets/lock.png') : require('../assets/lockopen.png')}
          style={styles.imageback2}
        />
      </TouchableOpacity>
    </View>

    <Modal visible={modalVisible} transparent={true} animationType="fade">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      {selectedTable && (
        <>
          <Text style={styles.modalTitle}>{selectedTable.name || 'פרטי שולחן'}</Text>
          <Text style={styles.modalSubTitle}>{`מספר אנשים: ${guests.length}`}</Text>

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

      {imageLoaded &&
        tables.map((table, index) => {
  let isDragging = false;

  return (
    <View
      key={table.id}
      {...panResponders[index]?.panHandlers}
      style={[
        styles.table,
        {
          transform: [
            { translateX: table.x },
            { translateY: table.y },
            { rotate: `${rotation}deg` },
          ],
          width: size,
          height: size,
          backgroundColor: color,
        },
      ]}
    >
    
      <View style={styles.fullSizeTouchable}>
        <Text style={[styles.tableText, { fontSize: size * 0.2 }]}>
              {`שולחן ${index + 1}`}
          </Text>
        <TouchableOpacity
          style={styles.touchableArea}
          activeOpacity={1}
          onPressIn={() => (isDragging = false)}
          onPressOut={() => {
            if (!isDragging && !isLocked) {
              openTableModal(table);
            }
          }}
        >

          <Text style={[styles.tableText, { fontSize: size * 0.2 }]}>
            {table.name || `שולחן ${index + 1} ללא שם`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
})
}
    <Text style={styles.centeredText}>הוראות שימוש</Text>
    <Text style={styles.centeredText2}>לפניך 5 כלים, מנעול - נעילת רשימת אורחים בשולחן, סיבוב - לסובב את השולחנות, צבע - לצבוע את השולחנות, זכוכיות מגדלת - זום אין זום אאוט. את השולחנות ניתן להזיז ולמקמם אותם על פני התרשים אולם שמוצג לפניכם כדי לקבל תאימות מרבית לסקיצה שלכם</Text>


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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    overflow: 'hidden',    // מונע חריגה של התוכן מהכפתור
    minWidth: 30,          // גודל מינימלי לכפתור
    minHeight: 30,         // גודל מינימלי לכפתור
  },
  
  tableText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,         // מאפשר לטקסט להתכווץ בתוך גבולות הכפתור
    maxWidth: '90%',       // מגביל את רוחב הטקסט
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -545,

  },
  button: {
    padding: 0,
    borderRadius: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // רקע כהה עם שקיפות
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10, // הצללה לאנדרואיד
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
  },
  modalSubTitle: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 15,
  },
  guestContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // הצללה לאנדרואיד
  },
  guestName: {
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    alignSelf: 'center',
    width: '50%',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  topBar: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'absolute',
    top: 0,
  },
  imageback: {
    width: 40,
    height: 40,
    position: 'absolute', // מאפשר מיקום מוחלט
    top: -595,              // לדוגמה: מיקום 10 פיקסלים מלמעלה
    right: 340,            // לדוגמה: מיקום 10 פיקסלים מימין
  },
  imageback2: {
    width: 28,
    height: 28,
    position: 'absolute', // מאפשר מיקום מוחלט
  },
touchableArea: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  height: '100%',
},
centeredText: {
  fontSize: 20,
  textAlign: 'center',
  marginTop: 550, // רווח מעל הטקסט
  fontWeight: 'bold', // הופך את הטקסט לבולד

},
centeredText2: {
  fontSize: 15,
  textAlign: 'center',
},
  
  
});

export default TablePlanningScreen;
