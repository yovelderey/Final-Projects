import React, { useRef, useState ,useEffect} from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet ,StatusBar, TouchableOpacity,ScrollView,Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set,get,child } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import { remove } from 'firebase/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const Task = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  const initialData = [
    [true, 'תוכן', 'עד תאריך', 'משימה/פעולה', 'מספר'],
    ...Array.from({ length: 9 }, () => Array(5).fill(''))
  ];

  const [tableData, setTableData] = useState(initialData);
  const [checked, setChecked] = useState(Array(10).fill(false));
  const [sumNumericColumn, setSumNumericColumn] = useState(Array(10).fill(0)); // סכום המספרים בעמודה האחרונה
  const database = getDatabase();
  const databaseRef = ref(database, 'Events/' + firebase.auth().currentUser.uid );
  const user = firebase.auth().currentUser;
  const [eventDetails, setEventDetails] = useState({});
  const [deleteIndex, setDeleteIndex] = useState(''); // State to hold the index to be deleted
  const insets = useSafeAreaInsets();
  const [checkedCount, setCheckedCount] = useState(0);



  const handleInputChange = (text, rowIndex, colIndex) => {
    const newData = [...tableData];
    newData[rowIndex][colIndex] = text;
    setTableData(newData);
  };

  
  const handleCheckBoxChange = (rowIndex) => {
    const newChecked = [...checked];
    newChecked[rowIndex] = !newChecked[rowIndex];
    setChecked(newChecked);
    
    updateCheckedCount(newChecked);
  
    const newTableData = [...tableData];
    newTableData[rowIndex][0] = newChecked[rowIndex];
    setTableData(newTableData);
  
    // עדכון הסכום בעמודה המספרית
    if (newChecked[rowIndex]) {
      let sum = 0;
      tableData[rowIndex].forEach((cell, colIndex) => {
        if (colIndex === 1) { // Assuming the price column is at index 1
          const numericValue = parseFloat(cell.replace(/[^0-9.-]/g, ''));
          if (!isNaN(numericValue)) {
            sum += numericValue;
          }
        }
      });
      const newSumNumericColumn = [...sumNumericColumn];
      newSumNumericColumn[rowIndex] = sum;
      setSumNumericColumn(newSumNumericColumn);
    } else {
      const newSumNumericColumn = [...sumNumericColumn];
      newSumNumericColumn[rowIndex] = 0; // Set to 0 when checkbox is unchecked
      setSumNumericColumn(newSumNumericColumn);
    }
  };
  

  
  const handleDeleteBudgetItems = () => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/task`);
    const databaseRef2 = ref(database, `Events/${user.uid}/${id}/taskCount`);

    remove(databaseRef)
      .then(() => {
        Alert.alert('Deleted Successfully!', 'The budget items have been deleted from Firebase.');
      })
      .catch(error => {
        Alert.alert('Delete Error', `An error occurred while deleting the budget items: ${error.message}`);
      });

      remove(databaseRef2)
      .then(() => {
      })
      .catch(error => {
      });
  };
  
  const updateCheckedCount = (newChecked) => {
    const count = newChecked.filter(Boolean).length;
    setCheckedCount(count);
  };

  const handleCustomAction = (index) => {
    console.log(`Custom action button at index ${index} pressed`);
  };

  const renderCheckBox = (index) => {
    return (
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleCheckBoxChange(index)}
      >
        <Text style={styles.checkboxText}>
          {checked[index] ? 'V' : ''}
        </Text>
      </TouchableOpacity>
    );
  };


  const fetchDataFromFirebase = () => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/task`);
    if(user) {
      get(databaseRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert the data back to the format used in the table
            const formattedData = data.map((item, index) => [
              item.checked,
              item.price,
              item.content,
              item.date,
              item.name || (index + 1).toString() // Set the last column with ascending numbers if 'name' is empty
            ]);
            setTableData(formattedData);
    
            const checkedData = formattedData.map(row => row[0]);
            setChecked(checkedData);
          } else {
          }
        })
        .catch(error => {
          Alert.alert('Error reading data', `An error occurred while reading data: ${error.message}`);
        });
    }
  };
  
  
  useEffect(() => {
    fetchDataFromFirebase();
    
    const fetchData = async () => {
      if (user) {
        try {
          const databaseRef = ref(database, `Events/${user.uid}/${id}/taskCount`);
          const snapshot = await get(databaseRef);
          const fetchedData = snapshot.val();

          if (fetchedData) {
            setCheckedCount(fetchedData); // לוקח מידע
          }

        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      }
    };
  
    fetchData();

  }, [user, id]);

 
  
  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {renderCheckBox(index)}
  
      {item.slice(1, 4).map((cell, colIndex) => (
        <TextInput
          key={`${index}-${colIndex}`}
          style={styles.cell}
          value={cell}
          onChangeText={(text) => handleInputChange(text, index, colIndex + 1)}
        />
      ))}
      <View key={`${index}-4`} style={styles.cell}>
        <Text>{item[4]}</Text>
      </View>
      <TouchableOpacity
        style={styles.customAction}
        onPress={() => {
          console.log('Custom action button pressed');
          handleCustomAction(index);
        }}
      >
        <Text style={styles.customActionText}>פעולה מותאמת אישית</Text>
      </TouchableOpacity>
    </View>
  );
  
  const handleRemoveLastRow = () => {
    if (tableData.length === 0) {
      Alert.alert('שגיאה', 'אין שורות להסרה.');
      return;
    }
    
  
    // הסרת השורה האחרונה מהטבלה
    const newTableData = tableData.slice(0, -1);
    setTableData(newTableData);
  
    // עדכון ה-checked לאחר הסרת השורה האחרונה
    const newChecked = checked.slice(0, -1);
    setChecked(newChecked);
  
    // שמירה בבסיס הנתונים
    const databaseRef = ref(database, `Events/${user.uid}/${id}/task`);
    set(databaseRef, newTableData.map(row => ({
      checked: row[0],
      price: row[1],
      content: row[2],
      date: row[3],
      name: row[4]
    })))
    .then(() => {
    })
    .catch(error => {
    });
  };
  
  

  const handleAddRow = () => {
    // יצירת שורה חדשה עם ערכי ברירת מחדל והמספר הבא בסדר עולה
    const newRowNumber = tableData.length > 1 ? parseInt(tableData[tableData.length - 1][4]) + 1 : 1;
    const newRow = [false, '', '', '', newRowNumber.toString()];
    const newTableData = [...tableData, newRow];
    setTableData(newTableData);
  
    // עדכון ה-checked עבור השורה החדשה
    const newChecked = [...checked, false];
    setChecked(newChecked);
  
    // שמירה בבסיס הנתונים
    const databaseRef = ref(database, `Events/${user.uid}/${id}/task`);
    set(databaseRef, newTableData.map(row => ({
      checked: row[0],
      price: row[1],
      content: row[2],
      date: row[3],
      name: row[4]
    })))
    .then(() => {
    })
    .catch(error => {
    });
  };
  
  

  const handleSaveToFirebase = () => {
    // Prepare data to be saved
    const dataToSave = tableData.map(row => ({
      checked: row[0],
      price: row[1],
      content: row[2],
      date: row[3],
      name: row[4]
    }));

    // Save data to Firebase
    if (user) {

      const databaseRef = ref(database, `Events/${user.uid}/${id}/task`);
      set(databaseRef, dataToSave)
        .then(() => {
          Alert.alert('נשמר בהצלחה!', 'הנתונים נשמרו בבסיס הנתונים של Firebase.');
        })
        .catch(error => {
          Alert.alert('שגיאה בשמירה', `אירעה שגיאה בעת שמירת הנתונים: ${error.message}`);
        });

        const databaseRef2 = ref(database, `Events/${user.uid}/${id}/taskCount`);
        set(databaseRef2, checkedCount)
          .then(() => {
          })
          .catch(error => {
          });
    }
  };


  
  return (
    
    <View style={styles.container}>

      <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>ניהול משימות</Text>
      </View>



      <View style={styles.moreContainer}>
      <TouchableOpacity
          style={styles.showPasswordButton}
          onPress={handleDeleteBudgetItems}>
          <Image source={require('../assets/delete.png')} style={styles.icon} />
        </TouchableOpacity>

        <View style={styles.leftIcons}>
          <TouchableOpacity
            onPress={handleAddRow}
            style={styles.removeButton}>
            <Image source={require('../assets/plus.png')} style={styles.icon2} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRemoveLastRow}
            style={styles.removeButton}>
            <Image source={require('../assets/minus-sign.png')} style={styles.icon2} />
          </TouchableOpacity>
        </View>
    </View>


      <View style={styles.tableContainer}>
        <FlatList
          data={tableData}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.table}/> 
      </View>

      <View style={styles.roundedBackground2}>
        <Text style={styles.sumText2}>
          משימות שבוצעו: {checkedCount}
        </Text>
      </View>


    <TouchableOpacity
        style={styles.largeButton}
        onPress={() => handleSaveToFirebase()} >
          <Text style={styles.title3}>שמור נתונים</Text>
      </TouchableOpacity>

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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',

  },
  moreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    marginTop: 20,

  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    
  },
  addButton: {
    marginRight: 20, // מרווח גדול יותר בין האייקונים
  },
  removeButton: {
    marginRight: 10, // מרווח גדול יותר בין האייקונים
  },

  showPasswordButton: {
    marginRight: 295,
  },
  icon: {
    width: 24,
    height: 24,
  },
  icon2: {
    width: 18,
    height: 18,
  },
  tableContainer: {
    borderColor: '#000',
    width: '98%',
    marginTop: 0,
    height: 500, // גובה קבוע לפריים

  },


  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 10,
    width: 90, // Adjust width as needed
    textAlign: 'center',
  },


  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },


  backIcon: {
    width: 50,
    height: 50,

  },

  customActionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 10,
    margin: 5,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  currencySymbol: {
    fontSize: 24, // Smaller font size for the currency symbol
    color: '#ff69b4', // White color for the currency symbol
    fontWeight: 'bold',
  },
    addButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,

  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  icon: {
    width: 30,
    height: 30,


  },
  topBar: {
    backgroundColor: '#ff69b4',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    color: '#000',
    marginTop: 15,

  },
  title3: {
    fontSize: 20,
    color: '#000',

  },

  largeButton: {
    width: '40%',
    height: 40,
    backgroundColor: '#ff69b4',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 70,

  },




  currencySymbol: {
    fontSize: 24, // Smaller font size for the currency symbol
    color: '#ff69b4', // White color for the currency symbol
    fontWeight: 'bold',
  },
  
  roundedBackground2: {
    alignItems: 'center', // Center the text within the background
    justifyContent: 'center',
    marginTop: 10,

  },

  sumText2: {
    fontSize: 20, // Adjust the font size as needed
    color: 'black', // Set the text color to white for better contrast
  },
});

export default Task;
