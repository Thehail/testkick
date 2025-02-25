// Recupera los estados actuales de las opciones de emotes y color de texto
chrome.storage.local.get(['extensionEnabled', 'textColorEnabled', 'censureEnabled'], function(data) {
    const isExtensionEnabled = data.extensionEnabled !== false;  // Si los emotes están activados o no
    const isTextColorEnabled = data.textColorEnabled !== false;  // Si el color de texto está activado o no
    const isCensureEnabled = data.censureEnabled !== false;  // Si la censura está activado o no
   
    // Ejecutar replaceEmotesInChat con ambos estados
    replaceEmotesInChat(isExtensionEnabled, isTextColorEnabled, isCensureEnabled); // Procesamos emotes y color de texto según cada uno
});


// Variable para almacenar los emotes obtenidos

let emoteMap = {};

// Función para obtener los emotes desde el background
function fetchEmotes() {
    chrome.runtime.sendMessage({ action: "fetchEmotes" }, response => {
        if (response && response.emotes) {
            emoteMap = Object.fromEntries(response.emotes.map(e => [e.name, e.url]));
            console.log("Mapa de emotes cargado:", emoteMap); // Verifica que se estén guardando bien
        }
    });
}


// Función para reemplazar los emotes en el chat y detectar mensajes con palabras baneadas
function replaceEmotesInChat(isEmotesEnabled, isTextColorEnabled, isCensureEnabled) {
    const messages = document.querySelectorAll(".betterhover\\:group-hover\\:bg-shade-lower:not([data-processed])");

    messages.forEach(msg => {
        let textElement = msg.querySelector(".font-normal");
        if (!textElement) return; // Si no hay mensaje, salimos

        let text = textElement.innerHTML; // Obtener el HTML completo del mensaje

        // 📌 Buscar el nombre del usuario en el botón correspondiente
        const usernameElement = msg.querySelector("button.inline.font-bold");
        const username = usernameElement ? usernameElement.textContent.trim() : "";

        // 🏆 Detectar insignias del usuario
        const userRoles = identifyUserRoles(msg);

        // 🎨 Aplicar color según el rol del usuario si la opción de color está activada
        if (isTextColorEnabled) {
            if(username === "BotRix"){
                msg.style.color = "#31B003"; // Verde si es el bot
            }
            else if (userRoles.isModerator) {
                msg.style.color = "#8EE0FB"; // 🔵 Azul (Moderador)
            } else if (userRoles.isOG) {
                msg.style.color = "#FBC88E"; // 🟠 Naranja (OG) 
            } else if (userRoles.isVIP) {
                msg.style.color = "#FBC88E"; // 🟠 Azul (VIP)
            } else if (userRoles.isSubscriber) {
                msg.style.color = "#FFFFFF"; // 🟡 Amarillo (Suscriptor) Deshabilitado temporalmente
            }
        } else {
            msg.style.color = "#FFFFFF"; // Sin color si la opción de color está desactivada
        }

        // 🚨 Verificar si el mensaje contiene palabras baneadas (más de 2 asteriscos seguidos)
        if (/\*\*/.test(text) && isCensureEnabled) {
            textElement.style.color = "#A8B1B8";  // Ocultar texto original
            textElement.style.fontSize = "0.1px";

            const span = document.createElement("span");
            span.textContent = "Este mensaje contiene palabras baneadas";
            span.style.color = "#FF0000";
            span.style.fontSize = "13px";
            span.classList.add("font-normal");
            textElement.appendChild(span);

            msg.setAttribute("data-processed", "true");
            return; // No seguimos procesando si ya detectamos una palabra baneada
        }

        // ⛔ Evitar procesar mensajes que ya tienen emotes de Kick
        if (text.includes('<img') && text.includes('src="https://files.kick.com/')) {
            msg.setAttribute("data-processed", "true");
            return;
        }

        let originalText = text; // Guardamos el HTML original
        let emoteName = "";
        let emoteFound = false;
        let emoteUrl = "";

        for (const [name, url] of Object.entries(emoteMap)) {
            const escapedName = escapeRegExp(name);
            const regex = new RegExp(`${escapedName}`, "g"); // Ya no usamos \b


            if (regex.test(text)) {
                emoteName = name;
                emoteFound = true;
                emoteUrl = url;
                break; // Solo usamos el primer emote encontrado
            }
        }
    
        if (emoteFound && isEmotesEnabled) {
            // 📌 Guardar el color original antes de ocultar el texto
            let originalColor = msg.style.color || "#FFFFFF";  
        
            textElement.style.color = "#A8B1B8";  // Ocultar texto original
            textElement.style.fontSize = "0.1px";
            
            const words = textElement.textContent.split(/\s+/); // Dividir el texto por espacios
        
            words.forEach(word => {
                if (emoteMap[word]) {  // Si es un emote, lo reemplazamos con una imagen
                    const img = document.createElement("img");
                    img.src = emoteMap[word];
                    img.title = word;
                    img.classList.add("emote-img");
                    img.setAttribute("data-emote-name", word); 
                    img.style.display = "inline-block";
                    img.style.verticalAlign = "middle";
                    img.style.cursor = "pointer"; // Cambia el cursor a puntero al pasar el ratón
                    img.style.transition = "transform 0.2s ease-in-out"; // Suaviza la animación

                    // Evento para agrandar la imagen al hacer hover
                    img.addEventListener("mouseenter", () => {
                        img.style.transform = "scale(1.2)"; // Aumenta un 20%
                    });

                    img.addEventListener("mouseleave", () => {
                        img.style.transform = "scale(1)"; // Vuelve al tamaño normal
                    });
                    textElement.appendChild(img);
                } else {  // Si no es un emote, mantenemos el texto y respetamos el color original
                    const span = document.createElement("span");
                    span.textContent = word + " "; // Agregar el texto con espacio
                    span.style.color = originalColor;  // ✅ Aplicar el color original del mensaje
                    span.style.fontSize = "13px";
                    span.classList.add("font-normal");
                    textElement.appendChild(span);
                }
            });
        }        
        

        // ✅ Marcar el mensaje como procesado
        msg.setAttribute("data-processed", "true");
    });

    
// ✨ Añadir evento para copiar el nombre del emote al hacer clic
const emoteImages = document.querySelectorAll('img.emote-img');
emoteImages.forEach(img => {
    img.addEventListener('click', function() {
        const emoteName = img.getAttribute('data-emote-name'); // Obtener el nombre del emote desde el atributo data-emote-name
        if (emoteName) {
            // 📋 Copiar al portapapeles
            navigator.clipboard.writeText(emoteName)
                .then(() => {
                    createTooltip(emoteName,img);
                    console.log(`Emote ${emoteName} copiado al portapapeles!`);
                })
                .catch(err => {
                    console.error('Error al copiar al portapapeles:', err);
                });
        }
    });
});

}


