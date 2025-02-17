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
});