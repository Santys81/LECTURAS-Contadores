# Sistema de Gestión de Contadores

Aplicación web moderna para la gestión de lecturas de contadores que permite importar datos desde Excel, registrar lecturas mensuales, calcular totales y exportar informes a PDF.

## Características

- **Importación desde Excel**: Carga tus contadores desde un archivo Excel existente
- **Registro de Lecturas**: Actualiza las lecturas mensuales de forma sencilla
- **Cálculo Automático**: Calcula automáticamente el consumo y los totales
- **Exportación a PDF**: Genera informes profesionales en formato PDF
- **Historial de Lecturas**: Almacena y gestiona un historial de todas las lecturas realizadas
- **Interfaz Responsive**: Funciona en dispositivos móviles y de escritorio
- **Almacenamiento Local**: Guarda los datos en el navegador para no perder información

## Cómo usar

1. **Importar datos de contadores**:
   - Prepara un archivo Excel con columnas como ID, Ubicación, Descripción y Lectura Anterior
   - Haz clic en "Importar Datos" para cargar el archivo
   
2. **Registrar lecturas**:
   - Selecciona el periodo (mes/año) de la lectura
   - Introduce las lecturas actuales de cada contador
   - El consumo se calculará automáticamente
   
3. **Guardar y exportar**:
   - Guarda las lecturas para mantener un historial
   - Exporta a PDF para compartir o imprimir los informes

## Estructura del Excel

Para un funcionamiento óptimo, el archivo Excel debe tener una estructura similar a esta:

| ID | Ubicación | Descripción | Lectura_Anterior |
|----|-----------|-------------|------------------|
| 1  | Edificio A| Contador agua| 2354.5          |
| 2  | Edificio B| Contador luz | 4532.8          |

## Tecnologías utilizadas

- HTML5, CSS3 y JavaScript (ES6+)
- Bootstrap 5 para la interfaz de usuario
- SheetJS (xlsx) para la lectura de archivos Excel
- jsPDF para la generación de documentos PDF
- Almacenamiento localStorage para persistencia de datos

## Instalación

No requiere instalación. Solo descarga los archivos y abre `index.html` en tu navegador.

Para subirlo a GitHub:

```bash
# Inicializar repositorio Git
git init

# Añadir todos los archivos
git add .

# Hacer commit inicial
git commit -m "Versión inicial del Sistema de Gestión de Contadores"

# Conectar con tu repositorio en GitHub
git remote add origin https://github.com/tu-usuario/sistema-contadores.git

# Subir el código
git push -u origin master
```

## Licencia

Este proyecto está disponible como código abierto bajo la licencia MIT.