// 🔍 Función para identificar si un usuario es Moderador, OG, VIP o Suscriptor
function identifyUserRoles(msg) {
    const svgs = msg.querySelectorAll("svg");
    const images = msg.querySelectorAll("img");

    let isModerator = false;
    let isOG = false;
    let isVIP = false;
    let isSubscriber = false;

    svgs.forEach(svg => {
        const path = svg.querySelector("path");
        if (path) {
            const fillColor = path.getAttribute("fill");

            // 🎖️ Moderador (color: #00C7FF)
            if (fillColor === "#00C7FF") {
                isModerator = true;
            }

            // 🏅 OG (contiene "url(#OGBadge)")
            if (fillColor && fillColor.includes("url(#OGBadge")) {
                isOG = true;
            }

            // ⭐ VIP (contiene "url(#VIPBadgeA)")
            if (fillColor && fillColor.includes("url(#VIPBadgeA)")) {
                isVIP = true;
            }
        }
    });

    // 🟡 Verificar si tiene la insignia de suscriptor (imagen en lugar de SVG)
    images.forEach(img => {
        if (img.src.includes("channel_subscriber_badges")) {
            isSubscriber = true;
        }
    });

    return { isModerator, isOG, isVIP, isSubscriber };
}

// Función que escapa caracteres especiales en el nombre del emote para evitar errores en la expresión regular
function escapeRegExp(string) {
    return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, '\\$&'); // Escapa caracteres especiales
}

