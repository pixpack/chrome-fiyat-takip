document.addEventListener('DOMContentLoaded', function() {
  // Badge'i temizle (popup açıldı) ve sayacı sıfırla
  chrome.action.setBadgeText({ text: '' });
  chrome.storage.local.set({ priceChangedCount: 0 });
  
  // Background script'i uyandır
  chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    console.log('Background script aktif:', response);
  });
  
  // Tab switcher
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Tab'ları güncelle
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
  
  // İçerikleri yükle
  loadTrackedItems();
  loadNotifications();

  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });

  document.getElementById('start-picker').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, { action: 'startPicker' });
    window.close();
  });
  
  document.getElementById('mark-all-read').addEventListener('click', () => {
    markAllNotificationsAsRead();
  });

});

function formatPrice(price, currency = 'USD') {
  if (!price) return 'Bilinmiyor';
  
  const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'TRY': '₺',
    'CAD': 'CA$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'RUB': '₽'
  };
  
  const symbol = currencySymbols[currency] || currency;
  
  // Fiyatı formatta göster
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
  
  // Para birimi sembolünü ekle
  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
    return `${symbol}${formatted}`;
  } else {
    return `${formatted} ${symbol}`;
  }
}

function loadNotifications() {
  chrome.storage.local.get(['notificationHistory'], (result) => {
    const notifications = result.notificationHistory || [];
    const notificationsList = document.getElementById('notifications-list');
    const notificationsCount = document.getElementById('notifications-count');
    
    const unreadCount = notifications.filter(n => !n.read).length;
    notificationsCount.textContent = unreadCount;
    
    if (notifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <div class="empty-text">
            Henüz bildirim yok.<br>
            Fiyat değişikliklerinde burada göreceksiniz!
          </div>
        </div>
      `;
      return;
    }
    
    notificationsList.innerHTML = '';
    
    notifications.forEach(notification => {
      const div = document.createElement('div');
      div.className = `notification-card ${notification.type} ${notification.read ? '' : 'unread'}`;
      div.onclick = () => openNotification(notification);
      
      let icon = '📦';
      let title = '';
      let priceInfo = '';
      
      // Site bazlı ikon ve başlık
      const isTrendyol = notification.url && notification.url.includes('trendyol.com');
      const isHepsiburada = notification.url && notification.url.includes('hepsiburada.com');
      const isAmazon = notification.url && notification.url.includes('amazon.com.tr');
      
      if (notification.type === 'basket-discount') {
        if (isTrendyol) {
          icon = '🏷️';
          title = 'İndirimli Fiyat';
        } else if (isHepsiburada) {
          icon = '🛒';
          title = 'Sepete Özel İndirim';
        } else if (isAmazon) {
          icon = '📦';
          title = 'Amazon İndirimi';
        } else {
          icon = '💰';
          title = 'İndirimli Fiyat';
        }
        priceInfo = `${formatPrice(notification.normalPrice, notification.currency)} → ${formatPrice(notification.basketPrice, notification.currency)} <span style="color: #10B981;">-%${notification.discount}</span>`;
      } else if (notification.type === 'price-drop') {
        icon = '↓';
        title = 'Fiyat Düştü';
        priceInfo = `${formatPrice(notification.oldPrice, notification.currency)} → ${formatPrice(notification.newPrice, notification.currency)} <span style="color: #10B981;">${notification.change}%</span>`;
      } else if (notification.type === 'price-increase') {
        icon = '↑';
        title = 'Fiyat Arttı';
        priceInfo = `${formatPrice(notification.oldPrice, notification.currency)} → ${formatPrice(notification.newPrice, notification.currency)} <span style="color: #EF4444;">+${notification.change}%</span>`;
      }
      
      const timeAgo = getTimeAgo(notification.timestamp);
      
      div.innerHTML = `
        <div class="notification-icon ${notification.type}">
          ${icon}
        </div>
        <div class="notification-content">
          <div class="notification-title">
            ${title}
            ${!notification.read ? '<div class="notification-unread-badge"></div>' : ''}
          </div>
          <div class="notification-product">${notification.productName}</div>
          <div class="notification-price">${priceInfo}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
      `;
      
      notificationsList.appendChild(div);
    });
  });
}

function openNotification(notification) {
  // Okundu işaretle
  chrome.storage.local.get(['notificationHistory'], (result) => {
    const history = result.notificationHistory || [];
    const index = history.findIndex(n => n.id === notification.id);
    if (index >= 0) {
      history[index].read = true;
      chrome.storage.local.set({ notificationHistory: history }, () => {
        loadNotifications();
      });
    }
  });
  
  // Ürün sayfasını aç
  chrome.tabs.create({ url: notification.url });
}

function markAllNotificationsAsRead() {
  chrome.storage.local.get(['notificationHistory'], (result) => {
    const history = result.notificationHistory || [];
    history.forEach(n => n.read = true);
    chrome.storage.local.set({ notificationHistory: history }, () => {
      loadNotifications();
    });
  });
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Az önce';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

function loadTrackedItems() {
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    const itemsList = document.getElementById('items-list');
    const productsCount = document.getElementById('products-count');
    
    productsCount.textContent = trackers.length;
    
    if (trackers.length === 0) {
      itemsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <div class="empty-text">
            Henüz takip edilen ürün yok.<br>
            Yukarıdaki butona basarak başlayın!
          </div>
        </div>
      `;
      return;
    }

    itemsList.innerHTML = '';
    
    // Sadece ilk 5 ürünü göster (popup için)
    const displayTrackers = trackers.slice(0, 5);
    
    displayTrackers.forEach((tracker) => {
      const div = document.createElement('div');
      div.className = 'item-card';
      div.style.cursor = 'pointer';
      div.onclick = () => {
        chrome.tabs.create({ url: 'settings.html' });
      };
      
      const latestPrice = tracker.priceHistory[tracker.priceHistory.length - 1];
      const previousPrice = tracker.priceHistory.length > 1 ? 
        tracker.priceHistory[tracker.priceHistory.length - 2] : null;
      
      let statusClass = 'same';
      let statusIcon = '━';
      let statusText = 'Değişmedi';
      
      // Tab kapalı durumu
      if (tracker.tabClosed) {
        statusClass = 'error';
        statusIcon = '⚠️';
        statusText = 'Tab Kapalı';
      } else if (previousPrice) {
        if (latestPrice.price > previousPrice.price) {
          statusClass = 'up';
          statusIcon = '↑';
          statusText = 'Arttı';
        } else if (latestPrice.price < previousPrice.price) {
          statusClass = 'down';
          statusIcon = '↓';
          statusText = 'Düştü';
        }
      }

      const imageHtml = tracker.productImage ? 
        `<img src="${tracker.productImage}" class="item-image">` : 
        `<div class="item-image" style="display: flex; align-items: center; justify-content: center; color: #9CA3AF;">
          <span class="material-icons-outlined" style="font-size: 24px;">shopping_bag</span>
        </div>`;
      
      const faviconHtml = tracker.favicon ? 
        `<img src="${tracker.favicon}" class="item-favicon">` : '';
      
      // İndirimli fiyat varsa göster (site bazlı)
      const isTrendyol = tracker.url.includes('trendyol.com');
      const isHepsiburada = tracker.url.includes('hepsiburada.com');
      const isAmazon = tracker.url.includes('amazon.com.tr');
      const discountIcon = isTrendyol ? 'local_offer' : isAmazon ? 'inventory_2' : 'shopping_cart';
      
      const basketPriceHtml = latestPrice && latestPrice.basketPrice ? `
        <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
          <span class="material-icons-outlined" style="font-size: 12px; color: #10B981;">${discountIcon}</span>
          <span style="font-size: 11px; color: #10B981; font-weight: 600;">${formatPrice(latestPrice.basketPrice, tracker.currency)}</span>
          <span style="font-size: 9px; color: #059669; background: #D1FAE5; padding: 2px 4px; border-radius: 3px;">-${((latestPrice.price - latestPrice.basketPrice) / latestPrice.price * 100).toFixed(0)}%</span>
        </div>
      ` : '';
      
      div.innerHTML = `
        ${imageHtml}
        <div class="item-content">
          <div class="item-header">
            ${faviconHtml}
            <div class="item-name">${tracker.productName}</div>
          </div>
          <div class="item-price">${latestPrice ? formatPrice(latestPrice.price, tracker.currency) : '━'}</div>
          ${basketPriceHtml}
          ${previousPrice && !latestPrice.basketPrice ? `<span class="item-status ${statusClass}">${statusIcon} ${statusText}</span>` : ''}
        </div>
      `;
      
      // Image error handling
      const img = div.querySelector('.item-image');
      if (img && img.tagName === 'IMG') {
        img.addEventListener('error', function() {
          this.style.display = 'none';
        });
      }
      
      const favicon = div.querySelector('.item-favicon');
      if (favicon) {
        favicon.addEventListener('error', function() {
          this.style.display = 'none';
        });
      }
      
      itemsList.appendChild(div);
    });
    
    // Eğer 5'ten fazla ürün varsa "Daha fazla" mesajı
    if (trackers.length > 5) {
      const moreDiv = document.createElement('div');
      moreDiv.style.cssText = 'text-align: center; padding: 12px; color: #6B7280; font-size: 11px; cursor: pointer;';
      moreDiv.innerHTML = `+${trackers.length - 5} ürün daha • Tümünü görmek için Ayarlar'a gidin`;
      moreDiv.onclick = () => {
        chrome.tabs.create({ url: 'settings.html' });
      };
      itemsList.appendChild(moreDiv);
    }
  });
}


