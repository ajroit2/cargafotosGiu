// Configuración de Supabase
// Configuración de Supabase
const SUPABASE_URL = "https://qzwzvwmaxuyxivzcqohw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d3p2d21heHV5eGl2emNxb2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNDY4NzgsImV4cCI6MjA2NDgyMjg3OH0.oSul8Xr6GamTPB4E6--3UFbtek1StSv-fuLNIavUFxQ";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let selectedFiles = [];
const maxFiles = 20;

// Elementos del DOM
const uploadForm = document.getElementById("uploadForm");
const fotosInput = document.getElementById("fotos");
const uploadPreview = document.getElementById("uploadPreview");
const uploadStatus = document.getElementById("uploadStatus");
const submitBtn = document.querySelector(".submit-btn");
const toast = document.getElementById("toast");
const toastClose = document.getElementById("toastClose");

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    initializeEventListeners();
    initializeButterfly();
    initializeAnimations();
});

// Event listeners
function initializeEventListeners() {
    uploadForm.addEventListener("submit", handleFormSubmit);
    fotosInput.addEventListener("change", handleFileSelection);
    toastClose.addEventListener("click", hideToast);
    document.getElementById("mesa").addEventListener("change", updateSubmitButton);
}

// Manejo de selección de archivos
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

// Mostrar preview de imágenes
function displayPreview(files) {
    uploadPreview.innerHTML = "";

    if (files.length === 0) {
        uploadPreview.style.display = "none";
        return;
    }

    uploadPreview.style.display = "grid";

    files.forEach((file, index) => {
        if (file.type.startsWith("image/")) {
            if (file.type === "image/heic" || file.type === "image/heif") {
                const previewItem = createPreviewItem("heic-placeholder.png", index, true);
                uploadPreview.appendChild(previewItem);
                showStatus("Se permite subir archivos .heic, pero no pueden previsualizarse en este navegador. Serán subidos correctamente.", "error");
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

// Crear elemento de preview
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

// Remover archivo del preview
function removeFile(index) {
    selectedFiles.splice(index, 1);
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fotosInput.files = dt.files;
    displayPreview(selectedFiles);
    updateSubmitButton();
}
window.removeFile = removeFile;

// Actualizar estado del botón submit
function updateSubmitButton() {
    const mesa = document.getElementById("mesa").value;
    const hasFiles = selectedFiles.length > 0;
    const hasTable = mesa && mesa >= 1 && mesa <= 12;
    submitBtn.disabled = !(hasFiles && hasTable);
}

// Manejo del envío del formulario
async function handleFormSubmit(e) {
    e.preventDefault();
    const mesa = document.getElementById("mesa").value;
    const files = selectedFiles;

    if (!validateForm(mesa, files)) return;
    await uploadFiles(mesa, files);
}

// Validación del formulario
function validateForm(mesa, files) {
    if (!mesa || mesa < 1 || mesa > 12) {
        showStatus("Seleccioná un número de mesa válido (1-12)", "error");
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

    const validTypes = [
        "image/jpeg", "image/jpg", "image/png",
        "image/webp", "image/heic", "image/heif"
    ];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));

    if (invalidFiles.length > 0) {
        showStatus("Solo se permiten archivos JPG, PNG, WEBP y HEIC", "error");
        return false;
    }

    const maxSize = 10 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSize);

    if (oversizedFiles.length > 0) {
        showStatus("Cada imagen debe ser menor a 10MB", "error");
        return false;
    }

    return true;
}

// Subir archivos a Supabase
async function uploadFiles(mesa, files) {
    setLoadingState(true);
    showStatus("Subiendo fotos...", "loading");

    const progressBar = createProgressBar();
    let uploadedCount = 0;
    let errors = [];

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `mesa-${mesa}/${Date.now()}-${i}-${file.name}`;

            try {
                const { error } = await client.storage
                    .from("fotos")
                    .upload(fileName, file);

                if (error) {
                    console.error("Error al subir", file.name, error.message);
                    errors.push(file.name);
                } else {
                    uploadedCount++;
                }

                const progress = ((i + 1) / files.length) * 100;
                updateProgressBar(progressBar, progress);

            } catch (err) {
                console.error("Error inesperado:", err);
                errors.push(file.name);
            }
        }

        if (errors.length === 0) {
            showStatus(`¡${uploadedCount} fotos subidas con éxito! 🎉`, "success");
            showToast();
            resetForm();
        } else if (uploadedCount > 0) {
            showStatus(`${uploadedCount} fotos subidas. ${errors.length} fallaron.`, "error");
        } else {
            showStatus("Error al subir las fotos. Intentá de nuevo.", "error");
        }

    } catch (error) {
        console.error("Error general:", error);
        showStatus("Error inesperado. Intentá de nuevo.", "error");
    } finally {
        setLoadingState(false);
        setTimeout(() => hideProgressBar(progressBar), 2000);
    }
}

// Estados de carga
function setLoadingState(loading) {
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading
        ? '<i class="fas fa-spinner fa-spin"></i> Subiendo...'
        : '<i class="fas fa-cloud-upload-alt"></i> Subir Fotos';
}

// Barra de progreso
function createProgressBar() {
    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-bar";
    progressContainer.innerHTML = '<div class="progress-fill"></div>';
    uploadStatus.appendChild(progressContainer);
    return progressContainer.querySelector(".progress-fill");
}

function updateProgressBar(progressBar, percentage) {
    progressBar.style.width = `${percentage}%`;
}

function hideProgressBar(progressBar) {
    const container = progressBar.parentElement;
    if (container) container.remove();
}

// Mostrar mensajes de estado
function showStatus(message, type) {
    uploadStatus.innerHTML = `
        <div class="status-message status-${type}">
            ${getStatusIcon(type)} ${message}
        </div>
    `;
}

function getStatusIcon(type) {
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        loading: '<i class="fas fa-spinner fa-spin"></i>'
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
