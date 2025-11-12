// Custom Alert & Confirm
function showAlert(message, title = 'Bildirim', icon = 'info') {
  return new Promise((resolve) => {
    const modal = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-title');
    const messageEl = document.getElementById('alert-message');
    const iconEl = document.getElementById('alert-icon');
    const okBtn = document.getElementById('alert-ok-btn');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Icon types
    const icons = {
      info: { icon: 'info', color: '#2563eb' },
      success: { icon: 'check_circle', color: '#10b981' },
      warning: { icon: 'warning', color: '#f59e0b' },
      error: { icon: 'error', color: '#ef4444' }
    };
    
    const iconData = icons[icon] || icons.info;
    iconEl.textContent = iconData.icon;
    iconEl.style.color = iconData.color;
    
    modal.style.display = 'flex';
    
    const handleOk = () => {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', handleOk);
      resolve(true);
    };
    
    okBtn.addEventListener('click', handleOk);
  });
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    
    messageEl.textContent = message;
    modal.style.display = 'flex';
    
    const handleOk = () => {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      resolve(true);
    };
    
    const handleCancel = () => {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      resolve(false);
    };
    
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Badge'i temizle (settings açıldı) ve sayacı sıfırla
  chrome.action.setBadgeText({ text: '' });
  chrome.storage.local.set({ priceChangedCount: 0 });
  
  loadTrackedProducts();
  
  // Modal buton event listeners
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeSettingsModal);
  }
  
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', closeSettingsModal);
  }
  
  if (modalSaveBtn) {
    modalSaveBtn.addEventListener('click', saveTrackerSettings);
  }
  
  // Modal dışına tıklayınca kapat
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSettingsModal();
      }
    });
  }
  
  // Tab sistemini başlat
  initTabSystem();
  
  // Tracking mode sistemini başlat
  initTrackingMode();
});

