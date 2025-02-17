document.addEventListener("copy", () => {
  setTimeout(() => {
    if (!chrome?.runtime?.id) return;
    
    navigator.clipboard.readText()
      .then(text => {
        if (text.trim()) {
          chrome.runtime.sendMessage({ 
            action: "saveText", 
            text: text,
            url: window.location.href
          });
        }
      })
      .catch(() => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
          chrome.runtime.sendMessage({ 
            action: "saveText", 
            text: selectedText,
            url: window.location.href
          });
        }
      });
  }, 100);

  // En content.js, verificar inicialización del storage
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "saveText") {
    chrome.storage.local.get({ copiedItems: [] }, ({ copiedItems }) => {
      // Asegurar que siempre sea un array
      const items = Array.isArray(copiedItems) ? copiedItems : [];
      const newItem = {
        text: message.text,
        url: message.url,
        timestamp: new Date().toISOString()
      };
      chrome.storage.local.set({ copiedItems: [...items, newItem] });
    });
  }
});

});