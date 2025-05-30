// Variables globales
let contadores = [];
let historialLecturas = [];
let excelData = null;
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
    
    // Intentar cargar el historial guardado
    cargarHistorial();
});

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
            
            // Mostrar información de debug sobre las columnas disponibles
            if (jsonData.length > 0) {
                console.log('Columnas disponibles en el Excel:', Object.keys(jsonData[0]));
                console.log('Primera fila completa:', jsonData[0]);
                
                // Verificar específicamente si existe la columna de última lectura
                const posiblesColumnas = [
                    'ultima lectura',  // Columna J del usuario
                    'ULTIMA LECTURA',
                    'Ultima lectura',
                    'última lectura',
                    'ÚLTIMA LECTURA',
                    'Última lectura',
                    'ultima_lectura',
                    'ultima lectura del mes',
                    'ULTIMA LECTURA DEL MES'
                ];
                
                let encontrada = false;
                posiblesColumnas.forEach(col => {
                    if (jsonData[0][col] !== undefined) {
                        console.log('Encontrada columna de última lectura:', col, 'con valor:', jsonData[0][col]);
                        encontrada = true;
                    }
                });
                
                if (!encontrada) {
                    console.log('AVISO: No se encontró columna de "ultima lectura"');
                    
                    // Intentemos localizar la columna J por su contenido
                    console.log('Buscando la columna J con datos numéricos que podría ser "ultima lectura"');
                    for (const key in jsonData[0]) {
                        if (typeof jsonData[0][key] === 'number' || 
                            (typeof jsonData[0][key] === 'string' && !isNaN(parseFloat(jsonData[0][key])))) {
                            console.log(`Posible columna de lecturas: "${key}" con valor: ${jsonData[0][key]}`);
                        }
                    }
                }
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
        // Lista ampliada de posibles nombres de columna para última lectura del mes
    const ultimaLecturaColumnas = [
        'ultima lectura',  // Añadido específicamente para la columna J del usuario
        'ULTIMA LECTURA',
        'Ultima lectura',
        'última lectura',
        'ÚLTIMA LECTURA',
        'Última lectura',
        'ultima_lectura',
        'ultima lectura del mes',
        'ULTIMA LECTURA DEL MES',
        'Ultima lectura del mes',
        'última lectura del mes',
        'ÚLTIMA LECTURA DEL MES',
        'Última lectura del mes',
        'ultima_lectura_del_mes',
        'ULTIMA_LECTURA_DEL_MES',
        'UltimaLecturaDelMes',
        'ultima lectura mes',
        'ultima',
        'ULTIMA',
        'lectura',
        'LECTURA',
        'lectura mes',
        'LECTURA MES'
    ];
    
    // Verifica si alguna de las columnas existe
    let columnaUltimaLectura = null;
    if (jsonData.length > 0) {
        for (const colName of ultimaLecturaColumnas) {
            if (jsonData[0][colName] !== undefined) {
                columnaUltimaLectura = colName;
                console.log('Usando columna para última lectura:', colName);
                break;
            }
        }
    }
    
    jsonData.forEach((row, index) => {
        // Intentar identificar las columnas del Excel específico de CCRR LIAR Y CARBONIEL
        const id = row.ID || row.Id || row.id || row.TOMA || row.Toma || row.toma || row.NUM || row.Num || row.num || index + 1;
        const hidrante = row.HIDRANTE || row.Hidrante || row.hidrante || row.SECTOR || row.Sector || row.sector || '';
        
        let lecturaAnterior = 0;
        
        // Si encontramos la columna específica, la usamos
        if (columnaUltimaLectura) {
            lecturaAnterior = parseFloat(row[columnaUltimaLectura] || 0);
            console.log(`Lectura para ID ${id}: ${lecturaAnterior} (de columna ${columnaUltimaLectura})`);
        } else {
            // Buscar específicamente si existe alguna propiedad con nombre que contenga "ultima lectura"
            let encontrada = false;
            for (const key in row) {
                if (key.toLowerCase().includes('ultima lectura') || key.toLowerCase().includes('última lectura')) {
                    lecturaAnterior = parseFloat(row[key] || 0);
                    console.log(`Encontrada columna por búsqueda parcial: ${key} con valor: ${lecturaAnterior}`);
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
                console.log(`Lectura para ID ${id}: ${lecturaAnterior} (de columna alternativa)`);
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
            const consumo = Math.floor(contador.consumo || 0);
            
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
