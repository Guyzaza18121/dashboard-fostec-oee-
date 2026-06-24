export function formatValue(value) {
  if (typeof value === "number" && value === 0) {
    return 0;
  }

  if (typeof value === "number" && Math.abs(value) < 1) {
    return value.toFixed(3);
  }

  if (typeof value === "number" && !Number.isInteger(value)) {
    return value.toFixed(1);
  }

  return value;
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLastSync(date = new Date()) {
  return {
    time: formatTime(date),
    date: date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
    }),
  };
}

export function formatRunningTime(hours = 0) {
  const safeHours = Math.max(0, Number(hours) || 0);
  const wholeHours = Math.floor(safeHours);
  const minutes = Math.round((safeHours - wholeHours) * 60);

  if (minutes >= 60) {
    return `${wholeHours + 1}h 00m`;
  }

  return `${wholeHours}h ${String(minutes).padStart(2, "0")}m`;
}
