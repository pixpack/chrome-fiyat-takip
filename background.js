console.log('🚀 Background script başlatıldı!');

// Offscreen Document helper fonksiyonları
async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length > 0) {
    console.log('📄 Offscreen document zaten mevcut');
    return;
  }
  
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'Fiyat bilgilerini çekmek için DOM parsing'
  });
  
  console.log('✅ Offscreen document oluşturuldu');
}

async function fetchPriceViaOffscreen(url, selector, exactValue, basketSelector) {
  // Offscreen document'ın hazır olduğundan emin ol
  await setupOffscreenDocument();
  
  // Offscreen document'a mesaj gönder
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'fetchPrice',
      url: url,
      selector: selector,
      exactValue: exactValue,
      basketSelector: basketSelector
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

// Badge güncelleme fonksiyonu
function updateBadge() {
  chrome.storage.local.get(['priceChangedCount'], (result) => {
    const count = (result.priceChangedCount || 0) + 1;
    chrome.storage.local.set({ priceChangedCount: count });
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#E85D4A' });
    console.log('📊 Badge güncellendi:', count, 'ürün değişti');
  });
}

// Bildirim geçmişine ekle
function addNotificationToHistory(notification) {
  chrome.storage.local.get(['notificationHistory'], (result) => {
    const history = result.notificationHistory || [];
    
    // Yeni bildirimi başa ekle
    history.unshift({
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    });
    
    // Son 50 bildirimi sakla
    const trimmedHistory = history.slice(0, 50);
    
    chrome.storage.local.set({ notificationHistory: trimmedHistory }, () => {
      console.log('📜 Bildirim geçmişine eklendi, toplam:', trimmedHistory.length);
    });
  });
}

// Badge sayacını başlat
chrome.storage.local.get(['priceChangedCount'], (result) => {
  const count = result.priceChangedCount || 0;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#E85D4A' });
    console.log('📊 Mevcut badge sayısı:', count);
  }
});

chrome.alarms.create('checkPrices', { periodInMinutes: 60 });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background message alındı:', request.action, request);
  
  if (request.action === 'ping') {
    console.log('🏓 Ping alındı');
    sendResponse({ status: 'alive', timestamp: new Date().toISOString() });
    return true;
  }
  
  if (request.action === 'elementSelected') {
    console.log('✅ elementSelected action tespit edildi');
    handleElementSelected(request.data);
    sendResponse({ success: true, message: 'Ürün eklendi!' });
    return true;
  }
  
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('⏰ Alarm tetiklendi:', alarm.name);
  
  if (alarm.name === 'checkPrices') {
    checkAllPrices();
  } else if (alarm.name.startsWith('tracker_')) {
    // Individual tracker alarm
    const trackerId = alarm.name.replace('tracker_', '');
    checkSingleTracker(trackerId);
  }
});