function loadTrackedProducts() {
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    
    // Load summary stats
    loadSummaryStats(trackers);
    
    // Load products list
    const productsList = document.getElementById('products-list');
    
    if (trackers.length === 0) {
      productsList.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-12 text-center">
          <p class="text-gray-500 text-lg mb-4">Henüz takip edilen ürün yok</p>
          <p class="text-gray-500 text-sm">Eklenti popup'ından ürün eklemeye başlayın</p>
        </div>
      `;
      return;
    }

    productsList.innerHTML = '<div class="space-y-4"></div>';
    const container = productsList.querySelector('.space-y-4');
    
    trackers.forEach((tracker, index) => {
      const card = createProductCard(tracker);
      container.appendChild(card);
    });
  });
}

function loadSummaryStats(trackers) {
  const summaryStats = document.getElementById('summary-stats');
  
  const totalProducts = trackers.length;
  const priceDrops = trackers.filter(t => {
    const latest = t.priceHistory[t.priceHistory.length - 1];
    const previous = t.priceHistory.length > 1 ? t.priceHistory[t.priceHistory.length - 2] : latest;
    return latest.price < previous.price;
  }).length;
  
  const avgPrices = trackers.map(t => t.priceHistory[t.priceHistory.length - 1].price);
  const avgPrice = avgPrices.length > 0 ? (avgPrices.reduce((a, b) => a + b, 0) / avgPrices.length) : 0;
  
  const activeTrackers = trackers.filter(t => {
    const lastCheck = new Date(t.lastChecked || t.priceHistory[t.priceHistory.length - 1].date);
    const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
    return hoursSinceCheck < 24;
  }).length;
  
  summaryStats.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm p-4 text-center">
      <div class="text-3xl font-bold coral-accent">${totalProducts}</div>
      <div class="text-sm text-gray-600 mt-1">Takip Edilen Ürün</div>
    </div>
    <div class="bg-white rounded-lg shadow-sm p-4 text-center">
      <div class="text-3xl font-bold text-green-600">${priceDrops}</div>
      <div class="text-sm text-gray-600 mt-1">Fiyat Düşüşü</div>
    </div>
    <div class="bg-white rounded-lg shadow-sm p-4 text-center">
      <div class="text-3xl font-bold text-blue-600">${formatPrice(avgPrice, trackers[0]?.currency || 'TRY')}</div>
      <div class="text-sm text-gray-600 mt-1">Ort. Fiyat</div>
    </div>
    <div class="bg-white rounded-lg shadow-sm p-4 text-center">
      <div class="text-3xl font-bold text-yellow-600">${activeTrackers}</div>
      <div class="text-sm text-gray-600 mt-1">Aktif Takip</div>
    </div>
  `;
}

function createProductCard(tracker) {
  const div = document.createElement('div');
  div.className = 'bg-white rounded-lg shadow-lg p-4';
  div.dataset.trackerId = tracker.id;
  
  const latestPrice = tracker.priceHistory[tracker.priceHistory.length - 1];
  const previousPrice = tracker.priceHistory.length > 1 ? 
    tracker.priceHistory[tracker.priceHistory.length - 2] : latestPrice;
  
  // Tab kapalı uyarısı
  const tabClosedWarning = tracker.tabClosed ? `
    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 0.75rem; margin-bottom: 1rem; border-radius: 0.25rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="material-icons-outlined" style="color: #F59E0B; font-size: 20px;">warning</span>
        <div>
          <div style="font-weight: 600; color: #92400E; font-size: 0.875rem;">Tab Kapalı</div>
          <div style="color: #78350F; font-size: 0.75rem;">Fiyat güncellenemedi. Ürün sayfasını açın.</div>
        </div>
      </div>
    </div>
  ` : '';
  
  // Calculate price range and position
  const minPrice = Math.min(...tracker.priceHistory.map(p => p.price));
  const maxPrice = Math.max(...tracker.priceHistory.map(p => p.price));
  const priceRange = maxPrice - minPrice;
  const currentPosition = priceRange > 0 ? ((latestPrice.price - minPrice) / priceRange) * 100 : 50;

  const imageHtml = tracker.productImage ? 
    `<img alt="${tracker.productName}" class="w-20 h-20 object-cover rounded-md" src="${tracker.productImage}" onerror="this.outerHTML='<div class=\\'w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center text-2xl\\'>📦</div>'">` : 
    `<div class="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center text-2xl">📦</div>`;

  const faviconHtml = tracker.favicon ? 
    `<img alt="favicon" class="w-4 h-4 inline-block mr-1" src="${tracker.favicon}" onerror="this.style.display='none'">` : '';

  const formattedDate = new Date(latestPrice.date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ', ' + new Date(latestPrice.date).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  div.innerHTML = `
    <div>
      ${tabClosedWarning}
      <div class="flex items-center" style="gap: 1rem;">
        <!-- Product Image -->
        <div style="flex-shrink: 0;">
          ${imageHtml}
        </div>
      
      <!-- Product Info -->
      <div style="flex: 1; min-width: 200px; max-width: 300px;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
          ${faviconHtml}
          <a class="text-sm font-semibold hover:underline" href="${tracker.url}" target="_blank" style="color: #4b5563;">${new URL(tracker.url).hostname}</a>
        </div>
        <h3 class="text-base font-bold truncate" style="color: #111827; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tracker.productName}</h3>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">${formattedDate}</span>
        </div>
      </div>
      
      <!-- Price Info -->
      <div style="display: flex; align-items: center; gap: 2rem; flex-shrink: 0;">
        <div style="text-align: right; min-width: 100px;">
          <div class="coral-accent" style="font-size: 1.5rem; font-weight: 700; line-height: 1.2;">${formatPrice(latestPrice.price, tracker.currency)}</div>
          ${latestPrice.basketPrice ? `<div style="font-size: 0.875rem; color: #10b981; font-weight: 600; display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem;">
            <span class="material-icons-outlined" style="font-size: 14px;">${tracker.url.includes('trendyol.com') ? 'local_offer' : tracker.url.includes('amazon.com.tr') ? 'inventory_2' : 'shopping_cart'}</span>
            ${formatPrice(latestPrice.basketPrice, tracker.currency)}
            <span style="color: #059669; font-size: 0.75rem;">-${((latestPrice.price - latestPrice.basketPrice) / latestPrice.price * 100).toFixed(0)}%</span>
          </div>` : `<div class="line-through" style="font-size: 0.875rem; color: #6b7280;">${formatPrice(previousPrice.price, tracker.currency)}</div>`}
        </div>
        
        <!-- Price Progress -->
        <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 300px;">
          <span style="font-size: 0.875rem; font-weight: 600; color: #374151;">${formatPrice(minPrice, tracker.currency)}</span>
          <div style="flex: 1; height: 12px; background: #e5e7eb; border-radius: 9999px; overflow: hidden; position: relative;">
            <div style="height: 100%; background: linear-gradient(to right, #ef4444, #10b981);"></div>
            <div style="position: absolute; top: 0; left: ${currentPosition}%; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 8px solid #1f2937; transform: translateX(-50%);"></div>
          </div>
          <span style="font-size: 0.875rem; font-weight: 600; color: #374151;">${formatPrice(maxPrice, tracker.currency)}</span>
        </div>
      </div>
      
      <!-- Actions -->
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
        <button class="btn-history hover-gray-btn-light" data-id="${tracker.id}" style="padding: 0.5rem; border: none; background: transparent; cursor: pointer; border-radius: 0.25rem;" title="Fiyat Geçmişi">
          <span class="material-icons-outlined history-icon" style="font-size: 20px; color: #4b5563; transition: transform 0.3s;">expand_more</span>
        </button>
        <button class="btn-toggle hover-gray-btn-light" data-id="${tracker.id}" style="padding: 0.5rem; border: none; background: transparent; cursor: pointer; border-radius: 0.25rem;" title="Takip Aç/Kapat">
          <span class="material-icons-outlined" style="font-size: 20px; color: #4b5563;">${tracker.enabled === false ? 'check_box_outline_blank' : 'check_box'}</span>
        </button>
        <button class="btn-settings hover-gray-btn-light" data-id="${tracker.id}" style="padding: 0.5rem; border: none; background: transparent; cursor: pointer; border-radius: 0.25rem;" title="Ayarlar">
          <span class="material-icons-outlined" style="font-size: 20px; color: #4b5563;">settings</span>
        </button>
        <button class="btn-delete hover-gray-btn-light" data-id="${tracker.id}" style="padding: 0.5rem; border: none; background: transparent; cursor: pointer; border-radius: 0.25rem;" title="Sil">
          <span class="material-icons-outlined" style="font-size: 20px; color: #4b5563;">delete</span>
        </button>
      </div>
      </div>
      
      <!-- Price History Dropdown (Kartın altında, full width) -->
      <div class="price-history-container" id="history-${tracker.id}">
        <div class="price-history-list">
          ${generatePriceHistoryHTML(tracker)}
        </div>
      </div>
    </div>
  `;
  
  // Event listeners ekle
  setTimeout(() => {
    const historyBtn = div.querySelector('.btn-history');
    const toggleBtn = div.querySelector('.btn-toggle');
    const settingsBtn = div.querySelector('.btn-settings');
    const deleteBtn = div.querySelector('.btn-delete');
    
    if (historyBtn) {
      historyBtn.addEventListener('click', () => togglePriceHistory(tracker.id));
    }
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => toggleTracker(tracker.id));
    }
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => openSettingsModal(tracker.id));
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => removeTracker(tracker.id));
    }
  }, 0);
  
  return div;
}

