// NotificationsCenter.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  FlatList,
  I18nManager,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ref,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  runTransaction,
  update,
} from "firebase/database";
import { database } from "../firebase"; // אצלך כבר קיים

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

function kindDot(kind) {
  switch (kind) {
    case "rsvp":
      return "#22c55e";
    case "gift":
      return "#f59e0b";
    case "system":
      return "#60a5fa";
    case "warning":
      return "#ef4444";
    default:
      return "#a3a3a3";
  }
}

/**
 * יוצר התראה רק אם לא קיימת (מפתח קבוע) כדי למנוע כפילויות
 */
async function ensureNotification({ uid, eventId, notifKey, payload }) {
  const itemRef = ref(database, `Events/${uid}/${eventId}/__notifications/items/${notifKey}`);
  await runTransaction(itemRef, (current) => {
    if (current) return current; // כבר קיים
    return {
      ...payload,
      read: false,
      ts: payload.ts ?? Date.now(),
    };
  });
}

/**
 * מאזינים ל-RSVP ולהתראות Gifts ומייצרים Notifications.
 * שים את זה איפה שנוח לך (לרוב במסך ListItem של האירוע).
 */
export function useEventNotificationsFeed({ uid, eventId }) {
  useEffect(() => {
    if (!uid || !eventId) return;

    // 1) RSVP responses -> notifications
    const responsesRef = ref(database, `Events/${uid}/${eventId}/responses`);
    const unsubResponses = onValue(responsesRef, async (snap) => {
      const val = snap.val();
      if (!val) return;

      // לוקחים את האחרון לפי timestamp (ISO) - אצלך timestamp נשמר כסטרינג ISO
      // אם תרצה יותר חכם: להחזיק lastSeenResponseAt ב-meta.
      const entries = Object.entries(val).map(([k, v]) => ({ k, v }));
      entries.sort((a, b) => String(a.v.timestamp || "").localeCompare(String(b.v.timestamp || "")));
      const last = entries[entries.length - 1];
      if (!last) return;

      const responseId = last.k;
      const guestName = last.v?.guestName || "אורח";
      const response = last.v?.response || "";
      const numGuests = Number(last.v?.numberOfGuests ?? 0);

      // זמן: אם יש ISO, נמיר
      const ts = last.v?.timestamp ? Date.parse(last.v.timestamp) : Date.now();

      await ensureNotification({
        uid,
        eventId,
        notifKey: `resp_${responseId}`,
        payload: {
          kind: "rsvp",
          title: "תגובה חדשה להזמנה",
          body: `${guestName}: ${response}${numGuests ? ` (${numGuests})` : ""}`,
          ts,
          deepLink: { screen: "RSVPs", params: { id: eventId } },
        },
      });
    });

    // 2) Gifts -> notifications
    const giftsRef = ref(database, `Events/${uid}/${eventId}/payments/gifts`);
    const unsubGifts = onValue(giftsRef, async (snap) => {
      const val = snap.val();
      if (!val) return;

      const entries = Object.entries(val).map(([k, v]) => ({ k, v }));
      entries.sort((a, b) => Number(a.v.updatedAt || 0) - Number(b.v.updatedAt || 0));
      const last = entries[entries.length - 1];
      if (!last) return;

      const giftId = last.k;
      const payerName = last.v?.payerName || last.v?.guestName || "מישהו";
      const amount = last.v?.amount ?? "";
      const method = last.v?.method ?? "";
      const ts = Number(last.v?.updatedAt || Date.now());

      await ensureNotification({
        uid,
        eventId,
        notifKey: `gift_${giftId}`,
        payload: {
          kind: "gift",
          title: "מתנה התקבלה",
          body: `${payerName}: ${amount}₪${method ? ` (${method})` : ""}`,
          ts,
          deepLink: { screen: "Payments", params: { id: eventId } },
        },
      });
    });

    return () => {
      // חשוב: onValue מחזיר unsubscribe בפועל ב-v9, אבל גם off עובד.
      try { unsubResponses?.(); } catch {}
      try { unsubGifts?.(); } catch {}
      try { off(responsesRef); } catch {}
      try { off(giftsRef); } catch {}
    };
  }, [uid, eventId]);
}

/**
 * כפתור פעמון עם Badge
 */