// Observador de cambios optimizado en el contenedor de chat para actualizar solo los mensajes nuevos
function observeChat() {
    const chatContainer = document.getElementById("chatroom-messages");

    if (chatContainer) {
        const observer = new MutationObserver(() => {
            console.log("¡Se detectó un cambio en el contenedor de chat!");

            // Verificamos si la extensión sigue activa antes de acceder a chrome.storage
            if (!chrome.runtime?.id) {
                console.log("Extensión inactiva o contexto invalidado.");
                return;
            }

            chrome.storage.local.get(['extensionEnabled', 'textColorEnabled', 'censureEnabled'], function(data) {
                const isExtensionEnabled = data.extensionEnabled !== false;
                const isTextColorEnabled = data.textColorEnabled !== false;
                const isCensureEnabled = data.censureEnabled !== false;
                replaceEmotesInChat(isExtensionEnabled, isTextColorEnabled, isCensureEnabled);
            });
        });

        observer.observe(chatContainer, {
            childList: true,
            subtree: true,
        });

        console.log("Observando cambios en el contenedor de chat");
    } else {
        console.log("No se encontró el contenedor de chat");
    }
}

// Ejecutar la función de obtener emotes y observar cambios en el chat al cargar la página
fetchEmotes();
observeChat();



// Función para inicializar el autocompletado en el chat
function initAutocomplete() {
    const chatInput = document.querySelector(".editor-input[contenteditable='true']");

    if (!chatInput) {
        console.log("No se encontró el input del chat.");
        return;
    }

    const suggestionBox = document.createElement("div");
    suggestionBox.classList.add("overflow-y-auto", "pt-1", "transition-opacity", "duration-300", "opacity-100");
    suggestionBox.style.position = "absolute";
    suggestionBox.style.transitionTimingFunction = "cubic-bezier(0.14, 0.98, 0.49, 1)";
    suggestionBox.style.backgroundColor = "rgba(23, 28, 30, 1)";
    suggestionBox.style.color = "#fff";
    suggestionBox.style.fontSize = "14px";
    suggestionBox.style.display = "none";
    suggestionBox.style.zIndex = "1000";
    suggestionBox.style.maxHeight = "150px";
    suggestionBox.style.overflowY = "auto";

    // Ajustar la posición del suggestionBox
    const rect = chatInput.getBoundingClientRect();

    document.body.appendChild(suggestionBox);

    let currentIndex = -1;

    chatInput.addEventListener("input", function () {
        const text = chatInput.innerText;
        const cursorPos = getCaretPosition(chatInput);
        const lastWord = getLastWord(text, cursorPos);

        if (lastWord.startsWith(";") && lastWord.length > 1) {
            const searchTerm = lastWord.substring(1).toLowerCase();
            const filteredEmotes = Object.keys(emoteMap).filter(emote =>
                emote.toLowerCase().includes(searchTerm)
            );

            if (filteredEmotes.length > 0) {
                showSuggestions(filteredEmotes, chatInput);
            } else {
                suggestionBox.style.display = "none";
                resetChatroomFooter(); // Reset background color when hiding
            }
        } else {
            suggestionBox.style.display = "none";
            resetChatroomFooter(); // Reset background color when hiding
        }
    });

    chatInput.addEventListener("keydown", function (event) {
        if (suggestionBox.style.display === "none") return;

        const items = suggestionBox.querySelectorAll(".autocomplete-item");

        if (event.key === "ArrowDown" || (event.ctrlKey && event.key.toLowerCase() === "j")) {
            event.preventDefault();
            currentIndex = (currentIndex + 1) % items.length;
            updateSelection(items);
        } else if (event.key === "ArrowUp" || (event.ctrlKey && event.key.toLowerCase() === "k")) {
            event.preventDefault();
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            updateSelection(items);
        } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            
            if (currentIndex < 0 && event.key === "Tab") {
                currentIndex = 0;
                updateSelection(items);
            }

            if (currentIndex >= 0 && items[currentIndex]) {
                replaceLastWordWithEmote(items[currentIndex].textContent);
                suggestionBox.style.display = "none";  // Cerrar el modal después de seleccionar
                resetChatroomFooter(); // Reset background color when hiding
                // Muestra el #quick-emotes-holder
                changeQuickEmotesState("block");
            }
        } else if (event.key === "Escape") {
            suggestionBox.style.display = "none";  // Cerrar el modal si presionas Escape
            resetChatroomFooter(); // Reset background color when hiding

            // Muestra el #quick-emotes-holder
        changeQuickEmotesState("block");
        }
    });

   

    function getCaretPosition(editableDiv) {
        let sel = window.getSelection();
        if (sel.rangeCount > 0) {
            let range = sel.getRangeAt(0);
            let preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(editableDiv);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            return preCaretRange.toString().length;
        }
        return 0;
    }

    function getLastWord(text, cursorPos) {
        const words = text.substring(0, cursorPos).split(/\s+/);
        return words[words.length - 1];
    }

    function showSuggestions(emotes, inputElement) {
        suggestionBox.innerHTML = "";
        suggestionBox.style.display = "block";
        suggestionBox.style.zIndex = "1";
        suggestionBox.style.borderRadius = "8px 8px 0 0";

        // Apply border color to suggestionBox
        suggestionBox.style.borderTop = "1px solid #a8b1b822";
        suggestionBox.style.borderRight = "1px solid #a8b1b822";
        suggestionBox.style.borderLeft = "1px solid #a8b1b822";

        // Log to check if the function is being called
        console.log("showSuggestions called");

        // Remove the #quick-emotes-holder element if it exists
        changeQuickEmotesState("none");

        // Apply border color to suggestionBox

        // Change background color of chatroom-footer
        const chatroomFooter = document.getElementById("chatroom-footer");
        if (chatroomFooter) {
            chatroomFooter.style.backgroundColor = "rgba(23, 28, 30, 1)";
            chatroomFooter.style.borderRight = "1px solid #a8b1b822"; // Apply color to right border
            chatroomFooter.style.borderBottom = "1px solid #a8b1b822"; // Apply color to bottom border
            chatroomFooter.style.borderLeft = "1px solid #a8b1b822"; // Apply color to left border
            chatroomFooter.style.zIndex = "2";
        }

        const rect = inputElement.getBoundingClientRect();
        suggestionBox.style.left = `${(rect.left - 61.5) / window.innerWidth * 100}%`;
        suggestionBox.style.bottom = `${window.innerHeight - rect.top + 10}px`; // Posicionar arriba del input
        suggestionBox.style.width = `340px`; // Establecer el ancho fijo a 340px

        const ul = document.createElement("ul");
        ul.classList.add("flex", "h-full", "flex-col", "gap-0.5", "overflow-y-auto", "px-1", "pb-1");

        // 🔹 Ordenar los emotes en orden alfabético descendente (de A a Z)
        emotes.sort((a, b) => a.localeCompare(b));

        emotes.forEach((emote) => {
            const li = document.createElement("li");
            li.classList.add("autocomplete-item", "px-1.5", "py-1.5", "text-sm", "font-medium", "rounded-sm", 
                "cursor-pointer", "transition-colors", "duration-200", "ease-out");
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.style.margin = "1px";
            li.style.gap = "8px";
     
            // Como no funciona el click del modal ha sido remplazado para buscar y copiar un emote
            li.addEventListener("click", function (event) {
                let item = event.target.closest(".autocomplete-item"); // Buscar el emote seleccionado
                if (item) {
                    let emoteName = item.innerText.trim(); // Obtener el nombre del emote
            
                    // 📋 Copiar al portapapeles
                    navigator.clipboard.writeText(emoteName);

                    // Create the tooltip
                    createTooltip(emoteName, item);
                }

                suggestionBox.style.display = "none";  // Cerrar el modal después de la selección
                resetChatroomFooter(); // Resetear el estilo del chat
                // Mostrar quick emotes
                changeQuickEmotesState("block");
            });

                        // Aplicar el estilo de hover manualmente
            li.addEventListener("mouseover", function () {
                li.style.backgroundColor = "#444";  // Cambiar el fondo cuando el mouse pasa
            });

            li.addEventListener("mouseout", function () {
                li.style.backgroundColor = "";        // Restaurar el fondo cuando el mouse se va
            
            });

            // Create the img element correctly
            const img = document.createElement("img");
            img.classList.add("aspect-square", "w-6");

            // Use the emote name to find the URL in emoteMap
            const emoteUrl = emoteMap[emote];
            if (emoteUrl) {
                img.src = emoteUrl;
            } else {
                console.warn(`URL no encontrada para el emote: ${emote}`);
            }

            img.alt = emote;
            img.loading = "lazy";

            const span = document.createElement("div");
            span.classList.add("flex", "items-center", "gap-1.5");
            span.textContent = emote;

            const div = document.createElement("div");
            div.classList.add("relative", "flex", "items-center", "gap-4");
            div.appendChild(img);
            div.appendChild(span);

            li.appendChild(div);
            ul.appendChild(li);
        });

        suggestionBox.appendChild(ul);
        currentIndex = -1;
    }
    
    function updateSelection(items) {
        if (!items.length || currentIndex < 0) return;
    
        // 🔹 Quitar fondo a todos los elementos antes de aplicar el nuevo seleccionado
         items.forEach(item => item.style.background = "rgb(23, 28, 30)");
    
        // 🔹 Obtener el ítem seleccionado
        const selectedItem = items[currentIndex];
        selectedItem.style.background = "#444";  // Marcar como seleccionado
    
        // 🔹 Obtener el contenedor de la lista (ul)
        const listContainer = suggestionBox.querySelector("ul");
    
        if (listContainer) {
            // 🔹 Ajustar scroll para que el ítem seleccionado esté siempre visible
            selectedItem.scrollIntoView({
                block: "nearest",  // Asegura que solo se desplace lo necesario
                inline: "nearest",
                behavior: "smooth" // Desplazamiento suave
            });
        }
    }
    
    function replaceLastWordWithEmote(emote) {
        let sel = window.getSelection();
        if (!sel.rangeCount) return;
    
        let range = sel.getRangeAt(0);
        let textNode = range.startContainer;
    
        // Si el nodo seleccionado no es de tipo texto, buscar el primer nodo de texto
        if (textNode.nodeType !== Node.TEXT_NODE) {
            if (textNode.childNodes.length > 0) {
                textNode = textNode.childNodes[range.startOffset]; 
            }
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
        }
    
        let text = textNode.nodeValue;
        let cursorPos = range.startOffset;
    
        // Separar el texto antes y después del cursor
        let beforeCursor = text.substring(0, cursorPos);
        let afterCursor = text.substring(cursorPos);
    
        console.log("beforeCursor:", beforeCursor);
        console.log("afterCursor:", afterCursor);
    
        // Reemplazar la última palabra que comienza con ';'
        let newBeforeCursor = beforeCursor.replace(/;\S*$/, emote);
    
        // Actualizar el nodo de texto
        textNode.nodeValue = newBeforeCursor + " " + afterCursor;
      
        // Mover el cursor después del emote insertado
        let newCursorPos = newBeforeCursor.length + 1;
  
        range.setStart(textNode, newCursorPos);
        range.setEnd(textNode, newCursorPos);
    
        sel.removeAllRanges();
        sel.addRange(range);

        // Remove the #quick-emotes-holder element if it exists
        changeQuickEmotesState("none");
    }

    
    

    function resetChatroomFooter() {
        const chatroomFooter = document.getElementById("chatroom-footer");
        if (chatroomFooter) {
            chatroomFooter.style.backgroundColor = ""; // Reset to default
            chatroomFooter.style.border = ""; // Reset border
        }
    }
    
}


// Llamar a la función después de cargar los emotes
fetchEmotes();
setTimeout(initAutocomplete, 2000);

function changeQuickEmotesState(state) {
    const quickEmotesHolder = document.getElementById('quick-emotes-holder');
    if (quickEmotesHolder) {
        console.log("#quick-emotes-holder found, add it");
        quickEmotesHolder.style.display = state;
    } else {
        console.log("#quick-emotes-holder not found");
    }
}

function createTooltip(emoteName, item) {
    const tooltip = document.createElement('div');
    tooltip.textContent = `¡${emoteName} ha sido copiado!`;
    tooltip.style.position = 'absolute';
    tooltip.style.width = '200px';
    tooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    tooltip.style.height = 'auto';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.zIndex = '1000';
    tooltip.style.fontSize = '12px';

    // Calculate tooltip position
    const rect = item.getBoundingClientRect();
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
}