function formatPrice(price, currency = 'TRY') {
  if (!price) return 'N/A';
  
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
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
  
  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
    return `${symbol}${formatted}`;
  } else {
    return `${formatted} ${symbol}`;
  }
}

let currentTrackerId = null;

function openSettingsModal(id) {
  currentTrackerId = id;
  
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    const tracker = trackers.find(t => t.id === id);
    
    if (!tracker) return;
    
    // Set product name
    document.getElementById('modal-product-name').textContent = tracker.productName;
    
    // Set current interval (default 60 minutes)
    const interval = tracker.checkInterval || 60;
    document.getElementById('check-interval').value = interval;
    
    // Set notification setting
    document.getElementById('enable-notifications').checked = tracker.notificationsEnabled !== false;
    
    // Show modal
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';
  });
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  modal.style.display = 'none';
  currentTrackerId = null;
}

function saveTrackerSettings() {
  if (!currentTrackerId) return;
  
  const interval = parseInt(document.getElementById('check-interval').value);
  const notificationsEnabled = document.getElementById('enable-notifications').checked;
  
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    const tracker = trackers.find(t => t.id === currentTrackerId);
    
    if (!tracker) return;
    
    // Update settings
    tracker.checkInterval = interval;
    tracker.notificationsEnabled = notificationsEnabled;
    
    // Save to storage
    chrome.storage.local.set({ trackers: trackers }, () => {
      // Setup alarm for this tracker
      setupTrackerAlarm(tracker);
      
      closeSettingsModal();
      showAlert(`Fiyat kontrolü ${interval} dakikada bir yapılacak.`, 'Ayarlar Kaydedildi', 'success');
    });
  });
}

