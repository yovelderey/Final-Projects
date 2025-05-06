#!/bin/bash

echo "🔍 בודק קבצי תמונה בפרויקט..."

find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | while read file; do
  # בדיקת גודל הקובץ - ב-Mac משתמשים ב-stat שונה
  size=$(stat -f%z "$file")
  if [ "$size" = "" ]; then
    echo "⚠️ לא ניתן לבדוק גודל קובץ: $file"
    continue
  fi
  if [ "$size" -eq 0 ]; then
    echo "❌ קובץ ריק: $file"
    continue
  fi

  # בדיקת קובץ PNG אמיתי
  if [[ "$file" == *.png ]]; then
    header=$(xxd -p -l 8 "$file")
    if [ "$header" != "89504e470d0a1a0a" ]; then
      echo "⚠️ $file אינו קובץ PNG אמיתי"
    fi
  fi

  # בדיקת תווים בעייתיים בשם
  if [[ "$file" =~ [\ \(\)\!\@\$\"] ]]; then
    echo "⚠️ שם קובץ עם תווים בעייתיים: $file"
  fi
done

echo "✅ בדיקה הסתיימה"