async function checkSingleTracker(trackerId) {
  console.log('🔍 Tek tracker kontrol ediliyor:', trackerId);
  
  chrome.storage.local.get(['trackers'], async (result) => {
    const trackers = result.trackers || [];
    const tracker = trackers.find(t => t.id === trackerId);
    
    if (!tracker || tracker.enabled === false) {
      console.log('❌ Tracker bulunamadı veya pasif:', trackerId);
      return;
    }
    
    console.log('✅ Tracker bulundu:', tracker.productName);
    
    try {
      // Service worker'da DOMParser yok - content script veya fetch kullan
      // URL pattern oluştur (query string'siz)
      const urlObj = new URL(tracker.url);
      const urlPattern = `${urlObj.origin}${urlObj.pathname}*`;
      
      const tabs = await chrome.tabs.query({ url: urlPattern });
      let price = null;
      let basketPriceFromBackground = null;
      
      if (tabs && tabs.length > 0) {
        // Tab açık - content script ile fiyat çek
        const tab = tabs[0];
        console.log('✅ Tab bulundu, content script ile fiyat çekiliyor...');
        
        try {
          // exactPriceValue null veya undefined olabilir - serialize edilebilir hale getir
          const exactPriceValue = tracker.exactPriceValue ?? 0;
          
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (selector, exactPriceValue) => {
              const elements = document.querySelectorAll(selector);
              
              if (elements.length === 0) {
                return null;
              }
              
              let targetElement = elements[0];
              
              // Birden fazla element varsa ve exactPriceValue belirtilmişse (0 değilse)
              if (elements.length > 1 && exactPriceValue > 0) {
                console.log('🔍 Multi-price filter aktif! exactPriceValue:', exactPriceValue);
                
                // parsePrice fonksiyonunu inline tanımla (hem ABD hem TR formatı)
                const parsePrice = (str) => {
                  if (!str) return null;
                  str = str.toString().replace(/[^\d.,]/g, '');
                  
                  // Virgül ve nokta pozisyonunu kontrol et
                  const lastComma = str.lastIndexOf(',');
                  const lastDot = str.lastIndexOf('.');
                  
                  if (lastComma > lastDot && lastDot === -1) {
                    // Sadece virgül var: "1,599" veya "1.999,99"
                    const parts = str.split(',');
                    if (parts[1] && parts[1].length === 2) {
                      // Son kısım 2 basamak → Ondalık ayırıcı: "19,99"
                      str = str.replace(',', '.');
                    } else {
                      // Son kısım 3 basamak → Binlik ayırıcı: "1,599"
                      str = str.replace(/,/g, '');
                    }
                  } else if (lastDot > lastComma && lastComma === -1) {
                    // Sadece nokta var: "1.599" veya "1,999.99"
                    const parts = str.split('.');
                    if (parts[1] && parts[1].length === 2) {
                      // Son kısım 2 basamak → Ondalık ayırıcı: "19.99"
                      // Zaten doğru format
                    } else {
                      // Son kısım 3 basamak → Binlik ayırıcı: "1.599"
                      str = str.replace(/\./g, '');
                    }
                  } else if (lastComma > lastDot && lastDot >= 0) {
                    // Her ikisi de var, virgül son → Türk formatı: "1.999,99"
                    str = str.replace(/\./g, '').replace(',', '.');
                  } else if (lastDot > lastComma && lastComma >= 0) {
                    // Her ikisi de var, nokta son → ABD formatı: "1,999.99"
                    str = str.replace(/,/g, '');
                  }
                  
                  return parseFloat(str);
                };
                
                for (const el of elements) {
                  const text = el.textContent.trim();
                  const priceMatch = text.match(/[\d.,]+/);
                  if (priceMatch) {
                    const priceNum = parsePrice(priceMatch[0]);
                    console.log('  🔎 Element kontrol:', priceMatch[0], '→', priceNum, 'vs', exactPriceValue);
                    if (Math.abs(priceNum - exactPriceValue) < 0.01) {
                      console.log('  ✅ Eşleşme bulundu!');
                      targetElement = el;
                      break;
                    }
                  }
                }
              }
              
              return targetElement ? targetElement.textContent.trim() : null;
            },
            args: [tracker.selector, exactPriceValue]
          });
          
          if (results && results[0] && results[0].result) {
            const priceText = results[0].result;
            price = parsePrice(priceText);
            console.log('💰 Content script ile bulunan fiyat:', price, 'Text:', priceText);
          } else {
            console.log('❌ Element bulunamadı (content script)');
          }
        } catch (scriptError) {
          console.error('❌ Content script hatası:', scriptError);
        }
      }
      
      if (!price) {
        // Tab yok - offscreen document ile fiyat çek
        console.log('🔄 Tab yok, offscreen document ile çekiliyor...');
        try {
          const result = await fetchPriceViaOffscreen(
            tracker.url,
            tracker.selector,
            tracker.exactPriceValue,
            tracker.basketPriceSelector
          );
          
          console.log('✅ Offscreen document sonucu:', result);
          
          // Fiyat parse et
          if (result.priceText) {
            const match = result.priceText.match(/[\d.,]+/);
            if (match) {
              price = parsePrice(match[0]);
              console.log('💰 Offscreen document\'tan fiyat alındı:', price, 'Text:', result.priceText);
            }
          }
          
          // Sepet fiyatını parse et
          if (result.basketPriceText) {
            const basketMatch = result.basketPriceText.match(/[\d.,]+/);
            if (basketMatch) {
              basketPriceFromBackground = parsePrice(basketMatch[0]);
              console.log('🛒 Offscreen document\'tan sepet fiyatı alındı:', basketPriceFromBackground);
            }
          }
          
          if (!price) {
            console.log('❌ Fiyat çekilemedi');
            tracker.tabClosed = true;
            tracker.lastError = 'Fiyat çekilemedi';
            chrome.storage.local.set({ trackers: trackers });
            return;
          }
          
        } catch (error) {
          console.log('❌ Offscreen document hatası:', error.message);
          tracker.tabClosed = true;
          tracker.lastError = 'Offscreen document hatası';
          chrome.storage.local.set({ trackers: trackers });
          return;
        }
      }
      
      // Tab açık veya offscreen başarılı - tabClosed flag'ini temizle
      if (tracker.tabClosed) {
        tracker.tabClosed = false;
        tracker.lastError = null;
        chrome.storage.local.set({ trackers: trackers });
      }
      
      // parsePrice fonksiyonu
      function parsePrice(priceStr) {
        let cleaned = priceStr.replace(/[^\d.,]/g, '');
        const commaCount = (cleaned.match(/,/g) || []).length;
        const dotCount = (cleaned.match(/\./g) || []).length;
        
        if (commaCount === 0 && dotCount === 0) {
          return parseFloat(cleaned);
        }
        
        if (commaCount === 1 && dotCount === 0) {
          const afterComma = cleaned.split(',')[1];
          if (afterComma && afterComma.length === 2) {
            return parseFloat(cleaned.replace(',', '.'));
          } else {
            return parseFloat(cleaned.replace(',', ''));
          }
        }
        
        if (dotCount === 1 && commaCount === 0) {
          const afterDot = cleaned.split('.')[1];
          if (afterDot && afterDot.length === 2) {
            return parseFloat(cleaned);
          } else {
            return parseFloat(cleaned.replace('.', ''));
          }
        }
        
        if (dotCount > 0 && commaCount > 0) {
          const lastCommaPos = cleaned.lastIndexOf(',');
          const lastDotPos = cleaned.lastIndexOf('.');
          if (lastCommaPos > lastDotPos) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
            cleaned = cleaned.replace(/,/g, '');
          }
        }
        
        return parseFloat(cleaned);
      }
      
      // Sepet fiyatını da kontrol et (Hepsiburada vb.)
      let basketPrice = basketPriceFromBackground || null;
      
      // Eğer tab açıksa ve henüz sepet fiyatı çekilmediyse
      if (!basketPrice && tracker.basketPriceSelector && tabs && tabs.length > 0) {
        try {
          console.log('🛒 Sepet fiyatı kontrol ediliyor...');
          const basketResults = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (selector) => {
              const el = document.querySelector(selector);
              return el ? el.textContent.trim() : null;
            },
            args: [tracker.basketPriceSelector]
          });
          
          if (basketResults && basketResults[0] && basketResults[0].result) {
            const basketPriceText = basketResults[0].result;
            const basketPriceMatch = basketPriceText.match(/[\d.,]+/);
            if (basketPriceMatch) {
              basketPrice = parsePrice(basketPriceMatch[0]);
              console.log('🛒 Sepet fiyatı bulundu:', basketPrice);
            }
          }
        } catch (error) {
          console.warn('⚠️ Sepet fiyatı kontrol edilemedi:', error);
        }
      }
      
      // Sepet fiyatı bildirim kontrolü (hem tab açık hem kapalı durumlar için)
      if (basketPrice && basketPrice < price) {
        // Önceki sepet fiyatını al
        const lastEntry = tracker.priceHistory[tracker.priceHistory.length - 1];
        const lastBasketPrice = lastEntry?.basketPrice;
        
        // Sepet fiyatı değişti mi kontrol et
        const basketPriceChanged = !lastBasketPrice || Math.abs(basketPrice - lastBasketPrice) > 0.01;
              
        // Sepet fiyatı normalden düşükse VE değişmişse bildirim gönder
        if (basketPriceChanged && tracker.notificationsEnabled !== false) {
          const discount = ((price - basketPrice) / price * 100).toFixed(1);
          const notificationId = `basket-discount-${tracker.id}-${Date.now()}`;
          
          // Site bazlı başlık
          const isTrendyol = tracker.url.includes('trendyol.com');
          const isHepsiburada = tracker.url.includes('hepsiburada.com');
          const isAmazon = tracker.url.includes('amazon.com.tr');
          let discountTitle = '💰 İndirimli Fiyat!';
          let discountIcon = '🏷️';
          
          if (isHepsiburada) {
            discountTitle = '🛒 Sepete Özel İndirim!';
            discountIcon = '🛒';
          } else if (isTrendyol) {
            discountTitle = '🏷️ İndirimli Fiyat!';
            discountIcon = '🏷️';
          } else if (isAmazon) {
            discountTitle = '📦 Amazon İndirimi!';
            discountIcon = '📦';
          }
          
          if (!lastBasketPrice) {
            // İlk kez indirim bulundu
            console.log(`🎉 ${isTrendyol ? 'Trendyol indirimli fiyat' : isHepsiburada ? 'Sepete özel indirim' : 'İndirimli fiyat'} bulundu!`, {
              normalPrice: price,
              discountedPrice: basketPrice,
              discount: discount + '%'
            });
          } else {
            // İndirimli fiyat değişti
            console.log(`🔄 ${isTrendyol ? 'İndirimli fiyat' : isHepsiburada ? 'Sepet fiyatı' : 'İndirimli fiyat'} değişti!`, {
              normalPrice: price,
              oldDiscountedPrice: lastBasketPrice,
              newDiscountedPrice: basketPrice,
              discount: discount + '%'
            });
          }
          
          chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: tracker.productImage || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            title: discountTitle,
            message: `${tracker.productName}\n${formatPrice(price, tracker.currency)} → ${formatPrice(basketPrice, tracker.currency)} (-%${discount})`,
            buttons: [
              { title: `${discountIcon} ${isTrendyol || isHepsiburada ? 'Ürüne Git' : 'Sepete Git'}` },
              { title: '📊 Detay Gör' }
            ],
            priority: 2,
            requireInteraction: false
          });
          
          // Telegram bildirimi gönder
          const telegramMessage = `${discountTitle}\n\n<b>${tracker.productName}</b>\n\n💰 Normal Fiyat: ${formatPrice(price, tracker.currency)}\n🎁 ${isTrendyol ? 'İndirimli' : 'Sepet'} Fiyatı: ${formatPrice(basketPrice, tracker.currency)}\n📉 İndirim: %${discount}\n\n${tracker.url}`;
          sendTelegramNotification(telegramMessage, tracker.url);
                
                // Bildirim geçmişine ekle
                addNotificationToHistory({
                  type: 'basket-discount',
                  trackerId: tracker.id,
                  productName: tracker.productName,
                  productImage: tracker.productImage,
                  url: tracker.url,
                  normalPrice: price,
                  basketPrice: basketPrice,
                  discount: discount,
                  currency: tracker.currency
                });
                
                // Badge'i güncelle
                updateBadge();
                
                // Chrome içi bildirim göster (sepet fiyatı için)
                const urlObj = new URL(tracker.url);
                const urlPattern = `${urlObj.origin}${urlObj.pathname}*`;
                
                chrome.tabs.query({ url: urlPattern }, async (tabs) => {
                  if (tabs && tabs.length > 0) {
                    console.log(`📱 ${tabs.length} adet uygun tab bulundu (sepet indirimi)`);
                    for (const tab of tabs) {
                      try {
                        await chrome.tabs.sendMessage(tab.id, {
                          action: 'showPriceNotification',
                          data: {
                            productName: tracker.productName,
                            oldPrice: formatPrice(price, tracker.currency),
                            newPrice: formatPrice(basketPrice, tracker.currency),
                            currency: tracker.currency,
                            change: `-%${discount}`
                          }
                        });
                        console.log('✅ Chrome içi bildirim gönderildi (sepet) tab:', tab.id);
                      } catch (error) {
                        console.warn('⚠️ Tab\'a mesaj gönderilemedi:', error.message);
                      }
                    }
                  } else {
                    console.log('📱 Uygun tab bulunamadı, sadece macOS bildirimi gösterildi');
                  }
                });
        } else if (!basketPriceChanged) {
          console.log('🛒 Sepet fiyatı aynı, bildirim gönderilmedi');
        }
      }
      
      if (price) {
        const lastPrice = tracker.priceHistory[tracker.priceHistory.length - 1];
        const priceChanged = lastPrice && price !== lastPrice.price;
        
        // HER ZAMAN yeni kayıt ekle (fiyat değişmese bile)
        tracker.priceHistory.push({
          price: price,
          date: new Date().toISOString(),
          changed: priceChanged,
          basketPrice: basketPrice // Sepet fiyatını da kaydet
        });
        tracker.lastChecked = new Date().toISOString();
        
        if (priceChanged) {
          console.log('💰 Fiyat DEĞİŞTİ:', lastPrice.price, '→', price);
        } else {
          if (basketPrice) {
            console.log('💰 Normal fiyat aynı:', price, '| 🛒 Sepet fiyatı:', basketPrice, `(-%${((price - basketPrice) / price * 100).toFixed(1)})`);
          } else {
            console.log('💰 Fiyat aynı:', price);
          }
        }
        
        // Send notification ONLY if price changed and notifications enabled
        if (priceChanged && tracker.notificationsEnabled !== false) {
          const change = price < lastPrice.price ? 'düştü ⬇️' : 'arttı ⬆️';
          const priceChange = ((price - lastPrice.price) / lastPrice.price * 100).toFixed(2);
          
          const formattedOldPrice = formatPrice(lastPrice.price, tracker.currency);
          const formattedNewPrice = formatPrice(price, tracker.currency);
          
          console.log('📢 Bildirim hazırlanıyor:', {
            productName: tracker.productName,
            oldPrice: lastPrice.price,
            newPrice: price,
            currency: tracker.currency,
            formattedOld: formattedOldPrice,
            formattedNew: formattedNewPrice
          });
          
          // macOS Chrome notification için minimal icon gerekiyor
          const notificationOptions = {
            type: 'basic',
            iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            title: `Fiyat ${change}`,
            message: `${tracker.productName} - ${formattedOldPrice} → ${formattedNewPrice} (${priceChange > 0 ? '+' : ''}${priceChange}%)`
          };
          
          console.log('📨 Notification options:', notificationOptions);
          
          // Unique ID oluştur (timestamp ekle)
          const notificationId = `price-change-${tracker.id}-${Date.now()}`;
          console.log('🆔 Notification ID:', notificationId);
          
          // Butonlu bildirim (Rich Notification)
          const richNotificationOptions = {
            ...notificationOptions,
            buttons: [
              { title: '🔗 Ürüne Git' },
              { title: '📈 Geçmişi Gör' }
            ],
            priority: 2,
            requireInteraction: false
          };
          
          chrome.notifications.create(notificationId, richNotificationOptions, (id) => {
            if (chrome.runtime.lastError) {
              console.error('❌ Bildirim hatası:', chrome.runtime.lastError);
              console.error('❌ Options tekrar:', richNotificationOptions);
            } else {
              console.log('✅ Bildirim gönderildi:', id);
              
              // Telegram bildirimi gönder
              const priceIcon = price < lastPrice.price ? '📉' : '📈';
              const priceChangeText = price < lastPrice.price ? 'DÜŞTÜ' : 'ARTTI';
              const priceChangeAmount = price - lastPrice.price; // Mutlak değişim
              const percentage = ((price - lastPrice.price) / lastPrice.price * 100); // Yüzde
              const telegramMessage = `${priceIcon} <b>FİYAT ${priceChangeText}!</b>\n\n<b>${tracker.productName}</b>\n\n💰 Eski Fiyat: ${formatPrice(lastPrice.price, tracker.currency)}\n💰 Yeni Fiyat: ${formatPrice(price, tracker.currency)}\n${priceIcon} Değişim: ${formatPrice(Math.abs(priceChangeAmount), tracker.currency)} (${Math.abs(percentage).toFixed(1)}%)\n\n${tracker.url}`;
              sendTelegramNotification(telegramMessage, tracker.url);
              
              // Bildirim geçmişine ekle
              addNotificationToHistory({
                type: price < lastPrice.price ? 'price-drop' : 'price-increase',
                trackerId: tracker.id,
                productName: tracker.productName,
                productImage: tracker.productImage,
                url: tracker.url,
                oldPrice: lastPrice.price,
                newPrice: price,
                change: priceChange,
                currency: tracker.currency
              });
              
              // Extension icon'unda badge göster - Değişen ürün sayısını artır
              updateBadge();
              
              // Chrome içi bildirim göster (tracker URL'sine uygun tab'da)
              const urlObj = new URL(tracker.url);
              const urlPattern = `${urlObj.origin}${urlObj.pathname}*`;
              
              chrome.tabs.query({ url: urlPattern }, async (tabs) => {
                if (tabs && tabs.length > 0) {
                  console.log(`📱 ${tabs.length} adet uygun tab bulundu`);
                  for (const tab of tabs) {
                    try {
                      await chrome.tabs.sendMessage(tab.id, {
                        action: 'showPriceNotification',
                        data: {
                          productName: tracker.productName,
                          oldPrice: formattedOldPrice,
                          newPrice: formattedNewPrice,
                          currency: tracker.currency,
                          change: `${priceChange > 0 ? '+' : ''}${priceChange}%`
                        }
                      });
                      console.log('✅ Chrome içi bildirim gönderildi tab:', tab.id);
                    } catch (error) {
                      console.warn('⚠️ Tab\'a mesaj gönderilemedi:', error.message);
                    }
                  }
                } else {
                  console.log('📱 Uygun tab bulunamadı, sadece macOS bildirimi gösterildi');
                }
              });
            }
          });
        }
        
        chrome.storage.local.set({ trackers: trackers });
        console.log('✅ Fiyat kaydedildi (Toplam kontrol:', tracker.priceHistory.length, ')');
      }
    } catch (error) {
      console.error(`❌ Fiyat kontrolü başarısız: ${tracker.productName}`, error);
    }
  });
}

