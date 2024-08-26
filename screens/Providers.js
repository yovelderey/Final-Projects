import React, { useRef, useState ,useEffect} from 'react';
import { View, Text, ImageBackground,Image, FlatList, TextInput, StyleSheet ,StatusBar, TouchableOpacity,ScrollView,Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set,get,child } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import { remove } from 'firebase/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const Providers = ({ route, navigation }) => {
  const { id } = route.params;
  const initialData = [
    [true, 'מחיר', 'תוכן', 'טלפון', 'שם'],
    ...Array.from({ length: 4 }, () => Array(5).fill(''))
  ];

  const [tableData, setTableData] = useState(initialData);
  const [checked, setChecked] = useState(Array(10).fill(false));
  const [sumNumericColumn, setSumNumericColumn] = useState(Array(10).fill(0));
  const database = getDatabase();
  const user = firebase.auth().currentUser;
  const insets = useSafeAreaInsets();

  const handleInputChange = (text, rowIndex, colIndex) => {
    const newData = [...tableData];
    newData[rowIndex][colIndex] = text;
    setTableData(newData);
  };

  const handleCheckBoxChange = (rowIndex) => {
    const newChecked = [...checked];
    newChecked[rowIndex] = !newChecked[rowIndex];
    setChecked(newChecked);

    const newTableData = [...tableData];
    newTableData[rowIndex][0] = newChecked[rowIndex];
    setTableData(newTableData);

    if (newChecked[rowIndex]) {
      const sum = tableData[rowIndex].reduce((total, cell, colIndex) => {
        if (colIndex === 1) {
          const numericValue = parseFloat(cell.replace(/[^0-9.-]/g, ''));
          if (!isNaN(numericValue)) total += numericValue;
        }
        return total;
      }, 0);
      const newSumNumericColumn = [...sumNumericColumn];
      newSumNumericColumn[rowIndex] = sum;
      setSumNumericColumn(newSumNumericColumn);
    } else {
      const newSumNumericColumn = [...sumNumericColumn];
      newSumNumericColumn[rowIndex] = 0;
      setSumNumericColumn(newSumNumericColumn);
    }
  };

  const handleDeleteBudgetItems = () => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/Providers`);
    remove(databaseRef)
      .then(() => {
        Alert.alert('נמחק בהצלחה!', 'פרטי התקציב נמחקו מ-Firebase.');
      })
      .catch(error => {
        Alert.alert('שגיאה במחיקה', `אירעה שגיאה בעת מחיקת הנתונים: ${error.message}`);
      });
  };

  const handleCustomAction = (index) => {
    console.log(`לחצן פעולה מותאמת אישית בלחיצה, אינדקס ${index}`);
  };

  const fetchDataFromFirebase = () => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/Providers`);
    if (user) {
      get(databaseRef)
        .then(snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const formattedData = data.map(item => [
              item.checked,
              item.price,
              item.content,
              item.date,
              item.name
            ]);
            setTableData(formattedData);

            const checkedData = formattedData.map(row => row[0]);
            setChecked(checkedData);
          }
        })
        .catch(error => {
          Alert.alert('שגיאה בקריאה', `אירעה שגיאה בעת קריאת הנתונים: ${error.message}`);
        });
    }
  };

  useEffect(() => {
    fetchDataFromFirebase();
  }, [user, id]);

  const renderCheckBox = (index) => (
    <TouchableOpacity
      style={styles.checkbox}
      onPress={() => handleCheckBoxChange(index)}
    >
      <Text style={styles.checkboxText}>
        {checked[index] ? 'V' : ''}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {renderCheckBox(index)}
      {item.slice(1).map((cell, colIndex) => (
        <TextInput
          key={`${index}-${colIndex}`}
          style={styles.cell}
          value={cell}
          onChangeText={(text) => {
            if (colIndex === 4) {
              const numericValue = text.replace(/[^0-9]/g, '');
              handleInputChange(numericValue, index, colIndex + 1);
            } else {
              handleInputChange(text, index, colIndex + 1);
            }
          }}
          keyboardType={colIndex === 4 ? 'numeric' : 'default'}
        />
      ))}
 
    </View>
  );



  const handleAddRow = () => {
    const newRow = [false, '', '', '', ''];
    const newTableData = [...tableData, newRow];
    setTableData(newTableData);
  
    const newChecked = [...checked, false];
    setChecked(newChecked);
  
    const databaseRef = ref(database, `Events/${user.uid}/${id}/Providers`);
    set(databaseRef, newTableData.map(row => ({
      checked: row[0] !== undefined ? row[0] : false, // טיפול ב-undefined
      price: row[1] !== undefined ? row[1] : '',
      content: row[2] !== undefined ? row[2] : '',
      date: row[3] !== undefined ? row[3] : '',
      name: row[4] !== undefined ? row[4] : ''
    }))).catch(error => {});
  };
  
  const handleRemoveLastRow = () => {
    if (tableData.length === 0) {
      Alert.alert('שגיאה', 'אין שורות להסרה.');
      return;
    }
  
    const newTableData = tableData.slice(0, -1);
    setTableData(newTableData);
  
    const newChecked = checked.slice(0, -1);
    setChecked(newChecked);
  
    const databaseRef = ref(database, `Events/${user.uid}/${id}/Providers`);
    set(databaseRef, newTableData.map(row => ({
      checked: row[0] !== undefined ? row[0] : false, // טיפול ב-undefined
      price: row[1] !== undefined ? row[1] : '',
      content: row[2] !== undefined ? row[2] : '',
      date: row[3] !== undefined ? row[3] : '',
      name: row[4] !== undefined ? row[4] : ''
    }))).catch(error => {});
  };
  

  const handleSaveToFirebase = () => {
    const dataToSave = tableData.map(row => ({
      checked: row[0],
      price: row[1],
      content: row[2],
      date: row[3],
      name: row[4]
    }));

    if (user) {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/Providers`);
      set(databaseRef, dataToSave)
        .then(() => {
          Alert.alert('נשמר בהצלחה!', 'הנתונים נשמרו ב-Firebase.');
        })
        .catch(error => {
          Alert.alert('שגיאה בשמירה', `אירעה שגיאה בעת שמירת הנתונים: ${error.message}`);
        });
    }
  };

  return (
    <ImageBackground source={require('../assets/backgruond_pro.png')} style={styles.background}>
      <View style={styles.container}>
        <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Text style={styles.title}>ניהול ספקים</Text>
        </View>

        <View style={styles.moreContainer}>
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={handleDeleteBudgetItems}
          >
            <Image source={require('../assets/delete.png')} style={styles.icon} />
          </TouchableOpacity>

          <View style={styles.leftIcons}>
            <TouchableOpacity onPress={handleAddRow} style={styles.removeButton}>
              <Image source={require('../assets/plus.png')} style={styles.icon2} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRemoveLastRow} style={styles.removeButton}>
              <Image source={require('../assets/minus-sign.png')} style={styles.icon2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tableContainer}>
          <FlatList
            data={tableData}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.table}
          />
        </View>

        <TouchableOpacity style={styles.largeButton} onPress={handleSaveToFirebase}>
          <Text style={styles.title3}>שמור נתונים</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('ListItem', { id })}
          style={[styles.showPasswordButton, { position: 'absolute', top: '7%', left: '4%' }]}
        >
          <Image source={require('../assets/back_icon2.png')} style={styles.backIcon} />
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'center',
    marginTop: 20,

  },
  moreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  tableContainer: {
    flex: 1,
    marginTop: -10,
  },
  table: {
    paddingBottom: 10,

  },
 
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#C0C0C0',
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFC0CB',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',

    marginRight: 10,
  },
  checkboxText: {
    fontSize: 18,
    color: '#FFC0CB',
  },
  cell: {
    flex: 1,
    height: 30,
    borderColor: '#C0C0C0',
    borderWidth: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginRight: 10,
  },
  customAction: {
    backgroundColor: '#FFC0CB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  customActionText: {
    color: '#fff',
  },
  largeButton: {
    width: '40%',
    height: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 70,

  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  title3: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  showPasswordButton: {
    padding: 5,
  },
  icon: {
    width: 30,
    height: 30,
  },
  leftIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeButton: {
    marginLeft: 10,
    padding: 5,
  },
  icon2: {
    width: 20,
    height: 20,

  },
  backIcon: {
    width: 40,
    height: 40,
  },
});

export default Providers;