export function NotificationsBellButton({ unreadCount, onPress, isDark }) {
  const badge = Math.max(0, Number(unreadCount || 0));
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}>
      <Ionicons name="notifications-outline" size={22} color={isDark ? "#fff" : "#111"} />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : String(badge)}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * חלון נפתח (Panel) של מרכז התראות
 * - לא Modal, זה View עם overlay + slide-in
 */
export default function NotificationsCenterPanel({
  uid,
  eventId,
  visible,
  onClose,
  navigation,
  isDark,
}) {
  const W = Dimensions.get("window").width;
  const panelW = clamp(Math.floor(W * 0.86), 290, 390);

  const x = useRef(new Animated.Value(panelW)).current;

  const [items, setItems] = useState([]);
  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  // מאזין לרשימת התראות
  useEffect(() => {
    if (!uid || !eventId) return;

    const itemsQ = query(
      ref(database, `Events/${uid}/${eventId}/__notifications/items`),
      orderByChild("ts"),
      limitToLast(60)
    );

    const unsub = onValue(itemsQ, (snap) => {
      const val = snap.val();
      if (!val) {
        setItems([]);
        return;
      }
      const arr = Object.entries(val).map(([id, v]) => ({ id, ...v }));
      arr.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
      setItems(arr);
    });

    return () => {
      try { unsub?.(); } catch {}
    };
  }, [uid, eventId]);

  // אנימציית פתיחה/סגירה + סימון כנקרא
  useEffect(() => {
    Animated.timing(x, {
      toValue: visible ? 0 : panelW,
      duration: 220,
      useNativeDriver: true,
    }).start(async () => {
      if (visible) {
        // ברגע שנפתח: מסמנים הכל כ-read
        await markAllAsRead({ uid, eventId, items });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const markAllAsRead = useCallback(async ({ uid, eventId, items }) => {
    if (!uid || !eventId || !items?.length) return;

    const updates = {};
    let hasUnread = false;

    for (const n of items) {
      if (!n.read) {
        updates[`Events/${uid}/${eventId}/__notifications/items/${n.id}/read`] = true;
        hasUnread = true;
      }
    }

    updates[`Events/${uid}/${eventId}/__notifications/meta/lastOpenedAt`] = Date.now();

    if (hasUnread) {
      try { await update(ref(database), updates); } catch {}
    } else {
      try {
        await update(ref(database, `Events/${uid}/${eventId}/__notifications/meta`), {
          lastOpenedAt: Date.now(),
        });
      } catch {}
    }
  }, []);

  const bg = isDark ? "#0b0f19" : "#f7f7fb";
  const card = isDark ? "#111827" : "#ffffff";
  const text = isDark ? "#e5e7eb" : "#111827";
  const sub = isDark ? "#9ca3af" : "#6b7280";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const renderItem = ({ item }) => {
    const dot = kindDot(item.kind);
    const isUnread = !item.read;

    return (
      <Pressable
        onPress={() => {
          const dl = item.deepLink;
          if (dl?.screen && navigation) {
            onClose?.();
            navigation.navigate(dl.screen, dl.params || {});
          }
        }}
        style={({ pressed }) => [
          styles.notifCard,
          {
            backgroundColor: card,
            borderColor: border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text
              style={[
                styles.notifTitle,
                { color: text, fontWeight: isUnread ? "800" : "700" },
              ]}
              numberOfLines={1}
            >
              {item.title || "התראה"}
            </Text>
            <Text style={[styles.notifTime, { color: sub }]}>
              {formatTime(item.ts)}
            </Text>
          </View>
          {!!item.body && (
            <Text style={[styles.notifBody, { color: sub }]} numberOfLines={2}>
              {item.body}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* overlay */}
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />

      {/* panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            width: panelW,
            backgroundColor: bg,
            transform: [{ translateX: x }],
            right: 0,
            borderLeftColor: border,
          },
        ]}
      >
        <View style={[styles.panelHeader, { borderBottomColor: border }]}>
          <Text style={[styles.panelTitle, { color: text }]}>מרכז התראות</Text>

          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <View style={styles.headerPill}>
                <Text style={styles.headerPillText}>{unreadCount} חדש</Text>
              </View>
            )}
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name="close" size={20} color={isDark ? "#fff" : "#111"} />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: sub, textAlign: "center" }}>
                אין התראות כרגע 🙂
              </Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },

  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  panelHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerPill: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 8,
    borderRadius: 10,
  },

  notifCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  notifTitle: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
  },
  notifTime: {
    fontSize: 11,
  },
  notifBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
  },
});
