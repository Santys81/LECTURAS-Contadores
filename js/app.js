// Variables globales
let contadores = [];
let historialLecturas = [];
let excelData = null;
let mapaHidrantes = null;
let marcadoresHidrantes = {};

// Elementos DOM
const excelFileInput = document.getElementById('excelFile');
const importBtn = document.getElementById('importBtn');
const saveBtn = document.getElementById('saveBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const contadoresBody = document.getElementById('contadoresBody');
const totalConsumoElement = document.getElementById('totalConsumo');
const periodoLecturaInput = document.getElementById('periodoLectura');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const hidranteSelect = document.getElementById('hidranteSelect');
const hidranteLatitud = document.getElementById('hidranteLatitud');
const hidranteLongitud = document.getElementById('hidranteLongitud');
const hidranteAltitud = document.getElementById('hidranteAltitud');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Establecer el mes actual en el input de periodo
    const fechaActual = new Date();
    const año = fechaActual.getFullYear();
    let mes = fechaActual.getMonth() + 1;
    mes = mes < 10 ? '0' + mes : mes;
    periodoLecturaInput.value = `${año}-${mes}`;
    
    // Inicializar el mapa
    inicializarMapa();
    
    // Cargar datos guardados en localStorage
    cargarDatosGuardados();
    
    // Eventos después de cargar la página
    importBtn.addEventListener('click', importarExcel);
    saveBtn.addEventListener('click', guardarLecturas);
    exportPdfBtn.addEventListener('click', mostrarPrevisualizacionPDF);
    exportExcelBtn.addEventListener('click', exportarExcel);
    downloadPdfBtn.addEventListener('click', descargarPDF);
    
    // Evento para el selector de hidrantes
    hidranteSelect.addEventListener('change', () => {
        const hidranteId = hidranteSelect.value;
        seleccionarHidranteEnMapa(hidranteId);
    });
    
    // Actualizar totales cuando se cambia una lectura
    contadoresBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('lectura-actual')) {
            const row = e.target.closest('tr');
            const index = row.dataset.index;
            const lecturaActualInput = e.target;
            const lecturaAnteriorCell = row.querySelector('.lectura-anterior');
            const consumoCell = row.querySelector('.consumo');
            
            // Actualizar datos y cálculos
            contadores[index].lecturaActual = parseFloat(lecturaActualInput.value) || 0;
            contadores[index].consumo = Math.max(0, contadores[index].lecturaActual - contadores[index].lecturaAnterior);
            consumoCell.textContent = Math.floor(contadores[index].consumo);
            
            // Recalcular total
            calcularTotalConsumo();
        }
        
        // Capturar cambios en las incidencias
        if (e.target.classList.contains('incidencia-input')) {
            const row = e.target.closest('tr');
            const index = row.dataset.index;
            
            // Actualizar incidencia en el array de contadores
            contadores[index].incidencia = e.target.value;
        }
    });
    
    // Evento para los botones de estado
    contadoresBody.addEventListener('click', (e) => {
        const btnEstado = e.target.closest('.btn-estado');
        if (btnEstado) {
            const row = btnEstado.closest('tr');
            const index = row.dataset.index;
            const nuevoEstado = btnEstado.dataset.estado;
            
            // Actualizar estado en el array de contadores
            contadores[index].estado = nuevoEstado;
            
            // Actualizar visualización de los botones
            const botonesEstado = row.querySelectorAll('.btn-estado');
            botonesEstado.forEach(btn => {
                if (btn.dataset.estado === 'ok') {
                    btn.className = nuevoEstado === 'ok' ? 'btn btn-success btn-estado' : 'btn btn-outline-success btn-estado';
                } else if (btn.dataset.estado === 'nook') {
                    btn.className = nuevoEstado === 'nook' ? 'btn btn-danger btn-estado' : 'btn btn-outline-danger btn-estado';
                }
            });
        }
    });
    
    // Intentar cargar el historial guardado
    cargarHistorial();
});

