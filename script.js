// Recuperar el estado actual de la extensión
function initializeExtensionToggle() {
    chrome.storage.local.get('extensionEnabled', function(data) {
        const toggle = document.getElementById('toggleExtension');
        const status = document.getElementById('status');
        toggle.checked = data.extensionEnabled !== false; // Por defecto, activada

        // Detectar cambios en el interruptor
        toggle.addEventListener('change', function() {
            chrome.storage.local.set({ extensionEnabled: toggle.checked }, function() {
                chrome.tabs.reload(); // Recargar la pestaña actual
            });
        });
    });
}

// Recuperar el estado actual de la opción de censura
function initializeCensureToggle() {
    chrome.storage.local.get('censureEnabled', function(data) {
        const toggle = document.getElementById('toggleCensure');
        const status = document.getElementById('censureStatus');
        toggle.checked = data.censureEnabled !== false; // Por defecto, activada

        // Detectar cambios en el interruptor
        toggle.addEventListener('change', function() {
            chrome.storage.local.set({ censureEnabled: toggle.checked }, function() {
                chrome.tabs.reload(); // Recargar la pestaña actual
            });
        });
    });
}

// Recuperar el estado actual de la opción de color de texto
function initializeTextColorToggle() {
    chrome.storage.local.get('textColorEnabled', function(data) {
        const textColorToggle = document.getElementById('toggleTextColor');
        const textStatus = document.getElementById('textStatus');
        textColorToggle.checked = data.textColorEnabled !== false; // Por defecto activado

        // Detectar cambios en el interruptor
        textColorToggle.addEventListener('change', function() {
            chrome.storage.local.set({ textColorEnabled: textColorToggle.checked });
            chrome.tabs.reload(); // Recargar la pestaña actual
        });
    });
}

// Recuperar el color guardado y aplicarlo automáticamente al cargar la página
chrome.storage.local.get("kickColor", function (data) {
    if (data.kickColor) {
        applyColor(data.kickColor); // Aplica el color guardado
    } else {
        console.log("No se ha guardado ningún color.");
    }
});

// Función para aplicar el color en la página
function applyColor(color) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) return;

        chrome.runtime.sendMessage({
            action: "changeColor",
            tabId: tabs[0].id,
            color: color
        }, function(response) {
            if (response && response.success) {
                console.log("CSS inyectado correctamente");
            } else {
                console.error("Error al inyectar CSS");
            }
        });
    });
}

// Initialize color buttons
function initializeColorButtons() {
    const colorButtons = document.querySelectorAll('.color-btn');
    const hueWheel = document.getElementById('hueWheel'); // Get the hue wheel element

    colorButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedColor = this.getAttribute('data-color'); // Get the color from the button's data attribute
            applyColor(selectedColor); // Call the function to apply the color
            chrome.storage.local.set({ kickColor: selectedColor }); // Save the selected color
            hueWheel.value = selectedColor; // Update the hue wheel to match the button color
        });
    });
}

// Add this inside the initializeColorButtons function or create a new function for the hue wheel
function initializeHueWheel() {
    const hueWheel = document.getElementById('hueWheel');

    hueWheel.addEventListener('input', function() {
        const selectedColor = this.value; // Get the selected color from the hue wheel
        applyColor(selectedColor); // Call the function to apply the color
        chrome.storage.local.set({ kickColor: selectedColor }); // Save the selected color
    });
}

// Call the initializeHueWheel function after initializing other buttons
initializeColorButtons();
initializeHueWheel();

// Función para abrir y cerrar el modal de emotes
function initializeEmotesModal() {
    document.getElementById('openEmotesModalBtn').addEventListener('click', function() {
        const emotesModal = document.getElementById('emotesModal');
        const autor = document.getElementById('autor'); // Get the autor element
        const isModalOpen = emotesModal.style.display === 'flex';

        // Alternar la visibilidad del modal
        if (isModalOpen) {
            emotesModal.style.display = 'none';
            this.textContent = "Ver emotes";  // Cambiar el texto del div cuando se cierra
            autor.style.display = 'block'; // Show the autor element when closing the modal
        } else {
            emotesModal.style.display = 'flex';
            this.textContent = "Cerrar emotes";  // Cambiar el texto del div cuando se abre
            autor.style.display = 'none'; // Hide the autor element when opening the modal

            // Llamar a la extensión para obtener los emotes de May solo si se abre el modal
            chrome.runtime.sendMessage({ action: 'fetchEmotes' }, function(response) {
                if (response && response.emotes && response.emotes.length > 0) {
                    displayEmotes(response.emotes);
                } else {
                    document.getElementById('emoteList').innerHTML = "<p>No se encontraron emotes.</p>";
                }
            });
        }
    });

    // Función para cerrar la modal cuando se haga clic fuera de ella
    document.getElementById('emotesModal').addEventListener('click', function(event) {
        if (event.target === this) {  // Si el clic fue fuera del contenido del modal
            this.style.display = 'none';
            document.getElementById('openEmotesModalBtn').textContent = "Ver emotes";  // Resetear el texto del botón
        }
    });
}

