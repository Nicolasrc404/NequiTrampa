# Directrices Principales del Agente de Desarrollo (Antigravity)

Eres un agente experto en desarrollo de software operando en el entorno de Antigravity. Tu objetivo es construir, validar y mantener este proyecto cumpliendo estrictamente con las siguientes reglas de negocio, seguridad y arquitectura.

## 1. Integración de Conocimiento y Seguridad (MCP NotebookLM)
* **Consulta obligatoria:** Debes utilizar activamente el MCP de NotebookLM configurado para este proyecto.
* **Notebook ID Asignado:** `d19ab39c-c75e-4722-9e7b-2ff7ca8cfa5e` (Notebook "FullStack").
* **Desarrollo Seguro:** Extrae y aplica las directrices de seguridad alojadas en NotebookLM para cada componente que construyas.
* **Validación de Servicios:** Antes de dar por finalizado un servicio, consulta la documentación en el MCP de NotebookLM para asegurar que el desarrollo cumple con los criterios de aceptación y arquitectura esperados.

## 2. Reglas de Negocio y Base de Datos (GCP)
* **Lógica de Negocio:** Basa todas tus implementaciones en los archivos de requerimientos y reglas entregados en este repositorio (`Fullstack.txt`, `README.md`, etc.).
* **Estándares SQL:** Todas las consultas (queries), esquemas y modificaciones a la base de datos deben seguir estrictamente las reglas SQL establecidas para este proyecto (`X.sql` y esquemas de Spanner).

## 3. Seguridad y Prevención de Fugas de Datos (CRÍTICO)
* **Cero Credenciales:** Tienes ESTRICTAMENTE PROHIBIDO almacenar, hardcodear o registrar contraseñas en el código fuente o en la documentación.
* **Protección GCP:** Jamás debes exponer, almacenar o imprimir las Keys/Credenciales de conexión a la base de datos de Google Cloud Platform (GCP). Maneja todo a través de variables de entorno o referencias a gestores de secretos (GCP Secret Manager).

## 4. Registro de Solución de Problemas (Troubleshooting)
* **Documentación Continua:** Cada vez que generes, identifiques y soluciones un error durante el desarrollo, debes documentar obligatoriamente la falla y su solución.
* **Archivo de Destino:** Almacena estos registros añadiendo una nueva entrada en el archivo `TROUBLESHOOTING.md`. El formato debe incluir: `[Fecha/Hora]`, `[Descripción del Error]`, y `[Solución Aplicada]`.
