// Settings.js v1.1 - Updated Price Display
console.log('🎨 Settings.js v1.1 loaded - Price comparison with first price!');

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
        <div style="background: white; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 3rem; text-align: center;">
          <p style="color: #6b7280; font-size: 1.125rem; margin-bottom: 1rem;">Henüz takip edilen ürün yok</p>
          <p style="color: #6b7280; font-size: 0.875rem;">Eklenti popup'ından ürün eklemeye başlayın</p>
        </div>
      `;
      return;
    }

    productsList.innerHTML = '<div style="display: flex; flex-direction: column; gap: 1rem;"></div>';
    const container = productsList.querySelector('div');
    
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
  
  summaryStats.innerHTML = `
    <div style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1rem; text-align: center;">
      <div style="font-size: 1.875rem; font-weight: 700; color: #ff6b6b;">${totalProducts}</div>
      <div style="font-size: 0.875rem; color: #4b5563; margin-top: 0.25rem;">Takip Edilen Ürün</div>
    </div>
    <div style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1rem; text-align: center;">
      <div style="font-size: 1.875rem; font-weight: 700; color: #10b981;">${priceDrops}</div>
      <div style="font-size: 0.875rem; color: #4b5563; margin-top: 0.25rem;">Fiyat Düşüşü</div>
    </div>
  `;
}

function createProductCard(tracker) {
  const div = document.createElement('div');
  div.style.cssText = 'background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1rem; display: flex; align-items: center; gap: 1rem;';
  div.dataset.trackerId = tracker.id;
  
  const latestPrice = tracker.priceHistory[tracker.priceHistory.length - 1];
  const firstPrice = tracker.priceHistory[0]; // İlk ekleme fiyatı
  const previousPrice = tracker.priceHistory.length > 1 ? 
    tracker.priceHistory[tracker.priceHistory.length - 2] : latestPrice;
  
  // Calculate price change percentage from first price
  const priceChange = latestPrice.price - firstPrice.price;
  const priceChangePercent = firstPrice.price > 0 ? (priceChange / firstPrice.price * 100) : 0;
  
  // Progress bar: show range between first and current price
  const progressMin = Math.min(firstPrice.price, latestPrice.price);
  const progressMax = Math.max(firstPrice.price, latestPrice.price);
  const progressRange = progressMax - progressMin;
  
  // Calculate position for current price indicator
  let progressPosition = 50; // Default middle
  if (progressRange > 0) {
    progressPosition = ((latestPrice.price - progressMin) / progressRange) * 100;
  }

  const imageHtml = tracker.productImage ? 
    `<img alt="${tracker.productName}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 0.375rem;" src="${tracker.productImage}" onerror="this.outerHTML='<div style=\\'width: 64px; height: 64px; background: #e5e7eb; border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;\\'>📦</div>'">` : 
    `<div style="width: 64px; height: 64px; background: #e5e7eb; border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">📦</div>`;

  const faviconHtml = tracker.favicon ? 
    `<img alt="favicon" style="width: 20px; height: 20px; display: inline-block; margin-right: 0.25rem; vertical-align: middle;" src="${tracker.favicon}" onerror="this.style.display='none'">` : '';

  const formattedDate = new Date(latestPrice.date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ', ' + new Date(latestPrice.date).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  div.innerHTML = `
    <!-- Product Image -->
    <div style="flex-shrink: 0;">
      ${imageHtml}
    </div>
    
    <!-- Product Info -->
    <div style="flex: 1; min-width: 0;">
      <div style="display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.25rem;">
        ${faviconHtml}
        <a href="${tracker.url}" target="_blank" style="color: #1f2937; font-size: 0.875rem; font-weight: 600; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${new URL(tracker.url).hostname}</a>
      </div>
      <h3 style="color: #111827; font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tracker.productName}</h3>
      <span style="background: #86efac; color: #14532d; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; display: inline-block;">${formattedDate}</span>
    </div>
    
    <!-- Price -->
    <div style="text-align: center; min-width: 120px; flex-shrink: 0;">
      ${latestPrice.price < firstPrice.price ? 
        `<div style="font-size: 1.5rem; font-weight: 700; color: #10b981; line-height: 1.2;">${formatPrice(latestPrice.price, tracker.currency)} ↓</div>` :
        latestPrice.price > firstPrice.price ?
        `<div style="font-size: 1.5rem; font-weight: 700; color: #dc2626; line-height: 1.2;">${formatPrice(latestPrice.price, tracker.currency)} ↑</div>` :
        `<div style="font-size: 1.5rem; font-weight: 700; color: #6b7280; line-height: 1.2;">${formatPrice(latestPrice.price, tracker.currency)}</div>`
      }
      <div style="font-size: 0.875rem; color: #6b7280;">İlk: ${formatPrice(firstPrice.price, tracker.currency)}</div>
    </div>
    
    <!-- Price Progress Bar -->
    <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 250px; flex-shrink: 0;">
      ${latestPrice.price < firstPrice.price ? 
        `<span style="font-size: 0.75rem; font-weight: 600; color: #10b981;">↓ ${Math.abs(priceChangePercent).toFixed(1)}%</span>` :
        latestPrice.price > firstPrice.price ?
        `<span style="font-size: 0.75rem; font-weight: 600; color: #dc2626;">↑ ${Math.abs(priceChangePercent).toFixed(1)}%</span>` :
        `<span style="font-size: 0.75rem; font-weight: 600; color: #6b7280;">0%</span>`
      }
      <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 9999px; overflow: hidden; position: relative;">
        ${latestPrice.price < firstPrice.price ? 
          `<div style="height: 100%; background: #10b981; width: ${100 - progressPosition}%; margin-left: ${progressPosition}%;"></div>` :
          latestPrice.price > firstPrice.price ?
          `<div style="height: 100%; background: #dc2626; width: ${progressPosition}%;"></div>` :
          `<div style="height: 100%; background: #6b7280; width: 0%;"></div>`
        }
        <div style="position: absolute; top: -2px; left: ${progressPosition}%; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 8px solid #1f2937; transform: translateX(-50%);"></div>
      </div>
      ${latestPrice.price < firstPrice.price ? 
        `<span style="font-size: 0.75rem; font-weight: 600; color: #10b981;">↓ ${Math.abs(priceChangePercent).toFixed(1)}%</span>` :
        latestPrice.price > firstPrice.price ?
        `<span style="font-size: 0.75rem; font-weight: 600; color: #dc2626;">↑ ${Math.abs(priceChangePercent).toFixed(1)}%</span>` :
        `<span style="font-size: 0.75rem; font-weight: 600; color: #6b7280;">0%</span>`
      }
    </div>
    
    <!-- Actions -->
    <div style="display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0;">
      <button class="btn-toggle hover-gray-btn-light" data-id="${tracker.id}" style="padding: 0.5rem; border: none; background: transparent; cursor: pointer; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center;" title="Takip Aç/Kapat">
        <span class="material-icons-outlined" style="font-size: 20px; color: #6b7280;">${tracker.enabled === false ? 'check_box_outline_blank' : 'check_box'}</span>
      </button>
      <button class="btn-settings hover-gray-btn-light" data-id="${tracker.id}" style="padding: 0.5rem; border: none; background: transparent; cursor: pointer; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center;" title="Ayarlar">
        <span class="material-icons-outlined" style="font-size: 20px; color: #6b7280;">settings</span>
      </button>
      <button class="btn-delete hover-gray-btn-light" data-id="${tracker.id}" style="padding: 0.5rem; border: none; background: transparent; cursor: pointer; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center;" title="Sil">
        <span class="material-icons-outlined" style="font-size: 20px; color: #6b7280;">delete</span>
      </button>
    </div>
  `;
  
  // Event listeners ekle
  setTimeout(() => {
    const toggleBtn = div.querySelector('.btn-toggle');
    const settingsBtn = div.querySelector('.btn-settings');
    const deleteBtn = div.querySelector('.btn-delete');
    
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