function setupTrackerAlarm(tracker) {
  const alarmName = `tracker_${tracker.id}`;
  
  // Clear existing alarm
  chrome.alarms.clear(alarmName);
  
  // Create new alarm
  chrome.alarms.create(alarmName, {
    delayInMinutes: tracker.checkInterval || 60,
    periodInMinutes: tracker.checkInterval || 60
  });
}

function toggleTracker(id) {
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    const tracker = trackers.find(t => t.id === id);
    
    if (!tracker) return;
    
    tracker.enabled = !tracker.enabled;
    
    chrome.storage.local.set({ trackers: trackers }, () => {
      if (tracker.enabled) {
        setupTrackerAlarm(tracker);
        showAlert('Ürün fiyatı otomatik kontrol edilecek.', 'Takip Aktif Edildi', 'success');
      } else {
        chrome.alarms.clear(`tracker_${tracker.id}`);
        showAlert('Ürün fiyatı artık kontrol edilmeyecek.', 'Takip Durduruldu', 'warning');
      }
      loadTrackedProducts();
    });
  });
}

async function removeTracker(id) {
  const confirmed = await showConfirm('Bu ürünü takipten çıkarmak istediğinize emin misiniz?\n\nTüm fiyat geçmişi silinecek.');
  if (!confirmed) return;
  
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    const tracker = trackers.find(t => t.id === id);
    
    if (tracker) {
      // Alarm'ı durdur
      chrome.alarms.clear(`tracker_${id}`, (wasCleared) => {
        console.log(`⏰ Alarm silindi: tracker_${id}`, wasCleared);
      });
    }
    
    // Tracker'ı listeden çıkar
    const filtered = trackers.filter(t => t.id !== id);
    chrome.storage.local.set({ trackers: filtered }, () => {
      console.log('✅ Tracker silindi:', tracker?.productName);
      
      // Backend'den sil
      chrome.runtime.sendMessage({
        action: 'removeTrackerFromBackend',
        trackerId: id
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Backend remove mesajı gönderilemedi:', chrome.runtime.lastError.message);
        }
      });
      
      showAlert('Ürün başarıyla takipten çıkarıldı.', 'Ürün Silindi', 'success');
      loadTrackedProducts();
    });
  });
}

