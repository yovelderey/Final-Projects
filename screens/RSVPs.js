import React, { useEffect, useRef,useState } from 'react';
import { View, Text,Animated, ImageBackground,TextInput, TouchableOpacity,Modal, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set,push, remove,get,update, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStorage, ref as storageRef, listAll, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}



const RSVPs = (props) => {
  const [message, setMessage] = useState();
  const [phoneNumbers, setPhoneNumbers] = useState(['']);
  const [responses, setResponses] = useState([]);
  const [yesCount, setYesCount] = useState(0);
  const [noCount, setNoCount] = useState(0);
  const [noResponseCount, setNoResponseCount] = useState(0);
  const id = props.route.params.id; // Accessing the passed id
  const [contacts, setContacts] = useState([]);
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [eventDetails, setEventDetails] = useState({});
  const [eventDetails2, setEventDetails2] = useState({});
  const [eventDetails3, setEventDetails3] = useState({});
  const [eventDetails4, setEventDetails4] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const auth = getAuth();
  const database = getDatabase();
  const [invitationImageUrl, setInvitationImageUrl] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [message2, setMessage2] = useState('אין כעת עדכונים'); // ברירת מחדל מעודכנת
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [isHelpModalVisible, setHelpModalVisible] = useState(false); // הוספת state עבור המודל
  const [planType, setPlanType] = useState('');

  const bounceAnim = useRef(new Animated.Value(1)).current;
  const [isScheduled, setIsScheduled] = useState(false); // מצב האם היומן נשמר
  const [sentInvitations, setSentInvitations] = useState(0);
  const [sentReminders, setSentReminders] = useState(0);
  const [sentWeddingDay, setSentWeddingDay] = useState(0);
  const [sentThankYou, setSentThankYou] = useState(0);
  

  const [mehsa, setmehsa] = useState();
  const [error, setError] = useState([]);
  const [noResponse, setNoResponse] = useState([]);
  const [yes, setYes] = useState([]);
  const [no, setNo] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("מוזמנים");
  const [maybe, setMaybe] = useState([]);
  const [showRepeatPrompt, setShowRepeatPrompt] = useState(false);
  const [hasPromptShown, setHasPromptShown] = useState(false);

  


  useEffect(() => {

    const fetchData = async () => {
      if (user) {
        try {
          const databaseRef = ref(database, `Events/${user.uid}/${id}/`);
          const snapshot = await get(databaseRef);
          const fetchedData = snapshot.val();

          if (fetchedData) {
            setEventDetails(fetchedData); // Set the fetched event details
          }


          
          return () => clearInterval(intervalId);

        } catch (error) {
          //console.error("Error fetching data: ", error);
        }
      }
    };
    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        
        
        const databaseRef = ref(database, `Events/${currentUser.uid}/${id}/contacts`);
        onValue(databaseRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const contactsArray = Object.values(data);
            setContacts(contactsArray);
          } else {
            setContacts([]);
          }
        });
      } else {
        setUser(null);
        setContacts([]);
      }
    });

    fetchData();

  }, [user, id]);
  useEffect(() => {
    if (user) {
      const eventRef = ref(database, `Events/${user.uid}/${id}/`);
      
      const handleValueChange = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEventDetails(data);
        }
      };
      
      // Attach listener
      const unsubscribe = onValue(eventRef, handleValueChange);
      
      // Cleanup function
      return () => {
        unsubscribe(); // Call unsubscribe to remove the listener
      };
    }
  }, [user, id]);


  useEffect(() => {
    if (user) {
      const eventRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/1/col1`);
      const eventRef2 = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/2/col1`);
      const eventRef3 = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/3/col1`);

      const handleValueChange = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEventDetails2(data);
        }
      };

      const handleValueChange2 = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEventDetails3(data);
        }
      };

      const handleValueChange3 = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEventDetails4(data);
        }
      };
      
      // Attach listener
      const unsubscribe = onValue(eventRef, handleValueChange);
      const unsubscribe2 = onValue(eventRef2, handleValueChange2);
      const unsubscribe3 = onValue(eventRef3, handleValueChange3);

      // Cleanup function
      return () => {
        unsubscribe(); 
        unsubscribe2(); // Call unsubscribe to remove the listener
        unsubscribe3(); // Call unsubscribe to remove the listener
        // Call unsubscribe to remove the listener
      };
    }
  }, [user, id]);

  useEffect(() => {
    if (user && id && tableData.length > 0) {
      const updatedTableData = tableData.map((row) => {
        const rowDate = new Date(row.col1);
        const today = new Date();
        
        if (rowDate.toDateString() === today.toDateString()) {
          return { ...row, col3: sentInvitations }; // עדכון מספר ההודעות שנשלחו באותו תאריך
        }
        return row;
      });
  
      setTableData(updatedTableData);
  
      // עדכון הנתונים בפיירבייס
      updatedTableData.forEach((row, index) => {
        const rowRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/${index}/col3`);
        set(rowRef, row.col3);
      });
    }
  }, [sentInvitations, sentReminders, sentWeddingDay, sentThankYou, user, id]);
  
  useEffect(() => {
    if (user) {
      const messagesRef = ref(database, `whatsapp/${user.uid}/${id}`);
      onValue(messagesRef, (snapshot) => {
        if (!snapshot.exists()) return;
  
        const messages = snapshot.val();
        let invitationCount = 0;
        let reminderCount = 0;
        let weddingDayCount = 0;
        let thankYouCount = 0;
  
        Object.values(messages).forEach((msg) => {
          const messageDate = new Date(msg.scheduleMessage);
          const today = new Date();
          
          if (messageDate.toDateString() === today.toDateString()) {
            invitationCount++;
          }
          
          // בדיקה אם ההודעה שייכת לשלב אחר
          if (msg.message.includes("תזכורת")) {
            reminderCount++;
          } else if (msg.message.includes("יום החתונה")) {
            weddingDayCount++;
          } else if (msg.message.includes("תודה רבה")) {
            thankYouCount++;
          }
        });
  
        setSentInvitations(invitationCount);
        setSentReminders(reminderCount);
        setSentWeddingDay(weddingDayCount);
        setSentThankYou(thankYouCount);
      });
    }
  }, [user, id]);
  

  useEffect(() => {
    let interval = null;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const startTimer = () => {
    setTimer(eventDetails.counter_contacts*25);
    setIsRunning(true);
  };

  const animation = useRef(new Animated.Value(0)).current;

  const targetDate = new Date(eventDetails.message_date_hour?.date);

  useEffect(() => {
    const updateCountdown = () => {
      const currentDate = new Date();
      const targetDate = new Date(eventDetails.message_date_hour?.date);
      const targetTime = eventDetails.message_date_hour?.time?.split(":") || ["00", "00"];
  
      // הגדרת השעה המדויקת של ההזמנה
      targetDate.setHours(parseInt(targetTime[0], 10), parseInt(targetTime[1], 10), 0, 0);
  
      const timeDiff = targetDate - currentDate;
      if (timeDiff > 0) {
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hoursDiff = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
        if (daysDiff > 0) {
          setDaysLeft(`ההזמנות ישלחו בעוד ${daysDiff} ימים ו-${hoursDiff} שעות`);
        } else {
          setDaysLeft(`ההזמנות ישלחו בעוד ${hoursDiff} שעות ו-${minutesDiff} דקות`);
        }
      } else {
        setDaysLeft("ההזמנות נשלחו");
      }
    };
      
    
  
    updateCountdown(); // קריאה ראשונית
    const interval = setInterval(updateCountdown, 60000); // עדכון כל דקה
  
    // אנימציה חד-פעמית שמופיעה עם טעינת המסך
    Animated.timing(animation, {
      toValue: 1,
      duration: 4000, // זמן האנימציה
      useNativeDriver: true,
    }).start(); // מפעילים את האנימציה פעם אחת בלבד

    return () => clearInterval(interval);
  }, [eventDetails.message_date_hour]);
  
  const animatedStyle = {
    opacity: animation,
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.2],
        }),
      },
    ],
  };

  useEffect(() => {
    if (user) {
      const planRef = ref(database, `Events/${user.uid}/${id}/plan`);
      const unsubscribe = onValue(planRef, (snapshot) => {
        if (snapshot.exists()) {
          setPlanType(snapshot.val());
        } else {
          setPlanType('no plan'); // ברירת מחדל
        }
      });
  
      return () => unsubscribe();
    }
  }, [user, id]);
  

  useEffect(() => {
    const fetchMessage = async () => {
      const database = getDatabase();
      const messageRef = ref(database, `notification/mesageRSVPs`); // הנתיב המעודכן

      try {
        setLoading(true); // התחלת טעינה
        const snapshot = await get(messageRef);

        if (snapshot.exists()) {
          setMessage2(snapshot.val()); // עדכון הטקסט מהנתיב
        }
      } catch (error) {
        console.error('Error fetching message:', error); // הדפסת השגיאה
      } finally {
        setLoading(false); // סיום הטעינה
      }
    };

    fetchMessage();
  }, []);

  // אנימציה של קפיצה
  useEffect(() => {
    if (!isScheduled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isScheduled]);

  const handleSchedulePress = () => {
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumbers.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.newPrice && contact.newPrice.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function formatPhoneNumber(phoneNumber) {
    // הסרת כל תווים שאינם ספרות או +
    phoneNumber = phoneNumber.replace(/[^0-9+]/g, '');

    // אם המספר מתחיל ב-0, מחליף את הקידומת ל-972
    if (phoneNumber.startsWith('0')) {
      phoneNumber = `972${phoneNumber.slice(1)}`;
    }
  
    // אם המספר מתחיל ב-+972, מחליף את הקידומת ב-972 בלבד
    if (phoneNumber.startsWith('+972')) {
      phoneNumber = phoneNumber.replace('+', '');
    }
  
    // אם המספר לא מתחיל ב-972, הוסף את הקידומת
    if (!phoneNumber.startsWith('972')) {
      phoneNumber = `972${phoneNumber}`;
    }
  
    return phoneNumber;
  }
  const startAnimation = () => {
    bounceAnim.setValue(1); // מאפס את האנימציה
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  // קריאה לאנימציה עם טעינת המסך
  useEffect(() => {
    startAnimation();
  }, []);
  
  const resetSchedule = () => {
    setIsScheduled(false); // מאפס את מצב השמירה
    startAnimation(); // מפעיל מחדש את האנימציה
  };

  const stopBounceAnimation = () => {
    bounceAnim.stopAnimation(); // מפסיק את האנימציה
    bounceAnim.setValue(1); // קובע את הערך ל-1
  };

  const fetchInvitationImage = async () => {
    try {
      const storage = getStorage();
      const folderPath = `users/${user.uid}/${id}/invitation/`;
      const listRef = storageRef(storage, folderPath);
  
      // קבלת רשימת הקבצים בתיקיית `invitation`
      const files = await listAll(listRef);
  
      if (files.items.length > 0) {
        // קבלת ה-URL של התמונה הראשונה
        const imageUrl = await getDownloadURL(files.items[0]);
        setInvitationImageUrl(imageUrl); // שמירת ה-URL של התמונה
      } else {
        console.log('No image found in invitation folder.');

        setInvitationImageUrl(null); // אין תמונה זמינה
      }
    } catch (error) {
      console.error('Error fetching invitation image:', error);
    }
  };



  useEffect(() => {
    if (user && id) {
      fetchInvitationImage();
    }
  }, [user, id]); // הטעינה מתבצעת כאשר `user` או `id` משתנים
  

  const sendMessageToRecipientssms = async () => {
    try {
        const mainSmsRef = ref(database, `Events/${user.uid}/${id}/main_sms`);
        const mainSmsSnapshot = await get(mainSmsRef);

        if (!mainSmsSnapshot.exists()) {
            Alert.alert("Error", "המכסה לא קיימת במערכת.");
            setModalVisible(false);
            return;
        }

        const initialMainSms = mainSmsSnapshot.val(); // ✅ שמירת ערך המכסה ההתחלתי
        const currentUserUid = user?.uid;
        if (!currentUserUid) throw new Error("User not authenticated");

        // שליפת הודעת ברירת מחדל מפיירבייס
        const messageRef = ref(database, `Events/${currentUserUid}/${id}/message`);
        const messageSnapshot = await get(messageRef);
        const messageFromFirebase = messageSnapshot.val() || 'שלום! אנא אשר את הגעתך לאירוע שלנו בקישור הבא:';

        // שליפת שם האירוע מפיירבייס
        const eventRef = ref(database, `Events/${user.uid}/${id}/eventName`);
        const eventSnapshot = await get(eventRef);
        const eventName = eventSnapshot.exists() ? eventSnapshot.val() : "אירוע";

        // הפקת מספרי הטלפון מאנשי הקשר
        const recipients = contacts
            .map((contact) => contact.phoneNumbers)
            .filter((num) => num.trim() !== '');
        const formattedContacts = recipients.map(formatPhoneNumber);

        // כתובת בסיס של האתר שלך
        const baseUrl = "https://final-project-d6ce7.web.app";

        // נתיב ב-Firebase
        const messageWhatsAppRef = ref(database, `whatsapp/${currentUserUid}/${id}/`);

        // שליפת אנשי קשר
        const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
        const contactsSnapshot = await get(contactsRef);

        if (!contactsSnapshot.exists()) {
            console.error('❌ שגיאה: אנשי הקשר לא נמצאו ב-Firebase.');
            Alert.alert('Error', 'לא ניתן לשלוף את אנשי הקשר.');
            return;
        }

        const contactsData = contactsSnapshot.val() || {};

        // 🔹 ספירת הודעות `sent` קיימות
        const existingMessagesSnapshot = await get(messageWhatsAppRef);
        let sentMessagesCount = 0;

        if (existingMessagesSnapshot.exists()) {
            const messages = existingMessagesSnapshot.val();
            Object.values(messages).forEach((msg) => {
                if (msg.status === "sent") {
                    sentMessagesCount++;
                }
            });
        }

        // 🔹 שליחת הודעות חדשות עם קישור מותאם אישית
        let newSentMessages = 0;
        for (const contact of formattedContacts) {
            const contactData = Object.values(contactsData).find(
                (c) => formatPhoneNumber(c.phoneNumbers) === contact
            );

            const contactName = contactData?.displayName || "שם לא ידוע";
            const guestId = contactData?.recordID || Math.random().toString(36).substring(7);

            // קידוד שם האירוע כך שלא יכיל תווים בעייתיים
            const encodedEventName = encodeURIComponent(eventName);

            // יצירת קישור מותאם אישית למוזמן
            const guestLink = `${baseUrl}?eventId=${encodedEventName}&guestId=${guestId}`;

            // יצירת ההודעה עם הקישור
            const fullMessage = `${messageFromFirebase} \n\nלאישור ההגעה: ${guestLink}`;

            // שליחת הנתונים לפיירבייס
            const newMessageRef = push(messageWhatsAppRef);
            const messageData = {
                currentUserUid,
                eventUserId: id,
                formattedContacts: contact,
                name: contactName,
                imageUrl: invitationImageUrl || "",
                message: fullMessage,
                scheduleMessage: "2025-01-01T00:00",
                serverId: '',
                sms: "yes",
                status: 'pending',
                timestamp: new Date().toISOString(),
            };

            await set(newMessageRef, messageData);

            // ✅ אם ההודעה מסומנת כ-"sent", נספור אותה
            if (messageData.status === "sent") {
                newSentMessages++;
            }
        }

        // ✅ חישוב `main_sms` שיוצג **ללא עדכון בפיירבייס**
        const displayedMainSms = Math.max(0, initialMainSms - (sentMessagesCount + newSentMessages));

        // ✅ עדכון `sent_msg` בפיירבייס
        if (newSentMessages > 0) {
            const sentMsgRef = ref(database, `Events/${user.uid}/${id}/sent_msg`);
            await set(sentMsgRef, sentMessagesCount + newSentMessages);

            console.log(`✔️ עדכון Firebase: sent_msg = ${sentMessagesCount + newSentMessages}`);
        }
        const imageUrlss = ref(database, `Events/${user.uid}/${id}/imageUrl/`);
        set(imageUrlss, invitationImageUrl || "");

        Alert.alert('הודעה נשלחה בהצלחה', `ההזמנות נשלחו עם קישורים אישיים למוזמנים.\n✅ מכסה נותרת: ${displayedMainSms}`);
    } catch (error) {
        console.error('❌ שגיאה:', error);
        Alert.alert('Error', 'Something went wrong while sending messages.');
    } finally {
        setModalVisible(false);
    }
};

  const sendMessageToRecipients = async () => {
    try {
        const mainSmsRef = ref(database, `Events/${user.uid}/${id}/main_sms`);
        const mainSmsSnapshot = await get(mainSmsRef);

        if (!mainSmsSnapshot.exists()) {
            Alert.alert("Error", "המכסה לא קיימת במערכת.");
            setModalVisible(false);
            return;
        }

        const initialMainSms = mainSmsSnapshot.val(); // ✅ שמירת ערך המכסה ההתחלתי
        const currentUserUid = user?.uid;
        if (!currentUserUid) throw new Error("User not authenticated");

        // שליפת הודעת ברירת מחדל מפיירבייס
        const messageRef = ref(database, `Events/${currentUserUid}/${id}/message`);
        const messageSnapshot = await get(messageRef);
        const messageFromFirebase = messageSnapshot.val() || 'שלום! אנא אשר את הגעתך לאירוע שלנו בקישור הבא:';

        // שליפת שם האירוע מפיירבייס
        const eventRef = ref(database, `Events/${user.uid}/${id}/eventName`);
        const eventSnapshot = await get(eventRef);
        const eventName = eventSnapshot.exists() ? eventSnapshot.val() : "אירוע";

        // הפקת מספרי הטלפון מאנשי הקשר
        const recipients = contacts
            .map((contact) => contact.phoneNumbers)
            .filter((num) => num.trim() !== '');
        const formattedContacts = recipients.map(formatPhoneNumber);

        // כתובת בסיס של האתר שלך
        const baseUrl = "https://final-project-d6ce7.web.app";

        // נתיב ב-Firebase
        const messageWhatsAppRef = ref(database, `whatsapp/${currentUserUid}/${id}/`);

        // שליפת אנשי קשר
        const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
        const contactsSnapshot = await get(contactsRef);

        if (!contactsSnapshot.exists()) {
            console.error('❌ שגיאה: אנשי הקשר לא נמצאו ב-Firebase.');
            Alert.alert('Error', 'לא ניתן לשלוף את אנשי הקשר.');
            return;
        }

        const contactsData = contactsSnapshot.val() || {};

        // 🔹 ספירת הודעות `sent` קיימות
        const existingMessagesSnapshot = await get(messageWhatsAppRef);
        let sentMessagesCount = 0;

        if (existingMessagesSnapshot.exists()) {
            const messages = existingMessagesSnapshot.val();
            Object.values(messages).forEach((msg) => {
                if (msg.status === "sent") {
                    sentMessagesCount++;
                }
            });
        }

        // 🔹 שליחת הודעות חדשות עם קישור מותאם אישית
        let newSentMessages = 0;
        for (const contact of formattedContacts) {
            const contactData = Object.values(contactsData).find(
                (c) => formatPhoneNumber(c.phoneNumbers) === contact
            );

            const contactName = contactData?.displayName || "שם לא ידוע";
            const guestId = contactData?.recordID || Math.random().toString(36).substring(7);

            // קידוד שם האירוע כך שלא יכיל תווים בעייתיים
            const encodedEventName = encodeURIComponent(eventName);

            // יצירת קישור מותאם אישית למוזמן
            const guestLink = `${baseUrl}?eventId=${encodedEventName}&guestId=${guestId}`;

            // יצירת ההודעה עם הקישור
            const fullMessage = `${messageFromFirebase} \n\nלאישור ההגעה: ${guestLink}`;

            // שליחת הנתונים לפיירבייס
            const newMessageRef = push(messageWhatsAppRef);
            const messageData = {
                currentUserUid,
                eventUserId: id,
                formattedContacts: contact,
                name: contactName,
                imageUrl: invitationImageUrl || "",
                message: fullMessage,
                scheduleMessage: "2025-01-01T00:00",
                serverId: '',
                status: 'pending',
                timestamp: new Date().toISOString(),
            };

            await set(newMessageRef, messageData);

            // ✅ אם ההודעה מסומנת כ-"sent", נספור אותה
            if (messageData.status === "sent") {
                newSentMessages++;
            }
        }

        // ✅ חישוב `main_sms` שיוצג **ללא עדכון בפיירבייס**
        const displayedMainSms = Math.max(0, initialMainSms - (sentMessagesCount + newSentMessages));

        // ✅ עדכון `sent_msg` בפיירבייס
        if (newSentMessages > 0) {
            const sentMsgRef = ref(database, `Events/${user.uid}/${id}/sent_msg`);
            await set(sentMsgRef, sentMessagesCount + newSentMessages);

            console.log(`✔️ עדכון Firebase: sent_msg = ${sentMessagesCount + newSentMessages}`);
        }
        const imageUrlss = ref(database, `Events/${user.uid}/${id}/imageUrl/`);
        set(imageUrlss, invitationImageUrl || "");

        Alert.alert('הודעה נשלחה בהצלחה', `ההזמנות נשלחו עם קישורים אישיים למוזמנים.\n✅ מכסה נותרת: ${displayedMainSms}`);
    } catch (error) {
        console.error('❌ שגיאה:', error);
        Alert.alert('Error', 'Something went wrong while sending messages.');
    } finally {
        setModalVisible(false);
    }
};

useEffect(() => {
  if (user) {
      const messagesRef = ref(database, `whatsapp/${user.uid}/${id}`);
      
      onValue(messagesRef, async (sentSnapshot) => {
          let sentMessagesCount = 0; // ✅ אתחול מראש לערך מספרי

          if (sentSnapshot.exists()) {
              const messages = sentSnapshot.val();
              sentMessagesCount = Object.values(messages).filter(msg => msg.status === "sent").length;
          }

          console.log("📩 כמות הודעות שנשלחו:", sentMessagesCount);

          const sentMsgRef = ref(database, `Events/${user.uid}/${id}/sent_msg`);

          try {
              const snapshot = await get(sentMsgRef);
              const previousSentMsg = snapshot.exists() ? snapshot.val() : 0;

              if (sentMessagesCount > previousSentMsg) {
                  await set(sentMsgRef, sentMessagesCount);
                  console.log(`✔️ עדכון Firebase: sent_msg = ${sentMessagesCount}`);
              }
          } catch (error) {
              console.error("❌ שגיאה בעדכון sent_msg:", error);
          }
      });
  }
}, [user, id]);

  


  const setSpecificTime = (dateString, timeString, hourOffset = 0) => {
    if (!dateString || !timeString) return null;
  
    try {
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
  
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        throw new Error("Invalid date/time values");
      }
  
      // יצירת אובייקט Date עם השנה, החודש, היום, השעה והדקות
      const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
      // החסרת שעתיים
      date.setHours(date.getHours() + hourOffset);
      const formattedDate = date.toISOString().slice(0, 16); // מחזיר "YYYY-MM-DDTHH:MM"

      // בדיקה שהתוצאה חוקית
      if (isNaN(date.getTime())) throw new Error("Invalid Date after adjustment");
  
      return formattedDate;
    } catch (error) {
      console.error("⚠️ Error in setSpecificTime:", error.message);
      return null;
    }
  };
  
  const scheduleMessages = async () => {
    if (!user || !id || !contacts.length) return;
  
    const updates = {};
    const currentUserUid = user?.uid;
    const formattedContacts = contacts.map(contact => formatPhoneNumber(contact.phoneNumbers));
    const timestampNow = new Date().toISOString();
    const baseUrl = "https://final-project-d6ce7.web.app";
  
    const [eventSnap, messageSnap, responsesSnap] = await Promise.all([
      get(ref(database, `Events/${user.uid}/${id}/eventName`)),
      get(ref(database, `Events/${currentUserUid}/${id}/message`)),
      get(ref(database, `Events/${user.uid}/${id}/responses`)),
    ]);
  
    const eventName = eventSnap.exists() ? eventSnap.val() : "אירוע";
    const messageFromFirebase = messageSnap.val() || "שלום! אנא אשר את הגעתך לאירוע שלנו בקישור הבא:";
    const responsesData = responsesSnap.exists() ? responsesSnap.val() : {};
  
    const [invitationSnap, reminderSnap, weddingSnap, thankYouSnap] = await Promise.all([
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/0/col1`)),
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/1/col1`)),
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/2/col1`)),
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/3/col1`)),
    ]);
  
    let invitationDate = invitationSnap.val();
    let reminderDate = reminderSnap.val();
    let weddingDate = weddingSnap.val();
    let thankYouDate = thankYouSnap.val();
  
    if (!thankYouDate && weddingDate) {
      const nextDay = new Date(weddingDate);
      nextDay.setDate(nextDay.getDate() + 1);
      thankYouDate = nextDay.toISOString().split('T')[0];
    }
  
    formattedContacts.forEach((contact, idx) => {
      const messageIdBase = `msg_${idx}`;
      const contactData = contacts.find(c => formatPhoneNumber(c.phoneNumbers) === contact);
      const contactName = contactData?.displayName || "שם לא ידוע";
      const guestId = contactData?.recordID || Math.random().toString(36).substring(7);
      const encodedEventName = encodeURIComponent(eventName);
      const guestLink = `${baseUrl}?eventId=${encodedEventName}&guestId=${guestId}`;
      const fullMessage = `${messageFromFirebase} \n\nלאישור ההגעה: ${guestLink}`;
      const guestResponse = Object.values(responsesData).find(r => formatPhoneNumber(r.phoneNumbers) === contact)?.response || "";
  
      // תמיד שולח הודעת הזמנה רגילה עם SMS
      if (["plus", "basic", "premium"].includes(planType)) {

      updates[`${messageIdBase}_1`] = {
        currentUserUid,
        eventUserId: id,
        formattedContacts: contact,
        name: contactName,
        phoneNumber: contact,
        imageUrl: invitationImageUrl || "",
        message: fullMessage,
        scheduleMessage: setSpecificTime(invitationDate, eventDetails.message_date_hour?.time, 2),
        serverId: "",
        sms: "yes",
        status: "pending",
        timestamp: timestampNow,
      };
    }
    if (["digital"].includes(planType)) {

      updates[`${messageIdBase}_1`] = {
        currentUserUid,
        eventUserId: id,
        formattedContacts: contact,
        name: contactName,
        phoneNumber: contact,
        imageUrl: invitationImageUrl || "",
        message: fullMessage,
        scheduleMessage: setSpecificTime(invitationDate, eventDetails.message_date_hour?.time, 2),
        serverId: "",
        sms: "no",
        status: "pending",
        timestamp: timestampNow,
      };
    }

  
      // שליחת שלבים נוספים בהתאם לתוכנית
      if (["plus", "digital", "premium"].includes(planType)) {
        updates[`${messageIdBase}_2`] = {
          currentUserUid,
          eventUserId: id,
          formattedContacts: contact,
          name: contactName,
          phoneNumber: contact,
          imageUrl: "",
          message: "היי, זוהי תזכורת לאירוע הקרוב שלכם. נשמח לראותכם!",
          scheduleMessage: setSpecificTime(reminderDate, "15:00"),
          serverId: "",
          status: "pending",
          timestamp: timestampNow,
        };
      }
  
      if (["digital", "premium"].includes(planType)) {
        updates[`${messageIdBase}_3`] = {
          currentUserUid,
          eventUserId: id,
          formattedContacts: contact,
          name: contactName,
          phoneNumber: contact,
          imageUrl: "",
          message: "היום הגדול הגיע! נתראה באירוע.",
          scheduleMessage: setSpecificTime(weddingDate, "14:00"),
          serverId: "",
          status: "pending",
          timestamp: timestampNow,
        };
      }
  
      if (["plus","digital", "premium"].includes(planType)) {
        updates[`${messageIdBase}_4`] = {
          currentUserUid,
          eventUserId: id,
          formattedContacts: contact,
          name: contactName,
          phoneNumber: contact,
          imageUrl: "",
          message: "תודה רבה על השתתפותכם באירוע שלנו!",
          scheduleMessage: setSpecificTime(thankYouDate, "12:00"),
          serverId: "",
          status: "pending",
          timestamp: timestampNow,
        };
      }
      
    });
  
    const whatsappRef = ref(database, `whatsapp/${user.uid}/${id}`);
    await update(whatsappRef, updates);
    setModalVisible(false);
    setIsScheduled(true);
    stopBounceAnimation();
  
    const imageUrls = ref(database, `Events/${user.uid}/${id}/imageUrl/`);
    set(imageUrls, invitationImageUrl || "");
  
    Alert.alert("היומן נשמר בהצלחה", "ההודעות תוזמנו בהתאם לתוכנית.");
  };
  

  const scheduleRepeatMessages = async () => {
    if (!user || !id || !contacts.length) {
      console.log("❌ נתונים חסרים לשליחת סבב חוזר.");
      return;
    }
  
    const updates = {};
    const formattedContacts = contacts.map(contact => formatPhoneNumber(contact.phoneNumbers));
    const currentUserUid = user?.uid;
    const timestampNow = new Date().toISOString();
    const baseUrl = "https://final-project-d6ce7.web.app";
  
    // שם האירוע
    const eventNameSnapshot = await get(ref(database, `Events/${user.uid}/${id}/eventName`));
    const eventName = eventNameSnapshot.exists() ? eventNameSnapshot.val() : "אירוע";
  
    // הודעה ראשית
    const messageSnapshot = await get(ref(database, `Events/${user.uid}/${id}/message`));
    const messageFromFirebase = messageSnapshot.exists() ? messageSnapshot.val() : "שלום! אנא אשר את הגעתך לאירוע שלנו בקישור הבא:";
  
    // תאריך הזמנה מהיומן
    const invitationDateSnapshot = await get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/0/col1`));
    const invitationDate = invitationDateSnapshot.exists() ? invitationDateSnapshot.val() : null;
  
    if (!invitationDate) {
      Alert.alert("שגיאה", "לא נשלחו הזמנות ראשונות - אי אפשר לשלוח סבב חוזר.");
      return;
    }
  
    // תגובות משתמשים
    const responsesSnapshot = await get(ref(database, `Events/${user.uid}/${id}/responses`));
    const responses = responsesSnapshot.exists() ? responsesSnapshot.val() : {};
  
    formattedContacts.forEach((contact, index) => {
      const messageIdBase = `msg_${index}`;
      const contactData = contacts.find(c => formatPhoneNumber(c.phoneNumbers) === contact);
      const contactName = contactData?.displayName || "שם לא ידוע";
      const guestId = contactData?.recordID || Math.random().toString(36).substring(7);
      const encodedEventName = encodeURIComponent(eventName);
      const guestLink = `${baseUrl}?eventId=${encodedEventName}&guestId=${guestId}`;
      const fullMessage = `${messageFromFirebase} \n\nלאישור ההגעה: ${guestLink}`;
  
      const guestResponse = responses[guestId]?.response || "";
  
      if (guestResponse === "" || guestResponse === "אולי" || guestResponse === "טרם השיבו") {
        updates[`${messageIdBase}_1_repeat`] = {
          currentUserUid,
          eventUserId: id,
          formattedContacts: contact,
          name: contactName,
          phoneNumber: contact,
          imageUrl: invitationImageUrl || "",
          message: fullMessage,
          scheduleMessage: setSpecificTime(invitationDate, eventDetails.message_date_hour?.time, 2),
          serverId: "",
          sms: "no",
          status: "pending",
          timestamp: timestampNow,
        };
      }
    });
  
    if (Object.keys(updates).length === 0) {
      Alert.alert("לא נשלחו הודעות", "לא נמצאו מוזמנים שזכאים לקבל תזכורת.");
      return;
    }
  
    const repeatRef = ref(database, `whatsapp/${user.uid}/${id}`);
    await update(repeatRef, updates);
    Alert.alert("סבב תזכורת נשלח", "נשלחו תזכורות למי שטרם השיב או שסומן כאולי.");
  };
  
  
  useEffect(() => {
    if (user && id) {
      const tableRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs`);
  
      // מאזין לשינויים בנתונים ב-Firebase
      const unsubscribe = onValue(tableRef, (snapshot) => {
        const data = snapshot.val();
  
        if (data) {
          // בדיקה אם הנתונים הם אובייקט והמרתם למערך במידת הצורך
          const formattedData = Array.isArray(data)
            ? data
            : Object.keys(data).map((key) => ({
                id: key,
                ...data[key],
              }));
  
  
          // עדכון ה-state עם הנתונים המעובדים
          setTableData(formattedData);
        } else {
          console.log('No data found in Firebase for Table_RSVPs');
          setTableData([]); // ניקוי ה-state אם אין נתונים
        }
      });
  
      // ביטול המאזין כשעוזבים את המסך
      return () => unsubscribe();
    }
  }, [user, id]);
  const getPlanLabel = (type) => {
    switch (type) {
      case 'basic': return 'חבילת בסיסית';
      case 'plus': return 'חבילת פלוס';
      case 'digital': return 'חבילת דיגיטלית';
      case 'premium': return 'חבילת משלימה';
      default: return 'ללא חבילה';
    }
  };
  
  const handleReset = () => {
    if (user) {
      console.log('Refresh button handleReset');

      const maybeRef = ref(database, `Events/${user.uid}/${id}/no_answear/`);
      set(maybeRef, 0);

      const yes_caming = ref(database, `Events/${user.uid}/${id}/yes_caming/`);
      set(yes_caming, 0);

      const maybe = ref(database, `Events/${user.uid}/${id}/maybe/`);
      set(maybe, 0);

      const no_cuming = ref(database, `Events/${user.uid}/${id}/no_cuming/`);
      set(no_cuming, 0);
    }
    console.log('Refresh button finish');

  };

  const closeHelpModal = () => {
    setHelpModalVisible(false);
  };

  useEffect(() => {
    const checkRepeatCondition = async () => {
      if (!user || !id || hasPromptShown) return;
  
      const invitationDateRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs/0/col1`);
      const snapshot = await get(invitationDateRef);
  
      if (!snapshot.exists()) return;
  
      const sentDate = new Date(snapshot.val());
      const now = new Date();
  
      const diffInHours = (now - sentDate) / (1000 * 60 * 60);
      const currentHour = now.getHours();
  
      if (diffInHours >= 24 && currentHour >= 8) {
        setShowRepeatPrompt(true);
        setHasPromptShown(true); // לא נציג שוב
      }
    };
  
    checkRepeatCondition();
  }, [user, id, hasPromptShown]);
  

  
  const deletescheduleMessages = () => {
    const today = new Date();
    const invitationDateStr = eventDetails.message_date_hour?.date;
    const invitationTimeStr = eventDetails.message_date_hour?.time;
  
    if (invitationDateStr && invitationTimeStr) {
      const [year, month, day] = invitationDateStr.split('-').map(Number);
      const [hours, minutes] = invitationTimeStr.split(':').map(Number);
      const invitationDate = new Date(year, month - 1, day, hours, minutes);
  
      if (invitationDate <= today) {
        Alert.alert("לא ניתן למחוק", "ההזמנות כבר נשלחו, לכן לא ניתן למחוק את היומן.");
        return;
      }
    }
  
    Alert.alert(
      "מחיקת יומן",
      "האם אתה בטוח שברצונך למחוק את היומן? פעולה זו אינה ניתנת לשחזור ומאפסת את נתוני המוזמנים.",
      [
        {
          text: "ביטול",
          style: "cancel",
        },
        {
          text: "מחק",
          onPress: async () => {
            try {
              const scheduleRef = ref(database, `whatsapp/${user.uid}/${id}`);
              await remove(scheduleRef);
              setModalVisible(false);
              resetSchedule();
              Alert.alert("יומן נמחק", "היומן נמחק בהצלחה.");
            } catch (error) {
              console.error("❌ שגיאה במחיקת היומן:", error);
              Alert.alert("שגיאה", "אירעה תקלה במחיקת היומן.");
            }
          },
          style: "destructive",
        },
      ]
    );
  };
  
  
  const handleRefresh = () => {
    const scheduledDate = eventDetails.message_date_hour?.date || "תאריך לא זמין"; // קבלת התאריך מהנתונים
    Alert.alert(
      "שלח הזמנות",
      `שים לב, פעולה זו תשלח את ההזמנות עכשיו לאורחים ותבטל את מועד ההזמנה הצפוי בתאריך ${scheduledDate}, מרגע השליחה אין אפשרות לחזור לאחור.`,
      [
        {
          text: "ביטול",
          style: "destructive", // הופך את הכפתור לאדום
        },
        {
          text: "שלח whatsapp",
          onPress: () => {

            if (!invitationImageUrl) {
              Alert.alert("⚠️ שגיאה", "לא ניתן לשלוח הזמנות ללא תמונה. אנא הוסף תמונה להזמנה.");
            } else {
              sendMessageToRecipients();
            }         
           },
        },
        {
          text: "שלח sms",
          onPress: () => {

            if (!invitationImageUrl) {
              Alert.alert("⚠️ שגיאה", "לא ניתן לשלוח הזמנות ללא תמונה. אנא הוסף תמונה להזמנה.");
            } else {
              sendMessageToRecipientssms();
            }         
           },
        },
        {
          text: "שלח sms וגם whatsapp",
          onPress: () => {

            if (!invitationImageUrl) {
              Alert.alert("⚠️ שגיאה", "לא ניתן לשלוח הזמנות ללא תמונה. אנא הוסף תמונה להזמנה.");
            } else {
              sendMessageToRecipients();
              sendMessageToRecipientssms();

            }         
           },
        },
      ]
    );
  };
  
  useEffect(() => {
    if (user) {
        const responsesRef = ref(database, `Events/${user.uid}/${id}/responses`);
        const sentMessagesRef = ref(database, `whatsapp/${user.uid}/${id}`);

        onValue(sentMessagesRef, (sentSnapshot) => {
            let sentMessages = [];
            let failedMessages = [];
            let sentMessagesCount = 0; // ✅ אתחול כדי למנוע undefined

            if (sentSnapshot.exists()) {
                const sentData = sentSnapshot.val();
                if (sentData) {
                    sentMessages = Object.values(sentData).filter(msg => msg.status === "sent");
                    failedMessages = Object.values(sentData).filter(msg => msg.status === "error");
                    sentMessagesCount = sentMessages.length; // ✅ ספירת הודעות שנשלחו
                }
            }

            onValue(responsesRef, (snapshot) => {
                let yesCount = 0;
                let maybeCount = 0;
                let noCount = 0;
                let noResponseCount = sentMessagesCount > 0 ? contacts.length : 0; // ✅ שימוש במשתנה מאופס

                if (snapshot.exists() && sentMessagesCount > 0) { 
                    const responsesData = snapshot.val();
                    if (responsesData) {
                        Object.values(responsesData).forEach((response) => {
                            if (response.response === "מגיע") {
                                yesCount += Number(response.numberOfGuests) || 1;
                                noResponseCount = Math.max(0, noResponseCount - 1);
                            } else if (response.response === "אולי") {
                                maybeCount++;
                                noResponseCount = Math.max(0, noResponseCount - 1);
                            } else if (response.response === "לא מגיע") {
                                noCount++;
                                noResponseCount = Math.max(0, noResponseCount - 1);
                            }
                        });
                    }
                }

                noResponseCount = Math.max(0, noResponseCount - failedMessages.length);

                setYes(yesCount);
                setMaybe(maybeCount);
                setNo(noCount);
                setNoResponse(noResponseCount);

                const yes_caming = ref(database, `Events/${user.uid}/${id}/yes_caming`);
                const no_cuming = ref(database, `Events/${user.uid}/${id}/no_cuming`);
                const maybe = ref(database, `Events/${user.uid}/${id}/maybe`);
                const no_answear = ref(database, `Events/${user.uid}/${id}/no_answear`);

                set(yes_caming, yesCount);
                set(no_cuming, noCount);
                set(maybe, maybeCount);
                set(no_answear, noResponseCount);
            });
        });
    }
}, [user, id, contacts]);




  const fetchData = async () => {
    if (user) {
      try {
        const databaseRef = ref(database, `Events/${user.uid}/${id}/`);
        const snapshot = await get(databaseRef);
        const fetchedData = snapshot.val();
  
        if (fetchedData) {
          setEventDetails(fetchedData); // שמירת הנתונים שהתקבלו
        }
  
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    }
  };
  

  useEffect(() => {
    if (user) {
      fetchData(); // טוען את הנתונים כברירת מחדל ללא תלות בעדכון מהמאזין
    }
  }, [user, id]);
  

  useEffect(() => {
    if (user && id) {
      const tableRef = ref(database, `Events/${user.uid}/${id}/Table_RSVPs`);
  
      const unsubscribe = onValue(tableRef, (snapshot) => {
        const data = snapshot.val();
  
        if (data) {
          // אם הנתונים הם אובייקט, המרה למערך
          const formattedData = Array.isArray(data)
            ? data
            : Object.keys(data).map((key) => ({
                id: key,
                ...data[key],
              }));
  
          setTableData(formattedData);
        } else {
          console.log('No data found in Firebase for Table_RSVPs');
          setTableData([]); // אם אין נתונים, נקה את ה-state
        }
      });
  
      return () => unsubscribe(); // ביטול המאזין
    }
  }, [user, id]);

  useEffect(() => {
    if (user) {
        const mainSmsRef = ref(database, `Events/${user.uid}/${id}/main_sms`);
        const sentMsgRef = ref(database, `Events/${user.uid}/${id}/sent_msg`);

        const unsubscribeMainSms = onValue(mainSmsRef, (mainSmsSnapshot) => {
            if (!mainSmsSnapshot.exists()) return;
            const mainSmsValue = mainSmsSnapshot.val() || 0; // ברירת מחדל 0

            onValue(sentMsgRef, (sentMsgSnapshot) => {
                const sentMsgValue = sentMsgSnapshot.exists() ? sentMsgSnapshot.val() : 0;

                // חישוב מכסה מעודכנת
                const updatedMainSms = Math.max(0, mainSmsValue - sentMsgValue);

                // שמירה ב-state כך שיעודכן על המסך בזמן אמת
                setmehsa(updatedMainSms);
            });
        });

        return () => unsubscribeMainSms();
    }
}, [user, id]);

//לא נשלח
const [failedMessages, setFailedMessages] = useState(0);
useEffect(() => {
    if (user) {
        const messagesRef = ref(database, `whatsapp/${user.uid}/${id}`);

        const unsubscribe = onValue(messagesRef, (snapshot) => {
            let errorCount = 0;

            if (snapshot.exists()) {
                const messages = snapshot.val();

                // 🔹 סופרים **רק הודעות עם status === "error"**
                errorCount = Object.values(messages).filter(msg => msg.status === "error").length;
            }

            setFailedMessages(errorCount); // ✅ שמירת מספר ההודעות שנכשלו
        });

        return () => unsubscribe(); // ביטול המאזין כשעוזבים את המסך
    }
}, [user, id]);

useEffect(() => {
  if (user) {
      const responsesRef = ref(database, `Events/${user.uid}/${id}/responses`);
      const sentMessagesRef = ref(database, `whatsapp/${user.uid}/${id}`);

      let sentMessagesCount = 0;
      let failedMessages = [];

      onValue(sentMessagesRef, (sentSnapshot) => {
          let sentMessages = [];
          if (sentSnapshot.exists()) {
              const sentData = sentSnapshot.val();
              sentMessages = Object.values(sentData).filter(msg => msg.status === "sent");
              failedMessages = Object.values(sentData).filter(msg => msg.status === "error");
          }

          sentMessagesCount = sentMessages.length;
          console.log("📨 כמות הודעות שנשלחו:", sentMessagesCount);

          onValue(responsesRef, (snapshot) => {
              let noResponseCount = sentMessagesCount; // התחל עם כמות ההודעות שנשלחו

              if (snapshot.exists()) {
                  const responsesData = snapshot.val();
                  Object.values(responsesData).forEach((response) => {
                      if (["מגיע", "אולי", "לא מגיע"].includes(response.response)) {
                          noResponseCount = Math.max(0, noResponseCount - 1);
                      }
                  });
              }

              noResponseCount = Math.max(0, noResponseCount - failedMessages.length);

              setNoResponse(noResponseCount);

              console.log("🟡 טרם השיבו:", noResponseCount);

              // שמירת הנתון ב-Firebase
              set(ref(database, `Events/${user.uid}/${id}/no_answear`), noResponseCount);
          });
      });
  }
}, [user, id, contacts]);




  return (
    

    <ImageBackground
      source={require('../assets/send_mesege_back.png')}
      style={styles.backgroundImage}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => props.navigation.navigate('ListItem', { id })}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>אישורי הגעה</Text>
      </View>


      <TouchableOpacity style={styles.cardButton} onPress={() => props.navigation.navigate('RSVPstwo', { id })}>
        <View style={styles.cardContent}>
          <Text style={styles.arrow}>←</Text>
          <View style={styles.separator} />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>עריכת הודעה</Text>
            <Text style={styles.cardSubtitle}>
              {eventDetails.message_date_hour?.date || "תאריך לא זמין"} בשעה {eventDetails.message_date_hour?.time || "השעה לא זמינה"}
            </Text>
            <Text style={styles.cardSubtitle}>ההודעה תשלח למוזמנים</Text>

          </View>
        </View>
      </TouchableOpacity>

    
      <View style={styles.container}>
      {daysLeft ? (
        <Animated.Text style={[styles.countdownText, animatedStyle]}>
          {daysLeft}
        </Animated.Text>
      ) : (
        <Text style={styles.countdownText}> אין נתונים</Text>
      )}
    </View>




    <View style={styles.counterContainer}>
  <TouchableOpacity
    style={styles.counterItemGreen}
    onPress={() => props.navigation.navigate('TabsScreen', { id, category: "מגיעים" })}
  >
    <Text style={styles.counterText}>{eventDetails.yes_caming || 0}</Text> 
    <Text style={styles.counterLabel}>אישרו הגעה</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.counterItemMaybe}
    onPress={() => props.navigation.navigate('TabsScreen', { id, category: "אולי" })}
  >
    <Text style={styles.counterText}>{eventDetails.maybe || 0}</Text> 
    <Text style={styles.counterLabel}>אולי</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.counterItemRed}
    onPress={() => props.navigation.navigate('TabsScreen', { id, category: "לא מגיעים" })}
  >
    <Text style={styles.counterText}>{eventDetails.no_cuming || 0}</Text> 
    <Text style={styles.counterLabel}>לא מגיעים</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.counterItemYellow}
    onPress={() => props.navigation.navigate('TabsScreen', { id, category: "טרם השיבו" })}
>
    <Text style={styles.counterText}>{noResponse}</Text> 
    <Text style={styles.counterLabel}>טרם השיבו</Text>
</TouchableOpacity>


</View>

<View style={styles.counterContainer}>
  <TouchableOpacity
    style={styles.counterItemblack}
    onPress={() => props.navigation.navigate('TabsScreen', { id, category: "מוזמנים" })}
  >
    <Text style={styles.counterText}>{(contacts?.length || 0)}</Text> 
    <Text style={styles.counterLabel}>מוזמנים</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.counterItemblack1}
    onPress={() => props.navigation.navigate('TabsScreen', { id, category: "נשלח" })}
  >
    <Text style={styles.counterText}>{eventDetails?.sent_msg || 0}</Text> 
    <Text style={styles.counterLabel}>נשלח</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.counterItemblack2}
    onPress={() => props.navigation.navigate('TabsScreen', { id, category: "לא נשלח" })}
>
    <Text style={styles.counterText}>{failedMessages}</Text> 
    <Text style={styles.counterLabel}>לא נשלח</Text>
</TouchableOpacity>


  <TouchableOpacity
    style={styles.counterItemSMS}
    onPress={() => props.navigation.navigate('TabsScreen', { id })}
  >
    <Text style={styles.counterText}>{mehsa || 0}</Text> 
    <Text style={styles.counterLabel}>מכסה</Text>
  </TouchableOpacity>
</View>



      <View style={styles.container2}>
      <TouchableOpacity
          onPress={handleRefresh} // קריאה ישירה לפונקציה
          style={[
              styles.triggerButton,
              contacts.length > mehsa ? { backgroundColor: "gray" } : {} // אפור אם אין מספיק במכסה
          ]}
          disabled={contacts.length > mehsa} // חסימה אם אין מספיק במכסה
      >
          <Text style={styles.buttonText}>
              {contacts.length > mehsa ? "אין מספיק במכסה" : "שלח הודעה עכשיו"}
          </Text>
      </TouchableOpacity>


        <TouchableOpacity
          onPress={() => setHelpModalVisible(true)}
          style={styles.triggerButton2}
        >
          <Text style={styles.buttonText}>קבל מידע / עזרה</Text>
        </TouchableOpacity>



        
      </View>


      <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6c63ff" />
      ) : (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message2}</Text>
        </View>
      )}

      
    </View>

{/* טבלה מתחת לטקסט העדכונים */}
<View style={styles.tableContainer}>
  <View style={styles.headerRow}>
    <Text style={[styles.headerCell, styles.col3]}>שומש</Text>
    <Text style={[styles.headerCell, styles.col2]}>מכסה</Text>
    <Text style={[styles.headerCell, styles.col1]}>תאריך שליחה</Text>
    <Text style={[styles.headerCell, styles.col4]}>שם פעולה</Text>
    <Text style={[styles.headerCell, styles.col5]}>מספר</Text>

  </View>

  {tableData.length > 0 && planType !== 'no plan' ? (
  <FlatList
    data={tableData.filter((item, index) => {
      if (planType === 'basic') return index < 1;
      if (planType === 'plus') return [0, 1, 3].includes(index); // הצגת שורות 1, 2 ו-4
      if (planType === 'digital') return true; // כל השורות
      if (planType === 'premium') return true; // כל השורות
      return false;
    })}
    renderItem={({ item }) => {
      const currentDate = new Date();
      const itemDate = new Date(item.col1);
      const isPastDate = itemDate <= currentDate;

      return (
        <View style={[styles.row, isPastDate && styles.pastDateRow]}>
          <Text style={[styles.cell, styles.col3]}>{item.col3}</Text>
          <Text style={[styles.cell, styles.col2]}>{item.col2}</Text>
          <Text style={[styles.cell, styles.col1]}>{item.col1}</Text>
          <Text style={[styles.cell, styles.col4]}>{item.col4}</Text>
          <Text style={[styles.cell, styles.col5]}>{item.col5}</Text>
        </View>
      );
    }}
    keyExtractor={(item) => item.id}
  />
) : (
  <Text style={{ textAlign: 'center', marginVertical: 20 }}>
    {planType === 'no plan' ? 'לא נבחרה חבילה להצגת נתונים' : 'אין נתונים להצגה'}
  </Text>
)}

</View>


<Modal
        visible={isHelpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeHelpModal}
      >
        <View style={styles.helpModalContainer}>
          <ImageBackground
            style={styles.helpModalBackground}
          >
            <Text style={styles.textstyle1}>חלון מידע</Text>
            <Text style={styles.textstyle2}>מדריך זה פשוט וקל להבנה. בראש המסך, בחלון "ערוך הודעה", ניתן לערוך מחדש את ההזמנה כך שתוצג בהתאם להגדרות החדשות שלכם.

מתחת לכפתור זה, קיים דשבורד המכיל 8 כפתורי מידע, המציגים את סטטוס האורחים וההזמנות.
ניתן ללחוץ על כל אחד מהכפתורים כדי לראות מי אישר הגעה ובאיזה סטטוס הוא נמצא.

בנוסף, קיימים שני כפתורים עיקריים:

"קבלת מידע" – הכפתור פותח חלון מידע זה.
"שליחת הזמנות עכשיו" – יש לשים לב כי פעולה זו בלתי הפיכה.
הכפתור שולח את ההזמנה הראשונית (קטגוריית "הזמנות") לכל המוזמנים באופן מיידי.
לאחר השליחה, הדשבורד יתעדכן בהתאם.
שימו לב: מרגע השליחה, המכסה יורדת, ואין אפשרות לשחזר את ההודעות שנשלחו.
בחלק התחתון של המסך מופיעה טבלת יומן שליחת הודעות, המציגה מידע רלוונטי על שלבי שליחת ההזמנות.
הטבלה מחולקת ל-4 שורות, כאשר כל שורה מייצגת שלב שליחה שונה.
כאשר מועד השליחה מגיע או עבר – השורה תיצבע בירוק.

בתחתית המסך נמצא הכפתור:

"לחץ לאישור תזמון הודעות" – יש לאשר את היומן כדי להפעיל את שליחת ההודעות במועד המתוזמן.
לאחר אישור, הכפתור ישתנה ל- "יומן תזמון הודעות", ויאפשר צפייה ביומן התזמונים.
לכל שאלה או צורך בעזרה, ניתן לפנות לצוות החברה בטלפון או בוואטסאפ: 054-2455869.</Text>

            <TouchableOpacity
              onPress={closeHelpModal}
              style={styles.helpModalButton}
            >
              <Text style={styles.helpModalButtonText}>הבנתי</Text>
            </TouchableOpacity>
          </ImageBackground>
        </View>
      </Modal>
      <Animated.View style={[styles.centeredContainer, { transform: [{ scale: bounceAnim }] }]}>
    <TouchableOpacity
        style={[
            styles.animatedButton,
            isScheduled && styles.scheduledButton, // שינוי צבע כשהיומן נשמר
            contacts.length > mehsa ? { backgroundColor: "gray" } : {} // אם אין מספיק מכסה – אפור
        ]}
        onPress={() => {
            if (contacts.length > mehsa) {
                Alert.alert("⚠️ שגיאה", "אין מספיק במכסה לתזמון הודעות.");
                return;
            }
            if (contacts.length === 0) {
                Alert.alert("⚠️ שגיאה", "לא ניתן לתזמן הודעות ללא מוזמנים.");
            } else {
                if (!invitationImageUrl) {
                    Alert.alert("⚠️ שגיאה", "לא נמצא תמונה לשליחת ההזמנה, נא חזור לתכנון הודעות והוסף את התמונה של ההזמנה");
                } else {
                    handleSchedulePress();
                }
            }
        }}
        disabled={contacts.length > mehsa} // חסימה אם אין מספיק במכסה
    >
        <Text style={styles.buttonText}>
            {contacts.length > mehsa ? "אין מספיק במכסה" : isScheduled ? "לחץ לצפייה ביומן שלי" : "לחץ לאישור תזמון הודעות"}
        </Text>
    </TouchableOpacity>
</Animated.View>



<Modal
  visible={modalVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={handleModalClose}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
    <Text style={styles.modalTitle}>יומן הודעות ({getPlanLabel(planType)})</Text>
    <Text style={styles.modalText}>
        ברגע שתאשר את היומן ההודעות יותזמנו במועד שנקבע, ניתן לשנות בכל עת עד יום לפני האירוע.
      </Text>
      {(planType === 'plus' || planType === 'basic' || planType === 'premium') && (
        <>

      <Text style={styles.modalTitle22}>-------------------------------------</Text>
      <Text style={styles.modalTitle}>הזמנות (sms):</Text>
      <Text style={styles.modalText3}>תאריך שליחה: {eventDetails.message_date_hour?.date} בשעה {eventDetails.message_date_hour?.time}</Text>
      <Text style={styles.modalText2}>{eventDetails.message}</Text>
      </>

    )}
    {(planType === 'digital') && (
        <>

      <Text style={styles.modalTitle22}>-------------------------------------</Text>
      <Text style={styles.modalTitle}>הזמנות (whatsapp):</Text>
      <Text style={styles.modalText3}>תאריך שליחה: {eventDetails.message_date_hour?.date} בשעה {eventDetails.message_date_hour?.time}</Text>
      <Text style={styles.modalText2}>{eventDetails.message}</Text>
      </>

    )}
      {/* תזכורת – מוצג רק אם לא basic ולא no plan */}
      {(planType === 'plus' || planType === 'digital' || planType === 'premium') && (
        <>
          <Text style={styles.modalTitle22}>-------------------------------------</Text>
          <Text style={styles.modalTitle}>תזכורת:</Text>
          <Text style={styles.modalText3}>תאריך שליחה: {eventDetails2} בשעה 13:00</Text>
          <Text style={styles.modalText2}>היי, זוהי תזכורת לאירוע הקרוב שלכם. נשמח לראותכם!</Text>
        </>
      )}

      {/* יום החתונה + תודה – רק ב-digital או premium */}
      {(planType === 'digital' || planType === 'premium') && (
        <>
          <Text style={styles.modalTitle22}>-------------------------------------</Text>
          <Text style={styles.modalTitle}>יום החתונה:</Text>
          <Text style={styles.modalText3}>תאריך שליחה: {eventDetails3} בשעה 10:00</Text>
          <Text style={styles.modalText2}>היום הגדול הגיע! נתראה באירוע.</Text>

        </>
      )}

      {/* יום החתונה + תודה – רק ב-digital או premium */}
      {(planType === 'digital' || planType === 'premium' ||planType === 'plus') && (
        <>
          <Text style={styles.modalTitle22}>-------------------------------------</Text>
          <Text style={styles.modalTitle}>יום אחרי החתונה:</Text>
          <Text style={styles.modalText3}>תאריך שליחה: {eventDetails4} בשעה 10:00</Text>
          <Text style={styles.modalText2}>תודה רבה על השתתפותכם באירוע שלנו!</Text>
        </>
      )}
      <Text style={styles.modalTitle22}>-------------------------------------</Text>

      <View style={styles.modalButtons}>
        {!isScheduled && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={async () => {
              await scheduleMessages();            // שולח את הסבב הראשון
            }}
          >
            <Text style={styles.buttonText}>מאשר יומן הודעות</Text>
          </TouchableOpacity>

        )}
        {isScheduled && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={deletescheduleMessages}
          >
            <Text style={styles.buttonText}>מחק יומן</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleModalClose}
        >
          <Text style={styles.buttonText}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
{showRepeatPrompt && (
  <Modal
    visible={showRepeatPrompt}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowRepeatPrompt(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>סבב שני - whatsapp</Text>
        <Text style={styles.modalText}>
          עברו 24 שעות מאז שליחת הודעת ה-SMS. כעת אפשר לשלוח את הודעת ה-WhatsApp למי שטרם השיב.
        </Text>

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={async () => {
              await scheduleRepeatMessages(); // שלח סבב שני
              setShowRepeatPrompt(false);
            }}
          >
            <Text style={styles.buttonText}>שלח סבב שני</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowRepeatPrompt(false)}
          >
            <Text style={styles.buttonText}>ביטול</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)}


    </ImageBackground>
  );
};


const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',

  },
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
  },
  backButtonText: {
    fontSize: 29,
    color: 'white',
  },
  header2: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    marginTop: -775, // הוסף מרווח מעל התיבה
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  header3: {
    fontSize: 15,
    fontWeight: 'bold',

    marginBottom: -5,
    color: '#343a40',
    marginTop: -5, // הוסף מרווח מעל התיבה
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  input: {
    height: 100, // גובה של 8 שורות
    minHeight: 100,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top', // מאפשר כתיבה מהחלק העליון של השדה
  },
  input2: {
    height: 50, // גובה של 8 שורות
    minHeight: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top', // מאפשר כתיבה מהחלק העליון של השדה
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#ff5733',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },

  responseItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  responseText: {
    fontSize: 16,
    color: '#495057',
  },
  responsesHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#343a40',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
counterItemGreen: {
  backgroundColor: '#d4edda',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemYellow: {
  backgroundColor: '#D2B48C',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemRed: {
  backgroundColor: '#f8d7da',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemblack: {
  backgroundColor: 'rgba(59, 187, 155, 0.9)',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
 counterItemblack1: {
  backgroundColor: 'rgba(152, 116, 153, 0.9)',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemblack2: {
  backgroundColor: '#DEE2E6',
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
  counterText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 15,
    color: '#495057',
  },
  counterLabel2: {
    fontSize: 16,
    color: '#495057',
  },

  tableHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  phoneNumberItem: {
    padding: 12,
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  oddRow: {
    backgroundColor: '#ffffff',
  },
  phoneNumberText: {
    fontSize: 16,
  },
  viewResponsesButton: {
    backgroundColor: '#ff69b4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
    // שאר הסגנונות שלך
    triggerButton: {
      flex: 1, // כל כפתור יתפוס שטח שווה
      backgroundColor: 'rgba(108, 99, 255, 0.9)', // צבע הרקע
      paddingVertical: 10, // גובה הכפתור
      marginHorizontal: 5, // רווח בין הכפתורים
      borderRadius: 10, // פינות מעוגלות
      alignItems: 'center', // יישור הטקסט למרכז
      justifyContent: 'center', // יישור הטקסט למרכז
    },
    triggerButton2: {
      flex: 1, // כל כפתור יתפוס שטח שווה
      backgroundColor: 'rgba(108, 99, 255, 0.9)', // צבע הרקע
      paddingVertical: 10, // גובה הכפתור
      marginHorizontal: 5, // רווח בין הכפתורים
      borderRadius: 10, // פינות מעוגלות
      alignItems: 'center', // יישור הטקסט למרכז
      justifyContent: 'center', // יישור הטקסט למרכז
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: 'bold',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      width: 200,
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timerText: {
      fontSize: 16,
      marginTop: 10,
    },
    cancelButton: {
      marginTop: 20,
      padding: 10,
      backgroundColor: 'red',
      borderRadius: 5,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: 'white',
      fontSize: 16,
    },
    imageback: {
      width: 40,
      height: 40,
      marginTop: -810,
      marginRight: 300,
    },
    list: {
      flexGrow: 0, // כדי לאפשר גלילה
    },
    separator: {
      height: 1,
      backgroundColor: '#dddddd',
    },
    gif: {
      width: '101%',
      height: '101%',
  
    },
    itemContainer: {
      borderRadius: 5, // מוסיף פינות מעוגלות
      shadowColor: '#000', // מוסיף צל
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2, // הגדרה עבור Android
      marginBottom: 12,

    },
    itemText: {
      fontSize: 16,
      color: '#000',

    },
    title: {
      fontSize: 20,
      color: 'white',
      fontWeight: 'bold',
      marginBottom: -10,
    },
    cardButton: {
      backgroundColor: 'rgba(108, 99, 255, 0.1)', // צבע רקע בהיר תואם לסגנון העמוד
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 15,
      marginVertical: 10,
      width: '90%',
      alignSelf: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#6c63ff', // צבע כותרת
      textAlign: 'right',
    },
    
    cardSubtitle: {
      fontSize: 14,
      color: '#555',
      textAlign: 'right',
    },
    
    separator: {
      width: 1,
      height: '100%',
      backgroundColor: '#ccc', // צבע הקו המפריד
      marginHorizontal: 15,
    },
    
    arrow: {
      fontSize: 36,
      color: '#6c63ff', // צבע החץ
      fontWeight: 'bold',
    },
    textContainer: {
      flex: 1,
    },
    container2: {
      flexDirection: 'row', // מסדר את הילדים בשורה
      justifyContent: 'space-between', // רווח שווה בין הכפתורים
      alignItems: 'center',
      marginVertical: 20, // רווח מעל ומתחת לשורה
      width: '100%', // מוודא שכל הכפתורים יתיישרו לרוחב המסך
      paddingHorizontal: 20, // ריווח פנימי משני הצדדים
      marginBottom: 0,

    },

    countdownText: {
      width: '80%', // מוודא שהטקסט לא תופס את כל הרוחב
      fontSize: 16,
      fontWeight: 'bold',
      color: 'rgba(108, 99, 255, 0.9)',
      textAlign: 'center',
      padding: 8,
      backgroundColor: '#fff0f5',
      borderRadius: 7,
      shadowColor: 'rgba(108, 99, 255, 0.9)',
      shadowOpacity: 0.8,
      shadowRadius: 15,
      elevation: 10,
      marginTop: -5,
      marginBottom: 0,
    },
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
      marginBottom: -10,

    },
    messageBox: {
      backgroundColor: '#fff0f5', // רקע לתיבה
      padding: 12,
      borderRadius: 10, // פינות מעוגלות
      shadowColor: '#000', // צל
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3, // הצללה לאנדרואיד
      width: '100%',
    },
    messageText: {
      fontSize: 14,
      color: '000', // צבע הטקסט
      textAlign: 'center',
    },
    textstyle1: {
      fontSize: 20,
      color: 'fff', // צבע הטקסט
      textAlign: 'center',
      marginBottom: 20, // מרווח מתחתית המודל
      fontWeight: 'bold',

    },
    textstyle2: {
      fontSize: 16,
      color: 'fff', // צבע הטקסט
      textAlign: 'right',
      marginBottom: 0, // מרווח מתחתית המודל
      padding: 12,

    },
tableContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,

  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#6c63ff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    
  },
  headerCell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right', // יישור לימין

  },
  list: {
    maxHeight: 180, // מגביל את הגובה של הרשימה
  },
  listContent: {
    paddingBottom: 60, // ריווח בתחתית הרשימה
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    
  },
  cell: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#333',
    
  },
  col1: {
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#333',
    flex: 2, // הקצאת רוחב גדול יותר לעמודה זו

  },
  col2: {

    textAlign: 'center',
    color: '#333',
  },
  col3: {
    textAlign: 'center',
    color: '#333',
    
  },
  col4: {
    textAlign: 'center',
    color: '#333',
    flex: 1.5, // הקצאת רוחב גדול יותר לעמודה זו

  },
  col5: {
    textAlign: 'center',
    color: '#333',
    flex: 0.7, // הקצאת רוחב גדול יותר לעמודה זו

  },
  greenText: {
  color: 'green',
  fontWeight: 'bold',
},
pastDateRow: {
  backgroundColor: 'green', // צבע רקע ירוק
},
helpModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // רקע חצי שקוף
  },
  helpModalBackground: {
    backgroundColor: 'rgb(255, 255, 255)', // רקע חצי שקוף

    width: '95%',
    height: '75%',
    justifyContent: 'flex-end', // הכפתור בתחתית המודל
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden', // מונע תוכן שיוצא מהתמונה
  },
  helpModalButton: {
    backgroundColor: '#6c63ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20, // מרווח מתחתית המודל
    width: '50%',
    alignItems: 'center',
  },
  helpModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
counterItemMaybe: {
  backgroundColor: '#f0e68c', // צבע ייחודי
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
},
counterItemSMS: {
  backgroundColor: '#87ceeb', // צבע ייחודי
  borderRadius: 8,
  padding: 8, // הקטנת הפדינג
  alignItems: 'center',
  width: '23%', // הקטנת הרוחב
  alignItems: 'center',
  justifyContent: 'center', // יישור תוכן למרכז
},
counterLabelBottom: {
  fontSize: 16, // גודל הטקסט התחתון
  color: '#000', // צבע הטקסט

},
centeredContainer: {
  flex: 1,
  justifyContent: "center", // ממרכז את התוכן לאורך הציר האנכי
  alignItems: "center", // ממרכז את התוכן לאורך הציר האופקי
},
animatedButton: {
    backgroundColor: "rgba(37, 158, 76, 0.9)",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 10, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 15,
    width: "80%",
    marginTop: 0,

  },
  scheduledButton: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)', // שינוי צבע לירוק כשהיומן נשמר

  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "92%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },

  modalText2: {
    fontSize: 15,
    marginBottom: 0,
    textAlign: "center",
  },
  modalText3: {
    fontSize: 15,
    marginBottom: 15,
    textAlign: "center",
  },
  modalButtons: {
    marginTop: 20,

    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
modalTitle: {
  fontSize: 22,
  fontWeight: "bold",
  marginBottom: 10,
  color: "#6c63ff",
  textAlign: "center",
},
modalText: {
  fontSize: 16,
  color: "#444",
  textAlign: "center",
  marginBottom: 20,
},

});

export default RSVPs;