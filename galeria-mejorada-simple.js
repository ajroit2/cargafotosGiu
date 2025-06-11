// =======================================================
//          ARCHIVO galeria.js - VERSIÓN MEJORADA SIMPLE
// =======================================================

// Variables globales
let currentImages = [];
let currentImageIndex = 0;

// Configuración de Supabase (mantén tus credenciales originales)
const SUPABASE_URL = "https://qzwzvwmaxuyxivzcqohw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d3p2d21heHV5eGl2emNxb2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNDY4NzgsImV4cCI6MjA2NDgyMjg3OH0.oSul8Xr6GamTPB4E6--3UFbtek1StSv-fuLNIavUFxQ";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    initializeGallery();
});

// Inicialización
function initializeGallery() {
    setupMesaSelector();
    setupModal();
    setupToastContainer();
    loadTotalPhotosCount();
    
    // Efecto parallax suave para el hero
    window.addEventListener('scroll', handleParallax);
}

// Configurar selector de mesas
function setupMesaSelector() {
    const mesaSelect = document.getElementById('mesaSelect');
    if (!mesaSelect) return;

    // Generar opciones de mesas con iconos
    const numeroDeMesas = 12;
    for (let i = 1; i <= numeroDeMesas; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `🍽️ Mesa ${i}`;
        mesaSelect.appendChild(option);
    }

    mesaSelect.addEventListener('change', handleMesaChange);
}

// Manejar cambio de mesa
async function handleMesaChange() {
    const mesaSelect = document.getElementById('mesaSelect');
    const mesa = mesaSelect.value;
    
    if (!mesa) {
        hideGallery();
        return;
    }

    showLoading();
    await cargarFotosDeMesa();
}

// Mostrar loading
function showLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const galeriaPreview = document.getElementById('galeriaPreview');
    const mesaInfo = document.getElementById('mesaInfo');
    
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (galeriaPreview) galeriaPreview.innerHTML = '';
    if (mesaInfo) mesaInfo.style.display = 'none';
}

// Ocultar loading
function hideLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// Ocultar galería
function hideGallery() {
    const galeriaPreview = document.getElementById('galeriaPreview');
    const mesaInfo = document.getElementById('mesaInfo');
    const galeriaStatus = document.getElementById('galeriaStatus');
    
    if (galeriaPreview) galeriaPreview.innerHTML = '';
    if (mesaInfo) mesaInfo.style.display = 'none';
    if (galeriaStatus) galeriaStatus.innerHTML = '';
    
    currentImages = [];
}

// Función principal para cargar las fotos (mejorada)
async function cargarFotosDeMesa() {
    const mesaSelect = document.getElementById("mesaSelect");
    const galeriaPreview = document.getElementById("galeriaPreview");
    const galeriaStatus = document.getElementById("galeriaStatus");
    const mesaInfo = document.getElementById('mesaInfo');

    const mesa = mesaSelect.value;
    
    galeriaPreview.innerHTML = "";
    galeriaStatus.innerHTML = "";

    if (!mesa) return;

    try {
        const { data, error } = await client.storage
            .from("fotos")
            .list(`mesa-${mesa}`, { 
                limit: 200, 
                sortBy: { column: 'created_at', order: 'desc' } 
            });

        hideLoading();

        if (error) {
            showError(`Error al listar fotos: ${error.message}`);
            showToast('Error al cargar las fotos', 'error');
            return;
        }

        if (!data || data.length === 0) {
            showEmptyState();
            showToast('No se encontraron fotos para esta mesa', 'info');
            return;
        }

        // Preparar datos de imágenes
        currentImages = data.map(item => ({
            name: item.name,
            url: `${SUPABASE_URL}/storage/v1/object/public/fotos/mesa-${mesa}/${item.name}`,
            created_at: item.created_at
        }));

        // Mostrar galería
        displayGallery(currentImages);
        
        // Mostrar información de la mesa
        showMesaInfo(mesa, data.length, data[0]?.created_at);
        
        // Configurar botón de descarga
        setupDownloadButton(data, mesa);

        showToast('¡Fotos cargadas exitosamente!', 'success');

    } catch (err) {
        hideLoading();
        showError(`Error inesperado: ${err.message}`);
        showToast('Error inesperado al cargar fotos', 'error');
    }
}

// Mostrar galería
function displayGallery(images) {
    const galeriaPreview = document.getElementById('galeriaPreview');
    if (!galeriaPreview) return;

    galeriaPreview.innerHTML = '';
    galeriaPreview.style.display = "grid";
    
    images.forEach((image, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item loading';
        
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name;
        img.loading = 'lazy';
        img.style.cursor = "pointer";
        img.style.width = "100%";
        img.style.borderRadius = "0.5rem";
        img.style.objectFit = "cover";
        
        // Manejar carga de imagen
        img.onload = () => {
            div.classList.remove('loading');
        };
        
        img.onerror = () => {
            div.classList.remove('loading');
            div.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;"><i class="fas fa-image"></i></div>';
        };
        
        // Click para abrir modal
        img.onclick = () => openModal(index);
        
        div.appendChild(img);
        galeriaPreview.appendChild(div);
    });
}

// Mostrar estado vacío
function showEmptyState() {
    const galeriaStatus = document.getElementById('galeriaStatus');
    if (galeriaStatus) {
        galeriaStatus.innerHTML = `
            <div class="status-message" style="text-align: center; padding: 3rem; color: var(--mint-600);">
                <i class="fas fa-images" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h3>No hay fotos disponibles</h3>
                <p>Aún no se han subido fotos para esta mesa.</p>
            </div>
        `;
    }
}