async function checkPrice(id, event) {
  const button = event?.target?.closest('button') || document.querySelector(`[data-id="${id}"]`);
  if (!button) return;
  
  const originalIcon = button.innerHTML;
  button.innerHTML = '<span class="material-icons-outlined" style="animation: spin 1s linear infinite; font-size: 20px;">sync</span>';
  button.disabled = true;
  
  chrome.storage.local.get(['trackers'], async (result) => {
    const trackers = result.trackers || [];
    const tracker = trackers.find(t => t.id === id);
    
    if (!tracker) {
      button.innerHTML = originalIcon;
      button.disabled = false;
      return;
    }

    try {
      const response = await fetch(tracker.url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const elements = doc.querySelectorAll(tracker.selector);
      
      if (elements.length === 0) {
        showAlert('Element bulunamadı!\n\nSeçici: ' + tracker.selector, 'Element Bulunamadı', 'error');
        button.innerHTML = originalIcon;
        button.disabled = false;
        return;
      }
      
      let targetElement = elements[0];
      
      // Birden fazla element varsa ve exactPriceValue belirtilmişse (ve 0'dan büyükse)
      if (elements.length > 1 && tracker.exactPriceValue && tracker.exactPriceValue > 0) {
        console.log(`⚠️ ${elements.length} adet element bulundu! exactPriceValue ile filtreleniyor:`, tracker.exactPriceValue);
        
        for (const el of elements) {
          const text = el.textContent.trim();
          const priceMatch = text.match(/[\d.,]+/);
          if (priceMatch) {
            const priceNum = parsePrice(priceMatch[0]);
            console.log('  🔎 Element kontrol:', priceMatch[0], '→', priceNum, 'vs', tracker.exactPriceValue);
            if (Math.abs(priceNum - tracker.exactPriceValue) < 0.01) {
              console.log('  ✅ Eşleşme bulundu!');
              targetElement = el;
              break;
            }
          }
        }
      }
      
      const priceText = targetElement.textContent.trim();
      const price = parsePrice(priceText);
        
        if (price) {
          const lastPrice = tracker.priceHistory[tracker.priceHistory.length - 1];
          const priceChanged = lastPrice && price !== lastPrice.price;
          
          // HER ZAMAN yeni kayıt ekle
          tracker.priceHistory.push({
            price: price,
            date: new Date().toISOString(),
            changed: priceChanged
          });
          tracker.lastChecked = new Date().toISOString();
          
          chrome.storage.local.set({ trackers: trackers }, async () => {
            if (priceChanged) {
              const change = price < lastPrice.price ? 'düştü ⬇️' : 'arttı ⬆️';
              const priceChangePercent = ((price - lastPrice.price) / lastPrice.price * 100).toFixed(1);
              const icon = price < lastPrice.price ? 'success' : 'warning';
              await showAlert(
                `${formatPrice(lastPrice.price, tracker.currency)} → ${formatPrice(price, tracker.currency)}\n(${priceChangePercent > 0 ? '+' : ''}${priceChangePercent}%)\n\nToplam kontrol: ${tracker.priceHistory.length}`,
                `Fiyat ${change}`,
                icon
              );
            } else {
              await showAlert(
                `Güncel fiyat: ${formatPrice(price, tracker.currency)}\nToplam kontrol: ${tracker.priceHistory.length}`,
                'Fiyat Değişmedi',
                'info'
              );
            }
            loadTrackedProducts();
          });
        } else {
          showAlert('Fiyat parse edilemedi!\n\nBulunan text: ' + priceText, 'Parse Hatası', 'error');
        }
    } catch (error) {
      showAlert(`Hata: ${error.message}`, 'Kontrol Başarısız', 'error');
    } finally {
      button.innerHTML = originalIcon;
      button.disabled = false;
    }
  });
}

// Price History HTML generator
function generatePriceHistoryHTML(tracker) {
  if (!tracker.priceHistory || tracker.priceHistory.length === 0) {
    return '<div style="text-align: center; color: #9CA3AF; padding: 20px;">Henüz fiyat geçmişi yok</div>';
  }
  
  // Son 20 kaydı göster (en yeni üstte)
  const history = [...tracker.priceHistory].reverse().slice(0, 20);
  
  return history.map((entry, index) => {
    const date = new Date(entry.date);
    const timeStr = date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const formattedPrice = formatPrice(entry.price, tracker.currency);
    
    // İndirimli fiyat varsa göster (site bazlı ikon)
    const discountIcon = tracker.url.includes('trendyol.com') ? 'local_offer' : tracker.url.includes('amazon.com.tr') ? 'inventory_2' : 'shopping_cart';
    const basketPriceHtml = entry.basketPrice ? `
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
        <span class="material-icons-outlined" style="font-size: 14px; color: #10b981;">${discountIcon}</span>
        <span style="font-size: 0.875rem; color: #10b981; font-weight: 600;">${formatPrice(entry.basketPrice, tracker.currency)}</span>
        <span style="font-size: 0.75rem; color: #059669;">-${((entry.price - entry.basketPrice) / entry.price * 100).toFixed(0)}%</span>
      </div>
    ` : '';
    
    // Bir önceki kayıtla karşılaştır (reversed olduğu için index+1)
    let badge = '';
    if (index < history.length - 1) {
      const prevPrice = history[index + 1].price;
      if (entry.price > prevPrice) {
        const diff = ((entry.price - prevPrice) / prevPrice * 100).toFixed(2);
        badge = `<span class="price-history-badge up">↑ +${diff}%</span>`;
      } else if (entry.price < prevPrice) {
        const diff = ((prevPrice - entry.price) / prevPrice * 100).toFixed(2);
        badge = `<span class="price-history-badge down">↓ -${diff}%</span>`;
      }
    }
    
    const changedClass = entry.changed ? 'changed' : '';
    
    return `
      <div class="price-history-item ${changedClass}">
        <div>
          <div class="price-history-price">${formattedPrice}</div>
          ${basketPriceHtml}
          <div class="price-history-date">${timeStr}</div>
        </div>
        <div>${badge}</div>
      </div>
    `;
  }).join('');
}

// Toggle price history
function togglePriceHistory(trackerId) {
  const container = document.getElementById(`history-${trackerId}`);
  const button = document.querySelector(`[data-id="${trackerId}"].btn-history`);
  const icon = button?.querySelector('.history-icon');
  
  if (container && icon) {
    container.classList.toggle('open');
    icon.classList.toggle('rotate-180');
  }
}

// Global scope'a ekle (window nesnesine)
window.showAlert = showAlert;
window.showConfirm = showConfirm;
window.checkPrice = checkPrice;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveTrackerSettings = saveTrackerSettings;
window.toggleTracker = toggleTracker;
window.removeTracker = removeTracker;
window.togglePriceHistory = togglePriceHistory;

function parsePrice(priceStr) {
  let cleaned = priceStr.replace(/[^\d.,]/g, '');
  
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  
  if (commaCount === 0 && dotCount === 0) {
    return parseFloat(cleaned);
  } else if (commaCount === 1 && dotCount === 0) {
    const parts = cleaned.split(',');
    if (parts[1].length === 2) {
      return parseFloat(cleaned.replace(',', '.'));
    } else {
      return parseFloat(cleaned.replace(',', ''));
    }
  } else if (commaCount === 0 && dotCount === 1) {
    const parts = cleaned.split('.');
    if (parts[1].length === 2) {
      return parseFloat(cleaned);
    } else {
      return parseFloat(cleaned.replace('.', ''));
    }
  } else if (commaCount > 0 && dotCount > 0) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
    return parseFloat(cleaned);
  } else {
    if (commaCount > 1) {
      cleaned = cleaned.replace(/,/g, '');
    } else if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    }
    return parseFloat(cleaned);
  }
}

