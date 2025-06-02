// Variables globales
let contadores = [];
let mapaHidrantes = null;
let marcadoresHidrantes = {};
let modoEdicion = false;
let hidrateSeleccionadoParaEdicion = null;

// Elementos DOM
const hidranteSelect = document.getElementById('hidranteSelect');
const hidranteLatitud = document.getElementById('hidranteLatitud');
const hidranteLongitud = document.getElementById('hidranteLongitud');
const hidranteAltitud = document.getElementById('hidranteAltitud');
const hidrantesBody = document.getElementById('hidrantesBody');
const generarHidrantesBtn = document.getElementById('generarHidrantesBtn');
const guardarPosicionesBtn = document.getElementById('guardarPosicionesBtn');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el mapa
    inicializarMapa();
    
    // Cargar datos guardados en localStorage
    cargarDatosGuardados();
    
    // Eventos
    generarHidrantesBtn.addEventListener('click', generarHidrantesDemo);
    guardarPosicionesBtn.addEventListener('click', guardarDatosLocalmente);
    
    // Evento para el selector de hidrantes
    hidranteSelect.addEventListener('change', () => {
        const hidranteId = hidranteSelect.value;
        seleccionarHidranteEnMapa(hidranteId);
    });
    
    // Renderizar la tabla de hidrantes
    renderizarTablaHidrantes();
});

// Inicializar el mapa de OpenStreetMap
function inicializarMapa() {
    // Comprobar si el contenedor del mapa existe
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    // Crear el mapa centrado en Alfamén, Zaragoza (coordenadas proporcionadas por el usuario)
    mapaHidrantes = L.map('mapContainer').setView([41.442453, -1.237450], 14);
    
    // Añadir capa de OpenStreetMap como capa base
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapaHidrantes);
    
    // Añadir capa de satélite de ESRI
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });
    
    // Añadir control de capas al mapa
    const baseLayers = {
        "OpenStreetMap": osmLayer,
        "Satélite": satelliteLayer
    };
    
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(mapaHidrantes);
    
    // Modo de edición (usando variables globales)
    modoEdicion = false;
    hidrateSeleccionadoParaEdicion = null;
    
    // Añadir botón de edición al mapa
    const botonEdicion = L.control({ position: 'topleft' });
    botonEdicion.onAdd = function() {
        const div = L.DomUtil.create('div', 'info leaflet-control-edicion');
        div.innerHTML = `
            <button id="toggleEdicionBtn" class="btn btn-sm btn-secondary">
                <i class="bi bi-geo-alt"></i> Modo Ubicación
            </button>
        `;
        return div;
    };
    botonEdicion.addTo(mapaHidrantes);
    
    // Añadir información de instrucciones
    const infoControl = L.control({ position: 'bottomleft' });
    infoControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'info bg-dark text-light p-2');
        div.style.borderRadius = '5px';
        div.style.padding = '8px';
        div.style.display = 'none';
        div.id = 'instruccionesEdicion';
        div.innerHTML = `
            <strong>Modo Ubicación Activado</strong><br>
            1. Seleccione un hidrante del desplegable<br>
            2. Haga clic en el mapa para posicionarlo<br>
            3. O arrastre un marcador existente para reubicarlo
        `;
        return div;
    };
    infoControl.addTo(mapaHidrantes);
    
    // Evento de clic en el mapa para ubicar hidrantes
    mapaHidrantes.on('click', function(e) {
        if (modoEdicion && hidrateSeleccionadoParaEdicion) {
            const contador = contadores.find(c => c.id == hidrateSeleccionadoParaEdicion);
            if (contador) {
                // Actualizar coordenadas
                contador.latitud = e.latlng.lat;
                contador.longitud = e.latlng.lng;
                
                // Refrescar marcadores
                actualizarMarcadoresHidrantes();
                
                // Actualizar panel de información
                mostrarCoordenadasHidrante(contador);
                
                // Actualizar tabla
                renderizarTablaHidrantes();
                
                // Guardar cambios
                guardarDatosLocalmente();
                
                // Mostrar mensaje
                mostrarNotificacion(`Hidrante ${contador.hidrante} ubicado correctamente`);
            }
        }
    });
    
    // Configurar el botón de modo edición después de añadirlo al DOM
    setTimeout(() => {
        const toggleBtn = document.getElementById('toggleEdicionBtn');
        const instrucciones = document.getElementById('instruccionesEdicion');
        
        if (toggleBtn && instrucciones) {
            toggleBtn.addEventListener('click', function() {
                modoEdicion = !modoEdicion;
                
                // Actualizar apariencia del botón
                if (modoEdicion) {
                    toggleBtn.classList.remove('btn-secondary');
                    toggleBtn.classList.add('btn-danger');
                    toggleBtn.innerHTML = '<i class="bi bi-x-lg"></i> Finalizar Ubicación';
                    instrucciones.style.display = 'block';
                } else {
                    toggleBtn.classList.remove('btn-danger');
                    toggleBtn.classList.add('btn-secondary');
                    toggleBtn.innerHTML = '<i class="bi bi-geo-alt"></i> Modo Ubicación';
                    instrucciones.style.display = 'none';
                    hidrateSeleccionadoParaEdicion = null;
                }
                
                // Notificar al usuario
                if (modoEdicion) {
                    mostrarNotificacion('Modo de ubicación activado. Seleccione un hidrante y haga clic en el mapa.');
                } else {
                    mostrarNotificacion('Modo de ubicación desactivado.');
                }
            });
        }
    }, 100);
    
    // Inicializar marcadores si hay contadores
    if (contadores.length > 0) {
        actualizarMarcadoresHidrantes();
    }
}

