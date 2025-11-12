// Chrome DevTools Console'a yapıştır:
chrome.storage.local.get(['trackers'], (result) => {
  const trackers = result.trackers || [];
  const tracker = trackers.find(t => t.productName.includes('Compact Design'));
  
  if (tracker) {
    console.log('📦 Tracker bilgileri:', {
      id: tracker.id,
      productName: tracker.productName,
      selector: tracker.selector,
      exactPriceValue: tracker.exactPriceValue,
      url: tracker.url,
      lastPrice: tracker.priceHistory[tracker.priceHistory.length - 1]
    });
    
    // Sayfada kaç tane bu selector'dan var?
    const elements = document.querySelectorAll(tracker.selector);
    console.log(`🔍 Sayfada "${tracker.selector}" selector'ından ${elements.length} adet bulundu:`);
    
    elements.forEach((el, index) => {
      const text = el.textContent.trim();
      const priceMatch = text.match(/[\d.,]+/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(',', ''));
        console.log(`  ${index + 1}. Element: ${text.substring(0, 50)} → Fiyat: ${price}`);
      }
    });
  } else {
    console.log('❌ Tracker bulunamadı!');
  }
});