// ==========================================
// TELEGRAM AYARLARI (OTOMATİK SİSTEM)
// ==========================================

const BACKEND_URL = 'https://chrome-fiyat-v1.vercel.app'; // Vercel Production URL
const BOT_TOKEN = '8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY';
const BOT_USERNAME = 'Fiyatci_bot';

let pollingInterval = null;

// Telegram durumunu yükle ve UI'ı güncelle
async function loadTelegramStatus() {
  const data = await chrome.storage.local.get(['telegramChatId']);
  
  if (data.telegramChatId) {
    // Bağlı
    const notConnected = document.getElementById('telegram-not-connected');
    const telegramDailyGrid = document.getElementById('telegram-daily-grid');
    const chatIdDisplay = document.getElementById('telegram-chat-id-display');
    const settingsCard = document.getElementById('telegram-settings-card');
    const testBtn = document.getElementById('telegram-test-connected-btn');
    
    if (notConnected) notConnected.style.display = 'none';
    if (telegramDailyGrid) telegramDailyGrid.style.display = 'grid';
    if (chatIdDisplay) chatIdDisplay.textContent = data.telegramChatId;
    if (settingsCard) settingsCard.style.display = 'block';
    if (testBtn) testBtn.style.display = 'flex';
  } else {
    // Bağlı değil
    const notConnected = document.getElementById('telegram-not-connected');
    const telegramDailyGrid = document.getElementById('telegram-daily-grid');
    const settingsCard = document.getElementById('telegram-settings-card');
    const testBtn = document.getElementById('telegram-test-connected-btn');
    
    if (notConnected) notConnected.style.display = 'block';
    if (telegramDailyGrid) telegramDailyGrid.style.display = 'none';
    if (settingsCard) settingsCard.style.display = 'none';
    if (testBtn) testBtn.style.display = 'none';
  }
}

// Telegram Bot'u aç
const telegramConnectBtn = document.getElementById('telegram-connect-btn');
if (telegramConnectBtn) {
  telegramConnectBtn.addEventListener('click', () => {
    // Telegram botunu yeni sekmede aç
    window.open('https://t.me/Fiyatci_bot', '_blank');
    
    // Talimatları göster
    const instructions = document.getElementById('telegram-instructions');
    if (instructions) {
      instructions.style.display = 'block';
    }
  });
}

