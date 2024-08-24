import React, { useRef, useState ,useEffect} from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet ,StatusBar, TouchableOpacity,ImageBackground,Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set,get,child } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import { remove } from 'firebase/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const Budget = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  const initialData = [
    [true, 'מחיר', 'מקדמה', 'תאריך', 'הוצאה'],
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
    <ImageBackground source={require('../assets/backgruond_pro.png')} style={styles.background}>

    <View style={styles.container}>

      <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>ניהול תקציב</Text>
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
          מסומן: {sumNumericColumn.reduce((acc, cur) => acc + cur, 0)}
        </Text>
      </View>

      <View style={styles.roundedBackground}>
 </View>
      <Text style={styles.sumText}>
          <Text style={styles.currencySymbol}>₪</Text>
          <Text style={styles.valueText}>{eventDetails > 0 ? eventDetails : 0}</Text>
        </Text>

    <TouchableOpacity
        style={styles.largeButton}
        onPress={() => handleSaveToFirebase()} >
          <Text style={styles.title3}>שמור נתונים</Text>
      </TouchableOpacity>

      <TouchableOpacity 
          onPress={() => props.navigation.navigate('ListItem', { id })}
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
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
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
  sumText2: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: -60,

  },
});

export default Budget;
