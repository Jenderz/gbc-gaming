---
name: code-review
description: Revisa de forma automática componentes, páginas y lógica en busca de errores, problemas de estilo y mejores prácticas antes de hacer commit.
---

# Habilidad de Revisión de Código (Code Review)

Esta habilidad se utiliza cuando el usuario solicita revisar el código, refactorizar, o validar que todo esté correcto antes de un despliegue o commit.

Sigue estos pasos rigurosamente en orden:

## 1. Verificación de Tipado y Errores Básicos
- Inspecciona si el código está usando `any` innecesariamente (fomentar interfaces y tipos estrictos de TypeScript).
- Asegúrate de que no haya variables declaradas que nunca se usen.

## 2. Convenciones de React / UI
- Verifica que los useEffect tengan las dependencias correctas en su arreglo.
- Revisa que los componentes funcionales estén estructurados adecuadamente y no tengan estado complejo que pudiera extraerse a custom hooks.
- Asegúrate de que las interacciones UI mantienen una experiencia de usuario (UX) rica y profesional, usando animaciones sutiles donde tenga sentido.

## 3. Seguridad y Consistencia de Datos
- Si se interactúa con APIs locales o remotas, evalúa si se están manejando adecuadamente los casos de error (ej. fallos de red, permisos insuficientes).
- Verifica que los datos sensibles o contraseñas nunca estén quemados en el código (hardcoded).

## 4. Rendimiento (Performance)
- Identifica re-renderizados innecesarios en React (considerar `useMemo` o `useCallback` si es extremadamente crítico).
- Sugiere limpieza de escuchadores de eventos o subscripciones.

## 5. Reporte
Cuando termines, genera un reporte estructurado y conciso.
No hagas cambios directos al código a menos que el usuario lo solicite explícitamente. Solo enumera tus hallazgos.
