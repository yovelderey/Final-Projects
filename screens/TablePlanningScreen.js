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
import { getDatabase, ref, set,remove, onValue } from 'firebase/database';
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
  const [showLockMessage, setShowLockMessage] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const minY = 175;           // הגובה המינימלי לגרירה (לדוגמה: 100 פיקסלים)
  const maxY = screenHeight - 210; // הגובה המקסימלי לגרירה (לדוגמה: 200 פיקסלים מתחתית המסך)
  const [responses, setResponses] = useState({});

  const { id, selectedImage, tableData,selectedSize } = route.params || {}; // קבלת הנתונים
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

  
  const renderTableIcon = (size) => {
    switch (size) {
      case 12:
        return <Image source={require('../assets/meroba-removebg-preview.png')} style={styles.tableIcon} />;
      case 14:
        return <Image source={require('../assets/malben1-removebg-preview.png')} style={styles.tableIcon} />;
      case 18:
        return <Image source={require('../assets/malben2-removebg-preview.png')} style={styles.tableIcon} />;
      case 16:
        return <Image source={require('../assets/igol1-removebg-preview.png')} style={styles.tableIcon} />;
      case 10:
        return <Image source={require('../assets/igol2-removebg-preview.png')} style={styles.tableIcon} />;
      case 24:
        return <Image source={require('../assets/malben4-removebg-preview.png')} style={styles.tableIcon} />;
      default:
        return <View style={[styles.table, { backgroundColor: color }]} />;
    }
  };
  

const centerTables = () => {
  Alert.alert(
    'מרכוז השולחנות',
    ' פעולה זו תמרכז את השולחנות למרכז ותמחק את הסידור הנוכחי.',
    [
      {
        text: 'ביטול',
        style: 'cancel',
      },
      {
        text: 'אישור',
        onPress: () => {
          const centerX = Dimensions.get('window').width / 2 - size / 2;
          const centerY = Dimensions.get('window').height / 2 - size / 2;

          setTables((prevTables) =>
            prevTables.map((table) => ({
              ...table,
              x: centerX,
              y: centerY,
            }))
          );

          saveTablesToFirebase(); // שמירת המיקומים החדשים בפיירבייס
        },
      },
    ],
    { cancelable: true }
  );
};


