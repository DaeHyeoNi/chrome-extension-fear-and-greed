function getColorByIndex(index) {
  const t = Math.max(0, Math.min(100, index)) / 100;
  const hue = 0 + t * 120; // 0:red, 120:green
  return `hsl(${hue}, 100%, 50%)`;
}

function fitTextToCircle(ctx, text, maxRadius) {
  let fontSize = maxRadius * 1.6;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  let metrics = ctx.measureText(text);
  let textWidth = metrics.width;
  let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  while ((textWidth > maxRadius * 2.0 || textHeight > maxRadius * 2.0) && fontSize > 5) {
    if (loopCount > 2000) {
      console.error("fitTextToCircle: 폰트 크기 조절 루프가 너무 많이 반복됨. 무한 루프 또는 비정상적인 값.");
      break; // 루프 강제 종료
    }
    fontSize -= 0.5;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    metrics = ctx.measureText(text);
    textWidth = metrics.width;
    textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  }
}

async function updateIcon(index) {
  const size = 64;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("OffscreenCanvas context is null");
    return;
  }

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
  ctx.fillStyle = "#000000";
  ctx.fillText(text, size / 2, size / 2);

  const imageData = ctx.getImageData(0, 0, size, size);

  // 이 부분이 아이콘을 실제로 설정하는 부분입니다.
  try {
    await chrome.action.setIcon({ imageData });
    console.log("chrome.action.setIcon 성공!");
  } catch (e) {
    console.error("chrome.action.setIcon 실패:", e);
  }

  try {
    await chrome.action.setTitle({ title: `${index.toFixed(5)}` });
    console.log("chrome.action.setTitle 성공!");
  } catch (e) {
    console.error("chrome.action.setTitle 실패:", e);
  }
}

async function fetchIndex() {
  try {
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata");
    const json = await res.json();
    return [json.fear_and_greed.score, json.fear_and_greed.timestamp];
  } catch (e) {
    console.error("Failed to fetch index:", e);
    return [null, null];
  }
}

async function updateDisplay() {
  console.log("updateDisplay 함수 시작");
  const [index, timestamp] = await fetchIndex();
  console.log("fetchIndex 결과:", index, timestamp);
  if (index !== null) {
    await updateIcon(index);

    chrome.storage.local.set({
      lastIndex: index,
      lastUpdate: timestamp
    });
  } else {
    console.log("fetchIndex 실패, 기본 아이콘 설정 시도");
    chrome.action.setIcon({ path: "icons/default.png" });
  }
}

function ensureAlarm() {
  chrome.alarms.create("updateDisplay", { periodInMinutes: 10 });
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log("확장 프로그램 설치/업데이트됨 - " + details.reason + " - " + new Date().toLocaleString());
  updateDisplay();
  ensureAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("확장 프로그램이 onStartup에서 시작됨 - " + new Date().toLocaleString());
  updateDisplay();
  ensureAlarm();
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
    ensureAlarm();
    return true;
  }
});