// Mostrar error
function showError(message) {
    const galeriaStatus = document.getElementById('galeriaStatus');
    if (galeriaStatus) {
        galeriaStatus.innerHTML = `
            <div class="status-message" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 1rem; border-radius: 0.75rem; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                ${message}
            </div>
        `;
    }
}

// Mostrar información de la mesa
function showMesaInfo(mesa, photoCount, lastUpdate) {
    const mesaInfo = document.getElementById('mesaInfo');
    const photoCountEl = document.getElementById('photoCount');
    const lastUpdateEl = document.getElementById('lastUpdate');
    
    if (mesaInfo) mesaInfo.style.display = 'flex';
    if (photoCountEl) photoCountEl.textContent = photoCount;
    if (lastUpdateEl) {
        const date = lastUpdate ? new Date(lastUpdate).toLocaleDateString('es-AR') : '--';
        lastUpdateEl.textContent = date;
    }
}

// Configurar modal
function setupModal() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.modal-close');
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');
    const downloadBtn = document.getElementById('downloadImage');
    
    if (!modal) return;

    // Cerrar modal
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Navegación con teclado
    document.addEventListener('keydown', handleKeyNavigation);
    
    // Botones de navegación
    prevBtn?.addEventListener('click', showPreviousImage);
    nextBtn?.addEventListener('click', showNextImage);
    downloadBtn?.addEventListener('click', downloadCurrentImage);
}

// Abrir modal
function openModal(index) {
    if (!currentImages.length) return;
    
    currentImageIndex = index;
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalName = document.getElementById('modalImageName');
    
    if (modal && modalImg) {
        modal.style.display = 'block';
        modalImg.src = currentImages[index].url;
        if (modalName) modalName.textContent = currentImages[index].name;
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
    }
}

// Cerrar modal
function closeModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Navegación con teclado
function handleKeyNavigation(e) {
    const modal = document.getElementById('imageModal');
    if (!modal || modal.style.display !== 'block') return;
    
    switch(e.key) {
        case 'Escape':
            closeModal();
            break;
        case 'ArrowLeft':
            showPreviousImage();
            break;
        case 'ArrowRight':
            showNextImage();
            break;
    }
}

// Imagen anterior
function showPreviousImage() {
    if (currentImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    updateModalImage();
}

// Imagen siguiente
function showNextImage() {
    if (currentImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    updateModalImage();
}

// Actualizar imagen del modal
function updateModalImage() {
    const modalImg = document.getElementById('modalImage');
    const modalName = document.getElementById('modalImageName');
    
    if (modalImg && currentImages[currentImageIndex]) {
        modalImg.src = currentImages[currentImageIndex].url;
        if (modalName) modalName.textContent = currentImages[currentImageIndex].name;
    }
}

// Descargar imagen actual
function downloadCurrentImage() {
    if (!currentImages[currentImageIndex]) return;
    
    const link = document.createElement('a');
    link.href = currentImages[currentImageIndex].url;
    link.download = currentImages[currentImageIndex].name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Descarga iniciada', 'success');
}

// Configurar botón de descarga masiva (mejorado)
function setupDownloadButton(files, mesa) {
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    if (!downloadAllBtn) return;
    
    downloadAllBtn.style.display = "block";

    // Limpiar listeners anteriores
    const newBtn = downloadAllBtn.cloneNode(true);
    downloadAllBtn.parentNode.replaceChild(newBtn, downloadAllBtn);

    newBtn.addEventListener('click', async () => {
        if (!window.JSZip) {
            showToast('Error: JSZip no está disponible', 'error');
            return;
        }

        const originalText = newBtn.innerHTML;
        newBtn.disabled = true;
        newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';

        try {
            const zip = new JSZip();
            const photoPromises = files.map(async (item) => {
                try {
                    const url = `${SUPABASE_URL}/storage/v1/object/public/fotos/mesa-${mesa}/${item.name}`;
                    const response = await fetch(url);
                    const blob = await response.blob();
                    zip.file(item.name, blob);
                } catch (error) {
                    console.warn(`Error al descargar ${item.name}:`, error);
                }
            });
            
            await Promise.all(photoPromises);

            newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando archivo...';

            const content = await zip.generateAsync({ 
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 6 }
            });
            
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `fotos_mesa_${mesa}_giu15.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('¡Descarga completada!', 'success');

        } catch (err) {
            console.error("Error al crear el ZIP:", err);
            showToast('Error al descargar las fotos', 'error');
        } finally {
            newBtn.disabled = false;
            newBtn.innerHTML = originalText;
        }
    });
}

// Sistema de notificaciones toast
function setupToastContainer() {
    if (!document.getElementById('toastContainer')) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove después de 4 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Cargar contador total de fotos
async function loadTotalPhotosCount() {
    try {
        let total = 0;
        
        for (let mesa = 1; mesa <= 12; mesa++) {
            const { data } = await client.storage
                .from("fotos")
                .list(`mesa-${mesa}`, { limit: 1000 });
            
            if (data) total += data.length;
        }
        
        const totalPhotosEl = document.getElementById('totalPhotos');
        if (totalPhotosEl) {
            totalPhotosEl.textContent = total;
        }
        
    } catch (error) {
        console.warn('Error al cargar contador total:', error);
    }
}

// Efecto parallax suave
function handleParallax() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    
    if (hero && scrolled < window.innerHeight) {
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }
}

// Manejo de errores global
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
    showToast('Ha ocurrido un error inesperado', 'error');
});

// Manejo de promesas rechazadas
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promesa rechazada:', e.reason);
    showToast('Error de conexión', 'error');
});