const increaseSize = () => {
  if (size < 115) { // הגבלה מקסימלית של 115
    const newSize = size + 10;
    const newTextSize = textSize + 2;
    setSize(newSize);
    setTextSize(newTextSize);
    saveSettingsToFirebase({ size: newSize, textSize: newTextSize, color, rotation });
  } else {
    Alert.alert('גודל מקסימלי', 'לא ניתן להגדיל את השולחן מעבר');
  }
};

  // פונקציה לנעילה עם הודעה מוקפצת
  const toggleLock = () => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
  
    // הצגת ההודעה רק כאשר המנעול ננעל
    if (newLockState) {
      setShowLockMessage(true);
  
      // הסתרת ההודעה אחרי 5 שניות
      setTimeout(() => {
        setShowLockMessage(false);
      }, 5000);
    }
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
        ? Object.entries(tableNames).map(([key, table]) => {
            const position = tablePositions.find((tablePos) => tablePos.id === key);
            const guests = table?.guests ? Object.keys(table.guests).length : 0;

            return {
              id: key,
              name: table.name, // גישה לשם
              size: table.size, // גישה לגודל
              guests, // מספר האורחים

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
            key, // מפתח (key)
            {    // ערך (value) – אובייקט עם כל המידע הרצוי
              name: table.displayName || `שולחן ${key}`,
              size: table.size || `גודל ${key}`,
              guests: table.guests || {}, // טוען את האורחים

            },
          ])
        )
      : {};
    
      mergeData();
    });
  }, [user, id]);
  
  const panResponders = tables.map((table) =>
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gestureState) => {
      setTables((prevTables) =>
        prevTables.map((t) => {
          if (t.id === table.id) {
            // חישוב המיקום החדש עם הגבלת הגובה
            const newY = t.y + gestureState.dy;
            const limitedY = Math.max(minY, Math.min(newY, maxY));

            return { ...t, x: t.x + gestureState.dx, y: limitedY };
          }
          return t;
        })
      );
    },
    onPanResponderRelease: () => {
      saveTablesToFirebase(); // שמירת המיקום בפיירבייס לאחר שחרור
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
const deleteSpecificGuest = (guestId) => {
  if (!user) {
    Alert.alert('שגיאה', 'משתמש לא מחובר.');
    return;
  }

  if (!id) {
    Alert.alert('שגיאה', 'אירוע לא נמצא.');
    return;
  }

  if (!selectedTable || !selectedTable.id) {
    Alert.alert('שגיאה', 'לא נבחר שולחן.');
    console.log("❌ שגיאה: selectedTable חסר או לא תקין", selectedTable);
    return;
  }

  // נתיב לשולחן שממנו מוחקים את האורח
  const tablePath = `Events/${user}/${id}/tables/${selectedTable.id}/guests`;
  const tableRef = ref(database, tablePath);

  console.log("📌 נתיב למחיקה:", tablePath);

  // 🔥 שלב 1: קבלת המערך הקיים של האורחים
  onValue(tableRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data || !Array.isArray(data)) {
      console.log("❌ אין אורחים במערך, לא ניתן למחוק.");
      Alert.alert("אין אורחים למחיקה.");
      return;
    }

    // 🔥 שלב 2: סינון האורח שצריך להימחק
    const updatedGuests = data.filter((guest) => guest.recordID !== guestId);

    // 🔥 שלב 3: עדכון המערך בלי האורח שנמחק
    set(tableRef, updatedGuests)
      .then(() => {
        console.log(`✅ נמחק בהצלחה: ${guestId} מהשולחן ${selectedTable.id}`);
        Alert.alert('האורח נמחק בהצלחה!');
        
        // 🔄 עדכון ה־state
        setGuests(updatedGuests);
      })
      .catch((error) => {
        console.error('❌ שגיאה במחיקת האורח:', error);
        Alert.alert('שגיאה במחיקת האורח:', error.message);
      });
  }, { onlyOnce: true }); // מאזין חד-פעמי כדי למנוע רענון אינסופי
};




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
  const [SizeTable, setSizeTable] = useState(null);

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

    const tableRef = ref(database, `Events/${user}/${id}/tables/${table.id}`);
    onValue(tableRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSizeTable(data.size || 'אין נתונים'); // שמירה של גודל השולחן
      } else {
        setSizeTable('אין נתונים');
      }
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
    if (!user) return;
  
    const responsesRef = ref(database, `Events/${user}/${id}/responses`);
    onValue(responsesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setResponses(data);
      } else {
        setResponses({});
      }
    });
  }, [user, id]);
  
  
  
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

      <TouchableOpacity style={styles.topRightButtons} onPress={() => navigation.goBack()  }>
          <Text style={styles.backButtonText}>חזור ←</Text>
      </TouchableOpacity>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={increaseSize}>
          <Image source={require('../assets/zoomin.png')} style={styles.imageback2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={decreaseSize}>
          <Image source={require('../assets/zoomout.png')} style={styles.imageback2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={centerTables}>
          <Image source={require('../assets/placeholder.png')} style={styles.imageback2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={changeColor}>
          <Image source={require('../assets/colorpalette.png')} style={styles.imageback2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={rotateTables}>
          <Image source={require('../assets/rotating.png')} style={styles.imageback2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={toggleLock}>
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
          <Text style={styles.modalSubTitle}>{`מספר אורחים: ${guests.length}`}</Text>
          <Text style={styles.modalSubTitle}>{SizeTable ? `גודל השולחן: ${SizeTable}` : 'אין נתונים על גודל השולחן'}</Text>



          <FlatList
  data={guests}
  keyExtractor={(item, index) => index.toString()}
  renderItem={({ item }) => {
    let guestColor = 'gray'; // ברירת מחדל

    // מחפש את הסטטוס בפיירבייס לפי ה-recordID של האורח
    const responseStatus = responses[item.recordID]?.response;

    if (responseStatus === 'מגיע') {
      guestColor = '#4CAF50'; // ירוק
    } else if (responseStatus === 'לא מגיע') {
      guestColor = '#FF6F61'; // אדום
    } else if (responseStatus === 'אולי') {
      guestColor = '#FFD700'; // צהוב
    }

    return (
      <View style={[styles.guestContainer, { backgroundColor: guestColor }]}>
        {/* כפתור מחיקה בצד שמאל */}
        {responseStatus === 'לא מגיע' && (
          <TouchableOpacity style={styles.deleteGuestButton} onPress={() => deleteSpecificGuest(item.recordID)}>
            <Text style={styles.deleteButtonText}>מחק</Text>
          </TouchableOpacity>
        )}

        {/* שם האורח בצד ימין */}
        <Text style={styles.guestName}>{item.displayName || 'ללא שם'}</Text>
      </View>
    );
  }}
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
        const isFull = table.guests >= table.size; // בדיקה אם השולחן מלא

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
      },
    ]}
  >
    <View style={styles.fullSizeTouchable}>

    <View style={styles.textOverlay}>
      <Text style={[styles.tableText, { fontSize: size * 0.2 }]}>
        {table.name || `שולחן ${index + 1}`}
      </Text>
      <Text style={[styles.modalTitle2,{ color: isFull ? 'rgb(195, 23, 51)' : 'rgb(144, 238, 144)' },]}>
        {table.size ? `${table.guests}/${table.size}` : 'אין נתונים על גודל השולחן'}
      </Text>
    </View>

      {/* אייקון מותאם לפי גודל */}
      {renderTableIcon(table.size)}

      <TouchableOpacity
  style={[
    styles.touchableArea,
    isLocked && { 
      zIndex: 100, // מביא את הכפתור לקדמת המסך כאשר נעול
      elevation: 10, // עבור אנדרואיד כאשר נעול
      position: 'relative', // כאשר נעול
    },
  ]}      
  activeOpacity={1}
        onPressIn={() => (isDragging = false)}
        onPressOut={() => {
          if (!isDragging && isLocked) {
            openTableModal(table);
          }
        }}
      >
      
      <Text style={[styles.tableText, { fontSize: size * 0.2 }]}>
        {table.name || `שולחן ${index + 1}`}
      </Text>
      <Text style={styles.modalTitle2}>
        {table.size ? `                                ` : 'אין נתונים על גודל השולחן'}
      </Text>


      </TouchableOpacity>
    </View>
  </View>
);
})
}
{showLockMessage && (
  <View style={styles.lockMessage}>
    <Text style={styles.lockMessageText}>🔒 נעילת רשימת אורחים - מופעל</Text>
  </View>
)}

    <Text style={styles.centeredText}>הוראות שימוש</Text>
    <Text style={styles.centeredText2}>לפניך 6 כלים, מנעול - נעילת שינוי מיקום השולחנות, סיבוב - לסובב את השולחנות, צבע - לצבוע את השולחנות, מיקוד - מרכז את השולחנות למרכז, זכוכיות מגדלת - זום אין זום אאוט. את השולחנות ניתן להזיז ולמקמם אותם על פני התרשים אולם שמוצג לפניכם כדי לקבל תאימות מרבית לסקיצה שלכם</Text>


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
    borderRadius: 7,
    overflow: 'hidden',    // מונע חריגה של התוכן מהכפתור
    minWidth: 30,          // גודל מינימלי לכפתור
    minHeight: 30,         // גודל מינימלי לכפתור
  },
  
  tableText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,         // מאפשר לטקסט להתכווץ בתוך גבולות הכפתור
    maxWidth: '90%',   
        // מגביל את רוחב הטקסט
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -565,

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
    textAlign: 'right',   // מיישר את הטקסט לימין

    color: '#444',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#808080',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    alignSelf: 'center',
    width: '50%',
    shadowColor: '#000',
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
lockMessage: {
  position: 'absolute',
  bottom: 30,
  left: 0,
  right: 0,
  backgroundColor: '#000',
  padding: 10,
  marginHorizontal: 20,
  borderRadius: 10,
  alignItems: 'center',
  opacity: 0.8,
  zIndex: 1,
},

