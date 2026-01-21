// ======================================
// ENVÍO A GOOGLE SHEETS EN TIEMPO REAL
// ======================================

// Solo necesitas la URL de tu Apps Script Web App
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbza0_XOCs2adck2Z2MDv0QKMW4onXdgYCI8jQOA3Zmd5jVsQdkYQC6l2BeDkZmyXtRn/exec";

// Función para enviar datos a Google Sheets
let debounceTimer;

export async function enviarAGoogleSheets(datos) {
    // Si ya hay un envío pendiente, cancelarlo
    if (debounceTimer) clearTimeout(debounceTimer);

    // Esperar 2 segundos antes de enviar realmente
    debounceTimer = setTimeout(async () => {
        try {
            if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "TU_APPS_SCRIPT_URL_AQUI") {
                console.error("Por favor configura la URL de Apps Script");
                return;
            }

            console.log("Iniciando envío de datos a Google Sheets (Debounced)...");
            console.log("URL:", APPS_SCRIPT_URL);
            console.log("Cantidad de registros:", datos.length);

            const payload = {
                datos: datos
            };

            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload),
            });

            console.log("Status:", response.status);

            // Intentar leer la respuesta
            let result;
            const textResponse = await response.text();
            
            try {
                result = JSON.parse(textResponse);
                console.log("Datos sincronizados con Google Sheets:", result);
            } catch (e) {
                console.warn("La respuesta no es JSON válido (posible error de HTML/Auth):", textResponse);
                console.log("Raw response:", textResponse);
                result = { success: false, raw: textResponse };
            }

            return result;

        } catch (error) {
            console.error("Error enviando datos a Google Sheets:", error);
        }
    }, 2000); // 2 segundos de espera
}
