const translations = {
  th: {
    overview: "ภาพรวม",
    compressors: "เครื่องอัดอากาศ",
    sensors: "เซ็นเซอร์",
    valves: "วาล์ว",
    alarms: "แจ้งเตือน",
    online: "ออนไลน์",
    offline: "ออฟไลน์",
    connecting: "กำลังเชื่อมต่อ",
    refresh: "รีเฟรช",
    noAlarms: "ไม่มีแจ้งเตือน",
    acknowledge: "ยืนยัน",
    delete: "ลบ",
    cancel: "ยกเลิก",
    start: "เริ่ม",
    stop: "หยุด",
    open: "เปิด",
    close: "ปิด",
  },
  en: {
    overview: "Overview",
    compressors: "Air Compressors",
    sensors: "Flow Sensors",
    valves: "Electric Valve",
    alarms: "Alarm",
    online: "Online",
    offline: "Offline",
    connecting: "Connecting",
    refresh: "Refresh",
    noAlarms: "No alarms",
    acknowledge: "Acknowledge",
    delete: "Delete",
    cancel: "Cancel",
    start: "Start",
    stop: "Stop",
    open: "Open",
    close: "Close",
  },
};

let currentLocale = "th";

export function setLocale(locale) {
  currentLocale = locale;
}

export function t(key) {
  return translations[currentLocale]?.[key] || translations.en[key] || key;
}