// Manuel Chat ID bağlantısı
const manualConnectBtn = document.getElementById('manual-connect-btn');
if (manualConnectBtn) {
  manualConnectBtn.addEventListener('click', async () => {
    const chatIdInput = document.getElementById('chat-id-input');
    const chatId = chatIdInput.value.trim();
    
    if (!chatId) {
      await showAlert('Lütfen Chat ID\'nizi girin!', 'Uyarı', 'warning');
      return;
    }
    
    if (!/^\d+$/.test(chatId)) {
      await showAlert('Chat ID sadece sayılardan oluşmalıdır!', 'Hata', 'error');
      return;
    }
    
    // Storage'a kaydet
    await chrome.storage.local.set({
      telegramChatId: chatId,
      telegramBotToken: BOT_TOKEN
    });
    
    await showAlert('🎉 Telegram başarıyla bağlandı!\n\nBildirimler artık Telegram\'dan gelecek.', 'Başarılı', 'success');
    
    // UI'ı güncelle
    loadTelegramStatus();
  });
}

// Polling başlat
function startPolling(code) {
  let attempts = 0;
  const maxAttempts = 60; // 60 * 2 = 120 saniye (2 dakika)
  
  pollingInterval = setInterval(async () => {
    attempts++;
    
    if (attempts > maxAttempts) {
      stopPolling();
      await showAlert('Zaman aşımı! Lütfen tekrar deneyin.', 'Uyarı', 'warning');
      resetQRUI();
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/check-code?code=${code}`);
      const data = await response.json();
      
      if (data.success && data.registered && data.chatId) {
        // Başarılı!
        stopPolling();
        
        await chrome.storage.local.set({
          telegramChatId: data.chatId,
          telegramBotToken: BOT_TOKEN
        });
        
        await showAlert('🎉 Telegram bağlantısı başarılı!\n\nBildirimler artık Telegram\'dan gelecek.', 'Başarılı', 'success');
        
        resetQRUI();
        loadTelegramStatus();
      }
    } catch (error) {
      console.error('Polling hatası:', error);
    }
  }, 2000); // Her 2 saniyede kontrol et
}

// Polling durdur
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// QR UI'ı sıfırla (eski HTML için)
function resetQRUI() {
  const qrContainer = document.getElementById('qr-container');
  const qrWaiting = document.getElementById('qr-waiting');
  const qrImage = document.getElementById('qr-code-image');
  
  if (qrContainer) qrContainer.style.display = 'block';
  if (qrWaiting) qrWaiting.style.display = 'none';
  if (qrImage) qrImage.src = '';
}

// İptal butonu (eski HTML için)
const qrCancelBtn = document.getElementById('qr-cancel-btn');
if (qrCancelBtn) {
  qrCancelBtn.addEventListener('click', () => {
    stopPolling();
    resetQRUI();
  });
}

// Bağlantıyı kes
const telegramDisconnectBtn = document.getElementById('telegram-disconnect-btn');
if (telegramDisconnectBtn) {
  telegramDisconnectBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm('Telegram bağlantısını kesmek istediğinize emin misiniz?');
    
    if (confirmed) {
      await chrome.storage.local.remove(['telegramChatId', 'telegramBotToken']);
      await showAlert('Telegram bağlantısı kesildi.', 'Bilgi', 'info');
      loadTelegramStatus();
    }
  });
}

// Test bildirimi gönder
const telegramTestBtn = document.getElementById('telegram-test-connected-btn');
if (telegramTestBtn) {
  telegramTestBtn.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['telegramChatId', 'telegramBotToken']);
  
  if (!data.telegramChatId || !data.telegramBotToken) {
    await showAlert('Telegram bağlantısı bulunamadı!', 'Hata', 'error');
    return;
  }
  
  const testButton = document.getElementById('telegram-test-connected-btn');
  const originalText = testButton.textContent;
  testButton.textContent = '⏳ Gönderiliyor...';
  testButton.disabled = true;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${data.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: data.telegramChatId,
        text: '🧪 <b>Test Bildirimi</b>\n\n✅ Fiyat Takip sistemi çalışıyor!\n\nFiyat değişikliklerini buradan takip edebilirsiniz.',
        parse_mode: 'HTML'
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      await showAlert('Test bildirimi gönderildi! 🎉\nTelegram\'ınızı kontrol edin.', 'Başarılı', 'success');
    } else {
      await showAlert(`Telegram hatası: ${result.description}`, 'Hata', 'error');
    }
  } catch (error) {
    await showAlert(`Bağlantı hatası: ${error.message}`, 'Hata', 'error');
  } finally {
    testButton.textContent = originalText;
    testButton.disabled = false;
  }
  });
}

// ==========================================
// TRACKING MODE YÖNETİMİ
// ==========================================

// Tracking mode'u yükle
async function loadTrackingMode() {
  const data = await chrome.storage.local.get(['trackingMode']);
  const mode = data.trackingMode || 'hybrid'; // Varsayılan: hybrid
  
  // Eski radio button sistemi (fallback)
  const radio = document.querySelector(`input[name="trackingMode"][value="${mode}"]`);
  if (radio) {
    radio.checked = true;
  }
  
  // Yeni mode-option sistemi
  const modeOptions = document.querySelectorAll('.mode-option');
  modeOptions.forEach(option => {
    if (option.getAttribute('data-mode') === mode) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// ==========================================
// TAB SİSTEMİ
// ==========================================

function initTabSystem() {
  // Tab butonlarına click event ekle
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Tüm tab'ları ve butonları deaktif et
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Seçili tab'ı aktif et
      button.classList.add('active');
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// ==========================================
// TRACKING MODE & SETTINGS
// ==========================================

function initTrackingMode() {
  // Eski radio button sistemi
  const radios = document.querySelectorAll('input[name="trackingMode"]');
  
  radios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const mode = e.target.value;
      
      // Kaydet
      await chrome.storage.local.set({ trackingMode: mode });
      
      console.log(`✅ Tracking mode değiştirildi: ${mode}`);
      
      // Bilgilendirme
      let message = '';
      
      if (mode === 'extension-only') {
        message = 'Sadece Chrome moduna geçildi. Extension yalnızca Chrome açıkken fiyatları kontrol edecek.';
      } else if (mode === 'hybrid') {
        message = 'Hybrid moda geçildi. Chrome açıkken 1 dakikada bir, kapalıyken günde 1 kere kontrol edilecek.';
      } else if (mode === 'backend-only') {
        message = 'Backend moduna geçildi. Günde 1 kere otomatik kontrol yapılacak.';
      }
      
      await showAlert(message, 'Mod Değiştirildi', 'success');
    });
  });
  
  // Yeni mode-option sistemi
  const modeOptions = document.querySelectorAll('.mode-option');
  
  modeOptions.forEach(option => {
    option.addEventListener('click', async () => {
      const mode = option.getAttribute('data-mode');
      
      // Tüm seçimleri kaldır
      modeOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Bu seçimi işaretle
      option.classList.add('selected');
      
      // Kaydet
      await chrome.storage.local.set({ trackingMode: mode });
      
      console.log(`✅ Tracking mode değiştirildi: ${mode}`);
      
      // Bilgilendirme
      let message = '';
      if (mode === 'extension-only') {
        message = 'Sadece Chrome moduna geçildi. Extension yalnızca Chrome açıkken fiyatları kontrol edecek.';
      } else if (mode === 'hybrid') {
        message = 'Hybrid moda geçildi. Chrome açıkken 1 dakikada bir, kapalıyken günde 1 kere kontrol edilecek.';
      } else if (mode === 'backend-only') {
        message = 'Backend moduna geçildi. Günde 1 kere otomatik kontrol yapılacak.';
      }
      
      await showAlert(message, 'Mod Değiştirildi', 'success');
    });
  });
  
  // Günlük kontrol saati değişikliğini dinle
  const hourSelect = document.getElementById('daily-check-hour');
  if (hourSelect) {
    // Kaydedilmiş saati yükle
    chrome.storage.local.get(['dailyCheckHour'], (data) => {
      const savedHour = data.dailyCheckHour || 12; // Varsayılan: 12:00
      hourSelect.value = savedHour;
    });
    
    // Değişikliği dinle
    hourSelect.addEventListener('change', async (e) => {
      const hour = parseInt(e.target.value);
      
      // Kaydet
      await chrome.storage.local.set({ dailyCheckHour: hour });
      
      console.log(`⏰ Günlük kontrol saati değiştirildi: ${hour}:00`);
      
      // Saat formatla
      const hourText = hour.toString().padStart(2, '0') + ':00';
      
      await showAlert(
        `⏰ Tercih edilen saat: ${hourText}\n\n💡 Not: Şu anda backend sabit saatte (12:00) çalışıyor. Seçiminiz Pro plana geçildiğinde aktif olacak.`,
        'Saat Tercihi Kaydedildi',
        'success'
      );
    });
  }
  
  // Tracking mode'u yükle
  loadTrackingMode();
  
  // Telegram durumunu yükle
  loadTelegramStatus();
}


