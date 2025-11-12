// Offscreen Document - Gizli DOM işlemleri için

console.log('🔧 Offscreen document yüklendi');

// Background'dan mesaj al
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchPrice') {
    console.log('📥 Fiyat çekme isteği alındı:', message.url);
    
    fetchPriceFromURL(message.url, message.selector, message.exactValue, message.basketSelector)
      .then(result => {
        console.log('✅ Fiyat çekildi:', result);
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('❌ Fiyat çekilemedi:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Async response için
  }
});

async function fetchPriceFromURL(url, selector, exactValue, basketSelector) {
  try {
    // Sayfayı fetch et
    console.log('🌐 URL fetch ediliyor:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log('📄 HTML alındı, uzunluk:', html.length);
    
    // HTML'i DOM'a parse et
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    console.log('🔍 HTML parse edildi');
    
    // Fiyatı bul
    const elements = doc.querySelectorAll(selector);
    console.log('🔍 Bulunan element sayısı:', elements.length);
    
    if (elements.length === 0) {
      throw new Error('Element bulunamadı');
    }
    
    let priceText = null;
    
    // Exact value varsa ve birden fazla element varsa
    if (exactValue && elements.length > 1) {
      console.log('🎯 Exact value ile arama:', exactValue);
      for (const el of elements) {
        const text = el.textContent.trim();
        const match = text.match(/[\d.,]+/);
        if (match) {
          const price = parsePrice(match[0]);
          if (Math.abs(price - exactValue) < 0.01) {
            priceText = text;
            console.log('✅ Exact match bulundu:', priceText);
            break;
          }
        }
      }
    }
    
    // Exact bulunamadıysa ilk elementi al
    if (!priceText) {
      priceText = elements[0].textContent.trim();
      console.log('📝 İlk element alındı:', priceText);
    }
    
    // Sepet fiyatını da kontrol et
    let basketPriceText = null;
    if (basketSelector) {
      console.log('🛒 Sepet fiyatı aranıyor:', basketSelector);
      const basketEl = doc.querySelector(basketSelector);
      if (basketEl) {
        basketPriceText = basketEl.textContent.trim();
        console.log('🛒 Sepet fiyatı bulundu:', basketPriceText);
      }
    }
    
    return {
      priceText: priceText,
      basketPriceText: basketPriceText
    };
    
  } catch (error) {
    console.error('❌ Fetch hatası:', error);
    throw error;
  }
}

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
