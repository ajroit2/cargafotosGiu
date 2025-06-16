// =======================================================
//     ARCHIVO galeria.js - VERSIÓN SIMPLIFICADA (SIN "TODAS LAS FOTOS")
// =======================================================

// Variables globales
let currentImages = [];
let currentImageIndex = 0;

// Configuración de Supabase
const SUPABASE_URL = "https://qzwzvwmaxuyxivzcqohw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d3p2d21heHV5eGl2emNxb2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNDY4NzgsImV4cCI6MjA2NDgyMjg3OH0.oSul8Xr6GamTPB4E6--3UFbtek1StSv-fuLNIavUFxQ";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const mesasValidas = [1, 2, 3, 4, 5, 6, 8, 13, 14, 16, 17];

document.addEventListener('DOMContentLoaded', () => {
    initializeGallery();
});

function initializeGallery() {
    setupMesaSelector();
    setupModal();
    setupDownloadAllButton();
    loadTotalPhotosCount();
    // Ya no se cargan fotos al inicio, se espera la selección del usuario
    window.addEventListener('scroll', handleParallax);
}

function setupMesaSelector() {
    const mesaSelect = document.getElementById('mesaSelect');
    if (!mesaSelect) return;

    // Se eliminó la opción "Ver Todas las Fotos"

    mesasValidas.forEach((mesa) => {
        const option = document.createElement('option');
        option.value = mesa;
        option.textContent = `🍽️ Mesa ${mesa}`;
        mesaSelect.appendChild(option);
    });

    mesaSelect.addEventListener('change', handleMesaChange);
}

async function handleMesaChange() {
    const mesa = document.getElementById("mesaSelect").value;
    const downloadBtn = document.getElementById('downloadAllBtn');
    
    if (mesa) {
        showLoading();
        await cargarFotosDeMesa(mesa);
        downloadBtn.style.display = 'block';
    } else {
        // Si el usuario selecciona la opción por defecto, limpiamos la galería
        document.getElementById("galeriaPreview").innerHTML = '';
        document.getElementById("galeriaStatus").innerHTML = '<p class="upload-info">Seleccioná una mesa para ver las fotos.</p>';
        document.getElementById("mesaInfo").style.display = 'none';
        downloadBtn.style.display = 'none';
    }
}

async function cargarFotosDeMesa(mesa) {
    const galeriaPreview = document.getElementById("galeriaPreview");
    const galeriaStatus = document.getElementById("galeriaStatus");
    const mesaInfo = document.getElementById("mesaInfo");

    galeriaPreview.innerHTML = "";
    galeriaStatus.innerHTML = "";
    
    try {
        const path = `mesa-${mesa}`;
        const { data, error } = await client.storage.from("fotos").list(path, {
            limit: 500,
            sortBy: { column: 'created_at', order: 'desc' }
        });

        hideLoading();

        if (error || !data || data.length === 0) {
            galeriaStatus.innerHTML = "<p>Esta mesa todavía no ha subido fotos. ¡Sé el primero!</p>";
            updateMesaInfo(0);
            if (mesaInfo) mesaInfo.style.display = 'flex';
            return;
        }

        const validFiles = data.filter(item => item.name !== '.emptyFolderPlaceholder');
        
        currentImages = validFiles.map(item => ({
            name: item.name,
            url: `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}/${item.name}`,
            path: `${path}/${item.name}`
        }));

        displayImages(currentImages);
        updateMesaInfo(currentImages.length, validFiles[0]?.created_at);

        if (mesaInfo) mesaInfo.style.display = 'flex';

    } catch (error) {
        console.error("Error al cargar fotos de mesa:", error);
        galeriaStatus.innerHTML = "<p>Error al cargar las fotos.</p>";
        hideLoading();
    }
}

function displayImages(images) {
    const galeriaPreview = document.getElementById("galeriaPreview");
    galeriaPreview.innerHTML = '';
    galeriaPreview.style.display = "grid";

    images.forEach((image, index) => {
        const div = document.createElement("div");
        div.className = "preview-item loading";

        const img = document.createElement("img");
        img.src = image.url;
        img.alt = image.name;
        img.loading = "lazy";
        img.style.cursor = "pointer";
        img.onload = () => div.classList.remove("loading");
        img.onerror = () => div.style.display = 'none';
        img.onclick = () => openModal(index); // Ya no pasamos el array, usamos la variable global

        div.appendChild(img);
        galeriaPreview.appendChild(div);
    });
}