// Funciones para el mapa de hidrantes

// Inicializar el mapa de OpenStreetMap
function inicializarMapa() {
    // Comprobar si el contenedor del mapa existe
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    // Crear el mapa centrado en España (coordenadas aproximadas)
    mapaHidrantes = L.map('mapContainer').setView([40.4168, -3.7038], 6);
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapaHidrantes);
    
    // Añadir capa de satélite de ESRI
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    }).addTo(mapaHidrantes);
    
    // Inicializar con datos existentes si hay
    if (contadores.length > 0) {
        actualizarMarcadoresHidrantes();
    }
}

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
            
            // Crear icono personalizado con el color correspondiente
            const icono = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${colorMarcador}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">${contador.id}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            // Crear marcador
            const marcador = L.marker(latLng, { icon: icono })
                .addTo(mapaHidrantes)
                .bindPopup(`
                    <div style="text-align: center;">
                        <h6>${contador.hidrante}</h6>
                        <p><strong>ID:</strong> ${contador.id}</p>
                        <p><strong>Última Lectura:</strong> ${Math.floor(contador.lecturaAnterior)}</p>
                        <p><strong>Coordenadas:</strong><br>
                        Lat: ${contador.latitud.toFixed(6)}<br>
                        Lng: ${contador.longitud.toFixed(6)}<br>
                        Alt: ${contador.altitud || 'N/A'} m</p>
                    </div>
                `);
            
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

// Seleccionar un hidrante en el mapa
function seleccionarHidranteEnMapa(hidranteId) {
    // Resetear la información mostrada
    hidranteLatitud.textContent = '-';
    hidranteLongitud.textContent = '-';
    hidranteAltitud.textContent = '-';
    
    if (!hidranteId) return;
    
    // Buscar el contador correspondiente
    const contador = contadores.find(c => c.id === hidranteId);
    if (!contador) return;
    
    // Actualizar la información de coordenadas
    if (contador.latitud) hidranteLatitud.textContent = contador.latitud.toFixed(6);
    if (contador.longitud) hidranteLongitud.textContent = contador.longitud.toFixed(6);
    if (contador.altitud) hidranteAltitud.textContent = `${contador.altitud} m`;
    
    // Enfocar el mapa en el marcador seleccionado
    const marcador = marcadoresHidrantes[hidranteId];
    if (marcador) {
        mapaHidrantes.setView(marcador.getLatLng(), 18);
        marcador.openPopup();
    }
}

