# Correcciones Aplicadas en la Iteración 2

1. **Reclasificación de `Notifications`**:
   * *Anterior*: Se listaba bajo el rol `SOPORTE`.
   * *Vigente*: Se reclasificó a la categoría `TRANSVERSAL`, dado que atiende eventos del cliente (transferencias recibidas), soporte (tickets) y operadores (escalaciones).
2. **Subordinación de `Access`**:
   * *Anterior*: Se proyectaba como un microservicio independiente.
   * *Vigente*: Se subordinó como capacidad de `/v1/me/access` dentro del dominio `Profile` en `core-api`.
3. **Mapeo de Identidad y Ownership**:
   * *Regla Refinada*: Se desacopló la suposición de que `sub == clientId`. Se formalizó el flujo `JWT sub -> Identity Mapping -> authenticatedClientId -> wallet.clientId == authenticatedClientId`.
4. **Delimitación de `Cash`**:
   * Se separó explícitamente la persistencia backend en **Cloud Firestore** del almacenamiento local offline en **SQLite**.
5. **Persistencia de `Beneficiaries`**:
   * Se eliminó la ambigüedad "Firestore / Spanner" y se marcó como `🎯 TO-BE / PERSISTENCIA PENDIENTE DE DEFINIR`.
6. **Políticas de Autorización Granulares**:
   * Se refinaron las políticas para evitar directivas genéricas, definiendo directivas explícitas como `CanCreateTransfer`, `CanCreateRecharge`, `CanExecuteReversals`, `CanManageUsers`, etc.
7. **Readiness Probe Funcional**:
   * Se clasificó `/health/ready` como `🟡 PARCIAL` hasta que verifique una conexión real contra Cloud Spanner.
