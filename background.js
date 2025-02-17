chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ copiedItems: [] });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveText") {
    chrome.storage.local.get("copiedItems", ({ copiedItems = [] }) => {
      const newItem = {
        text: message.text,
        url: message.url,
        timestamp: new Date().toISOString()
      };
      
      chrome.storage.local.set({ 
        copiedItems: [...copiedItems, newItem] 
      }, () => {
        console.log("Item guardado:", newItem);
      });
    });
    return true;
  }
});