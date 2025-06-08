// =======================================================
//          ARCHIVO galeria.js - VERSIÓN FINAL
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar las opciones del menú de mesas dinámicamente
    const mesaSelect = document.getElementById('mesaSelect');
    if (mesaSelect) {
        const numeroDeMesas = 12;
        for (let i = 1; i <= numeroDeMesas; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `🍽️ Mesa ${i}`;
            mesaSelect.appendChild(option);
        }
        mesaSelect.addEventListener("change", cargarFotosDeMesa);
    }

    // 2. Configurar la lógica para cerrar el modal (lightbox)
    const modal = document.getElementById("imageModal");
    const span = document.querySelector(".modal-close");

    if (modal && span) {
        // Cierra el modal al hacer clic en la 'X'
        span.onclick = function() {
            modal.style.display = "none";
        }
        // Cierra el modal al hacer clic fuera de la imagen
        modal.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        }
    }
});

// Configuración de Supabase
const SUPABASE_URL = "https://qzwzvwmaxuyxivzcqohw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d3p2d21heHV5eGl2emNxb2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNDY4NzgsImV4cCI6MjA2NDgyMjg3OH0.oSul8Xr6GamTPB4E6--3UFbtek1StSv-fuLNIavUFxQ";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// Función principal para cargar las fotos
async function cargarFotosDeMesa() {
    const mesaSelect = document.getElementById("mesaSelect");
    const galeriaPreview = document.getElementById("galeriaPreview");
    const galeriaStatus = document.getElementById("galeriaStatus");
    const downloadAllBtn = document.getElementById("downloadAllBtn");

    const mesa = mesaSelect.value;
    
    galeriaPreview.innerHTML = "";
    galeriaStatus.innerHTML = "";
    if(downloadAllBtn) downloadAllBtn.style.display = "none";

    if (!mesa) return;

    galeriaStatus.innerHTML = '<div class="status-message status-loading"><i class="fas fa-spinner fa-spin"></i> Cargando fotos...</div>';

    try {
        const { data, error } = await client.storage
            .from("fotos")
            .list(`mesa-${mesa}`, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
            galeriaStatus.innerHTML = `<div class="status-message status-error">Error al listar fotos: ${error.message}</div>`;
            return;
        }

        if (!data || data.length === 0) {
            galeriaStatus.innerHTML = '<div class="status-message status-error">No se encontraron fotos para esta mesa.</div>';
            return;
        }

        galeriaStatus.innerHTML = "";
        galeriaPreview.style.display = "grid";

        data.forEach(item => {
            const url = `${SUPABASE_URL}/storage/v1/object/public/fotos/mesa-${mesa}/${item.name}`;
            
            const img = document.createElement("img");
            img.src = url;
            img.alt = item.name;
            img.loading = "lazy";
            img.style.cursor = "pointer"; // Cursor para indicar que es clickeable
            img.style.width = "100%";
            img.style.borderRadius = "0.5rem";
            img.style.objectFit = "cover";

            // --- ESTA ES LA LÓGICA CLAVE PARA AMPLIAR LA IMAGEN ---
            img.onclick = function() {
                const modal = document.getElementById("imageModal");
                const modalImg = document.getElementById("modalImage");
                if (modal && modalImg) {
                    modal.style.display = "block";
                    modalImg.src = this.src;
                }
            };
            // --- FIN DE LA LÓGICA CLAVE ---

            const div = document.createElement("div");
            div.className = "preview-item";
            div.appendChild(img);
            galeriaPreview.appendChild(div);
        });

        if (data.length > 0 && downloadAllBtn) {
            setupDownloadButton(data, mesa);
        }

    } catch (err) {
        galeriaStatus.innerHTML = `<div class="status-message status-error">Error inesperado: ${err.message}</div>`;
    }
}

// Función para configurar el botón de descarga
function setupDownloadButton(files, mesa) {
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    downloadAllBtn.style.display = "block";

    const newBtn = downloadAllBtn.cloneNode(true);
    downloadAllBtn.parentNode.replaceChild(newBtn, downloadAllBtn);

    newBtn.addEventListener('click', async () => {
        newBtn.disabled = true;
        newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';

        try {
            const zip = new JSZip();
            const photoPromises = files.map(async (item) => {
                const url = `${SUPABASE_URL}/storage/v1/object/public/fotos/mesa-${mesa}/${item.name}`;
                const response = await fetch(url);
                const blob = await response.blob();
                zip.file(item.name, blob);
            });
            
            await Promise.all(photoPromises);

            const content = await zip.generateAsync({ type: "blob" });
            
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `fotos_mesa_${mesa}_giu15.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error("Error al crear el ZIP:", err);
        } finally {
            newBtn.disabled = false;
            newBtn.innerHTML = '<i class="fas fa-download"></i> Descargar Todas';
        }
    });
}