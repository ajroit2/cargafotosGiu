// --- COMIENZA EL CÓDIGO AÑADIDO ---
document.addEventListener('DOMContentLoaded', () => {
  const mesaSelect = document.getElementById('mesaSelect');
  const numeroDeMesas = 12;

  // Creamos un bucle para generar las 12 opciones de mesa
  for (let i = 1; i <= numeroDeMesas; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `🍽️ Mesa ${i}`;
    mesaSelect.appendChild(option);
  }
});
// --- TERMINA EL CÓDIGO AÑADIDO ---


// --- TU CÓDIGO ORIGINAL (QUE ESTÁ PERFECTO) ---
const SUPABASE_URL = "https://qzwzvwmaxuyxivzcqohw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d3p2d21heHV5eGl2emNxb2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNDY4NzgsImV4cCI6MjA2NDgyMjg3OH0.oSul8Xr6GamTPB4E6--3UFbtek1StSv-fuLNIavUFxQ";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const mesaSelect = document.getElementById("mesaSelect");
const galeriaPreview = document.getElementById("galeriaPreview");
const galeriaStatus = document.getElementById("galeriaStatus");

mesaSelect.addEventListener("change", async () => {
  const mesa = mesaSelect.value;
  galeriaPreview.innerHTML = "";
  galeriaStatus.innerHTML = "";

  if (!mesa) return;

  console.log(`Cargando fotos de la mesa ${mesa}...`);
  galeriaStatus.innerHTML = '<div class="status-message status-loading"><i class="fas fa-spinner fa-spin"></i> Cargando fotos...</div>';

  try {
    const { data, error } = await client.storage
      .from("fotos")
      .list(`mesa-${mesa}`, { limit: 100 });

    if (error) {
      galeriaStatus.innerHTML = `<div class="status-message status-error">Error al listar fotos: ${error.message}</div>`;
      console.error("Error en .list():", error);
      return;
    }

    if (!data || data.length === 0) {
      galeriaStatus.innerHTML = '<div class="status-message status-error">No se encontraron fotos para esta mesa.</div>';
      return;
    }

    galeriaStatus.innerHTML = "";
    galeriaPreview.style.display = "grid";

    for (const item of data) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/fotos/mesa-${mesa}/${item.name}`;
      const img = document.createElement("img");
      img.src = url;
      img.alt = item.name;
      img.loading = "lazy";
      img.style.width = "100%";
      img.style.borderRadius = "0.5rem";
      img.style.objectFit = "cover";

      const div = document.createElement("div");
      div.className = "preview-item";
      div.appendChild(img);
      galeriaPreview.appendChild(div);
    }

  } catch (err) {
    galeriaStatus.innerHTML = `<div class="status-message status-error">Error inesperado: ${err.message}</div>`;
    console.error("Error inesperado:", err);
  }
});