// Función para actualizar hidrante seleccionado para edición
window.seleccionarHidranteParaEdicion = function(hidranteId) {
    hidrateSeleccionadoParaEdicion = hidranteId;
    
    // Activamos automáticamente el modo edición si no está activo
    if (!modoEdicion) {
        const toggleBtn = document.getElementById('toggleEdicionBtn');
        if (toggleBtn && !toggleBtn.classList.contains('btn-danger')) {
            toggleBtn.click(); // Activar el modo edición
        }
    }
    
    const contador = contadores.find(c => c.id == hidranteId);
    if (contador) {
        // Si el contador tiene coordenadas, centramos el mapa en él
        if (contador.latitud && contador.longitud) {
            mapaHidrantes.setView([contador.latitud, contador.longitud], 18);
            if (marcadoresHidrantes[contador.id]) {
                marcadoresHidrantes[contador.id].openPopup();
            }
        }
        mostrarNotificacion(`Hidrante ${contador.hidrante} seleccionado. Haga clic en el mapa para ubicarlo o arrastre el marcador.`);
    }
};

// Actualizar los marcadores de hidrantes en el mapa
function actualizarMarcadoresHidrantes() {
    // Comprobar si el mapa se ha inicializado
    if (!mapaHidrantes) return;
    
    // Limpiar marcadores existentes
    Object.values(marcadoresHidrantes).forEach(marcador => mapaHidrantes.removeLayer(marcador));
    marcadoresHidrantes = {};
    
    // Limpiar y actualizar el selector de hidrantes
    hidranteSelect.innerHTML = '<option value="">Seleccione un hidrante...</option>';
    
    // Añadir marcadores para cada hidrante
    const bounds = L.latLngBounds();
    let hayCoordenadasValidas = false;
    
    contadores.forEach(contador => {
        // Verificar si el contador tiene coordenadas válidas
        if (contador.latitud && contador.longitud) {
            const latLng = L.latLng(contador.latitud, contador.longitud);
            hayCoordenadasValidas = true;
            
            // Determinar color según el grupo de hidrante
            let colorMarcador = '#3498db'; // Azul por defecto
            
            if (contador.hidrante) {
                // Detectar formato H01-051A, H02-059B, etc.
                const hidranteMatchDetallado = contador.hidrante.match(/H0?(\d+)-/i);
                if (hidranteMatchDetallado && hidranteMatchDetallado[1]) {
                    const hidranteNum = parseInt(hidranteMatchDetallado[1]);
                    const numClass = hidranteNum <= 10 ? hidranteNum : (hidranteNum % 10) || 10;
                    
                    // Asignar color según el número del hidrante
                    switch(numClass) {
                        case 1: colorMarcador = '#3498db'; break; // Azul
                        case 2: colorMarcador = '#2ecc71'; break; // Verde
                        case 3: colorMarcador = '#e74c3c'; break; // Rojo
                        case 4: colorMarcador = '#f1c40f'; break; // Amarillo
                        case 5: colorMarcador = '#9b59b6'; break; // Morado
                        case 6: colorMarcador = '#1abc9c'; break; // Turquesa
                        case 7: colorMarcador = '#e67e22'; break; // Naranja
                        case 8: colorMarcador = '#00bcd4'; break; // Cyan
                        case 9: colorMarcador = '#ff5722'; break; // Naranja oscuro
                        case 10: colorMarcador = '#4caf50'; break; // Verde claro
                    }
                }
            }
            
            // Crear icono personalizado con el color correspondiente usando las nuevas clases CSS
            const icono = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="hydrant-marker" style="background-color: ${colorMarcador};">${contador.id}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            // Crear marcador con opción de arrastrar
            const marcador = L.marker(latLng, { 
                icon: icono,
                draggable: true  // Permitir arrastrar el marcador
            })
            .addTo(mapaHidrantes)
            .bindPopup(`
                <div style="text-align: center;">
                    <h6>${contador.hidrante}</h6>
                    <p><strong>ID:</strong> ${contador.id}</p>
                    <p><strong>Coordenadas:</strong><br>
                    Lat: ${contador.latitud.toFixed(6)}<br>
                    Lng: ${contador.longitud.toFixed(6)}<br>
                    Alt: ${contador.altitud || 'N/A'} m</p>
                    <button class="btn btn-sm btn-primary ubicar-hidrante-btn" 
                            data-hidrante-id="${contador.id}">
                        Editar ubicación
                    </button>
                </div>
            `);
            
            // Evento cuando se arrastra y suelta el marcador
            marcador.on('dragend', function(event) {
                const marcador = event.target;
                const posicion = marcador.getLatLng();
                
                // Actualizar coordenadas del contador
                contador.latitud = posicion.lat;
                contador.longitud = posicion.lng;
                
                // Actualizar el popup con las nuevas coordenadas
                marcador.setPopupContent(`
                    <div style="text-align: center;">
                        <h6>${contador.hidrante}</h6>
                        <p><strong>ID:</strong> ${contador.id}</p>
                        <p><strong>Coordenadas:</strong><br>
                        Lat: ${contador.latitud.toFixed(6)}<br>
                        Lng: ${contador.longitud.toFixed(6)}<br>
                        Alt: ${contador.altitud || 'N/A'} m</p>
                        <button class="btn btn-sm btn-primary ubicar-hidrante-btn" 
                                data-hidrante-id="${contador.id}">
                            Editar ubicación
                        </button>
                    </div>
                `);
                
                // Actualizar panel de información si es el hidrante seleccionado
                if (contador.id == hidranteSelect.value) {
                    mostrarCoordenadasHidrante(contador);
                }
                
                // Actualizar la tabla
                renderizarTablaHidrantes();
                
                // Guardar cambios
                guardarDatosLocalmente();
                
                // Mostrar mensaje
                mostrarNotificacion(`Hidrante ${contador.hidrante} reposicionado correctamente`);
                
                // Añadir eventos a los botones del popup después de actualizarlo
                setTimeout(() => {
                    const botones = document.querySelectorAll('.ubicar-hidrante-btn');
                    botones.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const hidranteId = this.getAttribute('data-hidrante-id');
                            window.seleccionarHidranteParaEdicion(hidranteId);
                        });
                    });
                }, 100);
            });
            
            // Guardar referencia al marcador
            marcadoresHidrantes[contador.id] = marcador;
            
            // Extender los límites del mapa para incluir este punto
            bounds.extend(latLng);
            
            // Añadir al selector de hidrantes
            const option = document.createElement('option');
            option.value = contador.id;
            option.textContent = `${contador.hidrante} (ID: ${contador.id})`;
            hidranteSelect.appendChild(option);
        }
    });
    
    // Ajustar el mapa para mostrar todos los marcadores si hay coordenadas válidas
    if (hayCoordenadasValidas) {
        mapaHidrantes.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Mostrar coordenadas de un hidrante en el panel de información
function mostrarCoordenadasHidrante(contador) {
    if (contador && contador.latitud && contador.longitud) {
        hidranteLatitud.textContent = contador.latitud.toFixed(6);
        hidranteLongitud.textContent = contador.longitud.toFixed(6);
        hidranteAltitud.textContent = contador.altitud || 'N/A';
    } else {
        hidranteLatitud.textContent = '-';
        hidranteLongitud.textContent = '-';
        hidranteAltitud.textContent = '-';
    }
}

// Guardar datos localmente
function guardarDatosLocalmente() {
    localStorage.setItem('contadores', JSON.stringify(contadores));
    mostrarNotificacion('Datos guardados correctamente', 'success');
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacionToast = document.getElementById('notificacionToast');
    const notificacionMensaje = document.getElementById('notificacionMensaje');
    
    if (notificacionToast && notificacionMensaje) {
        // Establecer el mensaje
        notificacionMensaje.textContent = mensaje;
        
        // Establecer el color según el tipo
        notificacionToast.className = 'toast';
        
        if (tipo === 'success') {
            notificacionToast.classList.add('bg-success', 'text-white');
        } else if (tipo === 'warning') {
            notificacionToast.classList.add('bg-warning', 'text-dark');
        } else if (tipo === 'error') {
            notificacionToast.classList.add('bg-danger', 'text-white');
        } else {
            notificacionToast.classList.add('bg-info', 'text-white');
        }
        
        // Mostrar la notificación
        const toast = new bootstrap.Toast(notificacionToast, { delay: 3000 });
        toast.show();
    } else {
        // Fallback si no se puede mostrar la notificación
        console.log(`Notificación (${tipo}): ${mensaje}`);
    }
}

// Seleccionar un hidrante en el mapa
function seleccionarHidranteEnMapa(hidranteId) {
    if (!hidranteId) return;
    
    const contador = contadores.find(c => c.id == hidranteId);
    if (contador) {
        // Mostrar coordenadas en el panel
        mostrarCoordenadasHidrante(contador);
        
        // Si el hidrante tiene coordenadas, centrarlo en el mapa y abrir su popup
        if (contador.latitud && contador.longitud) {
            mapaHidrantes.setView([contador.latitud, contador.longitud], 18);
            
            if (marcadoresHidrantes[contador.id]) {
                marcadoresHidrantes[contador.id].openPopup();
            }
        } else {
            mostrarNotificacion(`El hidrante ${contador.hidrante} no tiene coordenadas asignadas. Active el modo ubicación y haga clic en el mapa para posicionarlo.`, 'warning');
        }
    }
}

// Renderizar tabla de hidrantes
function renderizarTablaHidrantes() {
    if (!hidrantesBody) return;
    
    // Limpiar tabla
    hidrantesBody.innerHTML = '';
    
    // Añadir fila para cada hidrante
    contadores.forEach((contador, index) => {
        const row = document.createElement('tr');
        
        // Añadir celdas con la información
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${contador.hidrante}</td>
            <td>${contador.latitud ? contador.latitud.toFixed(6) : '-'}</td>
            <td>${contador.longitud ? contador.longitud.toFixed(6) : '-'}</td>
            <td>${contador.altitud || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary ubicar-btn" data-id="${contador.id}">
                    <i class="bi bi-geo-alt"></i> Ubicar
                </button>
            </td>
        `;
        
        hidrantesBody.appendChild(row);
    });
    
    // Añadir eventos a los botones de ubicar
    document.querySelectorAll('.ubicar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            seleccionarHidranteEnMapa(id);
            hidranteSelect.value = id;
        });
    });
}

// Cargar datos guardados en localStorage
function cargarDatosGuardados() {
    const datosGuardados = localStorage.getItem('contadores');
    if (datosGuardados) {
        contadores = JSON.parse(datosGuardados);
        
        // Actualizar interfaz
        renderizarTablaHidrantes();
        actualizarMarcadoresHidrantes();
        
        mostrarNotificacion('Datos cargados desde almacenamiento local', 'info');
    }
}

// Generar 33 hidrantes de ejemplo
function generarHidrantesDemo() {
    // Preguntar al usuario si está seguro
    if (contadores.length > 0) {
        if (!confirm('¿Estás seguro de que quieres generar 33 hidrantes de demostración? Se borrarán los hidrantes existentes.')) {
            return;
        }
    }
    
    // Limpiar contadores existentes
    contadores = [];
    
    // Centro aproximado para la distribución (coordenadas de Alfamén, Zaragoza)
    const centro = { lat: 41.442453, lng: -1.237450 };
    
    // Generar 33 hidrantes en diferentes zonas
    for (let i = 1; i <= 33; i++) {
        // Determinar grupo (H01, H02, H03, etc.)
        const grupoNum = Math.ceil(i / 11);
        const idInGrupo = i % 11 || 11;
        
        // Crear ID formateado
        const hidrante = `H${grupoNum.toString().padStart(2, '0')}-${idInGrupo.toString().padStart(3, '0')}`;
        
        // Crear coordenadas distribuidas alrededor del centro
        // Distribución en círculos concéntricos según el grupo
        // Usando un radio mayor para que los hidrantes sean más visibles y fáciles de mover
        const radio = 0.005 * grupoNum;
        const angulo = ((i % 11) / 11) * Math.PI * 2;
        
        const lat = centro.lat + Math.sin(angulo) * radio;
        const lng = centro.lng + Math.cos(angulo) * radio;
        
        // Crear el contador
        const contador = {
            id: i,
            hidrante: hidrante,
            lecturaAnterior: 0,
            lecturaActual: 0,
            consumo: 0,
            incidencia: '',
            estado: 'pendiente',
            latitud: lat,
            longitud: lng,
            altitud: Math.floor(100 + Math.random() * 50)
        };
        
        // Añadir a la lista
        contadores.push(contador);
    }
    
    // Renderizar tabla y actualizar mapa
    renderizarTablaHidrantes();
    actualizarMarcadoresHidrantes();
    
    // Guardar en localStorage
    localStorage.setItem('contadores', JSON.stringify(contadores));
    
    // Activar el modo de edición para empezar a posicionar
    setTimeout(() => {
        const toggleBtn = document.getElementById('toggleEdicionBtn');
        if (toggleBtn && !toggleBtn.classList.contains('btn-danger')) {
            toggleBtn.click();
        }
        mostrarNotificacion('Se han generado 33 hidrantes de ejemplo. Ahora puedes posicionarlos en el mapa.', 'success');
    }, 500);
}
