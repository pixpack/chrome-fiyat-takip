// Chrome içi bildirim overlay
(function() {
  'use strict';
  
  // CSS'i yükle
  if (!document.getElementById('price-notification-styles')) {
    const link = document.createElement('link');
    link.id = 'price-notification-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('notification-overlay.css');
    document.head.appendChild(link);
  }
  
  // Bildirim sesi çal
  function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Yumuşak notification sesi (2 tonlu)
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
    
    // İkinci ton
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.value = 1000;
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.15);
    }, 100);
  }
  
  // Bildirim göster
  function showPriceNotification(data) {
    // Bildirim sesi çal
    try {
      playNotificationSound();
    } catch (error) {
      console.log('Ses çalınamadı:', error);
    }
    
    // Eğer zaten bir bildirim varsa kaldır
    const existing = document.querySelector('.price-notification-overlay');
    if (existing) {
      existing.remove();
    }
    
    const { productName, oldPrice, newPrice, currency, change } = data;
    
    const isDown = newPrice < oldPrice;
    const icon = isDown ? '↓' : '↑';
    const iconClass = isDown ? 'down' : 'up';
    const changeText = change || '0%';
    
    const overlay = document.createElement('div');
    overlay.className = 'price-notification-overlay';
    
    overlay.innerHTML = `
      <div class="price-notification-card">
        <button class="price-notification-close">×</button>
        <div class="price-notification-header">
          <div class="price-notification-icon ${iconClass}">
            ${icon}
          </div>
          <div class="price-notification-content">
            <div class="price-notification-title">
              Fiyat ${isDown ? 'Düştü' : 'Arttı'}!
            </div>
            <div class="price-notification-product">
              ${productName}
            </div>
          </div>
        </div>
        <div class="price-notification-price">
          <span>${oldPrice}</span>
          <span style="color: #9CA3AF;">→</span>
          <span>${newPrice}</span>
          <span class="price-notification-change">${changeText}</span>
        </div>
        <div class="price-notification-time">
          Az önce
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Close button
    const closeBtn = overlay.querySelector('.price-notification-close');
    closeBtn.addEventListener('click', () => {
      overlay.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => overlay.remove(), 300);
    });
    
    // Auto close after 10 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => overlay.remove(), 300);
      }
    }, 10000);
  }
  
  // Background'dan mesaj dinle
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showPriceNotification') {
      showPriceNotification(message.data);
      sendResponse({ success: true });
    }
  });
})();
