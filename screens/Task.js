import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabase, ref, set, get, push, remove } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';

const Task = ({route,props}) => {
  
  const { id } = route.params;
  const [fadeAnim] = useState(new Animated.Value(0));

  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState('table');
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [currentNoteName, setCurrentNoteName] = useState('');
  const [tableData, setTableData] = useState([
    { id: 1, text: 'האם סגרתם אולם אירועים?', checked: false },
    { id: 2, text: 'האם סגרתם גן אירועים?', checked: false },
    { id: 3, text: 'האם סגרתם צלם לאירוע?', checked: false },
    { id: 4, text: 'האם סגרתם צלם וידאו?', checked: false },
    { id: 5, text: 'האם סגרתם DJ לאירוע?', checked: false },
    { id: 6, text: 'האם סגרתם להקה חיה?', checked: false },
    { id: 7, text: 'האם סגרתם קייטרינג?', checked: false },
    { id: 8, text: 'האם סגרתם עיצוב שולחנות?', checked: false },
    { id: 9, text: 'האם סגרתם סידורי פרחים?', checked: false },
    { id: 10, text: 'האם סגרתם הסעות לאורחים?', checked: false },
    { id: 11, text: 'האם סגרתם שמלת כלה?', checked: false },
    { id: 12, text: 'האם סגרתם חליפת חתן?', checked: false },
    { id: 13, text: 'האם סגרתם תכשיטים לכלה?', checked: false },
    { id: 14, text: 'האם סגרתם חופה?', checked: false },
    { id: 15, text: 'האם סגרתם בר שתייה?', checked: false },
    { id: 16, text: 'האם סגרתם תא צילום?', checked: false },
    { id: 17, text: 'האם סגרתם בלונים מעוצבים?', checked: false },
    { id: 18, text: 'האם סגרתם קונפטי לאירוע?', checked: false },
    { id: 19, text: 'האם סגרתם מופע זיקוקים?', checked: false },
    { id: 20, text: 'האם סגרתם מפל שוקולד?', checked: false },
    { id: 21, text: 'האם סגרתם שירותי ניקיון?', checked: false },
    { id: 22, text: 'האם סגרתם שירותי אבטחה?', checked: false },
    { id: 23, text: 'האם סגרתם רקדנים מקצועיים?', checked: false },
    { id: 24, text: 'האם סגרתם מתופפים ושופרות?', checked: false },
    { id: 25, text: 'האם סגרתם מאפרת מקצועית?', checked: false },
    { id: 26, text: 'האם סגרתם מעצב שיער?', checked: false },
    { id: 27, text: 'האם סגרתם פינת יצירה לילדים?', checked: false },
    { id: 28, text: 'האם סגרתם בר קפה?', checked: false },
    { id: 29, text: 'האם סגרתם שולחן קינוחים?', checked: false },
    { id: 30, text: 'האם סגרתם עמדת שייקים?', checked: false },
    { id: 31, text: 'האם סגרתם בר קוקטיילים?', checked: false },
    { id: 32, text: 'האם סגרתם קרפ צרפתי?', checked: false },
    { id: 33, text: 'האם סגרתם דוכן גלידה?', checked: false },
    { id: 34, text: 'האם סגרתם מופע קסמים?', checked: false },
    { id: 35, text: 'האם סגרתם עיצוב חופה?', checked: false },
    { id: 36, text: 'האם סגרתם צלם מגנטים?', checked: false },
    { id: 37, text: 'האם סגרתם שירותי חניה?', checked: false },
    { id: 38, text: 'האם סגרתם פינת טעימות?', checked: false },
    { id: 39, text: 'האם סגרתם מנהל אירוע?', checked: false },
    { id: 40, text: 'האם סגרתם עיצוב כניסה לאולם?', checked: false },
    { id: 41, text: 'האם סגרתם צלם סטילס?', checked: false },
    { id: 42, text: 'האם סגרתם תאורת במה?', checked: false },
    { id: 43, text: 'האם סגרתם מערכת הגברה?', checked: false },
    { id: 44, text: 'האם סגרתם מפיק אירועים?', checked: false },
    { id: 45, text: 'האם סגרתם להקת נגנים?', checked: false },
    { id: 46, text: 'האם סגרתם מופע אומנותי?', checked: false },
    { id: 47, text: 'האם סגרתם קריינות לאירוע?', checked: false },
    { id: 48, text: 'האם סגרתם מתנות לאורחים?', checked: false },
    { id: 49, text: 'האם סגרתם פינת צילום עם אביזרים?', checked: false },
    { id: 50, text: 'האם סגרתם פינת צילום 360?', checked: false },
    { id: 51, text: 'האם סגרתם עיצוב כיסאות?', checked: false },
    { id: 52, text: 'האם סגרתם שף פרטי?', checked: false },
    { id: 53, text: 'האם סגרתם מופע לייזרים?', checked: false },
    { id: 54, text: 'האם סגרתם רכב חתונה?', checked: false },
    { id: 55, text: 'האם סגרתם תפאורה לחינה?', checked: false },
    { id: 56, text: 'האם סגרתם תלבושות לחינה?', checked: false },
    { id: 57, text: 'האם סגרתם תכשיטים לחינה?', checked: false },
    { id: 58, text: 'האם סגרתם מאפרת לחינה?', checked: false },
    { id: 59, text: 'האם סגרתם צלם לחינה?', checked: false },
    { id: 60, text: 'האם סגרתם הזמנות דיגיטליות?', checked: false },
    { id: 61, text: 'האם סגרתם חבילת צילום לחתונה?', checked: false },
    { id: 62, text: 'האם סגרתם חבילת צילום לחינה?', checked: false },
    { id: 63, text: 'האם סגרתם אולם קטן לאירוע משפחתי?', checked: false },
    { id: 64, text: 'האם סגרתם הפקת חינה?', checked: false },
    { id: 65, text: 'האם סגרתם תפאורה לאירוע?', checked: false },
  ]);
  
  
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const navigation = useNavigation(); // ייבוא הניווט
  const [newTask, setNewTask] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editNoteId, setEditNoteId] = useState(null); // מזהה הפתק שנערך
  const [isEditMode, setIsEditMode] = useState(false); // מצב עריכה

  useEffect(() => {
    if (user) {
      const tasksRef = ref(database, `Events/${user.uid}/${id}/task`);

      get(tasksRef).then((snapshot) => {
        if (snapshot.exists()) {
          setTableData(snapshot.val());
        }
      });

      const notesRef = ref(database, `Events/${user.uid}/${id}/notes`);
      get(notesRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setNotes(Object.entries(data).map(([key, value]) => ({ id: key, ...value })));
        }
      });
    }
  }, [user]);

  const countCheckedTasks = () => {
    return tableData.filter((item) => item.checked).length;
  };
  
  const handleCheckBoxChange = (index) => {
    const newData = [...tableData];
    newData[index].checked = !newData[index].checked;
    setTableData(newData);
  
    if (user) {
      const tasksRef = ref(database, `Events/${user.uid}/${id}/task`);
      set(tasksRef, newData).catch((error) => {
        Alert.alert('Error', error.message);
      });
    }
  };
  const startEditNote = (note) => {
    setEditNoteId(note.id);
    setCurrentNoteName(note.name);
    setCurrentNote(note.content);
    setIsEditMode(true);
  };
  

  const saveNote = () => {
    if (!currentNote.trim()) {
      Alert.alert('שגיאה', 'אנא הזן תוכן לפתק');
      return;
    }
  
    if (isEditMode && editNoteId) {
      // עדכון פתק קיים
      const noteRef = ref(database, `Events/${user.uid}/${id}/notes/${editNoteId}`);
      const updatedNote = {
        name: currentNoteName,
        content: currentNote,
        lastUpdated: new Date().toLocaleString(),
      };
  
      set(noteRef, updatedNote)
        .then(() => {
          setNotes((prevNotes) =>
            prevNotes.map((note) => (note.id === editNoteId ? { id: editNoteId, ...updatedNote } : note))
          );
          resetForm();
        })
        .catch((error) => {
          Alert.alert('שגיאה', 'לא ניתן לעדכן את הפתק: ' + error.message);
        });
    } else {
      // הוספת פתק חדש
      const newNote = {
        name: currentNoteName || `פתק חדש ${notes.length + 1}`,
        content: currentNote,
        lastUpdated: new Date().toLocaleString(),
      };
  
      const notesRef = ref(database, `Events/${user.uid}/${id}/notes`);
      push(notesRef, newNote).then((snapshot) => {
        setNotes([...notes, { id: snapshot.key, ...newNote }]);
        resetForm();
      });
    }
  };
  const resetForm = () => {
    setEditNoteId(null);
    setCurrentNote('');
    setCurrentNoteName('');
    setIsEditMode(false);
  };
  

  const resetModalState = () => {
    setEditNoteId(null);
    setCurrentNote('');
    setCurrentNoteName('');
    setIsEditMode(false);
    setModalVisible(false);
  };
    
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [tableData]);

  
  useEffect(() => {
    if (user) {
      const tasksRef = ref(database, `Events/${user.uid}/${id}/task`);
      get(tasksRef).then((snapshot) => {
        if (snapshot.exists() && Array.isArray(snapshot.val())) {
          setTableData(snapshot.val());
        } else {
          setTableData([
           
    { id: 1, text: 'האם סגרתם אולם אירועים?', checked: false },
    { id: 2, text: 'האם סגרתם גן אירועים?', checked: false },
    { id: 3, text: 'האם סגרתם צלם לאירוע?', checked: false },
    { id: 4, text: 'האם סגרתם צלם וידאו?', checked: false },
    { id: 5, text: 'האם סגרתם DJ לאירוע?', checked: false },
    { id: 6, text: 'האם סגרתם להקה חיה?', checked: false },
    { id: 7, text: 'האם סגרתם קייטרינג?', checked: false },
    { id: 8, text: 'האם סגרתם עיצוב שולחנות?', checked: false },
    { id: 9, text: 'האם סגרתם סידורי פרחים?', checked: false },
    { id: 10, text: 'האם סגרתם הסעות לאורחים?', checked: false },
    { id: 11, text: 'האם סגרתם שמלת כלה?', checked: false },
    { id: 12, text: 'האם סגרתם חליפת חתן?', checked: false },
    { id: 13, text: 'האם סגרתם תכשיטים לכלה?', checked: false },
    { id: 14, text: 'האם סגרתם חופה?', checked: false },
    { id: 15, text: 'האם סגרתם בר שתייה?', checked: false },
    { id: 16, text: 'האם סגרתם תא צילום?', checked: false },
    { id: 17, text: 'האם סגרתם בלונים מעוצבים?', checked: false },
    { id: 18, text: 'האם סגרתם קונפטי לאירוע?', checked: false },
    { id: 19, text: 'האם סגרתם מופע זיקוקים?', checked: false },
    { id: 20, text: 'האם סגרתם מפל שוקולד?', checked: false },
    { id: 21, text: 'האם סגרתם שירותי ניקיון?', checked: false },
    { id: 22, text: 'האם סגרתם שירותי אבטחה?', checked: false },
    { id: 23, text: 'האם סגרתם רקדנים מקצועיים?', checked: false },
    { id: 24, text: 'האם סגרתם מתופפים ושופרות?', checked: false },
    { id: 25, text: 'האם סגרתם מאפרת מקצועית?', checked: false },
    { id: 26, text: 'האם סגרתם מעצב שיער?', checked: false },
    { id: 27, text: 'האם סגרתם פינת יצירה לילדים?', checked: false },
    { id: 28, text: 'האם סגרתם בר קפה?', checked: false },
    { id: 29, text: 'האם סגרתם שולחן קינוחים?', checked: false },
    { id: 30, text: 'האם סגרתם עמדת שייקים?', checked: false },
    { id: 31, text: 'האם סגרתם בר קוקטיילים?', checked: false },
    { id: 32, text: 'האם סגרתם קרפ צרפתי?', checked: false },
    { id: 33, text: 'האם סגרתם דוכן גלידה?', checked: false },
    { id: 34, text: 'האם סגרתם מופע קסמים?', checked: false },
    { id: 35, text: 'האם סגרתם עיצוב חופה?', checked: false },
    { id: 36, text: 'האם סגרתם צלם מגנטים?', checked: false },
    { id: 37, text: 'האם סגרתם שירותי חניה?', checked: false },
    { id: 38, text: 'האם סגרתם פינת טעימות?', checked: false },
    { id: 39, text: 'האם סגרתם מנהל אירוע?', checked: false },
    { id: 40, text: 'האם סגרתם עיצוב כניסה לאולם?', checked: false },
    { id: 41, text: 'האם סגרתם צלם סטילס?', checked: false },
    { id: 42, text: 'האם סגרתם תאורת במה?', checked: false },
    { id: 43, text: 'האם סגרתם מערכת הגברה?', checked: false },
    { id: 44, text: 'האם סגרתם מפיק אירועים?', checked: false },
    { id: 45, text: 'האם סגרתם להקת נגנים?', checked: false },
    { id: 46, text: 'האם סגרתם מופע אומנותי?', checked: false },
    { id: 47, text: 'האם סגרתם קריינות לאירוע?', checked: false },
    { id: 48, text: 'האם סגרתם מתנות לאורחים?', checked: false },
    { id: 49, text: 'האם סגרתם פינת צילום עם אביזרים?', checked: false },
    { id: 50, text: 'האם סגרתם פינת צילום 360?', checked: false },
    { id: 51, text: 'האם סגרתם עיצוב כיסאות?', checked: false },
    { id: 52, text: 'האם סגרתם שף פרטי?', checked: false },
    { id: 53, text: 'האם סגרתם מופע לייזרים?', checked: false },
    { id: 54, text: 'האם סגרתם רכב חתונה?', checked: false },
    { id: 55, text: 'האם סגרתם תפאורה לחינה?', checked: false },
    { id: 56, text: 'האם סגרתם תלבושות לחינה?', checked: false },
    { id: 57, text: 'האם סגרתם תכשיטים לחינה?', checked: false },
    { id: 58, text: 'האם סגרתם מאפרת לחינה?', checked: false },
    { id: 59, text: 'האם סגרתם צלם לחינה?', checked: false },
    { id: 60, text: 'האם סגרתם הזמנות דיגיטליות?', checked: false },
    { id: 61, text: 'האם סגרתם חבילת צילום לחתונה?', checked: false },
    { id: 62, text: 'האם סגרתם חבילת צילום לחינה?', checked: false },
    { id: 63, text: 'האם סגרתם אולם קטן לאירוע משפחתי?', checked: false },
    { id: 64, text: 'האם סגרתם הפקת חינה?', checked: false },
    { id: 65, text: 'האם סגרתם תפאורה לאירוע?', checked: false },
          ]);
        }
      }).catch((error) => {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'שגיאה בטעינת הנתונים מהשרת');
      });
    }
  }, [user]);
  
  const addTask = () => {
    if (newTask.trim() === '') {
      Alert.alert('שגיאה', 'אנא הזן טקסט למשימה');
      return;
    }
  
    // מציאת המזהה הגבוה ביותר והוספת 1
    const maxId = tableData.length > 0 ? Math.max(...tableData.map((item) => item.id)) : 0;
    const newTaskItem = { id: maxId + 1, text: newTask, checked: false, custom: true };
  
    const updatedTableData = [...tableData, newTaskItem];
    setTableData(updatedTableData);
    setNewTask('');
    setModalVisible(false);
  
    // שמירת הנתונים בפיירבייס
    if (user) {
      const tasksRef = ref(database, `Events/${user.uid}/${id}/task`);
      set(tasksRef, updatedTableData).catch((error) => {
        Alert.alert('Error', error.message);
      });
    }
  };
  
  

  const deleteTask = (id) => {
    const newData = tableData.filter((item) => item.id !== id || !item.custom);
    setTableData(newData);
  };
  const [slideAnim] = useState(new Animated.Value(0));

  // פונקציה להפעלת האנימציה בעת שינוי הטאב
  const switchTab = (tab) => {
    const direction = tab === 'table' ? 0 : 1;

    Animated.timing(slideAnim, {
      toValue: direction,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setSelectedTab(tab);
  };
  const renderTableRow = ({ item, index }) => (
    <View style={styles.row}>
      <TouchableOpacity style={styles.checkbox} onPress={() => handleCheckBoxChange(index)}>
        <Text style={styles.checkboxText}>{item.checked ? 'V' : ''}</Text>
      </TouchableOpacity>
      <Text style={styles.textCell}>{item.text}</Text>
      {item.custom && (
        <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.cell}>{item.id}</Text>

    </View>
  );
  
  
  

  const addNote = () => {
    if (!currentNote.trim()) {
      Alert.alert('שגיאה', 'אנא הזן תוכן לפתק');
      return;
    }
  
    if (user) {
      const newNote = {
        name: currentNoteName || `פתק חדש ${notes.length + 1}`,
        content: currentNote,      // ודא שהתוכן מתווסף כאן
        lastUpdated: new Date().toLocaleString(),
      };
  
      const notesRef = ref(database, `Events/${user.uid}/${id}/notes`);
  
      push(notesRef, newNote).then(() => {
        setNotes([...notes, newNote]);
        setCurrentNote('');        // נקה את התוכן לאחר ההוספה
        setCurrentNoteName('');    // נקה את שם הפתק לאחר ההוספה
      });
    }
  };
  

  const deleteNote = (noteId) => {
    console.log('ID של הפתק למחיקה:', noteId); // בדיקת ה-ID שמתקבל
  
    if (user && noteId) {
      const noteRef = ref(database, `Events/${user.uid}/${id}/notes/${noteId}`);
      remove(noteRef)
        .then(() => {
          setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
        })
        .catch((error) => {
          Alert.alert('שגיאה', 'לא ניתן למחוק את הפתק: ' + error.message);
        });
    } else {
      Alert.alert('שגיאה', 'לא נמצא מזהה למחיקת הפתק');
    }
  };
  

  

  return (
    <ImageBackground source={require('../assets/backgruondcontact.png')} style={styles.background}>
    <StatusBar backgroundColor="rgba(108, 99, 255, 0.9)" barStyle="light-content" />

    {selectedTab === 'table' && (
      <View style={styles.header}>
        <Text style={styles.title}>ניהול משימות</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {selectedTab === 'table' && (
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.backButton}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
           )}

        </View>
      </View>
    )}
    {selectedTab === 'table' && (


      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'table' && styles.selectedTab]}
          onPress={() => setSelectedTab('table')}
        >
          <Text style={styles.tabText}>צ'ק ליסט</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'notes' && styles.selectedTab]}
          onPress={() => setSelectedTab('notes')}
        >
          <Text style={styles.tabText}>פתקים</Text>
        </TouchableOpacity>
      </View>
    )}

      {selectedTab === 'table' && (
        <Animated.View style={[styles.dashboardContainer, { opacity: fadeAnim }]}>
        <View style={styles.dashboardBox}>
          <Text style={styles.dashboardText}>כמות המשימות {tableData.length}</Text>
        </View>
        <View style={styles.dashboardBox}>
          <Text style={styles.dashboardText}>משימות מסומנות {countCheckedTasks()}</Text>
        </View>
        <View style={styles.dashboardBox}>
          <Text style={styles.dashboardText}>
            משימות שהוספת {tableData.filter((item) => item.custom).length}
          </Text>
        </View>
      </Animated.View>
      )}


      {selectedTab === 'table' && (
        <View style={styles.tableContainer}>
          <FlatList
            data={tableData}
            renderItem={renderTableRow}
            keyExtractor={(item) => item.id.toString()}
          />
        </View>
        
      )}
      {selectedTab === 'table' && (
        <Text style={styles.title2}>לחץ על כפתור ה- + ליצירת משימה חדשה לביצוע, מומלץ לעבור על הרשימה ולודא שלא שכחנו כלום.</Text>
      )}


      {selectedTab === 'notes' && (
      <View style={styles.header2}>
        <Text style={styles.title}>ניהול משימות</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {selectedTab === 'table' && (
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.backButton}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
           )}

        </View>
      </View>
    )}
    {selectedTab === 'notes' && (


      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'table' && styles.selectedTab]}
          onPress={() => setSelectedTab('table')}
        >
          <Text style={styles.tabText}>צ'ק ליסט</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'notes' && styles.selectedTab]}
          onPress={() => setSelectedTab('notes')}
        >
          <Text style={styles.tabText}>פתקים</Text>
        </TouchableOpacity>
      </View>
    )}

      {selectedTab === 'notes' && (
        <View style={styles.notesContainer}>
  <TextInput
    style={styles.noteNameInput}
    placeholder="שם הפתק"
    value={currentNoteName}
    onChangeText={setCurrentNoteName}
  />

  <TextInput
    style={styles.input2}
    placeholder="הקלד כאן את התוכן"
    placeholderTextColor="#999"
    value={currentNote}
    onChangeText={setCurrentNote}
    multiline={true}
    textAlign="right"                 // מיישר את הטקסט וה-placeholder לצד ימין

  />

      <View style={styles.buttonContainer}>
        <Text style={styles.notesCount}>סך הכל: {notes.length}</Text>
        <View style={styles.buttonGroup}>
        {isEditMode && (
            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.buttonText}>בטל עריכה</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={saveNote}>
            <Text style={styles.buttonText}>{isEditMode ? 'שמור עריכה' : 'הוסף פתק חדש'}</Text>
          </TouchableOpacity>

        </View>
      </View>



  <FlatList
    data={notes}
    renderItem={({ item }) => (
      <View style={styles.noteItem}>
        <Text style={styles.noteTitle}>{item.name}</Text>
        <Text style={styles.noteContent}>{item.content}</Text>
        <Text style={styles.noteDate}>עודכן לאחרונה: {item.lastUpdated}</Text>
        <View style={styles.noteButtons}>
          <TouchableOpacity onPress={() => startEditNote(item)} style={styles.editButton}>
            <Text style={styles.editText}>ערוך</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteNote(item.id)} style={styles.deleteButton}>
            <Text style={styles.deleteText}>מחק</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    keyExtractor={(item) => item.id}
  />
</View>

      )}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>הוסף משימה חדשה</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input3}
                placeholder="הקלד כאן את המשימה"
                value={newTask}
                onChangeText={setNewTask}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={addTask} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>הוסף</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalButton, styles.closeButton]}>
                <Text style={styles.modalButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



    </ImageBackground>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',

  },
  topBar: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 30,

  },
  title: {
    marginTop: 30, // הגדלת המרווח העליון
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10, // מרווח תחתון להפרדה טובה יותר
  },
  
  title2: {
    marginTop: 14,
    color: '#000', // טקסט כהה
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
  },
  counterContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  counterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(108, 99, 255, 0.9)',
  },
  buttonGroup: {
    flexDirection: 'row',             // מסדר את הכפתורים בשורה אופקית
    justifyContent: 'center',         // ממרכז את הכפתורים
    alignItems: 'center',      
    gap: 10,                          // מרווח של 20 פיקסלים בין הכפתורים (נתמך ב-React Native גרסה 0.71 ומעלה)
    // מיישר את הכפתורים אנכית
  },
  backIcon: {
    width: 40,
    height: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 0,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  selectedTab: {
    borderColor: 'rgba(108, 99, 255, 0.9)',

  },
  noteButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editButton: {
    marginRight: 15,
  },
  tableContainer: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    elevation: 5, // צללית לאנדרואיד
    shadowColor: '#000', // צללית ל-iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    maxHeight: 450, // מגביל את גובה הטבלה
    marginVertical: 10, // מרווח למעלה ולמטה

  },
  cancelButton: {
    backgroundColor: '#ff4d4d', // צבע אדום עבור כפתור הביטול
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 20, // מרווח בין הכפתורים
  },
  
  tabText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notesContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',

  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  buttonText: {
    color: '#fff',
    fontSize: 10,
    
  },
  background: {
    flex: 1,
    resizeMode: 'cover', // התאמת התמונה לגודל המסך
    justifyContent: 'center',
  },
  noteNameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    fontSize: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    elevation: 3,
    alignItems: 'flex-end', // מיישר את שדה הקלט לצד ימין
    textAlign: 'right',

  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    fontSize: 16,
    borderRadius: 5,
    alignItems: 'flex-end', // מיישר את שדה הקלט לצד ימין
    textAlign: 'right',

    backgroundColor: '#fdfdfd',
    textAlignVertical: 'top',
    lineHeight: 24,
    minHeight: 200,
    marginBottom: 10,
  },
  noteItem: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 0.2,
    borderColor: '#333',            // מסגרת כהה יותר

  },
  noteTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  noteContent: {
    fontSize: 16,
    color: '#000',
    marginBottom: 5,
    textAlign: 'right',

  },
  noteDate: {
    fontSize: 14,
    color: '#888',
  },
  deleteText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'right',
    marginTop: 10,
    fontWeight: 'bold',
  },
  inputContainer: {
    alignItems: 'flex-end', // מיישר את שדה הקלט לצד ימין
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  input2: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    fontSize: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
    elevation: 3,
    textAlign: 'right',
    minHeight: 100,    
    maxHeight: 150,         // גובה מינימלי שמאפשר הרבה שורות
    textAlignVertical: 'top', // מיישר את הטקסט לחלק העליון של התיב
    textAlign: 'right',           // יישור הטקסט לימין

  },
  input3: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    fontSize: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
    elevation: 3,
    textAlign: 'right',
    // גובה מינימלי שמאפשר הרבה שורות
    // גובה מינימלי שמאפשר הרבה שורות
    textAlignVertical: 'top', // מיישר את הטקסט לחלק העליון של התיב
  },
  cell: {
    width: 30,
    textAlign: 'center',
    fontSize: 16,
  },
  textCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  checkbox: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  checkboxText: {
    fontSize: 18,
    color: '#000',
  },
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: -50,

  },
  header2: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: -3,

  },
  headerButtons: {
    marginBottom: -40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    
  },
  backButtonText: {
    fontSize: 29,
    color: '#fff',
    marginBottom: 20,

  },
  addButtonText:{
    fontSize: 29,
    color: '#fff',
    marginBottom: 20,

},
  backButton: {
    padding: 10,
    marginLeft: -10, // מרווח משמאל לכפתור פלוס
    marginTop: -30,

  },
  addButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,   // הקטן את גודל הטקסט של הכפתור
    fontWeight: 'bold',
  },
  notesCount: {
    fontSize: 17,
    color: '#6c63ff',
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
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center', // ממקם את הכותרת באמצע

  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    alignItems: 'flex-end', // מיישר את שדה הקלט לצד ימין

    fontSize: 16,
    width: '100%', // שדה הקלט ימלא את כל הרוחב של הקונטיינר
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10, // מרווח עליון להפרדה משדה הקלט

  },
  modalButton: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
  },
  closeButton: {
    backgroundColor: '#808080',
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  editText: {
    color: 'blue',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginRight: 10,
  },
  deleteText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dashboardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 0,
    padding: 10,
  },
  
  dashboardBox: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '30%',
    elevation: 5, // צללית לאנדרואיד
    shadowColor: '#000', // צללית ל-iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  
  dashboardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c63ff', // צבע סגול מעודן
    textAlign: 'center',
  },
  
  
  
});

export default Task;