// Telegram bildirimi gönder
async function sendTelegramNotification(message, productUrl = null) {
  try {
    const data = await chrome.storage.local.get(['telegramBotToken', 'telegramChatId']);
    
    if (!data.telegramBotToken || !data.telegramChatId) {
      console.log('⚠️ Telegram ayarları yapılmamış');
      return false;
    }
    
    const url = `https://api.telegram.org/bot${data.telegramBotToken}/sendMessage`;
    
    const payload = {
      chat_id: data.telegramChatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };
    
    // Eğer ürün URL'i varsa, buton ekle
    if (productUrl) {
      payload.reply_markup = {
        inline_keyboard: [
          [
            { text: '🛒 Ürüne Git', url: productUrl }
          ]
        ]
      };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Telegram bildirimi gönderildi');
      return true;
    } else {
      console.error('❌ Telegram hatası:', result.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Telegram gönderme hatası:', error);
    return false;
  }
}

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
  
  // Decimal göster (küçük değişiklikleri görmek için)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
  
  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
    return `${symbol}${formatted}`;
  } else {
    return `${formatted} ${symbol}`;
  }
}

async function checkAllPrices() {
  chrome.storage.local.get(['trackers'], async (result) => {
    const trackers = result.trackers || [];
    
    for (const tracker of trackers) {
      if (tracker.enabled !== false) {
        await checkSingleTracker(tracker.id);
      }
    }
  });
}

