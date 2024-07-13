import React, { useRef, useState ,useEffect} from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet , TouchableOpacity,ScrollView,Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set,get,child } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import { remove } from 'firebase/database';


const Budget = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  const initialData = [
    [true, 'מחיר', 'תוכן', 'תאריך', 'שם'],
    ...Array.from({ length: 9 }, () => Array(5).fill(''))
  ];

  const [tableData, setTableData] = useState(initialData);
  const [checked, setChecked] = useState(Array(10).fill(false));
  const [sumNumericColumn, setSumNumericColumn] = useState(Array(10).fill(0)); // סכום המספרים בעמודה האחרונה
  const database = getDatabase();
  const databaseRef = ref(database, 'Events/' + firebase.auth().currentUser.uid );
  const user = firebase.auth().currentUser;
  const [spend, setSpend] = useState('');
  const [eventDetails, setEventDetails] = useState({});
  const [deleteIndex, setDeleteIndex] = useState(''); // State to hold the index to be deleted



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
    newTableData[rowIndex][0] = newChecked[rowIndex]; // עדכון הערך בטבלה
    setTableData(newTableData);

    // Update sumNumericColumn based on the checkbox change
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
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
    const databaseRef2 = ref(database, `Events/${user.uid}/${id}/spend`);

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
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
    if(user)
    {
      get(databaseRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert the data back to the format used in the table
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
          } else {
          }
        })
        .catch(error => {
          Alert.alert('שגיאה בקריאה', `אירעה שגיאה בעת קריאת הנתונים: ${error.message}`);
        });



    }
  };
  
  useEffect(() => {
    fetchDataFromFirebase();
    
    const fetchData = async () => {
      if (user) {
        try {
          const databaseRef = ref(database, `Events/${user.uid}/${id}/spend`);
          const snapshot = await get(databaseRef);
          const fetchedData = snapshot.val();

          if (fetchedData) {
            setEventDetails(fetchedData); // Set the fetched event details
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

      {item.slice(1).map((cell, colIndex) => (
        <TextInput
          key={`${index}-${colIndex}`}
          style={styles.cell}
          value={cell}
          onChangeText={(text) => {
            // אם העמודה היא העמודה האחרונה (colIndex === 4)
            if (colIndex === 4) {
              // בדוק אם הטקסט הוא מספר תקין
              const numericValue = text.replace(/[^0-9]/g, ''); // סנן רק מספרים
              handleInputChange(numericValue, index, colIndex + 1);
            } else {
              // אחרת, תקבל את הטקסט כפי שהוא
              handleInputChange(text, index, colIndex + 1);
            }
          }}
          keyboardType={colIndex === 4 ? 'numeric' : 'default'} // הגדר keyboardType לתא האחרון בכל שורה
        />
        
      ))}
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
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
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
    // יצירת שורה חדשה עם ערכי ברירת מחדל
    const newRow = [false, '', '', '', ''];
    const newTableData = [...tableData, newRow];
    setTableData(newTableData);
  
    // עדכון ה-checked עבור השורה החדשה
    const newChecked = [...checked, false];
    setChecked(newChecked);
  
    // שמירה בבסיס הנתונים
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
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

      const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
      set(databaseRef, dataToSave)
        .then(() => {
          Alert.alert('נשמר בהצלחה!', 'הנתונים נשמרו בבסיס הנתונים של Firebase.');
        })
        .catch(error => {
          Alert.alert('שגיאה בשמירה', `אירעה שגיאה בעת שמירת הנתונים: ${error.message}`);
        });

        const databaseRef2 = ref(database, `Events/${user.uid}/${id}/spend`);
        set(databaseRef2, sumNumericColumn.reduce((acc, cur) => acc + cur, 0))
          .then(() => {
          })
          .catch(error => {
          });
    }
  };


  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ניהול תקציב</Text>
      
      <Text style={styles.title2}>ניתן לסמן עד עשרה פריטים, כל עמודה מהוה הוספת ערך חדש לסכום הכללי</Text>
      <Text style={styles.sumText}>
        סכום המספרים בעמודה האחרונה: {eventDetails.spend}
      </Text>
      <Text style={styles.sumText}>
        סכום בדיקה {sumNumericColumn.reduce((acc, cur) => acc + cur, 0)}
      </Text>

      <TouchableOpacity
      onPress={handleAddRow}
      style={[styles.addButton]}
    >
      <Text style={styles.addButtonText}>הוסף שורה חדשה</Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={handleRemoveLastRow}
      style={styles.removeButton}
    >
      <Text style={styles.removeButtonText}>הסר שורה אחרונה</Text>
    </TouchableOpacity>

      <TouchableOpacity
        style={styles.customAction}
        onPress={() => handleSaveToFirebase()}
      >
          <Text style={styles.title}>שמור</Text>
      </TouchableOpacity>
          <View style={styles.deleteContainer}>
            <TextInput
              style={styles.input}

              onChangeText={setDeleteIndex}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteBudgetItems}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>


          </View>
      <View style={styles.tableContainer}>
        <FlatList
          data={tableData}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.table}
        />
    
      </View>



      
      <TouchableOpacity 
        onPress={() => props.navigation.navigate('ListItem', { id })}
        style={[styles.showPasswordButton, { position: 'absolute', top: '94%', left: '3%' }]}
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
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',

  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,

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
  headerText: {
    fontWeight: 'bold',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  title2: {
    fontSize: 12,
    marginBottom: 200,
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
    addButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,

  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Budget;
