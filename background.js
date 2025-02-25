const SEVEN_TV_API = "https://7tv.io/v3/users/twitch/150155452"; // Reemplaza con el ID real

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {  
    if (request.action === "fetchEmotes") {
        fetch(SEVEN_TV_API)
            .then(response => response.json())
            .then(data => {
                console.log("Respuesta de 7TV:", data);

                if (!data.user || !data.user.emote_sets) {
                    console.error("No se encontraron sets de emotes.");
                    sendResponse({ emotes: [] });
                    return;
                }

                const maaylenSet = data.user.emote_sets.find(set => set.name === "Maaylen's Emotes");

                if (!maaylenSet) {
                    console.error("No se encontró el set 'Maaylen's Emotes'.");
                    sendResponse({ emotes: [] });
                    return;
                }

                console.log("ID del set de Maaylen:", maaylenSet.id);

                return fetch(`https://7tv.io/v3/emote-sets/${maaylenSet.id}`);
            })
            .then(response => response.json())
            .then(setData => {
                console.log("Datos del set de Maaylen:", setData);

                if (!setData || !setData.emotes || setData.emotes.length === 0) {
                    console.error("El set no tiene emotes.");
                    sendResponse({ emotes: [] });
                    return;
                }

                const emotes = setData.emotes.map(emote => {
                    console.log(`Emote encontrado:`, emote);
                
                    if (!emote.data || !emote.data.host || !emote.data.host.files || emote.data.host.files.length === 0) {
                        console.warn(`El emote ${emote.name} no tiene archivos disponibles.`);
                        return null;
                    }
                
                    // Buscar la mejor calidad disponible (preferimos WEBP, si no AVIF, y si no GIF)
                    const file = emote.data.host.files.find(file => file.format === "WEBP")
                              || emote.data.host.files.find(file => file.format === "AVIF") 
                              || emote.data.host.files.find(file => file.format === "GIF");
                
                    if (!file) {
                        console.warn(`No se encontró un archivo válido para el emote ${emote.name}`);
                        return null;
                    }
                
                    const url = `https:${emote.data.host.url}/${file.name}`;
                    return { name: emote.name, url };
                }).filter(emote => emote !== null);
                
                console.log("✅ Emotes extraídos:", emotes);
                sendResponse({ emotes });
            })
            .catch(error => {
                console.error("❌ Error al obtener emotes de 7TV:", error);
                sendResponse({ emotes: [] });
            });

        return true;
    }
});



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "changeColor") {
        chrome.scripting.insertCSS({
            target: { tabId: request.tabId },
            css: `
                .bg-green-500, 
                .hover\\:bg-green-600:hover, 
                .focus-visible\\:bg-green-500:focus-visible {
                    background-color: ${request.color} !important;
                }

                .bg-green-500 {
                    --tw-bg-opacity: 1;
                    background-color: ${request.color} !important;
                }

                /* Cambiar el color del texto para que sea visible */
                .text-green-950, 
                .hover\\:text-green-900:hover {
                    color: #141517 !important;
                }

                /* Asegurar que el SVG también cambie de color */
                .fill-current {
                    fill: #141517 !important;
                }

                /* Cambiar el color del borde de .border-green-500 */
                .border-green-500 {
                    --tw-border-opacity: 1;
                    border-color: ${request.color} !important;  
                    background-color: ${request.color}50 !important; 
                }

                .ring-green-500, .ring-primary {
                    --tw-ring-opacity: 1;
                    --tw-ring-color: ${request.color} !important;  
                }
                
                .text-\\[rgb\\(83\\2c 252\\2c 24\\)\\] {
                    --tw-text-opacity: 1;
                    color: ${request.color} !important;  
                }

                .data-\\[state\\=checked\\]\\:bg-green-500[data-state=checked] {
                    --tw-bg-opacity: 1;
                    background-color: ${request.color} !important; 
                }
                

                .after\\:bg-green-500:after, .after\\:bg-primary:after {
                    content: var(--tw-content);
                    --tw-bg-opacity: 1;
                    background-color: ${request.color} !important; 
                }

                .data-\\[state\\=checked\\]\\:outline-green-600[data-state=checked] {
                    outline-color:${request.color} !important; 
                }

                .data-\\[state\\=checked\\]\\:bg-green-800[data-state=checked] {
                    --tw-bg-opacity: 1;
                    background-color: #141517 !important;
                }

                .text-primary {
                    --tw-text-opacity: 1;
                    color: ${request.color} !important; 
                }

                .\\[\\&_svg\\]\\:fill-highlight-base svg {
                    fill: ${request.color} !important; 
                }
                
                .\\[\\&_svg\\]\\:fill-green-500 svg {
                    fill: ${request.color} !important; 
                }

                .bg-green-500 {
                    --tw-bg-opacity: 1;
                    background-color: ${request.color} !important; 
                }

                .bg-primary, .bg-primary:after {
                    --tw-bg-opacity: 1;
                    background-color: ${request.color} !important; 
                }

                .data-\\[state\\=checked\\]\\:border-primary[data-state=checked] {
                    --tw-border-opacity: 1;
                    border-color: ${request.color} !important; 
                }

                .fill-primary {
                    fill: ${request.color} !important; 
                }

                .betterhover\\:hover\\:text-primary:hover {
                    --tw--text-opacity: 1;
                    color: ${request.color} !important; 
                }

                a:hover {
                 color: ${request.color} !important; 
                }
            `
        }, () => {
            sendResponse({ success: true });
        });

        return true;  // Para permitir que sendResponse funcione de manera asíncrona
    }
});