function extractPrice(text) {
  const cleaned = text.replace(/[^\d.,]/g, '');
  const price = parseFloat(cleaned.replace(',', '.'));
  return isNaN(price) ? null : price;
}

function extractPriceFromHTML(html, selector) {
  try {
    // Basit regex ile class/id içeriğini bul
    let pattern = '';
    if (selector.includes('.')) {
      // span.money -> money class'ını ara
      const classes = selector.split('.').filter(c => c);
      const tagName = classes[0].match(/^[a-z]+/i)?.[0] || 'div';
      const className = classes[classes.length - 1];
      
      // <div class="price">$2,099.00</div> formatını ara (multiline support)
      // [\s\S]*? ile boşlukları, nested tagları ve yeni satırları yakala
      pattern = new RegExp(`<${tagName}[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)</${tagName}>`, 'gi');
      
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        let text = match[1].trim();
        
        // Nested HTML tag'leri temizle (span, sup, sub, etc.)
        // <span>1,839</span><sup>00</sup> -> 1,83900
        text = text.replace(/<[^>]+>/g, '');
        
        const price = parsePrice(text);
        if (price) {
          return price;
        }
      }
    } else if (selector.includes('#')) {
      const idName = selector.replace('#', '');
      pattern = new RegExp(`id=["']${idName}["'][^>]*>([\\s\\S]*?)<`, 'i');
      const match = html.match(pattern);
      if (match && match[1]) {
        let text = match[1].trim();
        text = text.replace(/<[^>]+>/g, '');
        return parsePrice(text);
      }
    } else {
      // Tag selector
      pattern = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`, 'i');
      const match = html.match(pattern);
      if (match && match[1]) {
        let text = match[1].trim();
        text = text.replace(/<[^>]+>/g, '');
        return parsePrice(text);
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ extractPriceFromHTML hatası:', error);
    return null;
  }
}

function handleElementSelected(data) {
  console.log('handleElementSelected çağrıldı:', data);
  
  const tracker = {
    id: Date.now().toString(),
    url: data.url,
    selector: data.selector,
    productName: data.productName,
    productImage: data.productImage,
    favicon: data.favicon,
    pageTitle: data.pageTitle,
    priceHistory: [],
    lastChecked: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  if (data.price) {
    const price = parseFloat(data.price.replace(',', '.'));
    if (!isNaN(price)) {
      tracker.priceHistory.push({
        price: price,
        date: new Date().toISOString()
      });
    }
  }
  
  console.log('Tracker oluşturuldu:', tracker);
  
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    trackers.push(tracker);
    
    console.log('Storage\'a kaydediliyor, toplam:', trackers.length);
    
    chrome.storage.local.set({ trackers: trackers }, () => {
      console.log('Storage\'a kaydedildi!');
      
      chrome.notifications.create(`tracker-added-${tracker.id}`, {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: '✅ Takip Eklendi!',
        message: `${tracker.productName}\n${data.price || 'Fiyat bulunamadı'}`
      });
    });
  });
}

// Bildirim butonu tıklandığında
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('🔘 Bildirim butonu tıklandı:', notificationId, 'Button:', buttonIndex);
  
  // Tracker ID'sini notification ID'den çıkar
  let trackerId = null;
  if (notificationId.includes('basket-discount-')) {
    trackerId = notificationId.split('basket-discount-')[1].split('-')[0];
  } else if (notificationId.includes('price-change-')) {
    trackerId = notificationId.split('price-change-')[1].split('-')[0];
  }
  
  if (trackerId) {
    chrome.storage.local.get(['trackers'], (result) => {
      const trackers = result.trackers || [];
      const tracker = trackers.find(t => t.id === trackerId);
      
      if (tracker) {
        if (buttonIndex === 0) {
          // İlk buton: "Sepete Git" veya "Ürüne Git"
          console.log('🔗 Ürün sayfası açılıyor:', tracker.url);
          chrome.tabs.create({ url: tracker.url });
        } else if (buttonIndex === 1) {
          // İkinci buton: "Detay Gör" veya "Geçmişi Gör"
          console.log('📊 Settings sayfası açılıyor');
          chrome.tabs.create({ url: 'settings.html' });
        }
      }
    });
  }
  
  // Bildirimi kapat
  chrome.notifications.clear(notificationId);
});

// Bildirime tıklandığında (buton olmadan)
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('🔔 Bildirime tıklandı:', notificationId);
  
  // Tracker ID'sini bul ve ürün sayfasını aç
  let trackerId = null;
  if (notificationId.includes('basket-discount-')) {
    trackerId = notificationId.split('basket-discount-')[1].split('-')[0];
  } else if (notificationId.includes('price-change-')) {
    trackerId = notificationId.split('price-change-')[1].split('-')[0];
  }
  
  if (trackerId) {
    chrome.storage.local.get(['trackers'], (result) => {
      const trackers = result.trackers || [];
      const tracker = trackers.find(t => t.id === trackerId);
      
      if (tracker) {
        chrome.tabs.create({ url: tracker.url });
      }
    });
  }
  
  chrome.notifications.clear(notificationId);
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Fiyat Takip eklentisi yüklendi!');
});
