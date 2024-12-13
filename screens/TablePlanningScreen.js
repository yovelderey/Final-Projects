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
  Modal,
} from 'react-native';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import firebase from 'firebase/compat/app';

const TablePlanningScreen = ({ navigation, route }) => {

  const database = getDatabase();
  const user = firebase.auth().currentUser?.uid; // מזהה המשתמש הנוכחי
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
    set(tablesRef, tables)
      
      .catch((error) => Alert.alert('שגיאה בשמירת השולחנות:', error.message));
  };


  // טעינת מיקומי השולחנות מהפיירבייס
  useEffect(() => {
    const fetchTablesData = async () => {
      if (!user) return;
  
      const tablesPlaceRef = ref(database, `Events/${user}/${id}/tablesPlace`);
      const tablesRef = ref(database, `Events/${user}/${id}/tables`);
  
      let tablePositions = [];
      let tableNames = {};
  
      // פונקציה למיזוג הנתונים
      const mergeData = () => {
        if (tablePositions.length > 0) {
          const mergedTables = tablePositions.map((table, index) => ({
            ...table,
            name: tableNames[table.id] || `שולחן ${index + 1} ללא שם`,
          }));
          setTables(mergedTables); // עדכון state
        }
      };
  
      // מאזין לנתוני המיקומים
      onValue(tablesPlaceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          tablePositions = data;
          mergeData(); // קריאה לפונקציה למיזוג
        }
      });
  
      // מאזין לשמות השולחנות
      onValue(tablesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          tableNames = Object.fromEntries(
            Object.entries(data).map(([id, table]) => [
              id,
              table.displayName || "",
            ])
          );
          mergeData(); // קריאה לפונקציה למיזוג
        }
      });
    };
  
    fetchTablesData();
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
  const [modalVisible, setModalVisible] = useState(false);
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




  // הוספת שולחן חדש
  const addTable = () => {
    if (tables.length >= maxTablesFromSeatedAtTable) {
      Alert.alert(
        'שגיאה',
        `לא ניתן להוסיף שולחנות מעבר למספר הקיים בעמוד הקודם (${maxTablesFromSeatedAtTable}).`
      );
      return;
    }
  
    const newTableId = tables.length + 1;
    const newTable = {
      id: newTableId,
      name: `שולחן ${newTableId}`,
      x: Dimensions.get('window').width / 2 - 50,
      y: Dimensions.get('window').height / 2 - 50,
    };
    setTables([...tables, newTable]);
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
      console.log(`Tabl1111e ${index + 1} name:`, table.name);
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



{/* הצגת השולחנות */}
{imageLoaded &&
  tables.map((table, index) => {
    const logName = table.name || `Table ${index + 1} name: לוג לא קיים`; // ברירת מחדל אם אין שם
    return (
      <View
        key={table.id}
        {...(panResponders[index]?.panHandlers || {})}
        style={[
          styles.table,
          { transform: [{ translateX: table.x }, { translateY: table.y }] },
        ]}
      >
        {/* הוספת מספר השולחן */}
        <Text style={styles.tableText}>
          {`שולחן ${index + 1}`}
        </Text>

        {/* שם השולחן */}
        <Text style={styles.tableText}>
          {table.name || `שולחן ${index + 1} ללא שם`}
        </Text>


      </View>
    );
  })}








      {/* כפתורי פעולה */}
      <View style={styles.buttonsContainer}>
      <TouchableOpacity
  onPress={addTable}
  style={[
    styles.button,
    tables.length >= maxTablesFromSeatedAtTable && { backgroundColor: '#ccc' },
  ]}
  disabled={tables.length >= maxTablesFromSeatedAtTable}
>
  <Text style={styles.buttonText}>+</Text>
</TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={removeLastTable}>
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={saveTablesToFirebase}>
          <Text style={styles.buttonText}>שמור</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
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
  
});

export default TablePlanningScreen;
