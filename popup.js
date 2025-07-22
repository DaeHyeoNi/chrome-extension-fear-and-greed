function updateMeter(index) {
  const needleGroup = document.getElementById('needleGroup');
  const meterValue = document.getElementById('meterValue');
  const meterLabel = document.getElementById('meterLabel');
  
  // 각도 계산: 0-100을 -90도에서 +90도로 변환 (총 180도)
  const normalizedIndex = Math.max(0, Math.min(100, index));
  const angle = -90 + (normalizedIndex / 100) * 180;
  
  // 바늘 회전
  needleGroup.style.transform = `rotate(${angle}deg)`;
  
  // 값과 라벨 업데이트
  meterValue.textContent = Math.round(index * 10) / 10;
  meterLabel.textContent = getIndexLabel(parseInt(index));
}

function getIndexLabel(index) {
  if (index < 25) return "Extreme Fear";
  if (index < 45) return "Fear";
  if (index < 55) return "Neutral";
  if (index < 75) return "Greed";
  return "Extreme Greed";
}

function formatTime(date) {
  const now = new Date();
  const diffMins = Math.floor((now - date) / (1000 * 60));

  if (diffMins === 0) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours} hours ${remainingMins} minutes ago`;
  }
}

async function loadCachedData() {
  try {
    const cached = await chrome.storage.local.get(['lastIndex', 'lastUpdate']);
    if (cached.lastIndex !== undefined) {
      updateMeter(cached.lastIndex);
      if (cached.lastUpdate) {
        const lastUpdate = new Date(cached.lastUpdate);
        document.getElementById('lastUpdate').innerHTML = formatTime(lastUpdate);
      }
    } else {
      // 초기값 처리
      document.getElementById('meterValue').textContent = '?';
      document.getElementById('meterLabel').textContent = 'Data not available';
    }
  } catch (error) {
    console.error('Error loading cached data:', error);
  }
}

async function forceUpdateFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage("forceUpdate", (response) => {
      resolve(response);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // 캐시된 데이터 먼저 로드
  await loadCachedData();

  await forceUpdateFromBackground();
  await loadCachedData();
  
  // 새로고침 버튼 이벤트
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    document.getElementById('meterValue').textContent = '...';
    document.getElementById('meterLabel').textContent = '업데이트 중...';
    await forceUpdateFromBackground();
    await loadCachedData();
  });
});

document.getElementById('openCnnLink').addEventListener('click', () => {
  chrome.tabs.create({ url: "https://edition.cnn.com/markets/fear-and-greed" });
});
