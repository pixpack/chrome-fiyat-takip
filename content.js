let pickerMode = false;
let hoveredElement = null;
let overlay = null;

console.log('💉 Content script yüklendi:', window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPrice') {
    try {
      const elements = document.querySelectorAll(request.selector);
      
      if (elements.length === 0) {
        sendResponse({ 
          success: false, 
          error: 'Element bulunamadı' 
        });
        return true;
      }
      
      let targetElement = elements[0];
      
      // Birden fazla element varsa ve exactPriceValue belirtilmişse (ve 0'dan büyükse)
      if (elements.length > 1 && request.exactPriceValue && request.exactPriceValue > 0) {
        console.log(`⚠️ ${elements.length} adet element bulundu! exactPriceValue ile filtreleniyor:`, request.exactPriceValue);
        
        // İçinde exactPriceValue'ya eşit fiyat olanı bul
        for (const el of elements) {
          const text = el.textContent.trim();
          const priceMatch = text.match(/[\d.,]+/);
          if (priceMatch) {
            const priceNum = parsePrice(priceMatch[0]);
            console.log('  🔎 Element kontrol:', priceMatch[0], '→', priceNum, 'vs', request.exactPriceValue);
            // Tolerans ile karşılaştır (bazen virgül/nokta farklılıkları olabilir)
            if (Math.abs(priceNum - request.exactPriceValue) < 0.01) {
              console.log('  ✅ Eşleşme bulundu!');
              targetElement = el;
              break;
            }
          }
        }
      }
      
      const text = targetElement.textContent.trim();
      const priceMatch = text.match(/[\d.,]+/);
      const price = priceMatch ? parsePrice(priceMatch[0]) : null;
      
      sendResponse({ 
        success: true, 
        price: price,
        text: text 
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
    return true;
  }
  
  if (request.action === 'startPicker') {
    startElementPicker();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'stopPicker') {
    stopElementPicker();
    sendResponse({ success: true });
    return true;
  }
});

function startElementPicker() {
  if (pickerMode) return;
  
  pickerMode = true;
  document.body.style.cursor = 'crosshair';
  
  overlay = document.createElement('div');
  overlay.id = 'price-tracker-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(76, 175, 80, 0.1);
    z-index: 999998;
    pointer-events: none;
  `;
  document.body.appendChild(overlay);
  
  const tooltip = document.createElement('div');
  tooltip.id = 'price-tracker-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-family: Arial, sans-serif;
    z-index: 1000000;
    pointer-events: none;
    display: none;
  `;
  document.body.appendChild(tooltip);
  
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

function stopElementPicker() {
  if (!pickerMode) return;
  
  pickerMode = false;
  document.body.style.cursor = '';
  
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  
  const tooltip = document.getElementById('price-tracker-tooltip');
  if (tooltip) tooltip.remove();
  
  if (hoveredElement) {
    hoveredElement.style.outline = '';
    hoveredElement = null;
  }
  
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

function handleMouseOver(e) {
  if (!pickerMode) return;
  
  const target = e.target;
  if (target.id === 'price-tracker-overlay' || target.id === 'price-tracker-tooltip') return;
  
  if (hoveredElement && hoveredElement !== target) {
    hoveredElement.style.outline = '';
  }
  
  hoveredElement = target;
  target.style.outline = '2px solid #4CAF50';
  
  const tooltip = document.getElementById('price-tracker-tooltip');
  if (tooltip) {
    const text = target.textContent.trim().substring(0, 50);
    const selector = generateSelector(target);
    tooltip.textContent = `${text}... (${selector})`;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 10) + 'px';
    tooltip.style.top = (e.clientY + 10) + 'px';
  }
}

function handleMouseOut(e) {
  if (!pickerMode) return;
  
  const tooltip = document.getElementById('price-tracker-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function handleClick(e) {
  if (!pickerMode) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = e.target;
  if (target.id === 'price-tracker-overlay' || target.id === 'price-tracker-tooltip') return;
  
  const selector = generateSelector(target);
  const text = target.textContent.trim();
  const priceMatch = text.match(/[\d.,]+/);
  const price = priceMatch ? priceMatch[0] : null;
  
  // Tıklanan elementin tam fiyat değerini sakla (birden fazla aynı selector varsa kullanmak için)
  const exactPriceValue = priceMatch ? parsePrice(priceMatch[0]) : null;
  
  // Para birimini algıla
  const currency = detectCurrency(text);
  
  const productImage = findNearestImage(target);
  const favicon = getFavicon();
  const pageTitle = document.title;
  
  console.log('Element seçildi:', {
    url: window.location.href,
    selector: selector,
    price: price,
    productName: extractProductName()
  });
  
  stopElementPicker();
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.innerHTML = `
    <strong>✅ Takip Eklendi!</strong><br>
    <small>${extractProductName()}</small><br>
    <small>Fiyat: ${price || 'Bulunamadı'}</small>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  // İndirimli fiyat kontrolü (Hepsiburada + Trendyol)
  let basketPriceSelector = null;
  let basketPrice = null;
  
  // Hepsiburada - Sepete özel fiyat
  if (window.location.hostname.includes('hepsiburada.com')) {
    const checkoutPriceEl = document.querySelector('[data-test-id="checkout-price"]');
    if (checkoutPriceEl) {
      const basketPriceText = checkoutPriceEl.textContent.trim();
      const basketPriceMatch = basketPriceText.match(/[\d.,]+/);
      if (basketPriceMatch) {
        basketPrice = parsePrice(basketPriceMatch[0]);
        basketPriceSelector = '[data-test-id="checkout-price"]';
        console.log('🛒 Hepsiburada sepet fiyatı bulundu:', basketPrice, 'Selector:', basketPriceSelector);
      }
    }
  }
  
  // Amazon.com.tr - İndirimli fiyat (list price vs current price)
  if (window.location.hostname.includes('amazon.com.tr')) {
    // Liste fiyatı (üstü çizili - eski fiyat) - birden fazla selector dene
    let listPriceEl = document.querySelector('[data-a-strike="true"]'); // Öncelikli - üzeri çizili
    if (!listPriceEl) {
      listPriceEl = document.querySelector('.basisPrice .a-price, .a-price.a-text-price[data-a-strike="true"]');
    }
    if (!listPriceEl) {
      listPriceEl = document.querySelector('.a-price.a-text-price'); // Fallback
    }
    
    // İndirimli fiyat (kırmızı - yeni fiyat)
    const currentPriceEl = document.querySelector('.a-price.priceToPay, .a-price[data-a-color="price"], .a-price[data-a-color="base"]');
    
    if (listPriceEl && currentPriceEl) {
      const listPriceText = listPriceEl.textContent.trim();
      const listPriceMatch = listPriceText.match(/[\d.,]+/);
      
      const currentPriceText = currentPriceEl.textContent.trim();
      const currentPriceMatch = currentPriceText.match(/[\d.,]+/);
      
      if (listPriceMatch && currentPriceMatch) {
        const listPrice = parsePrice(listPriceMatch[0]);
        const currentPrice = parsePrice(currentPriceMatch[0]);
        
        // İndirimli fiyat liste fiyatından düşükse kaydet
        if (currentPrice < listPrice) {
          basketPrice = currentPrice;
          basketPriceSelector = '.a-price.priceToPay, .a-price[data-a-color="price"], .a-price[data-a-color="base"]';
          console.log('📦 Amazon indirimli fiyat bulundu:', basketPrice, 'Liste fiyatı:', listPrice, 'Selector:', basketPriceSelector);
        }
      }
    }
  }
  
  // Trendyol - İndirimli fiyat (campaign-price veya discounted)
  if (window.location.hostname.includes('trendyol.com')) {
    // Önce "Sepette İndirim" kontrolü (öncelikli)
    const campaignPrice = document.querySelector('.campaign-price');
    if (campaignPrice) {
      const newPriceEl = campaignPrice.querySelector('.new-price, p.new-price, [class*="new-price"]');
      const oldPriceEl = campaignPrice.querySelector('.old-price, p.old-price, [class*="old-price"]');
      
      if (newPriceEl) {
        const newPriceText = newPriceEl.textContent.trim();
        const newPriceMatch = newPriceText.match(/[\d.,]+/);
        if (newPriceMatch) {
          basketPrice = parsePrice(newPriceMatch[0]);
          basketPriceSelector = '.campaign-price .new-price, .campaign-price p.new-price';
          console.log('🛒 Trendyol sepette indirim bulundu:', basketPrice, 'Selector:', basketPriceSelector);
        }
      }
    }
    
    // Sepette indirim yoksa normal indirimli fiyat kontrolü
    if (!basketPrice) {
      const priceView = document.querySelector('.price-view');
      if (priceView) {
        const discountedEl = priceView.querySelector('.discounted, span.discounted, [class*="discounted"]');
        const originalEl = priceView.querySelector('.original, span.original, [class*="original"]');
        
        if (discountedEl && originalEl) {
          const discountedText = discountedEl.textContent.trim();
          const discountedMatch = discountedText.match(/[\d.,]+/);
          if (discountedMatch) {
            basketPrice = parsePrice(discountedMatch[0]);
            basketPriceSelector = '.price-view .discounted, .price-view span.discounted';
            console.log('🏷️ Trendyol indirimli fiyat bulundu:', basketPrice, 'Selector:', basketPriceSelector);
          }
        }
      }
    }
  }
  
  // Direkt storage'a kaydet (background bypass)
  const trackerData = {
    id: Date.now().toString(),
    url: window.location.href,
    selector: selector,
    exactPriceValue: exactPriceValue, // Tıklanan fiyatın tam değeri (multi-price sayfalar için)
    basketPriceSelector: basketPriceSelector, // Sepet fiyatı selector'ı (Hepsiburada vb.)
    productName: extractProductName(),
    productImage: productImage,
    favicon: favicon,
    pageTitle: pageTitle,
    currency: currency,
    priceHistory: [],
    lastChecked: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  if (price) {
    const priceNum = parsePrice(price);
    if (!isNaN(priceNum) && priceNum > 0) {
      trackerData.priceHistory.push({
        price: priceNum,
        date: new Date().toISOString()
      });
    }
  }
  
  console.log('💾 Storage\'a direkt kaydediliyor:', trackerData);
  
  chrome.storage.local.get(['trackers'], (result) => {
    const trackers = result.trackers || [];
    trackers.push(trackerData);
    
    chrome.storage.local.set({ trackers: trackers }, () => {
      console.log('✅ Kaydedildi! Toplam:', trackers.length);
      notification.innerHTML = `
        <strong>✅ Takip Eklendi!</strong><br>
        <small>${trackerData.productName}</small><br>
        <small>Fiyat: ${price || 'Bulunamadı'}</small><br>
        <small style="opacity:0.7">Toplam ${trackers.length} ürün takipte</small>
      `;
    });
  });
  
  // Background'a da bildir (opsiyonel)
  try {
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      data: trackerData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Background yanıt vermedi (normal):', chrome.runtime.lastError.message);
      } else {
        console.log('Background yanıtı:', response);
      }
    });
  } catch (error) {
    console.warn('Background mesaj gönderilemedi:', error);
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    stopElementPicker();
    chrome.runtime.sendMessage({ action: 'pickerCancelled' });
  }
}

function generateSelector(element) {
  // 1. ID varsa (en spesifik)
  if (element.id) {
    return '#' + element.id;
  }
  
  // 2. Unique data-attribute varsa
  const uniqueAttrs = ['data-product-id', 'data-variant-id', 'data-sku', 'data-price-id'];
  for (const attr of uniqueAttrs) {
    if (element.hasAttribute(attr)) {
      return `[${attr}="${element.getAttribute(attr)}"]`;
    }
  }
  
  // 3. Tıklanan elementi tam olarak yakalamak için içeriğe göre filtrele
  // Örnek: $1,999 seçildi, o zaman içinde "1,999" ya da "1999" geçen elementi bul
  const elementText = element.textContent.trim();
  const priceMatch = elementText.match(/[\d.,]+/);
  
  // 4. Class-based selector
  let selector = '';
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c && !c.match(/^(hover|active|focus)/));
    if (classes.length > 0) {
      selector = element.tagName.toLowerCase() + '.' + classes.join('.');
    }
  } else {
    selector = element.tagName.toLowerCase();
  }
  
  // 4. Aynı selector'dan birden fazla var mı kontrol et
  const matchingElements = document.querySelectorAll(selector);
  if (matchingElements.length > 1) {
    // Index'ini bul
    const index = Array.from(matchingElements).indexOf(element);
    if (index >= 0) {
      // Parent ile birleştir + nth-of-type kullan
      const parent = element.parentElement;
      if (parent && parent.tagName !== 'BODY') {
        let parentSelector = '';
        
        if (parent.id) {
          parentSelector = '#' + parent.id;
        } else if (parent.className && typeof parent.className === 'string') {
          const parentClasses = parent.className.trim().split(/\s+/).filter(c => c && !c.match(/^(hover|active|focus)/));
          if (parentClasses.length > 0) {
            parentSelector = parent.tagName.toLowerCase() + '.' + parentClasses[0];
          }
        } else {
          parentSelector = parent.tagName.toLowerCase();
        }
        
        // Sadece aynı tag+class olan kardeşleri say
        const sameSiblings = Array.from(parent.children).filter(child => {
          const childSelector = child.className && typeof child.className === 'string' 
            ? child.tagName.toLowerCase() + '.' + child.className.trim().split(/\s+/)[0]
            : child.tagName.toLowerCase();
          return childSelector === selector.split('.').slice(0, 2).join('.');
        });
        
        const siblingIndex = sameSiblings.indexOf(element);
        if (siblingIndex >= 0 && sameSiblings.length > 1) {
          selector = `${parentSelector} > ${selector}:nth-of-type(${siblingIndex + 1})`;
        } else {
          selector = `${parentSelector} > ${selector}`;
        }
      } else {
        // Body altındaysa sadece nth-of-type ekle
        selector += `:nth-of-type(${index + 1})`;
      }
    }
  }
  
  return selector;
}

function findNearestImage(element) {
  // 1. Site-spesifik selector'lar (en güvenilir)
  const siteSpecificSelectors = [
    // Amazon (öncelikli - en yüksek kalite)
    '#landingImage',
    '#imgTagWrapperId img',
    '[data-a-image-name="landingImage"]',
    '.a-dynamic-image',
    'img[data-old-hires]',
    'img[src*="images-amazon.com"]',
    // Trendyol (öncelikli - en yüksek kalite)
    'img.product-image',
    'img[class*="carouselImage"]',
    '.product-image',
    '.image-viewer img',
    '.product-detail-image img',
    'img[src*="cdn.dsmcdn.com"]',
    'img[class*="carousel"]',
    // Hepsiburada (öncelikli)
    'img.hb-HbImage-view__image',
    'img[class*="HbImage"]',
    '[data-test-id="product-image"] img',
    '.productImage img',
    'img[src*="productimages.hepsiburada.net"]',
    'img[alt*="ürün"]',
    'img[alt*="Ürün"]',
    '.gallery img',
    // Genel e-ticaret
    'img[itemprop="image"]',
    '[itemtype*="Product"] img',
    '.product-gallery img',
    '.main-image img',
    'img[data-zoom]',
    'img[src*="product"]',
    'img[src*="item"]'
  ];
  
  for (const selector of siteSpecificSelectors) {
    const img = document.querySelector(selector);
    if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
      // Amazon için daha düşük minimum (300x200 yeterli)
      const isAmazon = window.location.hostname.includes('amazon.com');
      const minWidth = isAmazon ? 300 : 300;
      const minHeight = isAmazon ? 200 : 300;
      
      // Rozet/badge değilse
      if ((img.naturalWidth >= minWidth || img.width >= minWidth) && 
          (img.naturalHeight >= minHeight || img.height >= minHeight)) {
        // Badge/kampanya resimlerini atla
        if (!img.src.includes('badge') && 
            !img.src.includes('sticker') && 
            !img.src.includes('label') &&
            !img.src.includes('/vas/') &&
            !img.src.includes('koruma_paketi') &&
            !img.src.includes('360_icon')) {  // Amazon 360 icon
          console.log('🖼️ Resim bulundu:', selector, img.naturalWidth + 'x' + img.naturalHeight);
          return img.src;
        }
      }
    }
  }
  
  // 2. Element'in yakınında ara
  let current = element;
  let depth = 0;
  const maxDepth = 8;
  
  while (current && depth < maxDepth) {
    const imgs = current.querySelectorAll('img');
    for (const img of imgs) {
      if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
        if ((img.naturalWidth >= 300 || img.width >= 300) && 
            (img.naturalHeight >= 300 || img.height >= 300)) {
          // Badge/kampanya resimlerini atla
          if (!img.src.includes('badge') && 
              !img.src.includes('sticker') && 
              !img.src.includes('label') &&
              !img.src.includes('/vas/') &&
              !img.src.includes('koruma_paketi')) {
            return img.src;
          }
        }
      }
    }
    
    const bgImage = window.getComputedStyle(current).backgroundImage;
    if (bgImage && bgImage !== 'none') {
      const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match && match[1].startsWith('http')) return match[1];
    }
    
    current = current.parentElement;
    depth++;
  }
  
  // 3. Sayfadaki ilk büyük resmi bul
  const allImages = document.querySelectorAll('img');
  for (const img of allImages) {
    if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
      if ((img.naturalWidth >= 200 || img.width >= 200) && 
          (img.naturalHeight >= 200 || img.height >= 200)) {
        return img.src;
      }
    }
  }
  
  return null;
}

function getFavicon() {
  const links = document.querySelectorAll('link[rel*="icon"]');
  if (links.length > 0) {
    return new URL(links[0].href, window.location.href).href;
  }
  return window.location.origin + '/favicon.ico';
}

function extractProductName() {
  // Site-spesifik selector'lar (öncelikli)
  
  // Amazon
  if (window.location.hostname.includes('amazon.com')) {
    const productTitle = document.querySelector('#productTitle, #title, h1#title, span#productTitle');
    if (productTitle) return productTitle.textContent.trim();
  }
  
  // Trendyol
  if (window.location.hostname.includes('trendyol.com')) {
    const productName = document.querySelector('h1.pr-new-br, h1[class*="product"], .product-name h1');
    if (productName) return productName.textContent.trim();
  }
  
  // Hepsiburada
  if (window.location.hostname.includes('hepsiburada.com')) {
    const productName = document.querySelector('h1[id*="product"], h1.product-name, [data-test-id="product-name"]');
    if (productName) return productName.textContent.trim();
  }
  
  // Genel fallback
  const h1 = document.querySelector('h1');
  if (h1) return h1.textContent.trim();
  
  const metaTitle = document.querySelector('meta[property="og:title"]');
  if (metaTitle) return metaTitle.content;
  
  const title = document.title.split('|')[0].split('-')[0].split(':')[0].trim();
  return title || 'İsimsiz Ürün';
}

function parsePrice(priceStr) {
  // Fiyat string'ini temizle
  let cleaned = priceStr.replace(/[^\d.,]/g, '');
  
  // Virgül ve nokta sayısını kontrol et
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  
  // Format algılama
  if (commaCount === 0 && dotCount === 0) {
    // Sadece rakam: 2099
    return parseFloat(cleaned);
  } else if (commaCount === 1 && dotCount === 0) {
    // Bir virgül var
    const parts = cleaned.split(',');
    if (parts[1].length === 2) {
      // Ondalık ayırıcı: 19,99
      return parseFloat(cleaned.replace(',', '.'));
    } else {
      // Binlik ayırıcı: 2,099
      return parseFloat(cleaned.replace(',', ''));
    }
  } else if (commaCount === 0 && dotCount === 1) {
    // Bir nokta var
    const parts = cleaned.split('.');
    if (parts[1].length === 2) {
      // Ondalık ayırıcı: 19.99
      return parseFloat(cleaned);
    } else {
      // Binlik ayırıcı: 2.099
      return parseFloat(cleaned.replace('.', ''));
    }
  } else if (commaCount > 0 && dotCount > 0) {
    // Her ikisi de var - hangisi son
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Virgül son: 1.234.567,89 (Avrupa formatı)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Nokta son: 1,234,567.89 (ABD formatı)
      cleaned = cleaned.replace(/,/g, '');
    }
    return parseFloat(cleaned);
  } else {
    // Çoklu ayırıcı - binlik ayırıcıları temizle
    if (commaCount > 1) {
      // 1,234,567 formatı
      cleaned = cleaned.replace(/,/g, '');
    } else if (dotCount > 1) {
      // 1.234.567 formatı
      cleaned = cleaned.replace(/\./g, '');
    }
    return parseFloat(cleaned);
  }
}

function detectCurrency(text) {
  // Para birimi sembollerini ve kodlarını kontrol et
  const currencyMap = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₺': 'TRY',
    'TL': 'TRY',
    'USD': 'USD',
    'EUR': 'EUR',
    'GBP': 'GBP',
    'JPY': 'JPY',
    'TRY': 'TRY',
    'CAD': 'CAD',
    'AUD': 'AUD',
    'CHF': 'CHF',
    'CNY': 'CNY',
    'INR': 'INR',
    'RUB': 'RUB'
  };
  
  // Metinde para birimi ara
  for (const [symbol, code] of Object.entries(currencyMap)) {
    if (text.includes(symbol)) {
      return code;
    }
  }
  
  // URL'den tahmin et
  const url = window.location.href.toLowerCase();
  if (url.includes('.tr') || url.includes('turkey') || url.includes('turkiye')) return 'TRY';
  if (url.includes('.uk') || url.includes('.co.uk')) return 'GBP';
  if (url.includes('.eu') || url.includes('.de') || url.includes('.fr') || url.includes('.it')) return 'EUR';
  
  // Varsayılan
  return 'USD';
}