lockMessageText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
tableIcon: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
  position: 'absolute', // מוודא שהאייקון ממוקם כהלכה
  zIndex: 10,          // מביא את התמונה לקדמת המסך
},
textOverlay: {
  position: 'absolute', // מיקום מוחלט מעל האייקון
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center', // ממרכז את הטקסט
  alignItems: 'center',     // ממרכז את הטקסט
  zIndex: 20,               // מביא את הטקסט לקדמת המסך
},

backButtonText: {
  fontSize: 18,
  color: '#000',
  marginBottom: 0,

},
topRightButtons: {
  position: 'absolute', 
  left: 10,
  top: 70,

},
guestContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end', // דוחף את שם האורח לצד ימין ואת הכפתור לצד שמאל
  padding: 12,
  borderRadius: 10,
  marginVertical: 5,
},
guestName: {
  fontSize: 16,
  color: '#fff',
  textAlign: 'right', // יישור לימין
  flex: 1, // מבטיח שהשם יתפוס את כל הרוחב הנותר
},
deleteGuestButton: {
  backgroundColor: '#D32F2F', // אדום כהה
  paddingVertical: 5,
  paddingHorizontal: 12,
  borderRadius: 5,
  marginRight: 'auto', // דוחף את הכפתור לצד שמאל
},
deleteButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: 'bold',
},

});

export default TablePlanningScreen;
