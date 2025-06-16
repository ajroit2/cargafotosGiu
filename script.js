// Configuración de Supabase
const SUPABASE_URL = "https://qzwzvwmaxuyxivzcqohw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d3p2d21heHV5eGl2emNxb2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNDY4NzgsImV4cCI6MjA2NDgyMjg3OH0.oSul8Xr6GamTPB4E6--3UFbtek1StSv-fuLNIavUFxQ";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedFiles = [];
const maxFiles = 20;

const uploadForm = document.getElementById("uploadForm");
const fotosInput = document.getElementById("fotos");
const uploadPreview = document.getElementById("uploadPreview");
const uploadStatus = document.getElementById("uploadStatus");
const submitBtn = document.querySelector(".submit-btn");
const toast = document.getElementById("toast");
const toastClose = document.getElementById("toastClose");

document.addEventListener("DOMContentLoaded", () => {
    initializeEventListeners();
    initializeButterfly();
    initializeAnimations();
});

function initializeEventListeners() {
    uploadForm.addEventListener("submit", handleFormSubmit);
    fotosInput.addEventListener("change", handleFileSelection);
    toastClose.addEventListener("click", hideToast);
    document.getElementById("mesa").addEventListener("change", updateSubmitButton);
}

function handleFileSelection(e) {
    const files = Array.from(e.target.files);
    if (files.length > maxFiles) {
        showStatus(`Máximo ${maxFiles} imágenes permitidas`, "error");
        return;
    }
    selectedFiles = files;
    displayPreview(files);
    updateSubmitButton();
}

function displayPreview(files) {
    uploadPreview.innerHTML = "";
    uploadPreview.style.display = files.length ? "grid" : "none";
    files.forEach((file, index) => {
        if (file.type.startsWith("image/")) {
            if (file.type === "image/heic" || file.type === "image/heif") {
                const previewItem = createPreviewItem("heic-placeholder.png", index, true);
                uploadPreview.appendChild(previewItem);
                showStatus(".heic no se previsualiza, pero se convertirá.", "info");
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = createPreviewItem(e.target.result, index);
                    uploadPreview.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            }
        }
    });
}

function createPreviewItem(src, index, isHEIC = false) {
    const div = document.createElement("div");
    div.className = "preview-item";
    div.innerHTML = `
        <img src="${src}" alt="Preview ${index + 1}">
        ${isHEIC ? '<span class="preview-label">.heic</span>' : ''}
        <button type="button" class="preview-remove" onclick="removeFile(${index})">×</button>
    `;
    return div;
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fotosInput.files = dt.files;
    displayPreview(selectedFiles);
    updateSubmitButton();
}
window.removeFile = removeFile;

function updateSubmitButton() {
    const mesa = document.getElementById("mesa").value;
    const hasFiles = selectedFiles.length > 0;
    const mesasValidas = [1,2,3,4,5,6,8,13,14,16,17];
    const hasTable = mesa && mesasValidas.includes(parseInt(mesa));
    submitBtn.disabled = !(hasFiles && hasTable);
}