// Función para importar datos desde Excel
function importarExcel() {
    const file = excelFileInput.files[0];
    if (!file) {
        alert('Por favor, selecciona un archivo Excel.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Obtener la primera hoja
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                alert('El archivo no contiene datos.');
                return;
            }
            
            // Procesar datos
            procesarDatosExcel(jsonData);
            
            // Habilitar botones
            saveBtn.disabled = false;
            exportPdfBtn.disabled = false;
            exportExcelBtn.disabled = false;
            
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            alert('Error al procesar el archivo. Verifica que sea un archivo Excel válido.');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Procesar los datos importados del Excel
function procesarDatosExcel(jsonData) {
    // Resetear array de contadores
    contadores = [];
    
    // Mapear datos del Excel a nuestro formato
    jsonData.forEach((row, index) => {
        // Intentar identificar las columnas del Excel específico de CCRR LIAR Y CARBONIEL
        const id = row.ID || row.Id || row.id || row.TOMA || row.Toma || row.toma || row.NUM || row.Num || row.num || index + 1;
        const hidrante = row.HIDRANTE || row.Hidrante || row.hidrante || row.SECTOR || row.Sector || row.sector || '';
        
        let lecturaAnterior = 0;
        
        // Si encontramos la columna específica, la usamos
        if (row['Última Lectura']) {
            lecturaAnterior = parseFloat(row['Última Lectura'] || 0);
        } else {
            // Buscar específicamente si existe alguna propiedad con nombre que contenga "ultima lectura"
            let encontrada = false;
            for (const key in row) {
                if (key.toLowerCase().includes('ultima lectura') || key.toLowerCase().includes('última lectura')) {
                    lecturaAnterior = parseFloat(row[key] || 0);
                    encontrada = true;
                    break;
                }
            }
            
            // Si todavía no la encontramos, buscar en las columnas alternativas
            if (!encontrada) {
                lecturaAnterior = parseFloat(
                    row.Lectura_Anterior || row['Lectura Anterior'] || row.LECTURA_ANTERIOR || 
                    row['ÚLTIMA LECTURA'] || row['Última Lectura'] || row['última lectura'] || 
                    row.CONTADOR || row.Contador || row.contador || 0
                );
            }
        }
        
        // Crear objeto contador
        const contador = {
            id,
            hidrante,
            lecturaAnterior,
            lecturaActual: lecturaAnterior, // Por defecto igual a la anterior
            consumo: 0
        };
        
        contadores.push(contador);
    });
    
    // Renderizar tabla
    renderizarTablaContadores();
    
    // Actualizar el mapa con los nuevos hidrantes
    actualizarMarcadoresHidrantes();
}

// Renderizar tabla de contadores
function renderizarTablaContadores() {
    contadoresBody.innerHTML = '';
    
    // Agrupar contadores por hidrante principal
    const contadoresPorHidrante = {};
    
    // Primero identificamos el hidrante principal de cada contador
    contadores.forEach(contador => {
        let hidranteMain = 'sin-hidrante';
        
        if (contador.hidrante) {
            // Detectar formato H01-051A, H02-059B, etc.
            const hidranteMatchDetallado = contador.hidrante.match(/H0?(\d+)-/i);
            if (hidranteMatchDetallado && hidranteMatchDetallado[1]) {
                hidranteMain = `H${parseInt(hidranteMatchDetallado[1])}`;
            } else {
                // Intentar formato simple H1, H2, etc.
                const hidranteMatch = contador.hidrante.match(/H0?(\d+)/i);
                if (hidranteMatch && hidranteMatch[1]) {
                    hidranteMain = `H${parseInt(hidranteMatch[1])}`;
                }
            }
        }
        
        // Crear el grupo si no existe
        if (!contadoresPorHidrante[hidranteMain]) {
            contadoresPorHidrante[hidranteMain] = [];
        }
        
        // Añadir el contador al grupo correspondiente
        contadoresPorHidrante[hidranteMain].push(contador);
    });
    
    // Obtener todos los grupos de hidrantes y ordenarlos
    const gruposHidrante = Object.keys(contadoresPorHidrante).sort();
    
    // Renderizar por grupos
    gruposHidrante.forEach((grupoHidrante, grupoIndex) => {
        // Si no es el primer grupo, añadir separador
        if (grupoIndex > 0) {
            const separador = document.createElement('tr');
            separador.className = 'grupo-separacion';
            separador.innerHTML = '<td colspan="7"></td>';
            contadoresBody.appendChild(separador);
        }
        
        // Renderizar el encabezado del grupo (opcional)
        if (grupoHidrante !== 'sin-hidrante') {
            const grupoHeader = document.createElement('tr');
            grupoHeader.className = `grupo-header fila-${grupoHidrante.toLowerCase()}`;
            grupoHeader.innerHTML = `
                <td colspan="7" class="text-center">Hidrante ${grupoHidrante}</td>
            `;
            // Descomentar si quieres mostrar un encabezado por grupo
            // contadoresBody.appendChild(grupoHeader);
        }
        
        // Renderizar cada contador del grupo
        contadoresPorHidrante[grupoHidrante].forEach((contador, index) => {
            const row = document.createElement('tr');
            row.dataset.index = contadores.indexOf(contador);
            
            // Determina la clase CSS para el color del hidrante y la fila
            let hidranteClass = '';
            let filaClass = '';
            
            if (contador.hidrante) {
                // Primero, intentar detectar el formato detallado
                const hidranteMatchDetallado = contador.hidrante.match(/H0?(\d+)-/i);
                if (hidranteMatchDetallado && hidranteMatchDetallado[1]) {
                    const hidranteNum = parseInt(hidranteMatchDetallado[1]);
                    const numClass = hidranteNum <= 10 ? hidranteNum : (hidranteNum % 10) || 10;
                    hidranteClass = `hidrante-h${numClass}`;
                    filaClass = `fila-h${numClass}`;
                } else {
                    // Si no coincide, intentar formato simple
                    const hidranteMatch = contador.hidrante.match(/H0?(\d+)/i);
                    if (hidranteMatch && hidranteMatch[1]) {
                        const hidranteNum = parseInt(hidranteMatch[1]);
                        const numClass = hidranteNum <= 10 ? hidranteNum : (hidranteNum % 10) || 10;
                        hidranteClass = `hidrante-h${numClass}`;
                        filaClass = `fila-h${numClass}`;
                    }
                }
            }
            
            // Añadir clase a la fila para el color de fondo
            if (filaClass) {
                row.classList.add(filaClass);
            }
            
            // Formatear los datos correctamente para evitar problemas de alineación
            const hidrante = contador.hidrante || '';
            const lecturaAnterior = Math.floor(contador.lecturaAnterior || 0);
            const lecturaActual = Math.floor(contador.lecturaActual || lecturaAnterior);
            
            // Recalcular siempre el consumo para asegurarnos que es correcto
            contador.consumo = Math.max(0, lecturaActual - lecturaAnterior);
            const consumo = Math.floor(contador.consumo);
            
            // Estado predeterminado: no verificado
            if (!contador.incidencia) contador.incidencia = '';
            if (!contador.estado) contador.estado = 'pendiente';
            
            row.innerHTML = `
                <td class="num-row text-center">${contadores.indexOf(contador) + 1}</td>
                <td class="${hidranteClass}">${hidrante}</td>
                <td class="lectura-anterior" title="Última lectura del mes">${lecturaAnterior}</td>
                <td>
                    <input type="number" class="form-control form-control-sm lectura-actual lectura-input" 
                        value="${lecturaActual}" step="1" min="${lecturaAnterior}">
                </td>
                <td class="consumo">${consumo}</td>
                <td>
                    <input type="text" class="form-control form-control-sm incidencia-input" 
                        placeholder="Anotar incidencia..." value="${contador.incidencia || ''}">
                </td>
                <td class="estado-col text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn ${contador.estado === 'ok' ? 'btn-success' : 'btn-outline-success'} btn-estado" data-estado="ok" title="OK">
                            <i class="bi bi-check-circle-fill"></i>
                        </button>
                        <button type="button" class="btn ${contador.estado === 'nook' ? 'btn-danger' : 'btn-outline-danger'} btn-estado" data-estado="nook" title="NO OK">
                            <i class="bi bi-x-circle-fill"></i>
                        </button>
                    </div>
                </td>
            `;
            
            contadoresBody.appendChild(row);
        });
    });
    
    calcularTotalConsumo();
}

// Calcular total de consumo
function calcularTotalConsumo() {
    let total = 0;
    contadores.forEach(contador => {
        total += Math.floor(contador.consumo);
    });
    
    // Buscar el elemento del total o crearlo si no existe
    let totalElement = document.getElementById('totalConsumo');
    if (!totalElement) {
        // Si el elemento no existe, crear la fila de total
        const tfoot = document.querySelector('#contadoresTable tfoot');
        if (tfoot) {
            tfoot.innerHTML = `
                <tr class="table-primary">
                    <td colspan="4" class="text-end fw-bold">Total m³ Consumidos:</td>
                    <td id="totalConsumo" class="fw-bold">${Math.floor(total)}</td>
                </tr>
            `;
        }
    } else {
        totalElement.textContent = Math.floor(total);
    }
    
    return total;
}

// Guardar lecturas
function guardarLecturas() {
    const periodo = periodoLecturaInput.value;
    
    if (!periodo) {
        alert('Por favor, selecciona un periodo de lectura.');
        return;
    }
    
    if (contadores.length === 0) {
        alert('No hay datos de contadores para guardar.');
        return;
    }
    
    // Recoger los valores actuales de los inputs
    document.querySelectorAll('.lectura-actual').forEach((input, index) => {
        contadores[index].lecturaActual = parseFloat(input.value) || 0;
        contadores[index].consumo = Math.max(0, contadores[index].lecturaActual - contadores[index].lecturaAnterior);
    });
    
    // Crear registro de lectura
    const fechaRegistro = new Date().toISOString();
    const totalConsumo = calcularTotalConsumo();
    
    const registro = {
        periodo,
        fechaRegistro,
        totalConsumo,
        contadores: JSON.parse(JSON.stringify(contadores)) // Copia profunda
    };
    
    // Verificar si ya existe un registro para este periodo
    const existeIndex = historialLecturas.findIndex(item => item.periodo === periodo);
    
    if (existeIndex >= 0) {
        // Actualizar registro existente
        historialLecturas[existeIndex] = registro;
    } else {
        // Agregar nuevo registro
        historialLecturas.push(registro);
    }
    
    // Guardar en localStorage
    localStorage.setItem('historialLecturas', JSON.stringify(historialLecturas));
    
    // Actualizar UI
    renderizarHistorialLecturas();
    
    alert('Lecturas guardadas correctamente.');
}

// Renderizar historial de lecturas
function renderizarHistorialLecturas() {
    historialBody.innerHTML = '';
    
    historialLecturas.sort((a, b) => b.periodo.localeCompare(a.periodo)).forEach((registro, index) => {
        const row = document.createElement('tr');
        
        // Formatear fecha
        const fecha = new Date(registro.fechaRegistro);
        const fechaFormateada = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString();
        
        // Formatear periodo para mostrar
        const [año, mes] = registro.periodo.split('-');
        const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const periodoFormateado = `${nombresMeses[parseInt(mes) - 1]} ${año}`;
        
        row.innerHTML = `
            <td>${periodoFormateado}</td>
            <td>${registro.totalConsumo.toFixed(2)}</td>
            <td>${fechaFormateada}</td>
            <td>
                <button class="btn btn-sm btn-info ver-detalle" data-index="${index}">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-danger eliminar-registro" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        historialBody.appendChild(row);
    });
    
    // Agregar event listeners para los botones
    document.querySelectorAll('.ver-detalle').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = btn.dataset.index;
            cargarRegistroHistorico(index);
        });
    });
    
    document.querySelectorAll('.eliminar-registro').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = btn.dataset.index;
            eliminarRegistroHistorico(index);
        });
    });
}

// Cargar un registro histórico
function cargarRegistroHistorico(index) {
    const registro = historialLecturas[index];
    
    // Actualizar periodo
    periodoLecturaInput.value = registro.periodo;
    
    // Cargar contadores
    contadores = JSON.parse(JSON.stringify(registro.contadores));
    
    // Renderizar tabla
    renderizarTablaContadores();
    
    // Actualizar el mapa con los nuevos hidrantes
    actualizarMarcadoresHidrantes();
}

// Eliminar un registro histórico
function eliminarRegistroHistorico(index) {
    if (confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
        historialLecturas.splice(index, 1);
        
        // Guardar en localStorage
        localStorage.setItem('historialLecturas', JSON.stringify(historialLecturas));
        
        // Actualizar UI
        renderizarHistorialLecturas();
    }
}

// Cargar datos guardados en localStorage
function cargarDatosGuardados() {
    // Intentar cargar datos desde localStorage
    const contadoresGuardados = localStorage.getItem('contadores');
    if (contadoresGuardados) {
        contadores = JSON.parse(contadoresGuardados);
        renderizarTablaContadores();
        actualizarMarcadoresHidrantes();
    }
    
    // Cargar historial
    const historialGuardado = localStorage.getItem('historialLecturas');
    if (historialGuardado) {
        historialLecturas = JSON.parse(historialGuardado);
        renderizarHistorialLecturas();
    }
}

// Generar PDF
function generarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configurar documento
    doc.setFontSize(18);
    doc.text('Informe de Lecturas de Contadores', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Periodo: ${periodoSeleccionado}`, 14, 30);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 37);
    
    // Preparar tabla
    const headers = [[
        '#', 
        'HIDRANTE', 
        'Última Lectura', 
        'Lectura Actual', 
        'm³ Consumidos',
        'Incidencias',
        'Estado'
    ]];
    
    const data = contadores.map((contador, index) => [
        index + 1, 
        contador.hidrante, 
        Math.floor(contador.lecturaAnterior),
        Math.floor(contador.lecturaActual),
        Math.floor(contador.consumo),
        contador.incidencia || '',
        contador.estado === 'ok' ? 'OK' : contador.estado === 'nook' ? 'NO OK' : 'Pendiente'
    ]);
    
    // Añadir total
    const totalConsumo = contadores.reduce((total, contador) => total + contador.consumo, 0);
    data.push(['', '', '', 'Total m³:', Math.floor(totalConsumo), '', '']);
    
    // Generar tabla
    doc.autoTable({
        head: headers,
        body: data,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        footStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: {
            0: { cellWidth: 10 },  // # (estrecha)
            5: { cellWidth: 40 },  // Incidencias (más ancha)
            6: { cellWidth: 20 }   // Estado
        }
    });
    
    // Generar PDF
    const pdfOutput = doc.output('datauristring');
    const pdfPreview = document.getElementById('pdfPreview');
    pdfPreview.innerHTML = `<iframe width="100%" height="100%" src="${pdfOutput}"></iframe>`;
    
    // Mostrar modal
    const pdfModal = new bootstrap.Modal(document.getElementById('pdfModal'));
    pdfModal.show();
    
    return doc;
}

// Exportar a Excel
function exportarExcel() {
    if (contadores.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }
    
    const periodoExcel = periodoLecturaInput.value || 'Sin periodo';
    
    // Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new();
    
    // Datos para la hoja de cálculo
    const headers = ['#', 'HIDRANTE', 'Última Lectura', 'Lectura Actual', 'm³ Consumidos', 'Incidencias', 'Estado'];
    
    const data = contadores.map((contador, index) => [
        index + 1, 
        contador.hidrante, 
        Math.floor(contador.lecturaAnterior),
        Math.floor(contador.lecturaActual),
        Math.floor(contador.consumo),
        contador.incidencia || '',
        contador.estado === 'ok' ? 'OK' : contador.estado === 'nook' ? 'NO OK' : 'Pendiente'
    ]);
    
    // Añadir una fila con el total
    const totalConsumo = contadores.reduce((total, contador) => total + contador.consumo, 0);
    data.push(['', '', '', 'Total m³:', Math.floor(totalConsumo), '', '']);
    
    // Combinar headers con datos
    const wsData = [headers, ...data];
    
    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Lecturas');
    
    // Generar nombre de archivo con el periodo
    const nombreArchivo = `Lecturas_Contadores_${periodoExcel.replace(/[\/:*?"<>|]/g, '_')}.xlsx`;
    
    // Exportar el archivo
    XLSX.writeFile(wb, nombreArchivo);
    
    alert(`Archivo Excel "${nombreArchivo}" exportado correctamente.`);
}
