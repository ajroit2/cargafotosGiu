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
    
    // Actualizar botón cuando cambie la mesa seleccionada
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
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = createPreviewItem(e.target.result, index);
                uploadPreview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Crear elemento de preview
function createPreviewItem(src, index) {
    const div = document.createElement("div");
    div.className = "preview-item";
    div.innerHTML = `
        <img src="${src}" alt="Preview ${index + 1}">
        <button type="button" class="preview-remove" onclick="removeFile(${index})">×</button>
    `;
    return div;
}

// Remover archivo del preview
function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    // Actualizar el input file
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fotosInput.files = dt.files;
    
    displayPreview(selectedFiles);
    updateSubmitButton();
}

// Actualizar estado del botón submit
function updateSubmitButton() {
    const mesa = document.getElementById("mesa").value;
    const hasFiles = selectedFiles.length > 0;
    const hasTable = mesa && mesa >= 1 && mesa <= 10;
    
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
    if (!mesa || mesa < 1 || mesa > 10) {
        showStatus("Seleccioná un número de mesa válido (1-10)", "error");
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
    
    // Validar tipos de archivo
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
        showStatus("Solo se permiten archivos JPG, PNG y WEBP", "error");
        return false;
    }
    
    // Validar tamaño de archivos (máximo 10MB por archivo)
    const maxSize = 10 * 1024 * 1024; // 10MB
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
                
                // Actualizar barra de progreso
                const progress = ((i + 1) / files.length) * 100;
                updateProgressBar(progressBar, progress);
                
            } catch (err) {
                console.error("Error inesperado:", err);
                errors.push(file.name);
            }
        }
        
        // Mostrar resultado
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
        setTimeout(() => {
            hideProgressBar(progressBar);
        }, 2000);
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
    if (container) {
        container.remove();
    }
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
    setTimeout(() => {
        hideToast();
    }, 5000);
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
        
        if (changeDirectionTime > 100) {
            if (Math.random() < 0.1) {
                dx = (Math.random() * 2 - 1) * 2;
                dy = (Math.random() * 2 - 1) * 2;
                changeDirectionTime = 0;
            }
        }
        
        x += dx;
        y += dy;
        
        // Mantener dentro de los límites
        if (x < 0) {
            x = 0;
            dx = -dx;
        }
        if (x > window.innerWidth - 64) {
            x = window.innerWidth - 64;
            dx = -dx;
        }
        if (y < 0) {
            y = 0;
            dy = -dy;
        }
        if (y > window.innerHeight - 64) {
            y = window.innerHeight - 64;
            dy = -dy;
        }
        
        // Aplicar posición
        butterfly.style.left = x + "px";
        butterfly.style.top = y + "px";
        butterfly.style.transform = `scaleX(${dx < 0 ? -1 : 1})`;
        
        requestAnimationFrame(updateButterflyPosition);
    }
    
    updateButterflyPosition();
    
    // Ajustar en redimensión de ventana
    window.addEventListener("resize", () => {
        if (x > window.innerWidth - 64) x = window.innerWidth - 64;
        if (y > window.innerHeight - 64) y = window.innerHeight - 64;
    });
}

// Inicializar animaciones
function initializeAnimations() {
    // Animación de entrada para elementos
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
    
    // Animación de las decoraciones de bambú
    const bambooDecorations = document.querySelectorAll(".bamboo-decoration, .bamboo-decoration-form");
    bambooDecorations.forEach((decoration, index) => {
        decoration.style.opacity = "0";
        setTimeout(() => {
            decoration.style.transition = "opacity 1s ease-out";
            decoration.style.opacity = "0.3";
        }, 500 + index * 100);
    });
}

// Prevenir comportamientos no deseados con la mariposa
document.addEventListener("DOMContentLoaded", () => {
    const butterfly = document.getElementById("butterfly");
    if (butterfly) {
        butterfly.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });

        butterfly.addEventListener("touchstart", (e) => {
            e.preventDefault();
        });
    }
});

// Efectos de hover suaves para elementos interactivos
document.addEventListener("DOMContentLoaded", () => {
    const interactiveElements = document.querySelectorAll(".preview-item, .submit-btn, .form-container");
    
    interactiveElements.forEach(element => {
        element.addEventListener("mouseenter", () => {
            element.style.transition = "all 0.3s ease";
        });
    });
});

// Función global para remover archivos (necesaria para el onclick en HTML)
window.removeFile = removeFile;