// ================================================================
//               NUEVA LÓGICA DE PROCESAMIENTO
// ================================================================
async function handleFormSubmit(e) {
    e.preventDefault();
    const mesa = document.getElementById("mesa").value;
    const files = selectedFiles;

    if (!validateForm(mesa, files)) return;

    setLoadingState(true);
    showStatus("Preparando imágenes... esto puede tardar un momento.", "loading");

    // Límite de tamaño: SOLO comprimimos archivos que pesen más de 10 MB.
    const COMPRESSION_THRESHOLD_MB = 10;
    const COMPRESSION_THRESHOLD_BYTES = COMPRESSION_THRESHOLD_MB * 1024 * 1024;

    // Opciones de compresión MUY suaves, solo para archivos gigantes.
    // Usamos `maxSizeMB` para asegurar que el resultado esté por debajo de 10 MB,
    // pero `initialQuality` muy alta para mantener la mayor calidad posible.
    const compressionOptions = {
        maxSizeMB: 9.5,            // Aseguramos que el resultado final sea < 10MB
        initialQuality: 0.96,      // Calidad extremadamente alta (96%)
        useWebWorker: true,
        fileType: 'image/jpeg'
    };

    try {
        const processedFiles = await Promise.all(files.map(async (file) => {
            let fileToProcess = file;
            const isHeic = file.type === 'image/heic' || file.type === 'image/heif';

            // 1. Convertir HEIC a JPEG si es necesario
            if (isHeic) {
                console.log(`Convirtiendo ${file.name} de HEIC a JPEG...`);
                const jpegBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.98 });
                fileToProcess = new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, ".jpeg"), { type: "image/jpeg" });
                console.log(`Convertido. Nuevo tamaño: ${(fileToProcess.size / 1024 / 1024).toFixed(2)} MB`);
            }
            
            // 2. Comprobar si el archivo (original o convertido) necesita compresión
            if (fileToProcess.type.startsWith("image/") && fileToProcess.size > COMPRESSION_THRESHOLD_BYTES) {
                console.log(`Archivo ${fileToProcess.name} (${(fileToProcess.size / 1024 / 1024).toFixed(2)} MB) supera el umbral de ${COMPRESSION_THRESHOLD_MB} MB. Comprimiendo...`);
                
                const compressedFile = await imageCompression(fileToProcess, compressionOptions);
                
                console.log(`Compresión finalizada. Nuevo tamaño: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
                return compressedFile;
            } else {
                // Si el archivo no es una imagen o está por debajo del umbral, no se toca.
                console.log(`Archivo ${fileToProcess.name} (${(fileToProcess.size / 1024 / 1024).toFixed(2)} MB) no necesita compresión. Se subirá tal cual.`);
                return fileToProcess;
            }
        }));

        await uploadFiles(mesa, processedFiles);
    } catch (err) {
        console.error("Error al procesar imágenes:", err);
        showStatus("Error al procesar imágenes. Revisa la consola.", "error");
        setLoadingState(false);
    }
}


function validateForm(mesa, files) {
    const mesasValidas = [1,2,3,4,5,6,8,13,14,16,17];
    if (!mesa || !mesasValidas.includes(parseInt(mesa))) {
        showStatus("Seleccioná una mesa válida", "error");
        return false;
    }
    if (files.length === 0) {
        showStatus("Seleccioná al menos una foto", "error");
        return false;
    }
    if (files.length > maxFiles) {
        showStatus(`Máximo ${maxFiles} imágenes por vez`, "error");
        return false;
    }
    return true;
}

// El resto del código no cambia.
async function uploadFiles(mesa, filesToUpload) {
    showStatus("Subiendo fotos...", "loading");

    const progressBar = createProgressBar();
    let uploadedCount = 0;
    let errors = [];

    try {
        for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            const fileName = `mesa-${mesa}/${Date.now()}-${i}-${file.name}`;

            const { error } = await client.storage
                .from("fotos")
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error("Error al subir", file.name, error.message);
                errors.push(file.name);
            } else {
                uploadedCount++;
            }

            const progress = ((i + 1) / filesToUpload.length) * 100;
            updateProgressBar(progressBar, progress);
        }

        if (errors.length === 0) {
            showStatus(`¡${uploadedCount} fotos subidas con éxito! 🎉`, "success");
            showToast();
            resetForm();
        } else if (uploadedCount > 0) {
            showStatus(`${uploadedCount} fotos subidas. ${errors.length} fallaron.`, "error");
        } else {
            showStatus("Error al subir todas las fotos. Intentá de nuevo.", "error");
        }

    } catch (error) {
        console.error("Error general en el proceso de subida:", error);
        showStatus("Error inesperado. Intentá de nuevo.", "error");
    } finally {
        setLoadingState(false);
        setTimeout(() => hideProgressBar(progressBar), 2000);
    }

    // Notificación a Telegram
    try {
        await fetch("https://aviso-fotos-giu.ajroit-wa.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mesa,
                cantidad: filesToUpload.length,
                clave: "Giu2025"
            }),
        });
    } catch (err) {
        console.warn("No se pudo enviar notificación Telegram:", err);
    }
}


// Estados de carga
function setLoadingState(loading) {
    submitBtn.disabled = loading;
    if(loading) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    } else {
        submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subir Fotos';
        updateSubmitButton();
    }
}

// Barra de progreso
function createProgressBar() {
    const existingBar = document.querySelector('.progress-bar');
    if (existingBar) existingBar.remove();

    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-bar";
    progressContainer.innerHTML = '<div class="progress-fill"></div>';
    uploadStatus.appendChild(progressContainer);
    return progressContainer.querySelector(".progress-fill");
}

function updateProgressBar(progressBar, percentage) {
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
}

function hideProgressBar(progressBar) {
    if (progressBar && progressBar.parentElement) {
        progressBar.parentElement.remove();
    }
}

// Mostrar mensajes de estado
function showStatus(message, type) {
    const icon = getStatusIcon(type);
    const statusContainer = document.getElementById("uploadStatus");
    const progressBar = statusContainer.querySelector('.progress-bar');
    if (progressBar) progressBar.remove();
    
    statusContainer.innerHTML = `
        <div class="status-message status-${type}">
            ${icon} ${message}
        </div>
    `;
}


function getStatusIcon(type) {
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        loading: '<i class="fas fa-spinner fa-spin"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    return icons[type] || '';
}

// Toast notifications
function showToast() {
    toast.classList.add("show");
    setTimeout(() => hideToast(), 5000);
}

function hideToast() {
    toast.classList.remove("show");
}

// Resetear formulario
function resetForm() {
    uploadForm.reset();
    selectedFiles = [];
    uploadPreview.innerHTML = "";
    uploadPreview.style.display = "none";
    updateSubmitButton();
}

// Animación de mariposa
function initializeButterfly() {
    const butterfly = document.getElementById("butterfly");
    if (!butterfly) return;

    let x = Math.random() * window.innerWidth;
    let y = Math.random() * window.innerHeight;
    let dx = (Math.random() * 2 - 1) * 2;
    let dy = (Math.random() * 2 - 1) * 2;
    let changeDirectionTime = 0;

    function updateButterflyPosition() {
        changeDirectionTime++;
        if (changeDirectionTime > 100 && Math.random() < 0.1) {
            dx = (Math.random() * 2 - 1) * 2;
            dy = (Math.random() * 2 - 1) * 2;
            changeDirectionTime = 0;
        }
        x += dx;
        y += dy;
        if (x < 0 || x > window.innerWidth - 64) dx = -dx;
        if (y < 0 || y > window.innerHeight - 64) dy = -dy;
        x = Math.max(0, Math.min(x, window.innerWidth - 64));
        y = Math.max(0, Math.min(y, window.innerHeight - 64));
        butterfly.style.left = x + "px";
        butterfly.style.top = y + "px";
        butterfly.style.transform = `scaleX(${dx < 0 ? -1 : 1})`;
        requestAnimationFrame(updateButterflyPosition);
    }
    updateButterflyPosition();
    window.addEventListener("resize", () => {
        if (x > window.innerWidth - 64) x = window.innerWidth - 64;
        if (y > window.innerHeight - 64) y = window.innerHeight - 64;
    });
}

// Animaciones de entrada
function initializeAnimations() {
    const elements = document.querySelectorAll(".hero-content, .form-container");
    elements.forEach((el, index) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        setTimeout(() => {
            el.style.transition = "all 0.8s ease-out";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
        }, index * 200);
    });
    const bambooDecorations = document.querySelectorAll(".bamboo-decoration, .bamboo-decoration-form");
    bambooDecorations.forEach((decoration, index) => {
        decoration.style.opacity = "0";
        setTimeout(() => {
            decoration.style.transition = "opacity 1s ease-out";
            decoration.style.opacity = "0.3";
        }, 500 + index * 100);
    });
}