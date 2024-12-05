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
} from 'react-native';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import firebase from 'firebase/compat/app';

const TablePlanningScreen = ({ navigation, route }) => {
  const { id, selectedImage } = route.params || {}; // מקבל את המידע מהמסך הקודם
  const [tables, setTables] = useState([]);
  const database = getDatabase();
  const user = firebase.auth().currentUser?.uid; // מזהה המשתמש הנוכחי
  const [imageLoaded, setImageLoaded] = useState(false);

  // שמירת מיקומי השולחנות בפיירבייס
  const saveTablesToFirebase = () => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }

    const tablesRef = ref(database, `Events/${user}/${id}/tablesPlace`);
    set(tablesRef, tables)
      .then(() => Alert.alert('השולחנות נשמרו בהצלחה!'))
      .catch((error) => Alert.alert('שגיאה בשמירת השולחנות:', error.message));
  };

  // טעינת מיקומי השולחנות מהפיירבייס
  useEffect(() => {
    const fetchTables = async () => {
      if (!user) return;

      const tablesRef = ref(database, `Events/${user}/${id}/tablesPlace`);
      onValue(tablesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setTables(data); // טען את המיקומים השמורים מהפיירבייס
        }
      });
    };

    fetchTables();
  }, [user]);

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

      {/* הצגת השולחנות */}
      {imageLoaded &&
        tables.map((table, index) => (
          <View
            key={table.id}
            {...panResponders[index]?.panHandlers}
            style={[
              styles.table,
              { transform: [{ translateX: table.x }, { translateY: table.y }] },
            ]}
          >
            <Text style={styles.tableText}>{table.name}</Text>
          </View>
        ))}

      {/* כפתורי פעולה */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={addTable}>
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
    width: 100,
    height: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  tableText: {
    color: '#fff',
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
});

export default TablePlanningScreen;
