# Deep Search 02: Análisis Comparativo de Tecnologías Backend
## Justificación de ASP.NET Core 8 / C# frente a Alternativas para Sistemas Financieros

---

## 1. Criterios de Evaluación Técnica

Para seleccionar la plataforma backend de **NequiTrampa**, se evaluaron 5 tecnologías ampliamente utilizadas en la industria bajo 6 dimensiones críticas para un sistema financiero distribuido:

1. **Soporte de Concurrencia y Transaccionalidad**: Capacidad para manejar transacciones ACID distribuidas sin condiciones de carrera.
2. **Sistema de Tipos y Precisión Numérica**: Soporte nativo para tipos monetarios de precisión fija (`decimal`), evitando errores de redondeo de punto flotante.
3. **Seguridad y Modelo de Autorización**: Soporte maduro para RBAC, autorización basada en políticas, recursos (Resource-Based Authorization) y validación criptográfica de JWT (RFC 8725).
4. **Desempeño y Consumo de Recursos en Cloud Run**: Tiempos de arranque en frío (*cold start*), latencia P99 y uso de memoria para escalar a cero eficientemente.
5. **Ecosistema y SDKs Oficiales de Google Cloud**: Soporte para Cloud Spanner, Pub/Sub, Firestore y Secret Manager.
6. **Manejo Estandarizado de Errores**: Soporte nativo para RFC 9457 (Problem Details) y OpenAPI 3.x.

---

## 2. Matriz Comparativa

| Criterio | ASP.NET Core 8 (C#) | Spring Boot 3 (Java) | NestJS (TypeScript) | FastAPI (Python) | Go (Golang) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Precisión Numérica Monetaria** | **Excelente** (`decimal` nativo de 128 bits) | **Excelente** (`BigDecimal`) | **Deficiente** (IEEE 754 float; requiere bibliotecas externas como `decimal.js`) | **Aceptable** (`Decimal` en stdlib, pero propenso a bugs de coerción dinámica) | **Aceptable** (`shopspring/decimal` de terceros) |
| **Pipeline de Seguridad y RBAC** | **Excelente** (`IAuthorizationService`, Policies, Resource-Based Auth, Deny-by-Default) | **Excelente** (Spring Security, aunque con alta complejidad de configuración) | **Bueno** (Guards e Interceptors, requiere código ad-hoc para resource auth) | **Regular** (Dependencias de FastAPI, validación manual de scopes) | **Básico** (Middleware manual, no hay framework de policies nativo) |
| **Soporte Nativo RFC 9457** | **Nativo** (`AddProblemDetails()` en ASP.NET Core 8) | **Bueno** (`ProblemDetail` en Spring 6) | **Manual** (Filtros de excepción personalizados) | **Manual** (Middleware de excepción propio) | **Manual** (Serialización de structs propios) |
| **SDK Oficial Cloud Spanner** | **Nativo y Maduro** (`Google.Cloud.Spanner.Data`) | **Nativo y Maduro** (`google-cloud-spanner`) | **Bueno** (`@google-cloud/spanner`) | **Bueno** (`google-cloud-spanner`) | **Excelente** (`cloud.google.com/go/spanner`) |
| **Cold Start en Cloud Run** | **Muy Bueno** (~1.2s en .NET 8 chiseled) | **Lento** (4s - 8s en JVM estándar; requiere GraalVM Native Image) | **Bueno** (~1.5s en Node.js) | **Rápido** (~0.8s) | **Excelente** (~0.3s) |
| **Tipado Estricto y Async** | **Excelente** (C# 12, Task-based async/await) | **Excelente** (Java 21 Virtual Threads) | **Bueno** (TypeScript, pero borrado en runtime) | **Débil** (Type hints en Python sin validación estricta en runtime) | **Excelente** (Estricto, goroutines) |

---

## 3. Justificación de la Elección: ASP.NET Core 8 / C#

### A. Tipo `decimal` de 128 bits de Primera Clase
En sistemas financieros, el uso de tipos de coma flotante (`float`, `double`, `number` en JS) está estrictamente prohibido debido a errores de representación binaria (ej. `0.1 + 0.2 !== 0.3`). C# ofrece `decimal`, un tipo numérico de coma flotante decimal de 128 bits diseñado específicamente para cálculos financieros con 28-29 dígitos significativos, que se mapea directamente a los tipos `NUMERIC` de Cloud Spanner.

### B. Arquitectura de Seguridad Robusta y Deny-by-Default
ASP.NET Core 8 posee uno de los pipelines de seguridad más rigurosos de la industria:
* Permite definir un `FallbackPolicy` global que bloquea cualquier endpoint que no esté explícitamente abierto (**Deny-by-Default**).
* Soporta **Resource-Based Authorization** mediante `IAuthorizationService`, esencial para verificar la propiedad del recurso (`originClientId == authenticatedUserId`) antes de retornar transacciones o comprobantes.
* Integración nativa con `Microsoft.AspNetCore.Authentication.JwtBearer`, lo que facilita la validación estricta de RFC 8725 frente a Google Cloud Identity Platform sin dependencias frágiles.

### C. Soporte Nativo de RFC 9457 (Problem Details)
A partir de .NET 7 y 8, el framework incorpora `AddProblemDetails()` como middleware de primera clase, garantizando que tanto los errores del framework (400, 404, 405, 415, 422) como las excepciones de negocio emitan `application/problem+json` sin necesidad de envoltorios manuales propensos a errores.

### D. Optimización para Google Cloud Run
Con las imágenes base `mcr.microsoft.com/dotnet/aspnet:8.0-chiseled` basadas en Ubuntu distroless, los contenedores tienen un tamaño inferior a 100 MB, carecen de shell o gestores de paquetes (reduciendo drásticamente la superficie de vulnerabilidad CVE), y arrancan en Cloud Run en poco más de un segundo, permitiendo escalar a cero con costos mínimos.
