function getContrastColor(bgColor) {
  const rgb = bgColor.match(/\d+/g).map(Number);
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function getColorByIndex(index) {
  const t = Math.max(0, Math.min(100, index)) / 100;
  const hue = 0 + t * 120; // 0:red, 120:green
  return `hsl(${hue}, 100%, 50%)`;
}

function fitTextToCircle(ctx, text, maxRadius) {
  let fontSize = maxRadius * 1.6;
  ctx.font = `bold ${fontSize}px system-ui`;

  let metrics = ctx.measureText(text);
  let textWidth = metrics.width;
  let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  while ((textWidth > maxRadius * 2.0 || textHeight > maxRadius * 2.0) && fontSize > 5) {
    fontSize -= 0.5;
    ctx.font = `bold ${fontSize}px system-ui`;
    metrics = ctx.measureText(text);
    textWidth = metrics.width;
    textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  }
}

async function updateIcon(index) {
  const size = 64;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // 배경
  const bgColor = getColorByIndex(index);
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
  ctx.fill();

  // 텍스트
  const text = String(Math.round(index));
  const radius = size / 2 - 4;
  fitTextToCircle(ctx, text, radius);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const contrastColor = getContrastColor(bgColor);
  ctx.lineWidth = 2;
  ctx.strokeStyle = contrastColor;
  ctx.strokeText(text, size / 2, size / 2);
  ctx.fillStyle = contrastColor;
  ctx.fillText(text, size / 2, size / 2);

  const imageData = ctx.getImageData(0, 0, size, size);
  chrome.action.setIcon({ imageData });
  chrome.action.setTitle({ title: `${index.toFixed(5)}` });
}

async function fetchIndex() {
  try {
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata");
    const json = await res.json();
    return json.fear_and_greed.score;
  } catch (e) {
    console.error("Failed to fetch index:", e);
    return null;
  }
}

async function updateDisplay() {
  const index = await fetchIndex();
  if (index !== null) {
    await updateIcon(index);

    chrome.storage.local.set({
      lastIndex: index,
      lastUpdate: Date.now()
    });
  } else {
    chrome.action.setIcon({ path: "icons/default.png" });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  updateDisplay();
  chrome.alarms.create("updateDisplay", { periodInMinutes: 10 });
});

chrome.runtime.onStartup.addListener(() => {
  updateDisplay();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateDisplay") {
    updateDisplay();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "forceUpdate") {
    console.log("forceUpdate");
    updateDisplay().then(() => sendResponse({ status: "ok" }));
    return true;
  }
});
