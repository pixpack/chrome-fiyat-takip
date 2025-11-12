// Settings console'a yapıştır
chrome.storage.local.get(['trackers'], (result) => {
  const trackers = result.trackers || [];
  const bosgame = trackers.find(t => t.productName.includes('Bosgame'));
  
  if (bosgame) {
    console.log('📦 Eski selector:', bosgame.selector);
    
    // Doğru selector'ı güncelle
    bosgame.selector = '.product-sales-price';
    
    chrome.storage.local.set({ trackers: trackers }, () => {
      console.log('✅ Bosgame selector güncellendi:', bosgame.selector);
      console.log('🔄 1 dakika bekle, test edilecek...');
    });
  } else {
    console.log('❌ Bosgame tracker bulunamadı');
  }
});
