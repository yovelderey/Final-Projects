import React, { useEffect, useRef,useState } from 'react';
import { View,ScrollView, Text,Animated,Platform, ImageBackground,TextInput, TouchableOpacity,Modal,Dimensions, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, set, push, remove, get, update, onValue }
        from 'firebase/database';
import { onAuthStateChanged }    from 'firebase/auth';
import { auth, database }        from '../firebase';          // ⬅️ ייבוא Auth & DB


import { ref as storageRef, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';   // נשאר כפי שהוא



const RSVPs = (props) => {

  const [responses, setResponses] = useState([]);

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
  const guestRows = contacts || [];
// ==== Quick-send state (הוסף למעלה) ====
const [qsTarget, setQsTarget] = useState('all');              // 'all' | 'specific' | 'manual'
const [quickSpecificIds, setQuickSpecificIds] = useState([]); // מזהי נמענים שסומנו
const [quickManualList, setQuickManualList] = useState([]);   // [{displayName, phoneNumbers, recordID}]
const [tempManualName, setTempManualName] = useState('');
const [tempManualPhone, setTempManualPhone] = useState('');

  const [invitationImageUrl, setInvitationImageUrl] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [message2, setMessage2] = useState('אין כעת עדכונים'); // ברירת מחדל מעודכנת
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [isHelpModalVisible, setHelpModalVisible] = useState(false); // הוספת state עבור המודל
  const [planType, setPlanType] = useState('');
/* למעלה, עם שאר ה-useState-ים */
const [unsentList,        setUnsentList]        = useState([]);   // מערך המוזמנים שלא נשלח אליהם
const [showUnsentModal,   setShowUnsentModal]   = useState(false); // מודאל הרשימה

  const bounceAnim = useRef(new Animated.Value(1)).current;
  const [isScheduled, setIsScheduled] = useState(false); // מצב האם היומן נשמר
  const [sentInvitations, setSentInvitations] = useState(0);
  const [sentReminders, setSentReminders] = useState(0);
  const [sentWeddingDay, setSentWeddingDay] = useState(0);
  const [sentThankYou, setSentThankYou] = useState(0);
  const [showSendNowModal , setShowSendNowModal] = useState(false); // מציג את המודל
  const [quickMsg, setQuickMsg] = useState('');     // טקסט חופשי
  const [currentChannel, setCurrentChannel] = useState('');   // ← ערוץ נוכחי
  const [isSchedLoading, setSchedLoading] = useState(false);
  const normPhone = p => formatPhoneNumber(p || '');
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedContacts, setFailedContacts] = useState([]);

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
  const [targetGroup, setTargetGroup] = useState(null); // 'all' | 'confirmed'
  const [rowToSend, setRowToSend] = useState(null);   // האובייקט של השורה שנבחרה
  const [customMsg, setCustomMsg] = useState('');      // טקסט ערוך במודאל
  const [qsAddLink , setQsAddLink ] = useState(true);   // לצרף קישור אישי?
  const [qsAddImage, setQsAddImage] = useState(false);  // לצרף תמונה?
  const [qsSendAll,      setQsSendAll]   = useState(true);   // שלח לכולם?
  const [qsManualPhones, setQsManualPhones] = useState('');  // רשימת מספרים ידנית
  const [qsManualName, setQsManualName] = useState('');  // ״שם נמען ידני״
  const screenWidth = Dimensions.get('window').width;
  const [failedList, setFailedList] = useState([]);   // ← יאגור כשלונות
  const [progress, setProgress] = useState({
    current: 0,       // כמה נשלחו בפועל
    total:   0,       // סך-הכול מוזמנים
    secondsLeft: 0,   // אומדן שניות
    batch: 1,         // מספר ה-שרת הנוכחי (1-based)
    totalBatches: 1,  // כמה “שרתים” בסך-הכול
  });
  const [isSending,   setIsSending]   = useState(false);
  const [cancelSending, setCancelSending] = useState(false);
  const delay = (ms) => new Promise(res => setTimeout(res, ms));
// ===== חישובי מצב נוכחי =====
const confirmedList = contacts.filter(
  c => responses[c.recordID || c.id]?.response === 'מגיע'
);
const maybeList = contacts.filter(
  c => responses[c.recordID || c.id]?.response === 'אולי'
);
const confirmedOrMaybeList = contacts.filter(
  c => ['מגיע','אולי'].includes(responses[c.recordID || c.id]?.response)
);

  /* ⬅️ הוסף כאן – REF במקום useState */
  const cancelSendingRef = useRef(false);
  const getInviteImg = async () => {
    if (invitationImageUrl) return invitationImageUrl;   // כבר קיים
    await new Promise(r => setTimeout(r, 100));          // micro-wait
    if (invitationImageUrl) return invitationImageUrl;   // נטען בינתיים?
    throw new Error('⚠️ לא נמצאה תמונת הזמנה');
  };
// בחירת נמענים ספציפית
const [selectedSpecificIds, setSelectedSpecificIds] = useState([]); // ids של מוזמנים שנבחרו
const [specificSearch, setSpecificSearch] = useState('');           // חיפוש בתוך הספציפיים

// רשימת מוזמנים מסוננת לחיפוש “ספציפיים”
const filteredSpecificContacts = contacts.filter(c => {
  const q = specificSearch.trim().toLowerCase();
  if (!q) return true;
  const name = (c.displayName || '').toLowerCase();
  const phone = (c.phoneNumbers || '').toLowerCase();
  return name.includes(q) || phone.includes(q);
});

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

/* מוסיפים מחדש – פעם אחת בלבד */
useEffect(() => {
  if (!user) return;
  const respRef = ref(database, `Events/${user.uid}/${id}/responses`);
  const unsub = onValue(respRef, snap => {
    setResponses(snap.exists() ? snap.val() : {});   // ← מעדכן state
  });
  return () => unsub();
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
  
/**
 * quickSendNow – שליחה מיידית (SMS / WhatsApp / שניהם)
 * @param {'sms' | 'wa' | 'both'} channel
 */
const quickSendNow = async (channel) => {
  // בדיקות בסיס
  if (!quickMsg.trim()) { Alert.alert('⚠️', 'כתוב משהו…'); return; }
  if (!user)            { Alert.alert('⚠️', 'לא מחובר');   return; }

  let recipients = [];

  if (qsTarget === 'all') {
    recipients = contacts;

  } else if (qsTarget === 'specific') {
    // שליחה רק לאלו שסומנו ברשימת הספציפיים
    const byId = new Map(
      contacts.map(c => [ (c.recordID || c.id), c ])
    );
    recipients = quickSpecificIds
      .map(cid => byId.get(cid))
      .filter(Boolean);

    if (recipients.length === 0) {
      Alert.alert('שים לב', 'לא נבחרו נמענים ספציפיים');
      return;
    }

  } else if (qsTarget === 'manual') {
    // שליחה לרשימת הידניים שנוספו עם ➕
    recipients = quickManualList;
    if (recipients.length === 0) {
      Alert.alert('שים לב', 'הוסף לפחות נמען אחד באמצעות כפתור ➕');
      return;
    }
  }

  // שליחה לפי ערוץ
if (channel === 'sms'  || channel === 'both') {
  await sendBatchedMessages({ recipients, body: quickMsg, smsFlag: 'yes', actionType: 'quick' });
}
if (channel === 'wa'   || channel === 'both') {
  await sendBatchedMessages({ recipients, body: quickMsg, smsFlag: 'no',  actionType: 'quick' });
}


  Alert.alert('✔︎', `ההודעות נשלחו ל-${recipients.length} נמענים`);
  setShowSendNowModal(false);

  // איפוס בחירה ספציפית (לא חובה)
  setQuickSpecificIds([]);
  setQsTarget('all');
};


/* ---------- מאחזר את רשימת הנמענים לפי targetGroup ---------- */
const getRecipients = () => {
  switch (targetGroup) {
    case 'confirmed':
      return contacts.filter(c => responses[c.recordID || c.id]?.response === 'מגיע');

    case 'maybe':
      return contacts.filter(c => responses[c.recordID || c.id]?.response === 'אולי');

    case 'confirmedOrMaybe':
      return contacts.filter(c => ['מגיע','אולי'].includes(responses[c.recordID || c.id]?.response));

    case 'failed':
      return contacts.filter(c => failedContacts.includes(formatPhoneNumber(c.phoneNumbers)));

    // ⬅️ חדש: רק הנמענים שסימנת ידנית
    case 'specific':
      return contacts.filter(c => selectedSpecificIds.includes(c.recordID || c.id));

    default:
      return contacts;
  }
};



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

/**
 * מאתר את כל אנשי-הקשר שלא קיבלו הודעה ושומר אותם במשתנה state.
 * @param {boolean} silent ­– אם true ⇢ יעדכן את failedContacts בלי לפתוח את המודל.
 */
const findFailedContacts = async (silent = false) => {
  if (!user || contacts.length === 0) return;     // אין נתונים? יוצאים.

  try {
    /* 1. שולף את כל ההודעות שנשלחו מה-Firebase ושומר את המספרים ב-Set */
    const msgRef   = ref(database, `whatsapp/${user.uid}/${id}`);
    const snapshot = await get(msgRef);

    const sentPhones = new Set();
 if (snapshot.exists()) {
   Object.values(snapshot.val()).forEach(msg => {
     if (msg.status === 'sent' && msg.formattedContacts) {
       sentPhones.add(formatPhoneNumber(msg.formattedContacts));
     }
   });
 }

    /* 2. יוצר מערך של כל הטלפונים (מנורמלים) מתוך contacts  */
    const allPhones = contacts.map(c =>
      formatPhoneNumber(typeof c === 'string' ? c : c.phoneNumbers)
    );

    /* 3. מסנן – רק מספרים שלא הופיעו ב-sentPhones */
    const failed = allPhones.filter(p => p && !sentPhones.has(p));

    /* 4. שומר ב-state */
    setFailedContacts(failed);

    /* 5. פותח את מודל “לא נשלח” אלא אם ביקשו silent */
    if (!silent) setShowFailedModal(true);

  } catch (err) {
    console.error('findFailedContacts error:', err);
    Alert.alert('שגיאה', 'לא ניתן היה לאחזר את רשימת הכישלונות');
  }
};





const handleRetryFailed = async () => {
  if (!user || failedContacts.length === 0 || !eventDetails) return;

  const timestamp = new Date().toISOString();

  for (let i = 0; i < failedContacts.length; i++) {
    const phone = failedContacts[i];
    try {
      const newMsgRef = push(ref(database, `Events/${user.uid}/${id}/msg`));
      await set(newMsgRef, {
        currentUserUid: user.uid,
        eventUserId: id,
        formattedContacts: phone,
        imageUrl: eventDetails.image || '',
        message: eventDetails.message,
        scheduleMessage: timestamp,
        sms: "yes",
        status: "pending",
      });
      console.log(`נשלח שוב ל: ${phone}`);
    } catch (error) {
      console.error(`שגיאה בשליחה חוזרת ל: ${phone}`, error);
    }
  }

  Alert.alert("השליחה בוצעה מחדש למי שלא קיבל ✅");
  setShowFailedModal(false);
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
/** מחפש את כל אנשי-הקשר שלא נשלח אליהם *אף* הודעה */
const findUnsentContacts = async () => {
  if (!user || !contacts.length) return;

  /* 1. כל המספרים שהופיעו אי-פעם בטבלת whatsapp */
  const msgsSnap = await get(
    ref(database, `whatsapp/${user.uid}/${id}`)
  );

  const sentPhones = new Set();
  if (msgsSnap.exists()) {
    Object.values(msgsSnap.val()).forEach(m => {
      if (m.formattedContacts)
        sentPhones.add(formatPhoneNumber(m.formattedContacts));
    });
  }

  /* 2. סינון contacts – רק מי שלא מופיע ב-sentPhones */
  const list = contacts.filter(c =>
    !sentPhones.has(formatPhoneNumber(c.phoneNumbers))
  );

  setUnsentList(list);          // לשמירה ב-state
  setShowUnsentModal(true);     // פתיחת המודאל
};

  
/* ========= bulkSend – שליחה מיידית (SMS / WhatsApp) ========= */
const bulkSend = async ({ body, smsFlag }) => {
  if (!user || !contacts.length) return;

  /* --- 1. נתונים קבועים שצריך רק פעם אחת --- */
  const baseRef      = ref(database, `whatsapp/${user.uid}/${id}`);
  const baseUrl      = "https://final-project-d6ce7.web.app";
  const eventNameSnap = await get(ref(database, `Events/${user.uid}/${id}/eventName`));
  const eventName     = encodeURIComponent(eventNameSnap.exists() ? eventNameSnap.val() : "אירוע");

  /* --- 2. עוברים על כל איש-קשר ושולחים --- */
  contacts
    .map(c => ({                               // נחסוך חיפושים כפולים
      phone : formatPhoneNumber(c.phoneNumbers),
      name  : c.displayName || "שם לא ידוע",
      id    : c.recordID   || Math.random().toString(36).slice(2)
    }))
    .filter(c => c.phone.trim() !== "")
    .forEach(async ({ phone, name, id: guestId }) => {

      /* 🔗 בונים קישור אישי */
      const guestLink = `${baseUrl}?uid=${user.uid}&eventId=${eventName}&guestId=${guestId}`;

      /* 📨 ההודעה הסופית */
      const fullMsg = `${body}\n\nלאישור ההגעה: ${guestLink}`;

      const msgData = {
        currentUserUid  : user.uid,
        eventUserId     : id,
        formattedContacts: phone,
        name,
        imageUrl        : await getInviteImg(),
        message         : fullMsg,
        scheduleMessage : "2025-01-01T00:00",
        serverId        : "",
        sms             : smsFlag,          // "yes" או "no"
        status          : "pending",
        timestamp       : new Date().toISOString(),
      };

      await set(push(baseRef), msgData);
    });

  /* אפשרי: הודעה וסגירת המודאל */
  Alert.alert("נשלח ✔︎", "ההודעות נשלחו עם הקישור האישי");
  setRowToSend(null);          // יסגור את המודאל
};


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
  
  /**
 * מתזמן את כל ההודעות לפי החבילה – כולל מודאל-התקדמות, שליחה בבּאצ’ים וביטול ריצה.
 * - שולח בקבוצות של ‎45‎ נמענים עם דיליי ‎5s‎ בין קבוצה לקבוצה
 * - מעדכן Progress-Bar בזמן אמת
 * - מכבד cancelSendingRef.current  (כפתור “בטל שליחה”)
 */
const scheduleMessages = async () => {
  /* 0. בדיקות בסיס */
  if (!user || !id || !contacts.length) return;

  /* 1. איפוס מודאל-התקדמות */
  const batchSize     = 30;
  const delayPerBatch = 5000;
  cancelSendingRef.current = false;
  setIsSending(true);
  setProgress({
    current     : 0,
    total       : contacts.length,
    secondsLeft : Math.ceil(contacts.length / batchSize) * (delayPerBatch / 1000),
    batch       : 1,
    totalBatches: Math.ceil(contacts.length / batchSize),
  });
  setModalVisible(false);            // סוגר את חלון-היומן

  try {
    /* 2. נתונים קבועים */
    const [
      eventSnap,  msgSnap,   respSnap,
      invSnap,    remSnap,   wedSnap,   thxSnap
    ] = await Promise.all([
      get(ref(database, `Events/${user.uid}/${id}/eventName`)),
      get(ref(database, `Events/${user.uid}/${id}/message`)),
      get(ref(database, `Events/${user.uid}/${id}/responses`)),
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/0/col1`)),
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/1/col1`)),
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/2/col1`)),
      get(ref(database, `Events/${user.uid}/${id}/Table_RSVPs/3/col1`)),
    ]);

    const eventName   = eventSnap.exists() ? eventSnap.val() : "אירוע";
    const baseUrl     = "https://final-project-d6ce7.web.app";
    const baseRef     = ref(database, `whatsapp/${user.uid}/${id}`);
    const defaultMsg  = msgSnap.val() || "שלום! אנא אשר את הגעתך לאירוע שלנו בקישור הבא:";
    const responses   = respSnap.exists() ? respSnap.val() : {};

    const dates = {
      invite : invSnap.val(),
      remind : remSnap.val(),
      wedding: wedSnap.val(),
      thanks : (() => {              // יום אחרי החתונה אם לא קיים
        const tmp = thxSnap.val();
        if (tmp) return tmp;
        if (!wedSnap.val()) return null;
        const d = new Date(wedSnap.val()); d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      })(),
    };

    /* 3. לולאה בבּאצ’ים */
    const formatted = contacts.map(c => ({
      raw     : c,
      phone   : formatPhoneNumber(c.phoneNumbers),
      name    : c.displayName || "שם לא ידוע",
      guestId : c.recordID || Math.random().toString(36).slice(7)
    })).filter(c => c.phone);

    for (let start = 0; start < formatted.length; start += batchSize) {
      if (cancelSendingRef.current) break;

      const slice      = formatted.slice(start, start + batchSize);
      const batchUpds  = {};
      const tsNow      = new Date().toISOString();
      const encodedEvt = encodeURIComponent(eventName);

      slice.forEach((c, idx) => {
        const idxGlobal = start + idx;
        const idBase    = `msg_${idxGlobal}`;
        const link      = `${baseUrl}?uid=${user.uid}&eventId=${encodedEvt}&guestId=${c.guestId}`;
        const fullMsg   = `${defaultMsg}\n\nלאישור ההגעה: ${link}`;

        /* ============ שלב 1 – הזמנה ============ */
        const inviteObj = {
          currentUserUid : user.uid,
          eventUserId    : id,
          formattedContacts: c.phone,
          name           : c.name,
          phoneNumber    : c.phone,
          imageUrl       : invitationImageUrl || "",
          message        : fullMsg,
          scheduleMessage: setSpecificTime(dates.invite, eventDetails.message_date_hour?.time, 2),
          serverId       : "",
          status         : "pending",
          timestamp      : tsNow,
        };
        if (["plus","basic","premium"].includes(planType))   inviteObj.sms = "yes";
        if (["digital"].includes(planType))                  inviteObj.sms = "no";
        batchUpds[`${idBase}_1`] = inviteObj;

        /* ============ שלב 2 – תזכורת ============ */
        if (["plus","digital","premium"].includes(planType)) {
          batchUpds[`${idBase}_2`] = {
            ...inviteObj,
            imageUrl       : "",
            message        : "היי, זוהי תזכורת לאירוע הקרוב שלכם. נשמח לראותכם!",
            scheduleMessage: setSpecificTime(dates.remind,"15:00"),
            sms            : "no",
          };
        }

        /* ============ שלב 3 – יום החתונה ============ */
        if (["digital","premium"].includes(planType)) {
          batchUpds[`${idBase}_3`] = {
            ...inviteObj,
            imageUrl       : "",
            message : buildWeddingMsg(c.phone),   
            scheduleMessage: setSpecificTime(dates.wedding,"14:00"),
            sms            : "no",
          };
        }

        /* ============ שלב 4 – תודה ============ */
        if (["plus","digital","premium"].includes(planType)) {
          batchUpds[`${idBase}_4`] = {
            ...inviteObj,
            imageUrl       : "",
            message        : "משפחה וחברים יקרים, מודים לכם מקרב לב על השתתפותכם באירוע. מקווים שנהניתם ושניפגש רק בשמחות! אוהבים המון ❤",
            scheduleMessage: setSpecificTime(dates.thanks,"12:00"),
            sms            : "no",
          };
        }
      });

      await update(baseRef, batchUpds);     // כתיבה ב-Firebase

      /* 4. עדכון progress */
      setProgress(p => ({
        ...p,
        current    : Math.min(p.total, p.current + slice.length),
        batch      : p.batch + 1,
        secondsLeft: Math.max(0, p.secondsLeft - delayPerBatch / 1000),
      }));

      if (start + batchSize < formatted.length)
        await delay(delayPerBatch);
    }

    /* 5. השלמה */
    await set(ref(database, `Events/${user.uid}/${id}/imageUrl/`),
              invitationImageUrl || "");
    setIsScheduled(true);
    stopBounceAnimation();
    Alert.alert("✔︎ היומן נשמר", "ההודעות הוזנו בהצלחה למערכת.");

  } catch (err) {
    console.error("scheduleMessages error:", err);
    Alert.alert("שגיאה", "לא ניתן היה לשמור את היומן");
  } finally {
    setIsSending(false);        // סוגר את מודאל-ההתקדמות
  }
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
      const guestLink = `${baseUrl}?uid=${user.uid}&eventId=${encodedEventName}&guestId=${guestId}`;

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
  


const deleteScheduleMessages = async () => {
  // הגנה: אם ההזמנה כבר נשלחה – לא מוחקים
  const { date, time } = eventDetails.message_date_hour || {};
  if (date && time) {
    const alldate = new Date(`${date}T${time}:00`);
    if (alldate <= new Date()) {
      Alert.alert("לא ניתן למחוק", "ההזמנות כבר נשלחו.");
      return;
    }
  }

  /* ----------  WEB  ---------- */
  if (Platform.OS === "web") {
    const ok = window.confirm("האם אתה בטוח? פעולה זו בלתי-הפיכה.");
    if (!ok) return;          // משתמש לחץ Cancel
    try {
      await remove(ref(database, `whatsapp/${user.uid}/${id}`));
      setIsScheduled(false);
      setModalVisible(false);
      alert("היומן נמחק בהצלחה ✔︎");
    } catch (e) {
      console.error("delete error", e);
      alert("שגיאה במחיקה");
    }
    return;                   // יציאה – לא להריץ Alert.alert
  }

  /* ----------  MOBILE  ---------- */
  Alert.alert(
    "מחיקת יומן",
    "האם אתה בטוח? פעולה זו בלתי-הפיכה.",
    [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(ref(database, `whatsapp/${user.uid}/${id}`));
            setIsScheduled(false);
            setModalVisible(false);
            Alert.alert("יומן נמחק", "היומן נמחק בהצלחה.");
          } catch (e) {
            console.error("delete error", e);
            Alert.alert("שגיאה", "אירעה תקלה במחיקת היומן.");
          }
        }
      }
    ]
  );
};

  
// ==================== handleRefresh (חדש) ====================
const handleRefresh = () => {
  setQuickMsg('');
  setShowSendNowModal(true);
};


  const sendNow = async (channel /* 'sms' | 'wa' | 'both' */) => {
  if (!quickMsg.trim()) { Alert.alert('⚠️', 'כתוב משהו…'); return; }

  if (channel === 'sms'  || channel === 'both')
    await sendBatchedMessages({ recipients: contacts, body: quickMsg, smsFlag: 'yes' });

  if (channel === 'wa'   || channel === 'both')
     await sendBatchedMessages({ recipients: contacts, body: quickMsg, smsFlag: 'no' });

  Alert.alert('✔︎', 'ההודעות נשלחו');
  setShowSendNowModal(false);
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


  // --- לפני ---
const buildWeddingPreview = () => {
  const first = getRecipients()[0];
  if (!first) return getDefaultMsg(rowToSend);
  const extra = tableText(first.phoneNumbers) || '';
  return `${getDefaultMsg(rowToSend)} ${extra}`.trim();
};

// --- אחרי ---

  /** מחזיר נוסח הודעת-יום-חתונה + השולחן של נמען לדוגמה  */


// ===== כתיבה בפיירבייס בקבוצות של 15 + דיליי 5 שניות =====
const sendBatchedMessages = async ({ recipients, body, smsFlag,actionType = '' }) => {
  if (!user || !id) return;

  cancelSendingRef.current = false;
  setIsSending(true);

  const batchSize     = 30;
  const delayPerBatch = 5000;
  const totalBatches  = Math.ceil(recipients.length / batchSize);
  const baseRef       = ref(database, `whatsapp/${user.uid}/${id}`);
  const baseUrl       = 'https://final-project-d6ce7.web.app';
  const evSnap = await get(ref(database, `Events/${user.uid}/${id}/eventName`));
  const eventNameEnc  = encodeURIComponent(evSnap.exists() ? evSnap.val() : 'אירוע');
  setCurrentChannel(
    smsFlag === 'yes' ? 'SMS'
    : smsFlag === 'no' ? 'WhatsApp'
    : 'SMS + WhatsApp'
  );

  /* ➌--- התחלה – איפוס ומעבר למודל ההתקדמות */
  setFailedList([]);
  setCancelSending(false);
  setIsSending(true);
  setProgress({
    current: 0,
    total  : recipients.length,
    secondsLeft: totalBatches * (delayPerBatch / 1000),
    batch: 1,
    totalBatches,
  });

  let sentTotal = 0;
for (let i = 0; i < recipients.length; i += batchSize) {
  if (cancelSendingRef.current) break;   // ← כאן בודקים
    const batch = recipients.slice(i, i + batchSize);

    await Promise.all(batch.map(async (c) => {
      try {
        const phone = formatPhoneNumber(c.phoneNumbers);
        if (!phone) throw new Error('bad-phone');

        const guestId = c.recordID || Math.random().toString(36).slice(2);
        const link    = `${baseUrl}?uid=${user.uid}&eventId=${eventNameEnc}&guestId=${guestId}`;

      const tableExtra = actionType === 'יום חתונה'
          ? tableText(c.phoneNumbers)   // או buildWeddingMsg(c.phoneNumbers)
          : '';


 const cleanBody = body.replace(/הינכם יושבים ב.*$/m, '').trim();

 // ➋ מוסיף את השולחן (רק פעם אחת) לאורח הנוכחי
const msg =
  `${cleanBody}${tableExtra}` +
  (
    qsAddLink &&
    actionType !== 'quick' &&                 // ⬅️ מונע קישור בשליחה מהירה
    !['תודה רבה','תזכורת','יום חתונה'].includes(actionType)
      ? `\n\nלאישור ההגעה: ${link}`
      : ''
  );


await set(push(baseRef), {
  currentUserUid: user.uid,
  eventUserId: id,
  formattedContacts: phone,
  name: c.displayName || 'שם לא ידוע',
  imageUrl: (actionType === 'quick' ? '' : await getInviteImg()),  // ⬅️ בלי תמונה בשליחה מהירה
  message: msg,
  scheduleMessage: '2025-01-01T00:00',
  serverId: '',
  sms: smsFlag,
  status: 'pending',
  timestamp: new Date().toISOString(),
});

      } catch (err) {
        setFailedList((prev) => [...prev, { name: c.displayName, phone: c.phoneNumbers }]);
      }
    }));

    /* ⬅️ עדכון-progress */
    sentTotal += batch.length;
    setProgress({
      current: sentTotal,
      total: recipients.length,
      secondsLeft: Math.max(0,
        (totalBatches - (i / batchSize + 1)) * (delayPerBatch / 1000)),
      batch: (i / batchSize) + 2,
      totalBatches,
    });

    if (i + batchSize < recipients.length) await delay(delayPerBatch);
  }

  /* ⬅️ סיום */
  setIsSending(false);
  if (!cancelSending) {
    const ok = failedList.length === 0;
    Alert.alert(ok ? '✔︎' : 'הסתיים (עם כשלונות)',
                ok ? 'כל ההודעות נשלחו' : 'חלק מהנמענים נכשלו - ראה ברשימה');
  }
};




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

const handleConfirmSchedule = async () => {
  try {
    setSchedLoading(true);          // spinner קטן על הכפתור
    await scheduleMessages();       // הפונקציה הקיימת שלך
    setModalVisible(false);         // סגור את המודאל ידנית
  } catch (err) {
    console.error('schedule error:', err);
    Alert.alert('שגיאה', 'לא ניתן היה לשמור את היומן');
  } finally {
    setSchedLoading(false);
  }
};

/** מחלץ את שמות בני הזוג מתוך נוסח ההזמנה */
/** מחלץ את שמות בני/ות הזוג מתוך נוסח ההזמנה */
const extractCoupleNames = (invitationText = '') => {
  const m = invitationText.match(/החתונה של\s+(.+?)\s+שתיערך/);
  if (!m) return null;                                   // לא נמצא
  const namesPart = m[1].trim();                         

  // חותכים רק על רווח + ו' (ולא על כל ו' בתוך שם)
  const parts = namesPart.split(/\s+ו/);                 
  return parts.map(p => p.trim()).filter(Boolean);       // ניקוי רווחים
};
// ➊ למעלה, יחד עם ה-useState הקיימים
const [tables, setTables] = useState({});   // כל השולחנות

// ➋ useEffect חדש – נטען את /tables ונאזין לעדכונים
useEffect(() => {
  if (!user || !id) return;

  const tRef = ref(database, `Events/${user.uid}/${id}/tables`);
  const off  = onValue(tRef, snap => {
    setTables(snap.exists() ? snap.val() : {});
  });

  return () => off();   // ניקוי מאזין
}, [user, id]);
// מגדירים פונקציה (או useMemo) שתמצא לכל אורח את השולחן שלו
// מחוץ לכל פונקציה אחרת – רק פעם אחת
const getTableInfo = (guestPhone) => {
  const norm = formatPhoneNumber(guestPhone); // מנרמל 0→972 וכו'
  for (const tblKey in tables) {
    const tbl    = tables[tblKey];
    const guests = tbl?.guests ?? {};
    for (const g of Object.values(guests)) {
      if (formatPhoneNumber(g.phoneNumbers) === norm) {
        return { number: tbl.numberTable || '', name: tbl.displayName || '' };
      }
    }
  }
  return null;
};


/**  מחזיר הודעת-“יום החתונה” מותאמת אישית  */
const buildWeddingMsg = (phone) => {
  // שמות בני הזוג – אם רוצים לשלב
  const [name1 = 'הזוג', name2 = 'המאושר'] =
        extractCoupleNames(eventDetails.message) || [];

  // מידע על השולחן (אם שובץ)
                     info.name;
 // מציג קודם את שם-השולחן; אם אין – מספר
const label = info.name || info.number || '';

 return `היום הגדול הגיע! מחכים לראותכם באירוע, הינכם יושבים ב${label}`;
};



const findTableByPhone = (phone) => {
  const norm = normPhone(phone);
  for (const tKey in tables) {
    const tbl = tables[tKey];
    const guests = tbl?.guests ?? {};
    for (const g of Object.values(guests)) {
      if (normPhone(g.phoneNumbers) === norm) {
        return {                    // ← מספיק המידע הזה
          number: tbl.numberTable  || '',
          name  : tbl.displayName  || ''
        };
      }
    }
  }
  return null;                      // לא שובץ
};

/* ---------- טקסט “שולחן … ” ---------- */
// מחזיר טקסט יום-חתונה + **שם** השולחן בלבד
const tableText = (phone) => {
  const info = getTableInfo(phone);     // מאתר את פרטי השולחן של הטלפון
  if (!info) return '';                 // אורח שלא שובץ

  // קודם כל שם השולחן; אם אין – מספר
  const label = info.name || info.number || '';
  return ` הינכם יושבים ב${label}`;   // ← בלי “היום הגדול הגיע!”
};




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
                errorCount = Object.values(messages).filter(msg => 
                    msg.status === "error" || msg.status === "error_quota"
                ).length;
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

useEffect(() => {
  if (!user || !id) return;
  const whatsappRef = ref(database, `whatsapp/${user.uid}/${id}`);
  return onValue(whatsappRef, async snapshot => {
    if (!snapshot.exists()) return;
    const msgs = Object.values(snapshot.val());
    const sentCount = msgs.filter(m => m.status === "sent").length;

    // תשמור ב־Firebase
    const sentMsgRef = ref(database, `Events/${user.uid}/${id}/sent_msg`);
    await set(sentMsgRef, sentCount);
  });
}, [user, id]);



// helper – מחזיר טקסט ברירת-מחדל בהתאם לשם הפעולה
const getDefaultMsg = (row) => {
  switch (row?.col4) {            // col4 = שם פעולה
    case 'הזמנות':
      return eventDetails.message || '';              // ההזמנה המקורית
case 'תזכורת': {
  const [name1 = 'הזוג', name2 = 'המאושר'] =
        extractCoupleNames(eventDetails.message) || [];
  return `היי, זוהי תזכורת לאירוע הקרוב שלכם. נשמח לראותכם, אוהבים ${name1} ו${name2}!`;

    }
case 'יום חתונה': {
  const [name1 = 'הזוג', name2 = 'המאושר'] =
        extractCoupleNames(eventDetails.message) || [];
  return `🎉 היום הגדול הגיע! ${name1} ו${name2} מחכים לראותכם בחופה 🙌`;
}


    case 'תודה רבה':
      return 'משפחה וחברים יקרים, מודים לכם מקרב לב על השתתפותכם באירוע. מקווים שנהניתם ושניפגש רק בשמחות! אוהבים המון ❤';
    default:
      return row?.col4 || '';
  }
};

/* ---------- state ---------- */
const [latestReply, setLatestReply] = useState(null);   // {guestName,response,dateTime}
const [showGeneral, setShowGeneral] = useState(true);   // true ⇒ מציגים message2

/* ---------- מאזין ---------- */
useEffect(() => {
  if (!user || !id) return;

  const respRef = ref(database, `Events/${user.uid}/${id}/responses`);
  const off = onValue(respRef, snap => {
    if (!snap.exists()) return;

    // מוצא את התגובה עם ה-timestamp האחרון
    const latest = Object.values(snap.val())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (latest) {
      const dt = new Date(latest.timestamp);

      const dateStr = dt.toLocaleDateString('he-IL', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });            // 27/07/2025

      const timeStr = dt.toLocaleTimeString('he-IL', {
        hour: '2-digit', minute: '2-digit'
      });            // 18:42

      setLatestReply({
        guestName: latest.guestName || 'אורח/ת',
        response : latest.response  || '—',
        dateTime : `${dateStr} ${timeStr}`          // תאריך + שעה
      });
    }
  });

  return () => off();
}, [user, id]);

/* ---------- מחליף תצוגה כל 5 שניות ---------- */
useEffect(() => {
  const t = setInterval(() => setShowGeneral(p => !p), 5000);
  return () => clearInterval(t);
}, []);

const updatesText =
  showGeneral || !latestReply
    ? message2
    : `${latestReply.guestName} סימן/ה "${latestReply.response}" בתאריך ${latestReply.dateTime.replace(' ', ' בשעה ')}`;

  return (
    

    <ImageBackground
      source={require('../assets/send_mesege_back.png')}
      style={styles.backgroundImage}
    >


 <ScrollView
   style={{ flex: 1 }}
   contentContainerStyle={{ paddingBottom: insets.bottom + 40, flexGrow: 1 }}
   showsVerticalScrollIndicator={false}
   keyboardShouldPersistTaps="handled"
   nestedScrollEnabled
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
              {contacts.length > mehsa ? "אין מספיק במכסה" : "שלח הודעה מותאמת"}
          </Text>
      </TouchableOpacity>


        <TouchableOpacity
  onPress={findFailedContacts}      // ← מפעיל את הלולאה
          style={styles.triggerButton2}
        >
          <Text style={styles.buttonText}>📤 למי לא נשלח?</Text>
        </TouchableOpacity>



        
      </View>


      <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6c63ff" />
      ) : (
        <View style={styles.messageBox}>
            <Text style={styles.messageText}>{updatesText}</Text>
        </View>
      )}

      
    </View>

{/* טבלה מתחת לטקסט העדכונים */}
<View style={styles.tableContainer}>
  <View style={styles.headerRow}>
    <Text style={[styles.headerCell, styles.colSendHdr]}>שלח</Text>  
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
      {/* עמודת הכפתור משמאל */}
{/* עמודת הכפתור בטבלת היומן */}
<View style={styles.sendCol}>
  <TouchableOpacity
    style={styles.sendBtn12}
    onPress={() => {
      /* 1. שורה זו תיפתח במודל */
      setRowToSend(item);

      /* 2. בסיס ההודעה */
      const baseMsg = getDefaultMsg(item);      // תמיד מחזיר משפט פתיחה אחד

      /* 3. תוספת “שולחן …” (רק אם זו הודעת יום-חתונה) */
      let extra = '';
      if (item.col4 === 'יום חתונה') {
        const firstRecipient = getRecipients()[0];           // הנמען הראשון לפי הסינון
        if (firstRecipient) {
          extra = tableText(firstRecipient.phoneNumbers);    // “ הינכם יושבים ב…”
        }
      }

      /* 4. שמירת הטקסט במודל */
      setCustomMsg(`${baseMsg}${extra}`.trim());
    }}
  >
    <Text style={styles.sendTxt}>שלח</Text>
  </TouchableOpacity>
</View>


      {/* שאר העמודות כמו קודם */}
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
    /*  ❌  style=[ ...] – גורם לקריסה  */
    styles.animatedButton,
    { marginTop: screenWidth > 600 ? 0 : 20 },
    isScheduled && styles.scheduledButton,
    contacts.length > mehsa && { backgroundColor: 'gray' },
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
      
      {(planType === 'plus' || planType === 'digital' || planType === 'premium') && (
        <>
          <Text style={styles.modalTitle22}>-------------------------------------</Text>
          <Text style={styles.modalTitle}>תזכורת:</Text>
          <Text style={styles.modalText3}>תאריך שליחה: {eventDetails2} בשעה 13:00</Text>
          <Text style={styles.modalText2}>היי, זוהי תזכורת לאירוע הקרוב שלכם. נשמח לראותכם!</Text>
        </>
      )}

     
      {(planType === 'digital' || planType === 'premium') && (
        <>
          <Text style={styles.modalTitle22}>-------------------------------------</Text>
          <Text style={styles.modalTitle}>יום החתונה:</Text>
          <Text style={styles.modalText3}>תאריך שליחה: {eventDetails3} בשעה 10:00</Text>
          <Text style={styles.modalText2}>היום הגדול הגיע! נתראה באירוע.</Text>

        </>
      )}

     
      {(planType === 'digital' || planType === 'premium' ||planType === 'plus') && (
        <>
          <Text style={styles.modalTitle22}>-------------------------------------</Text>
          <Text style={styles.modalTitle}>יום אחרי החתונה:</Text>
          <Text style={styles.modalText3}>תאריך שליחה: {eventDetails4} בשעה 10:00</Text>
          <Text style={styles.modalText2}>משפחה וחברים יקרים, מודים לכם מקרב לב על השתתפותכם באירוע. מקווים שנהניתם ושניפגש רק בשמחות! אוהבים המון ❤</Text>
        </>
      )}
      <Text style={styles.modalTitle22}>-------------------------------------</Text>

      <View style={styles.modalButtons}>
        {!isScheduled && (
          <TouchableOpacity
            style={styles.confirmButton}
            disabled={isSchedLoading}
            onPress={handleConfirmSchedule}   // ← במקום scheduleMessages
          >
            {isSchedLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>מאשר יומן הודעות</Text>}
          </TouchableOpacity>


        )}
        {isScheduled && (
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={deleteScheduleMessages}   
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


<Modal
  visible={!!rowToSend}
  transparent          // רקע שקוף
  animationType="slide"
  onRequestClose={() => setRowToSend(null)}
>
  <View style={styles.modalOverlay}>

    {/* קופסת-הדיאלוג */}
    <View style={styles.modalBox}>

      {/* ===== כותרת ===== */}
      <Text style={styles.modalHeadline}>
        {(() => {
          switch (rowToSend?.col4) {
            case 'הזמנות'   : return 'שלח הזמנה';
            case 'יום חתונה': return 'שלח הודעת יום-חתונה';
            case 'תזכורת'   : return 'שלח תזכורת';
            default         : return 'שלח הודעה';
          }
        })()}
      </Text>

      {/* ===== טקסט הודעה ===== */}
      <TextInput
        style={styles.modalInput}
        multiline
        value={customMsg}
        onChangeText={setCustomMsg}
        placeholder="כתוב הודעה..."
        placeholderTextColor="#999"
      />

      {/* ===== בחירת קבוצת יעד ===== */}
      <Text style={styles.modalSubHdr}>בחר את קבוצת היעד לשליחה:</Text>

<View style={styles.choiceRow}>
  {[
    { key: 'all',       label: `לכולם (${contacts.length})` },
    { key: 'confirmed', label: `מגיע (${confirmedList.length})` },
    { key: 'maybe',     label: `אולי (${maybeList.length})` },
    { key: 'confirmedOrMaybe', label: `מגיע + אולי (${confirmedOrMaybeList.length})` },
    { key: 'failed',    label: `לא נשלח (${failedContacts.length})` },
    /* ✅ חדש: ספציפיים */
    { key: 'specific',  label: `לנמענים ספציפיים` },
  ].map(opt => (
    <TouchableOpacity
      key={opt.key}
      style={[styles.radioBtn, targetGroup === opt.key && styles.radioBtnSelected]}
      onPress={async () => {
        if (opt.key === 'failed') await findFailedContacts(true);
        setTargetGroup(opt.key);
      }}
    >
      <Text style={styles.radioText}>{opt.label}</Text>
    </TouchableOpacity>
  ))}
</View>

{/* ✅ בחירת “נמענים ספציפיים” */}
{targetGroup === 'specific' && (
  <View style={styles.specificBox}>
    <Text style={styles.inputLabel}>בחר נמענים לשליחה</Text>
    <TextInput
      style={styles.specificSearchInput}
      placeholder="חפש לפי שם/טלפון…"
      placeholderTextColor="#999"
      value={specificSearch}
      onChangeText={setSpecificSearch}
    />
    <Text style={styles.specificCounter}>
      נבחרו: {selectedSpecificIds.length}
    </Text>

    <FlatList
      data={filteredSpecificContacts}
      keyExtractor={item => item.recordID || item.id}
      style={styles.specificList}
      renderItem={({ item }) => {
        const id = item.recordID || item.id;
        const selected = selectedSpecificIds.includes(id);
        const status  = responses[id]?.response;
        let rowBg = '#fff';
        if (status === 'מגיע') rowBg = '#d4edda';
        else if (status === 'אולי') rowBg = '#fff3cd';
        else if (status === 'לא מגיע') rowBg = '#f8d7da';

        return (
          <TouchableOpacity
            onPress={() => {
              setSelectedSpecificIds(prev =>
                selected ? prev.filter(x => x !== id) : [...prev, id]
              );
            }}
            style={[
              styles.specificItem,
              { backgroundColor: rowBg },
              selected && styles.specificItemSelected
            ]}
          >
            <Text style={styles.specificCheck}>{selected ? '✔︎' : '◻︎'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.specificName}>{item.displayName}</Text>
              <Text style={styles.specificPhone}>{item.phoneNumbers}</Text>
            </View>
            {!!status && <Text style={styles.specificStatus}>{status}</Text>}
          </TouchableOpacity>
        );
      }}
    />
    {selectedSpecificIds.length > 0 && (
      <TouchableOpacity
        onPress={() => setSelectedSpecificIds([])}
        style={styles.specificClearBtn}
      >
        <Text style={styles.specificClearTxt}>נקה בחירה</Text>
      </TouchableOpacity>
    )}
  </View>
)}


      {/* ===== רשימת נמענים ===== */}
      <Text style={styles.recipientsTitle}>נמענים:</Text>
<FlatList
  data={
    targetGroup === 'specific'
      ? contacts.filter(c => selectedSpecificIds.includes(c.recordID || c.id))
      : getRecipients()
  }
  keyExtractor={(c) => String(c.recordID || c.id || c.phoneNumbers)}
  style={styles.recipientsList}
  renderItem={({ item }) => {
    const guestId = item.recordID || item.id;
    const status  = responses[guestId]?.response;
    let backgroundColor = '#fff';
    if (status === 'מגיע')        backgroundColor = '#d4edda';
    else if (status === 'אולי')   backgroundColor = '#fff3cd';
    else if (status === 'לא מגיע') backgroundColor = '#f8d7da';

    return (
      <View style={[styles.recipientRowBox, { backgroundColor }]}>
        <Text style={styles.recipientRow}>
          • {item.displayName} ({item.phoneNumbers}) – {status || 'לא השיב'}
        </Text>
      </View>
    );
  }}
/>


      <Text style={styles.noticeText}>ההודעות יישלחו ברגע זה.</Text>

      {/* ===== כפתורי שליחה ===== */}
      <View style={styles.actionsRow}>
        {[
          {flag:'yes', label:'שלח SMS'},
          {flag:'no',  label:'שלח WhatsApp'},
          {flag:'both',label:'שלח שניהם'},
        ].map(btn => (
          <TouchableOpacity
            key={btn.flag}
            style={styles.sendBtn}
            onPress={async () => {
              if (!targetGroup) {
                Alert.alert('שים לב', 'יש לבחור קבוצת יעד לפני השליחה');
                return;
              }

              const recipients = targetGroup === 'specific'
                ? contacts.filter(c => selectedSpecificIds.includes(c.recordID || c.id))
                : getRecipients();

              if (recipients.length === 0) {
                Alert.alert('אין נמענים', 'לא נבחרו נמענים ספציפיים');
                return;
              }

              if (btn.flag === 'both') {
                await sendBatchedMessages({ recipients, body: customMsg, smsFlag: 'yes', actionType: rowToSend?.col4 || '' });
                await sendBatchedMessages({ recipients, body: customMsg, smsFlag: 'no',  actionType: rowToSend?.col4 || '' });
              } else {
                await sendBatchedMessages({
                  recipients,
                  body: customMsg,
                  smsFlag: btn.flag === 'yes' ? 'yes' : 'no',
                  actionType: rowToSend?.col4 || '',
                });
              }
              Alert.alert('✔︎', 'ההודעה נשלחה');
              setRowToSend(null);
            }}


          >
            <Text style={styles.sendBtnTxt}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== סגירה ===== */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => setRowToSend(null)}
      >
        <Text style={styles.closeBtnTxt}>סגור</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

<Modal
  visible={showSendNowModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowSendNowModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.quickModalBox}>
      
      <Text style={styles.quickTitle}>שליחת הודעה מיידית</Text>

      {/* הודעה + מונה תווים */}
      <Text style={styles.quickLabel}>תוכן ההודעה</Text>
      <TextInput
        style={styles.quickMsgInput}
        multiline
        value={quickMsg}
        onChangeText={setQuickMsg}
        placeholder="כתוב הודעה מותאמת אישית…"
        placeholderTextColor="#999"
        maxLength={100}     // ⬅️ הגבלה ל-100 תווים
        textAlignVertical="top"
      />
      <View style={styles.quickCharRow}>
        <Text
          style={[
            styles.quickCharText,
            quickMsg.length >= 100 && { color: '#dc2626', fontWeight: '700' }
          ]}
        >
          {quickMsg.length}/100
        </Text>
      </View>


      {/* יעד השליחה */}
      <Text style={styles.quickLabel}>בחר יעד</Text>
      <View style={styles.quickTargetRow}>
        {[
          { key: 'all',      label: `לכולם (${contacts.length})` },
          { key: 'specific', label: 'לנמענים ספציפיים' },
          { key: 'manual',   label: 'למספרים ידניים' },
        ].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.quickTargetBtn,
              qsTarget === opt.key && styles.quickTargetBtnSelected
            ]}
            onPress={() => setQsTarget(opt.key)}
          >
            <Text
              style={[
                styles.quickTargetText,
                qsTarget === opt.key && styles.quickTargetTextSelected
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* בחירת נמענים ספציפיים */}
      {qsTarget === 'specific' && (
        <>
          <Text style={styles.quickSelectListTitle}>בחר נמענים:</Text>
          <FlatList
            data={contacts}
            keyExtractor={(c) => (c.recordID || c.id)}
            style={styles.quickSelectList}
            renderItem={({ item }) => {
              const cid = item.recordID || item.id;
              const selected = quickSpecificIds.includes(cid);
              return (
                <TouchableOpacity
                  onPress={() => {
                    setQuickSpecificIds(prev =>
                      selected ? prev.filter(x => x !== cid) : [...prev, cid]
                    );
                  }}
                  style={styles.quickSelectRow}
                >
                  <Text style={styles.quickSelectCheck}>{selected ? '✔︎' : '◻︎'}</Text>
                  <Text style={styles.quickSelectName}>
                    {item.displayName} ({item.phoneNumbers})
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      {/* הוספת נמען ידני */}
      {qsTarget === 'manual' && (
        <>
          <Text style={styles.quickLabel}>הוספת נמען</Text>
          <View style={styles.quickAddRow}>
            {/* ➕ ירוק בצד שמאל */}
            <TouchableOpacity
              style={styles.quickPlusBtn}
              onPress={() => {
                const raw = (tempManualPhone || '').trim();
                if (!raw) { Alert.alert('שגיאה','הכנס מספר טלפון'); return; }
                const phone = formatPhoneNumber(raw);
                const name  = (tempManualName || raw).trim();

                const exists = quickManualList.some(r => formatPhoneNumber(r.phoneNumbers) === phone);
                if (exists) { Alert.alert('מידע','הנמען כבר קיים'); return; }

                setQuickManualList(prev => [
                  ...prev,
                  { displayName: name, phoneNumbers: phone, recordID: `manual_${phone}` }
                ]);
                setTempManualName('');
                setTempManualPhone('');
              }}
            >
              <Text style={styles.quickPlusBtnText}>➕</Text>
            </TouchableOpacity>

            {/* שדות קלט מימין ל-➕ */}
            <TextInput
              style={[styles.quickInput, {flex: 1.1, marginLeft: 6}]}
              placeholder="טלפון"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={tempManualPhone}
              onChangeText={setTempManualPhone}
              textAlign="right"
            />
            <TextInput
              style={[styles.quickInput, {flex: 0.9}]}
              placeholder="שם"
              placeholderTextColor="#999"
              value={tempManualName}
              onChangeText={setTempManualName}
              textAlign="right"
              
            />
          </View>

          {/* תצוגת נמענים ידניים שנוספו */}
          {quickManualList.length > 0 && (
            <>
              <Text style={styles.quickManualListTitle}>נמענים שנוספו:</Text>
              <View style={styles.quickManualList}>
                {quickManualList.map(rec => (
                  <Text key={rec.recordID} style={styles.quickManualItem}>
                    • {rec.displayName} ({rec.phoneNumbers})
                  </Text>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {/* תצוגת נמענים שיישלח אליהם בפועל */}
      {(() => {
        const previewRecipients =
          qsTarget === 'all'
            ? contacts
            : qsTarget === 'specific'
              ? contacts.filter(c => quickSpecificIds.includes(c.recordID || c.id))
              : quickManualList;

        const disabled = !quickMsg.trim() || previewRecipients.length === 0;

        return (
          <>
            <Text style={styles.quickRecipientsCount}>
              נבחרו {previewRecipients.length} נמענים
            </Text>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickSendBtn, disabled && styles.quickSendBtnDisabled]}
                disabled={disabled}
                onPress={() => quickSendNow('wa')}
              >
                <Text style={styles.quickSendBtnTxt}>שלח WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickSendBtn, disabled && styles.quickSendBtnDisabled]}
                disabled={disabled}
                onPress={() => quickSendNow('sms')}
              >
                <Text style={styles.quickSendBtnTxt}>שלח SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickSendBtn, disabled && styles.quickSendBtnDisabled]}
                disabled={disabled}
                onPress={() => quickSendNow('both')}
              >
                <Text style={styles.quickSendBtnTxt}>שלח שניהם</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      })()}

      {/* סגירה */}
      <TouchableOpacity
        style={styles.quickCloseBtn}
        onPress={() => setShowSendNowModal(false)}
      >
        <Text style={styles.quickCloseBtnTxt}>סגור</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


<Modal visible={isSending} transparent animationType="fade"
       onRequestClose={() => setCancelSending(true)}>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalHeadline}>
        שולח לשרת {progress.batch} מתוך {progress.totalBatches}
      </Text>
      <Text style={styles.modalText}>ערוץ: {currentChannel}</Text>
      <Text style={styles.modalText}>
        {progress.current} / {progress.total} מוזמנים
      </Text>
      <Text style={styles.modalText}>
        זמן נותר ≈ {progress.secondsLeft} ש׳
      </Text>

      <View style={styles.progressBarBackground}>
        <View style={[
          styles.progressBarFill,
          { width: `${(progress.current / progress.total) * 100}%` }]}
        />
      </View>

      {failedList.length > 0 && (
        <>
          <Text style={[styles.modalText, { marginTop: 10 }]}>לא נשלח אל:</Text>
          <FlatList
            data={failedList}
            keyExtractor={(_, i) => i.toString()}
            style={{ maxHeight: 100, alignSelf: 'stretch' }}
            renderItem={({ item }) => (
              <Text style={{ textAlign: 'right', fontSize: 13 }}>
                • {item.name || 'לא ידוע'} ({item.phone})
              </Text>
            )}
          />
        </>
      )}

    <TouchableOpacity
      style={styles.cancelButton}
      onPress={() => {
        cancelSendingRef.current = true;   // ← חובה!
        setCancelSending(true);            // רק כדי לעדכן את ה-UI (לא את הלולאה)
      }}>
      <Text style={styles.buttonText}>בטל שליחה</Text>
    </TouchableOpacity>
    </View>
  </View>
</Modal>

<Modal visible={showFailedModal} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>🚫 הודעות שלא נשלחו</Text>

      <View style={styles.failedListContainer}>
        <ScrollView>
          {failedContacts.map((contact, index) => (
            <Text key={index} style={styles.failedContactText}>📱 {contact}</Text>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.failedCountText}>
        סה"כ לא נשלחו: {failedContacts.length} מתוך {contacts.length}
      </Text>

      <TouchableOpacity onPress={handleRetryFailed} style={styles.modalButton}>
        <Text style={styles.modalButtonText}>🔁 שלח שוב רק למי שלא נשלח</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowFailedModal(false)} style={styles.modalClose}>
        <Text style={styles.modalCloseText}>❌ סגור</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

</ScrollView>

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
    bottom: 10,
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

  textAlign: 'right',   // מיישר לימין
    color: '#333',
  },
  col3: {
    color: '#333',
    textAlign: 'right',   // מיישר לימין

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
// ⬅️ הוסף (או עדכן) ב-StyleSheet
modalBox: {
  width: '90%',
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 20,
  alignItems: 'center',
},

modalHeadline: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#6c63ff',
  marginBottom: 12,
  textAlign: 'center',
},

modalInput: {
  width: '100%',
  minHeight: 110,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 10,
  padding: 10,
  textAlignVertical: 'top',
  marginBottom: 12,
},

recipientsList: { maxHeight: 100, alignSelf: 'stretch' },

recipientRow: { fontSize: 14, textAlign: 'right' },

noticeText: { fontSize: 14, marginTop: 10, marginBottom: 14, textAlign: 'center' },

actionsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  marginBottom: 12,
},

sendBtn: {
  flex: 1,
  backgroundColor: '#28a745',
  paddingVertical: 6,
  marginHorizontal: 4,
  borderRadius: 14,
  alignItems: 'center',
  width: '115%',       // יתפוס את כל רוחב sendCol

},

sendBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

closeBtn: {
  backgroundColor: '#dc3545',
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 20,
},

closeBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
qsOptionsRow:{flexDirection:'row',justifyContent:'space-around',
              marginBottom:12,width:'100%'},
qsOption    :{flexDirection:'row',alignItems:'center'},
qsCheck     :{fontSize:18,color:'#6c63ff',marginHorizontal:4},
qsLabel     :{fontSize:14},
qsTargetRow:  { flexDirection:'row',justifyContent:'space-around',
                width:'100%',marginBottom:10 },
qsManualInput:{ width:'100%',borderWidth:1,borderColor:'#ccc',
                borderRadius:8,padding:8,marginBottom:10,
                textAlign:'right' },
                inputLabel: {
  alignSelf: 'flex-start',
  fontSize: 14,
  fontWeight: 'bold',
  marginBottom: 4,
  color: '#333'
},
progressBarBackground: {
  height: 10,
  width: '100%',
  backgroundColor: '#ccc',
  borderRadius: 5,
  marginTop: 10,
},
progressBarFill: {
  height: 10,
  backgroundColor: '#28a745',
  borderRadius: 5,
},

radioBtn: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 10,
  padding: 10,
  margin: 5,
  backgroundColor: '#eee',
},
radioBtnSelected: {
  backgroundColor: '#ffcc00',
  borderColor: '#ff9900',
},
radioText: {
  fontSize: 16,
  textAlign: 'center',
},
recipientRowBox: {
  paddingVertical: 6,
  paddingHorizontal: 10,
  marginVertical: 2,
  borderRadius: 8,
},
recipientRow: {
  fontSize: 15,
  textAlign: 'right',
},

modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.55)',      // שכבה כהה-שקופה
},

modalBox: {
  width: '90%',
  maxHeight: '90%',
  backgroundColor: '#ffffff',
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical : 20,
  elevation : 10,                            // Android shadow
  shadowColor: '#000',                       // iOS shadow
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
},

/* כותרות ---------------------------------------------------------------- */
modalHeadline: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#6c63ff',
  textAlign: 'center',
  marginBottom: 12,
},

modalSubHdr: {
  fontSize: 15,
  fontWeight: '500',
  color: '#333',
  textAlign: 'center',
  marginVertical: 8,
},

/* שדה טקסט -------------------------------------------------------------- */
modalInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 10,
  minHeight: 100,
  padding: 10,
  fontSize: 15,
  textAlignVertical: 'top',
  marginBottom: 14,
  backgroundColor: '#fafafa',
},

/* רדיו-כפתורים ----------------------------------------------------------- */
choiceRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginBottom: 12,
},

radioBtn: {
  borderWidth: 1,
  borderColor: '#bbb',
  borderRadius: 10,
  paddingVertical: 6,
  paddingHorizontal: 10,
  marginVertical: 4,
  flexGrow: 1,
  marginHorizontal: 3,
  backgroundColor: '#f4f4f4',
},

radioBtnSelected: {
  backgroundColor: '#6c63ff30',
  borderColor: '#6c63ff',
},

radioText: {
  fontSize: 14,
  textAlign: 'center',
  color: '#333',
},

/* רשימת נמענים ----------------------------------------------------------- */
recipientsTitle: {
  alignSelf: 'flex-start',
  fontSize: 15,
  fontWeight: 'bold',
  marginBottom: 4,
  color: '#333',
  textAlign: 'right',
  alignItems: "right",
  alignSelf : 'right',

},


recipientsList: {
  maxHeight: 120,
  alignSelf : 'stretch',
  marginBottom: 8,
},

recipientRowBox: {
  borderRadius: 8,
  paddingVertical: 4,
  paddingHorizontal: 6,
  marginVertical: 2,
},

recipientRow: {
  fontSize: 14,
  textAlign: 'right',
},

/* טקסט הבהרה ------------------------------------------------------------- */
noticeText: {
  fontSize: 13,
  color: '#666',
  textAlign: 'center',
  marginBottom: 8,
},

/* כפתורי פעולה ----------------------------------------------------------- */
actionsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
},

sendBtn: {
  flex: 1,
  backgroundColor: '#6c63ff',
  paddingVertical: 8,
  marginHorizontal: 4,
  borderRadius: 12,
  alignItems: 'center',
},

sendBtnTxt: {
  color: '#fff',
  fontSize: 14,
  fontWeight: 'bold',
},
sendBtn12: {
  backgroundColor: '#6c63ff',

  /* ריווח וגודל */
  paddingVertical: 10,
  paddingHorizontal: 16,  // פחות רוחב מכל צד
  minWidth: 50,          // לא “תשבר” בצדדים
  maxWidth: 80,          // שלא תתפרש על כל השורה

  /* פינות וצל */
  borderRadius: 24,       // עיגול ברור יותר
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3,           // אנדרואיד

  /* מיקום בטור הכפתורים */
  alignItems: 'center',
  justifyContent: 'center',
  marginHorizontal: 4,
},


/* כפתור סגירה ------------------------------------------------------------ */
closeBtn: {
  alignSelf: 'center',
  backgroundColor: '#e63946',
  paddingVertical: 8,
  paddingHorizontal: 24,
  borderRadius: 14,
  marginTop: 4,
},

closeBtnTxt: {
  color: '#fff',
  fontSize: 14,
  fontWeight: 'bold',
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},

modalContainer: {
  width: '90%',
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  alignItems: 'center',
  elevation: 10,
},

modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  marginBottom: 10,
  textAlign: 'center',
},

failedListContainer: {
  maxHeight: 200,
  width: '100%',
  backgroundColor: '#f9f9f9',
  borderRadius: 8,
  padding: 10,
  borderWidth: 1,
  borderColor: '#ddd',
  marginBottom: 10,
},

failedContactText: {
  fontSize: 14,
  color: '#333',
  marginVertical: 2,
},

failedCountText: {
  fontSize: 16,
  marginBottom: 15,
  color: '#555',
},

modalButton: {
  backgroundColor: '#4CAF50',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
  marginBottom: 10,
},

modalButtonText: {
  color: 'white',
  fontWeight: 'bold',
  fontSize: 16,
},

modalClose: {
  paddingVertical: 8,
  paddingHorizontal: 16,
},

modalCloseText: {
  color: '#888',
  fontSize: 14,
},
specificBox: {
  alignSelf: 'stretch',
  backgroundColor: '#fafafa',
  borderWidth: 1,
  borderColor: '#eee',
  borderRadius: 12,
  padding: 10,
  marginBottom: 10,
},
specificSearchInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  paddingVertical: 8,
  paddingHorizontal: 10,
  marginBottom: 8,
  backgroundColor: '#fff',
  textAlign: 'right',
},
specificCounter: {
  fontSize: 13,
  color: '#666',
  textAlign: 'right',
  marginBottom: 6,
},
specificList: {
  maxHeight: 180,
  alignSelf: 'stretch',
},
specificItem: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#e6e6e6',
  borderRadius: 10,
  paddingVertical: 8,
  paddingHorizontal: 10,
  marginVertical: 4,
},
specificItemSelected: {
  borderColor: '#6c63ff',
  backgroundColor: '#F3F2FF',
},
specificCheck: {
  fontSize: 18,
  color: '#6c63ff',
  marginLeft: 8,
  marginRight: 4,
},
specificName: {
  fontSize: 14,
  color: '#222',
  textAlign: 'right',
},
specificPhone: {
  fontSize: 12,
  color: '#666',
  textAlign: 'right',
},
specificStatus: {
  fontSize: 12,
  color: '#444',
  marginHorizontal: 6,
},
specificClearBtn: {
  alignSelf: 'flex-start',
  backgroundColor: '#eee',
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 8,
  marginTop: 6,
},
/* ===== Quick Send Modal (Styled) ===== */
quickOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.55)',
  justifyContent: 'center',
  alignItems: 'center',
},
quickSheet: {
  width: '92%',
  maxHeight: '92%',
  backgroundColor: '#fff',
  borderRadius: 18,
  padding: 16,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
},
quickHeader: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},
quickTitle: {
  fontSize: 20,
  fontWeight: '800',
  color: '#6c63ff',
},
quickClose: {
  fontSize: 20,
  color: '#666',
  paddingHorizontal: 8,
},

quickModalBox: {
  width: '92%',
  maxHeight: '92%',
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 16,
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
},
quickTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#6c63ff',
  textAlign: 'center',
  marginBottom: 12,
},
quickLabel: {
  alignSelf: 'flex-end',
  fontSize: 14,
  fontWeight: '700',
  marginBottom: 6,
  color: '#333',
},
quickMsgInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 10,
  minHeight: 100,
  padding: 10,
  backgroundColor: '#fafafa',
},
quickCharRow: {
  width: '100%',
  alignItems: 'flex-start',
  marginTop: 6,
  marginBottom: 8,
},
quickCharText: {
  fontSize: 12,
  color: '#666',
},

/* chips row – ימין */
quickChipsRow: {
  flexDirection: 'row-reverse',
  justifyContent: 'flex-start',
  gap: 8,
  marginBottom: 12,
},
quickChip: {
  borderWidth: 1,
  borderColor: '#ddd',
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 999,
  backgroundColor: '#fff',
  marginLeft: 8,
},
quickChipActive: {
  backgroundColor: '#F3F2FF',
  borderColor: '#6c63ff',
},
quickChipText: { fontSize: 13, color: '#333' },
quickChipTextActive: { color: '#6c63ff', fontWeight: '700' },

/* target row */
quickTargetRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 10,
  gap: 6,
},
quickTargetBtn: {
  flex: 1,
  borderWidth: 1,
  borderColor: '#bbb',
  borderRadius: 10,
  paddingVertical: 8,
  alignItems: 'center',
  backgroundColor: '#f4f4f4',
},
quickTargetBtnSelected: {
  backgroundColor: '#6c63ff30',
  borderColor: '#6c63ff',
},
quickTargetText: { fontSize: 14, color: '#333' },
quickTargetTextSelected: { color: '#333', fontWeight: '700' },

/* specific list */
quickSelectListTitle: {
  alignSelf: 'flex-end',
  fontSize: 14,
  fontWeight: '700',
  marginVertical: 6,
  color: '#333',
},
quickSelectList: {
  maxHeight: 150,
  alignSelf: 'stretch',
  borderWidth: 1,
  borderColor: '#eee',
  borderRadius: 10,
  backgroundColor: '#fff',
  padding: 6,
  marginBottom: 6,
},
quickSelectRow: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  paddingVertical: 6,
},
quickSelectCheck: { fontSize: 16, marginLeft: 8, color: '#6c63ff' },
quickSelectName: { fontSize: 14, color: '#333', textAlign: 'right', flex: 1 },

/* manual add */
quickAddRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 6,
},
quickPlusBtn: {
  backgroundColor: '#22c55e',  // ירוק
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 14,
  marginRight: 8, // כדי שיישאר בצד שמאל ויפה עם השדות
},
quickPlusBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
quickInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 8,
  backgroundColor: '#fff',
},

quickManualListTitle: {
  alignSelf: 'flex-end',
  fontSize: 14,
  fontWeight: '700',
  marginTop: 6,
  marginBottom: 4,
  color: '#333',
},
quickManualList: {
  alignSelf: 'stretch',
  backgroundColor: '#f9f9f9',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#eee',
  padding: 8,
},
quickManualItem: {
  fontSize: 14,
  color: '#333',
  textAlign: 'right',
  marginVertical: 2,
},

/* recipients & actions */
quickRecipientsCount: {
  fontSize: 13,
  color: '#555',
  textAlign: 'center',
  marginTop: 8,
  marginBottom: 10,
},
quickActionsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 6,
  marginBottom: 8,
},
quickSendBtn: {
  flex: 1,
  backgroundColor: '#6c63ff',
  paddingVertical: 10,
  borderRadius: 12,
  alignItems: 'center',
},
quickSendBtnDisabled: {
  backgroundColor: '#c7c7c7',
},
quickSendBtnTxt: { color: '#fff', fontWeight: '700' },

quickCloseBtn: {
  alignSelf: 'center',
  backgroundColor: '#e63946',
  paddingVertical: 8,
  paddingHorizontal: 24,
  borderRadius: 14,
  marginTop: 6,
},
quickCloseBtnTxt: { color: '#fff', fontWeight: '700' },

});

export default RSVPs;