async function loadTotalPhotosCount() {
    const totalPhotosSpan = document.getElementById('totalPhotos');
    try {
        const { data, error } = await client.rpc('count_photos_in_bucket');
        if (error) throw error;
        totalPhotosSpan.textContent = data || 0;
    } catch (error) {
        console.error('Error contando fotos:', error);
        totalPhotosSpan.textContent = 'N/A';
    }
}

function updateMesaInfo(count, lastUpdate) {
    document.getElementById('photoCount').textContent = count;
    if (lastUpdate) {
        const date = new Date(lastUpdate);
        document.getElementById('lastUpdate').textContent = date.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } else {
        document.getElementById('lastUpdate').textContent = '--';
    }
}

function hideLoading() {
    const loadingSpinner = document.getElementById("loadingSpinner");
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

function showLoading() {
    const loadingSpinner = document.getElementById("loadingSpinner");
    const galeriaPreview = document.getElementById("galeriaPreview");
    const mesaInfo = document.getElementById("mesaInfo");

    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (galeriaPreview) galeriaPreview.innerHTML = '';
    if (mesaInfo) mesaInfo.style.display = 'none';
}

function setupModal() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.modal-close');
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');
    const downloadBtn = document.getElementById('downloadImage');

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', handleKeyNavigation);
    prevBtn?.addEventListener('click', showPreviousImage);
    nextBtn?.addEventListener('click', showNextImage);
    downloadBtn?.addEventListener('click', downloadCurrentImage);
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openModal(index) {
    currentImageIndex = index;
    const modal = document.getElementById('imageModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    updateModalImage();
}

function handleKeyNavigation(e) {
    const modal = document.getElementById('imageModal');
    if (modal.style.display !== 'block') return;

    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') showPreviousImage();
    if (e.key === 'ArrowRight') showNextImage();
}

function showPreviousImage() {
    if (currentImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    updateModalImage();
}

function showNextImage() {
    if (currentImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    updateModalImage();
}

function updateModalImage() {
    const modalImg = document.getElementById('modalImage');
    const modalName = document.getElementById('modalImageName');
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');

    if (!currentImages || currentImages.length === 0) return;

    const image = currentImages[currentImageIndex];
    modalImg.src = image.url;
    modalName.textContent = `Foto de la mesa ${image.path.split('/')[0].replace('mesa-','')}`;

    const oneImage = currentImages.length <= 1;
    prevBtn.style.display = oneImage ? 'none' : 'block';
    nextBtn.style.display = oneImage ? 'none' : 'block';
}

function downloadCurrentImage() {
    const image = currentImages[currentImageIndex];
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Imagen descargada.', 'success');
}

function setupDownloadAllButton() {
    const downloadBtn = document.getElementById('downloadAllBtn');
    downloadBtn.addEventListener('click', async () => {
        const mesa = document.getElementById('mesaSelect').value;
        if (!mesa) return;

        showToast('Iniciando descarga... Esto puede tardar unos segundos.', 'info');
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';

        try {
            const zip = new JSZip();
            const folder = zip.folder(`mesa-${mesa}`);

            for (const img of currentImages) {
                const response = await fetch(img.url);
                const blob = await response.blob();
                folder.file(img.name, blob);
            }
            
            const content = await zip.generateAsync({type:"blob"});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `fotos_mesa_${mesa}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);

            showToast('¡ZIP descargado con éxito!', 'success');

        } catch (err) {
            console.error(err);
            showToast('Error al crear el archivo ZIP.', 'error');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Descargar Todas';
        }
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 500);
    }, 4000);
}


function handleParallax() {
    const hero = document.querySelector('.hero');
    if (hero) {
        const scrollPosition = window.pageYOffset;
        hero.style.backgroundPositionY = `${scrollPosition * 0.5}px`;
    }
}