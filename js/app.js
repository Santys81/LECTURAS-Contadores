// Variables globales
let contadores = [];

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

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Establecer el mes actual en el input de periodo
    const fechaActual = new Date();
    const año = fechaActual.getFullYear();
    let mes = fechaActual.getMonth() + 1;
    mes = mes < 10 ? '0' + mes : mes;
    periodoLecturaInput.value = `${año}-${mes}`;
    
    // Cargar datos guardados en localStorage
    cargarDatosGuardados();
    
    // Eventos después de cargar la página
    importBtn.addEventListener('click', importarExcel);
    saveBtn.addEventListener('click', guardarLecturas);
    exportPdfBtn.addEventListener('click', mostrarPrevisualizacionPDF);
    exportExcelBtn.addEventListener('click', exportarExcel);
    downloadPdfBtn.addEventListener('click', descargarPDF);
    
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
    
    // Intentar cargar los datos guardados
    cargarDatosGuardados();
});

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
            procesarExcel(e.target.result);
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            alert('Error al procesar el archivo. Verifica que sea un archivo Excel válido.');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Procesar datos Excel
function procesarExcel(buffer) {
    try {
        // Leer el archivo Excel
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Verificar que hay datos
        if (data.length < 2) {
            throw new Error('El archivo no contiene suficientes datos.');
        }
        
        // Buscar índices de columnas necesarias
        const headers = data[0].map(h => String(h).toLowerCase());
        const idIdx = headers.findIndex(h => h.includes('id') || h.includes('toma'));
        const hidranteIdx = headers.findIndex(h => h.includes('hidrante') || h.includes('contador'));
        
        // Detectar columna de última lectura (puede tener varios nombres)
        let lecturaAnteriorIdx = headers.findIndex(h => 
            h.includes('ultima lectura') || 
            h.includes('última lectura') || 
            h.includes('lectura anterior') ||
            h.includes('lectura_anterior')
        );
        
        // Si no se encontró la columna, buscar alternativas
        if (lecturaAnteriorIdx === -1) {
            lecturaAnteriorIdx = headers.findIndex(h => 
                h.includes('lectura') || 
                h.includes('medida') || 
                h.includes('consumo anterior')
            );
        }
        
        // Buscar coordenadas si existen
        const latitudIdx = headers.findIndex(h => h.includes('latitud') || h.includes('lat'));
        const longitudIdx = headers.findIndex(h => h.includes('longitud') || h.includes('long') || h.includes('lng'));
        const altitudIdx = headers.findIndex(h => h.includes('altitud') || h.includes('alt') || h.includes('elevacion'));
        
        // Verificar que se encontraron las columnas necesarias
        if (idIdx === -1 || hidranteIdx === -1 || lecturaAnteriorIdx === -1) {
            throw new Error('No se encontraron todas las columnas necesarias en el archivo.');
        }
        
        // Almacenar grupos de hidrantes para generar coordenadas inteligentes
        const gruposHidrantes = {};
        const coordenadasGeneradas = {};
        
        // Primera pasada: identificar grupos de hidrantes
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row.length <= Math.max(idIdx, hidranteIdx)) continue;
            
            const hidrante = row[hidranteIdx] ? String(row[hidranteIdx]) : '';
            if (!hidrante) continue;
            
            // Detectar el grupo del hidrante (H01, H02, etc.)
            let grupoHidrante = 'otros';
            
            // Intentar capturar patrones como CR-LIAR_H01-001
            const matchComplejo = hidrante.match(/H0?(\d+)-/i);
            if (matchComplejo && matchComplejo[1]) {
                grupoHidrante = `H${parseInt(matchComplejo[1])}`;
            } else {
                // Intentar formato simple H1, H2
                const matchSimple = hidrante.match(/H0?(\d+)/i);
                if (matchSimple && matchSimple[1]) {
                    grupoHidrante = `H${parseInt(matchSimple[1])}`;
                }
            }
            
            if (!gruposHidrantes[grupoHidrante]) {
                gruposHidrantes[grupoHidrante] = [];
            }
            gruposHidrantes[grupoHidrante].push(hidrante);
        }
        
        // Generar coordenadas base para cada grupo
        const gruposCoordenadas = {};
        const grupos = Object.keys(gruposHidrantes).sort();
        
        // Ubicación central (puedes cambiarla por una ubicación real si lo deseas)
        const centroCoordenadas = { lat: 37.8883, lng: -4.7794 }; // Córdoba, España
        
        // Distribuir grupos en un círculo alrededor del centro
        grupos.forEach((grupo, index) => {
            const radio = 0.05; // ~5km
            const angulo = (index / grupos.length) * Math.PI * 2;
            
            // Posición relativa al centro para este grupo
            gruposCoordenadas[grupo] = {
                lat: centroCoordenadas.lat + Math.sin(angulo) * radio,
                lng: centroCoordenadas.lng + Math.cos(angulo) * radio
            };
        });
        
        // Procesar los datos
        contadores = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row.length <= Math.max(idIdx, hidranteIdx, lecturaAnteriorIdx)) continue;
            
            const id = row[idIdx] ? String(row[idIdx]) : `ID-${i}`;
            const hidrante = row[hidranteIdx] ? String(row[hidranteIdx]) : '';
            const lecturaAnterior = parseFloat(row[lecturaAnteriorIdx]) || 0;
            
            // Crear objeto base del contador
            const contador = {
                id,
                hidrante,
                lecturaAnterior,
                lecturaActual: lecturaAnterior,
                consumo: 0,
                incidencia: '',
                estado: 'pendiente'
            };
            
            // Añadir coordenadas existentes o generarlas inteligentemente
            if (latitudIdx !== -1 && row[latitudIdx]) {
                contador.latitud = parseFloat(row[latitudIdx]);
                contador.longitud = longitudIdx !== -1 && row[longitudIdx] ? 
                    parseFloat(row[longitudIdx]) : centroCoordenadas.lng;
                contador.altitud = altitudIdx !== -1 && row[altitudIdx] ? 
                    parseFloat(row[altitudIdx]) : Math.floor(100 + Math.random() * 50);
            } else {
                // Determinar grupo de hidrante para coordenadas
                let grupoHidrante = 'otros';
                const matchComplejo = hidrante.match(/H0?(\d+)-/i);
                if (matchComplejo && matchComplejo[1]) {
                    grupoHidrante = `H${parseInt(matchComplejo[1])}`;
                } else {
                    const matchSimple = hidrante.match(/H0?(\d+)/i);
                    if (matchSimple && matchSimple[1]) {
                        grupoHidrante = `H${parseInt(matchSimple[1])}`;
                    }
                }
                
                // Usar coordenadas del grupo con pequeña variación para cada hidrante
                if (gruposCoordenadas[grupoHidrante]) {
                    // Obtenemos un índice del hidrante dentro del grupo
                    const hidranteIndex = gruposHidrantes[grupoHidrante].indexOf(hidrante);
                    const total = gruposHidrantes[grupoHidrante].length;
                    
                    // Distribuimos los hidrantes en un pequeño círculo alrededor de la coordenada del grupo
                    const miniRadio = 0.005; // ~500m
                    const miniAngulo = (hidranteIndex / (total || 1)) * Math.PI * 2;
                    
                    contador.latitud = gruposCoordenadas[grupoHidrante].lat + 
                        Math.sin(miniAngulo) * miniRadio * (Math.random() * 0.5 + 0.5);
                    contador.longitud = gruposCoordenadas[grupoHidrante].lng + 
                        Math.cos(miniAngulo) * miniRadio * (Math.random() * 0.5 + 0.5);
                    contador.altitud = Math.floor(100 + Math.random() * 50);
                } else {
                    // Si no hay grupo, usar el centro con pequeña variación
                    contador.latitud = centroCoordenadas.lat + (Math.random() - 0.5) * 0.01;
                    contador.longitud = centroCoordenadas.lng + (Math.random() - 0.5) * 0.01;
                    contador.altitud = Math.floor(100 + Math.random() * 50);
                }
            }
            
            contadores.push(contador);
        }
        
        // Guardar datos en localStorage
        localStorage.setItem('contadores', JSON.stringify(contadores));
        
        // Renderizar tabla
        renderizarTablaContadores();
        
        // Notificar al usuario que los datos se han importado con éxito
        mostrarNotificacion('Datos importados con éxito', 'success');
        
        // Habilitar botones
        habilitarBotones();
        
        return true;
    } catch (error) {
        console.error('Error al procesar el archivo Excel:', error);
        alert(`Error al procesar el archivo: ${error.message}`);
        return false;
    }
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
        
        // Calcular consumo total
        calcularTotalConsumo();
        
        // Habilitar botones
        habilitarBotones();
    }
    
    // Cargar historial
    const historialGuardado = localStorage.getItem('historialLecturas');
    if (historialGuardado) {
        historialLecturas = JSON.parse(historialGuardado);
        renderizarHistorialLecturas();
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
            lecturaAnterior: Math.floor(Math.random() * 1000),
            lecturaActual: Math.floor(Math.random() * 1000),
            consumo: 0,
            incidencia: '',
            estado: 'pendiente',
            latitud: lat,
            longitud: lng,
            altitud: Math.floor(100 + Math.random() * 50)
        };
        
        // Calcular consumo
        contador.consumo = Math.max(0, contador.lecturaActual - contador.lecturaAnterior);
        
        // Añadir a la lista
        contadores.push(contador);
    }
    
    // Renderizar tabla y actualizar mapa
    renderizarTablaContadores();
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
    
    // Habilitar botones
    habilitarBotones();
}