// Función para mostrar los emotes con su nombre
function displayEmotes(emotes) {
    const emoteList = document.getElementById('emoteList');
    const searchInput = document.getElementById('searchEmotes');
    const sortAscButton = document.getElementById('sortAsc');
    const sortDescButton = document.getElementById('sortDesc');

    // Limpiar la lista de emotes antes de agregar los nuevos
    emoteList.innerHTML = '';

    // Filtrar los emotes según lo que el usuario escribe
    searchInput.addEventListener('input', function() {
        const query = searchInput.value.toLowerCase();
        const filteredEmotes = emotes.filter(emote => emote.name.toLowerCase().includes(query));
        displayEmotesList(filteredEmotes); // Actualiza la lista con los emotes filtrados
    });

    // Función para mostrar la lista de emotes
    function displayEmotesList(emotesToDisplay) {
        emoteList.innerHTML = '';  // Limpiar lista anterior

        chrome.storage.local.get("kickColor", function(data) {
            const selectedColor = data.kickColor || "#ff9800"; // Si no hay color guardado, usar un valor por defecto

            emotesToDisplay.forEach(emote => {
                const emoteDiv = document.createElement('div');
                emoteDiv.classList.add('emote-item'); // Add class for styling

                const emoteImg = document.createElement('img');
                emoteImg.src = emote.url;
                emoteImg.alt = emote.name;
                emoteImg.style.width = '50px';
                emoteImg.style.height = '50px';
                emoteImg.style.cursor = 'pointer'; // Change cursor to pointer on hover

                // Add event listener to copy emote name when the image is clicked
                emoteImg.addEventListener('click', function() {
                    navigator.clipboard.writeText(emote.name).then(() => {
                        // Create the tooltip
                        const tooltip = document.createElement('div');
                        tooltip.textContent = `¡${emote.name} ha sido copiado al portapapeles!`;
                        tooltip.style.position = 'absolute';
                        tooltip.style.width = '100px';
                        tooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
                        tooltip.style.height = 'auto';
                        tooltip.style.backgroundColor = '#333';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '5px';
                        tooltip.style.borderRadius = '5px';
                        tooltip.style.zIndex = '1000';
                        tooltip.style.fontSize = '12px';

                        // Calculate tooltip position
                        const rect = emoteImg.getBoundingClientRect();
                        document.body.appendChild(tooltip); // Append tooltip to get its width
                        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`; // Adjust position to be above
                        tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`; // Center tooltip
                        // Remove tooltip after 2 seconds
                        setTimeout(() => {
                            tooltip.style.transition = 'opacity 0.3s';
                            tooltip.style.opacity = '0';
                            setTimeout(() => {
                                document.body.removeChild(tooltip);
                            }, 500);
                        }, 1000);
                    }).catch(err => {
                        console.error('Error al copiar al portapapeles: ', err);
                    });
                });

                const emoteName = document.createElement('p');
                emoteName.textContent = emote.name;
                emoteName.style.fontSize = '12px'; // Set a default font size
                emoteName.style.color = '#fff';
                emoteName.style.cursor = 'pointer'; // Change cursor to pointer on hover
                emoteName.style.margin = '0'; // Remove margin
                emoteName.style.maxWidth = '80px'; // Set a maximum width for the name
                emoteName.style.overflow = 'hidden'; // Hide overflow text
                emoteName.style.whiteSpace = 'nowrap'; // Prevent text from wrapping
                emoteName.style.textOverflow = 'ellipsis'; // Show "..." for overflow text

                // Cambiar color al pasar el mouse, usando el color seleccionado
                emoteName.addEventListener('mouseover', function() {
                    emoteName.style.color = selectedColor;  // Use the selected color
                });

                // Volver al color original cuando el mouse se va
                emoteName.addEventListener('mouseout', function() {
                    emoteName.style.color = '#fff';  // Revert to white
                });

                // Existing event to copy the name when the text is clicked
                emoteName.addEventListener('click', function() {
                    navigator.clipboard.writeText(emote.name).then(() => {
                        // Create the tooltip
                        const tooltip = document.createElement('div');
                        tooltip.textContent = `¡${emote.name} ha sido copiado al portapapeles!`;
                        tooltip.style.position = 'absolute';
                        tooltip.style.width = '100px';
                        tooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
                        tooltip.style.height = 'auto';
                        tooltip.style.backgroundColor = '#333';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '5px';
                        tooltip.style.borderRadius = '5px';
                        tooltip.style.zIndex = '1000';
                        tooltip.style.fontSize = '12px';

                        // Calculate tooltip position
                        const rect = emoteName.getBoundingClientRect();
                        document.body.appendChild(tooltip); // Append tooltip to get its width
                        tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`; // Adjust position to be above
                        tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`; // Center tooltip
                        // Remove tooltip after 2 seconds
                        setTimeout(() => {
                            tooltip.style.transition = 'opacity 0.3s';
                            tooltip.style.opacity = '0';
                            setTimeout(() => {
                                document.body.removeChild(tooltip);
                            }, 500);
                        }, 1000);
                    }).catch(err => {
                        console.error('Error al copiar al portapapeles: ', err);
                    });
                });

                emoteDiv.appendChild(emoteImg);
                emoteDiv.appendChild(emoteName);
                emoteList.appendChild(emoteDiv);
            });
        });
    }

    // Mostrar los emotes por defecto
    displayEmotesList(emotes);

    // Ordenar los emotes en orden ascendente
    sortAscButton.addEventListener('click', function() {
        const sortedEmotes = [...emotes].sort((a, b) => a.name.localeCompare(b.name));
        displayEmotesList(sortedEmotes);
    });

    // Ordenar los emotes en orden descendente
    sortDescButton.addEventListener('click', function() {
        const sortedEmotes = [...emotes].sort((a, b) => b.name.localeCompare(a.name));
        displayEmotesList(sortedEmotes);
    });
}

// Initialize all functions
initializeExtensionToggle();
initializeCensureToggle();
initializeTextColorToggle();
initializeColorButtons();
initializeHueWheel();
initializeEmotesModal();
