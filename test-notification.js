// Background console'a yapıştır - Test notification gönder

chrome.notifications.create('test-' + Date.now(), {
  type: 'basic',
  iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  title: '🧪 Test Bildirimi',
  message: 'Eğer bunu görüyorsan, bildirimler çalışıyor! ✅'
}, (notificationId) => {
  if (chrome.runtime.lastError) {
    console.error('❌ Bildirim hatası:', chrome.runtime.lastError);
  } else {
    console.log('✅ Test bildirimi gönderildi:', notificationId);
  }
});
