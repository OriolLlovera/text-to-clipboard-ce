document.addEventListener("DOMContentLoaded", () => {
  const textList = document.getElementById("textList");
  const searchInput = document.getElementById("search");
  const clearAllBtn = document.getElementById("clearAll");

  // Variable para mantener el estado original de los items
  let originalItems = [];

  // Renderizar lista manteniendo referencias correctas
  const renderList = (items = []) => {
    textList.innerHTML = items
      .map(
        (item, displayIndex) => `
      <div class="text-item">
        <div class="text-content">
          <div class="text">${item.text}</div>
          <div class="meta">
            <span class="url">${new URL(item.url).hostname || "Sin URL"}</span>
            <span class="date">${new Date(item.timestamp).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}</span>
            <span class="time">${new Date(item.timestamp).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}</span>
          </div>
        </div>
        <div class="btn-group">
          <button class="edit-btn" data-original-index="${item.originalIndex}" aria-label="Editar">
            <span class="material-icons">edit</span>
          </button>
          <button class="delete-btn" data-original-index="${item.originalIndex}" aria-label="Eliminar">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    `
      )
      .join("");
  };

  // Cargar textos manteniendo el índice original
  const loadTexts = () => {
    chrome.storage.local.get({ copiedItems: [] }, ({ copiedItems }) => {
      // Validación extra del array
      const validItems = Array.isArray(copiedItems) ? copiedItems : [];
      originalItems = validItems;
      const itemsWithIndex = validItems
        .map((item, index) => ({ 
          ...item,
          timestamp: item.timestamp || new Date().toISOString(), // Fecha por defecto
          originalIndex: index 
        }))
        .reverse();
      renderList(itemsWithIndex);
    });
  };

  // Evento de edición corregido
  textList.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const originalIndex = parseInt(editBtn.dataset.originalIndex);
      
      const textDiv = editBtn.closest(".text-item").querySelector(".text");
      const originalText = textDiv.textContent;

      // Crear textarea para edición
      const textarea = document.createElement("textarea");
      textarea.className = "edit-textarea";
      textarea.value = originalText;
      textDiv.replaceWith(textarea);
      textarea.focus();

      // Guardar cambios
      const saveEdit = () => {
        const newText = textarea.value.trim();
        if (!newText) {
          alert("El texto no puede estar vacío.");
          return;
        }

        chrome.storage.local.get({ copiedItems: [] }, ({ copiedItems }) => {
          const updatedItems = [...copiedItems];
          updatedItems[originalIndex] = {
            ...updatedItems[originalIndex],
            text: newText
          };
          chrome.storage.local.set({ copiedItems: updatedItems }, loadTexts);
        });
      };

      // Eventos para guardar cambios
      textarea.addEventListener("blur", saveEdit);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          saveEdit();
        }
      });
    }
  });

  // Eliminar ítem corregido
  textList.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      const originalIndex = parseInt(deleteBtn.dataset.originalIndex);
      
      chrome.storage.local.get({ copiedItems: [] }, ({ copiedItems }) => {
        const updated = copiedItems.filter((_, i) => i !== originalIndex);
        chrome.storage.local.set({ copiedItems: updated }, loadTexts);
      });
    }
  });

  // Búsqueda actualizada
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    chrome.storage.local.get({ copiedItems: [] }, ({ copiedItems }) => {
      const filtered = copiedItems
        .map((item, index) => ({ ...item, originalIndex: index }))
        .filter(
          (item) =>
            item.text.toLowerCase().includes(query) ||
            (item.url && item.url.toLowerCase().includes(query))
        )
        .reverse();
      renderList(filtered);
    });
  });

  // Exportar
  document.querySelectorAll(".export-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const format = btn.dataset.format;
      const { copiedItems } = await chrome.storage.local.get({ copiedItems: [] });
      let content, fileName;

      if (format === "json") {
        content = JSON.stringify(copiedItems, null, 2);
        fileName = `clipboard-export-${Date.now()}.json`;
      } else {
        content = copiedItems
          .map(
            (item) =>
              `Texto: ${item.text}\nURL: ${item.url || "Sin URL"}\nFecha: ${new Date(
                item.timestamp
              ).toLocaleString()}\n${"-".repeat(50)}`
          )
          .join("\n\n");
        fileName = `clipboard-export-${Date.now()}.txt`;
      }

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  });

  // Importar
  document.getElementById("importBtn").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const text = await file.text();
      let importedItems = [];
  
      if (file.name.endsWith(".json")) {
        importedItems = JSON.parse(text);
      } else if (file.name.endsWith(".txt")) {
        importedItems = text.split("\n" + "-".repeat(50))
          .map((block) => {
            // Extraer componentes con mejor expresión regular
            const text = block.match(/Texto: (.*?)(\n|$)/)?.[1]?.trim() || "";
            const url = block.match(/URL: (.*?)(\n|$)/)?.[1]?.trim() || "";
            const fechaHora = block.match(/Fecha: (.*?)(\n|$)/)?.[1]?.trim();
            
            // Convertir fecha original al formato ISO
            let timestamp;
            if (fechaHora) {
              // Parsear formato español: DD/MM/AAAA HH:MM
              const [fecha, hora] = fechaHora.split(' ');
              const [dia, mes, anio] = fecha.split('/');
              const [horas, minutos] = hora.split(':');
              
              timestamp = new Date(
                parseInt(anio),
                parseInt(mes) - 1, // Meses son 0-based en JS
                parseInt(dia),
                parseInt(horas),
                parseInt(minutos)
              ).toISOString();
            } else {
              timestamp = new Date().toISOString(); // Si no hay fecha, usar actual
            }
  
            return { 
              text, 
              url: url || "unknown",
              timestamp 
            };
          })
          .filter(item => item.text);
      }
  
      if (Array.isArray(importedItems)) {
        const { copiedItems = [] } = await chrome.storage.local.get("copiedItems");
        const combinedItems = [...copiedItems, ...importedItems];
        
        await chrome.storage.local.set({ copiedItems: combinedItems });
        loadTexts();
        alert(`Importados ${importedItems.length} elementos con sus fechas originales`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  });

  // Borrar todo
  clearAllBtn.addEventListener("click", () => {
    if (confirm("¿Borrar todo el historial?")) {
      chrome.storage.local.set({ copiedItems: [] }, () => {
        // Forzar reinicio del array
        originalItems = [];
        loadTexts();
        alert("Historial borrado. Puedes comenzar de nuevo.");
      });
    }
  });
  // Inicializar
  loadTexts();
});