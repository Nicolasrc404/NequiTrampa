// Punto de entrada de la capa de servicios remotos (núcleo puro).
// Los servicios por dominio se añaden sobre `createHttpClient`.
// El cableado de plataforma vive en `./api` y `./session/platform`.
export * from './http';
export * from './session';