// Mostrar previsualización del PDF
function mostrarPrevisualizacionPDF() {
    const periodo = periodoLecturaInput.value || 'Actual';
    
    // Crear PDF con jsPDF
    const pdf = new jspdf.jsPDF();
    
    // Añadir título y fecha
    pdf.setFontSize(18);
    pdf.text('Informe de Lecturas de Contadores', 105, 15, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Periodo: ${periodo}`, 105, 25, { align: 'center' });
    pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });
    
    // Configuración de la tabla
    const head = [['#', 'HIDRANTE', 'ÚLTIMA LECTURA', 'LECTURA ACTUAL', 'M³ CONSUMIDOS', 'INCIDENCIAS', 'ESTADO']];
    
    // Datos de la tabla
    const data = contadores.map((contador, idx) => {
        return [
            idx + 1,
            contador.hidrante || '',
            Math.floor(contador.lecturaAnterior) || 0,
            Math.floor(contador.lecturaActual) || 0,
            Math.floor(contador.consumo) || 0,
            contador.incidencia || '',
            contador.estado || 'Pendiente'
        ];
    });
    
    // Añadir tabla al PDF
    pdf.autoTable({
        head: head,
        body: data,
        startY: 40,
        theme: 'striped',
        styles: { 
            fontSize: 8, 
            cellPadding: 2 
        },
        columnStyles: {
            0: { cellWidth: 15 }, // #
            1: { cellWidth: 40 }, // HIDRANTE
            2: { cellWidth: 30 }, // ÚLTIMA LECTURA
            3: { cellWidth: 30 }, // LECTURA ACTUAL
            4: { cellWidth: 30 }, // M³ CONSUMIDOS
            5: { cellWidth: 30 }, // INCIDENCIAS
            6: { cellWidth: 20 }  // ESTADO
        }
    });
    
    // Calcular consumo total
    let totalConsumo = 0;
    contadores.forEach(contador => {
        totalConsumo += Math.floor(contador.consumo) || 0;
    });
    
    // Añadir total de consumo
    const finalY = pdf.previousAutoTable.finalY || 150;
    pdf.text(`Total M³ Consumidos: ${totalConsumo}`, 195, finalY + 10, { align: 'right' });
    
    // Obtener como URL de datos
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Mostrar previsualización en el contenedor
    const pdfPreview = document.getElementById('pdfPreview');
    if (pdfPreview) {
        pdfPreview.innerHTML = `<iframe src="${pdfUrl}" width="100%" height="500" style="border: none;"></iframe>`;
        pdfPreview.style.display = 'block';
    } else {
        alert('No se encontró el contenedor para la previsualización del PDF');
    }
    
    // Mostrar botón de descarga
    downloadPdfBtn.style.display = 'block';
}

// Generar PDF para descargar
function descargarPDF() {
    const periodo = periodoLecturaInput.value || 'Actual';
    
    // Crear PDF con jsPDF
    const pdf = new jspdf.jsPDF();
    
    // Añadir título y fecha
    pdf.setFontSize(18);
    pdf.text('Informe de Lecturas de Contadores', 105, 15, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Periodo: ${periodo}`, 105, 25, { align: 'center' });
    pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });
    
    // Configuración de la tabla
    const head = [['#', 'HIDRANTE', 'ÚLTIMA LECTURA', 'LECTURA ACTUAL', 'M³ CONSUMIDOS', 'INCIDENCIAS', 'ESTADO']];
    
    // Datos de la tabla
    const data = contadores.map((contador, idx) => {
        return [
            idx + 1,
            contador.hidrante || '',
            Math.floor(contador.lecturaAnterior) || 0,
            Math.floor(contador.lecturaActual) || 0,
            Math.floor(contador.consumo) || 0,
            contador.incidencia || '',
            contador.estado || 'Pendiente'
        ];
    });
    
    // Añadir tabla al PDF
    pdf.autoTable({
        head: head,
        body: data,
        startY: 40,
        theme: 'striped',
        styles: { 
            fontSize: 8, 
            cellPadding: 2 
        },
        columnStyles: {
            0: { cellWidth: 15 }, // #
            1: { cellWidth: 40 }, // HIDRANTE
            2: { cellWidth: 30 }, // ÚLTIMA LECTURA
            3: { cellWidth: 30 }, // LECTURA ACTUAL
            4: { cellWidth: 30 }, // M³ CONSUMIDOS
            5: { cellWidth: 30 }, // INCIDENCIAS
            6: { cellWidth: 20 }  // ESTADO
        }
    });
    
    // Calcular consumo total
    let totalConsumo = 0;
    contadores.forEach(contador => {
        totalConsumo += Math.floor(contador.consumo) || 0;
    });
    
    // Añadir total de consumo
    const finalY = pdf.previousAutoTable.finalY || 150;
    pdf.text(`Total M³ Consumidos: ${totalConsumo}`, 195, finalY + 10, { align: 'right' });
    
    // Generar nombre de archivo con el periodo
    const nombreArchivo = `Lecturas_Contadores_${periodo.replace(/[\/:*?"<>|]/g, '_')}.pdf`;
    
    // Descargar el archivo
    pdf.save(nombreArchivo);
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
