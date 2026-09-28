# Habilidades del Agente (Agent Skills)

Este directorio (`.agent/skills/`) contiene las "habilidades" específicas para este proyecto. Las habilidades permiten al agente de IA (Antigravity) aprender flujos de trabajo personalizados, convenciones de código y tareas recurrentes.

## ¿Qué es una "Habilidad"?
Según el estándar de Antigravity, una habilidad es un paquete reutilizable de conocimiento que incluye:
- **Instrucciones**: Cómo abordar un tipo específico de tarea.
- **Mejores prácticas**: Convenciones y estándares a seguir.
- **Scripts y recursos opcionales**: Herramientas que el agente puede ejecutar.

## Cómo Crear una Nueva Habilidad

1. **Crear una carpeta**: `mkdir .agent/skills/nombre-de-habilidad`
2. **Añadir un archivo `SKILL.md`**: Este es el archivo principal que el agente leerá.

### Estructura del archivo `SKILL.md`

Debe incluir un bloque frontal en YAML (frontmatter) seguido de instrucciones en Markdown:

```markdown
---
name: nombre-de-habilidad
description: Explicación MUY CLARA de qué hace la habilidad y cuándo debe usarla el agente.
---

# Instrucciones

Paso a paso de lo que el agente debe hacer cuando invoque esta habilidad.
```

### Carpetas Opcionales
- `scripts/`: Coloca aquí scripts auxiliares (ej. bash, python, node) que el agente deba ejecutar.
- `resources/`: Archivos de referencia estáticos (ej. plantillas, ejemplos de la arquitectura).

## Mejores Prácticas
- **Enfoque único**: Cada habilidad debe hacer bien una sola cosa.
- **Descripción precisa**: El campo `description` del frontmatter es crucial; el agente lo utiliza para saber si esta habilidad es relevante para la petición del usuario.
- **Árboles de decisión**: Para tareas complejas, estructura las instrucciones como un árbol de decisión (ej. "Si pasa X, haz Y, sino haz Z").
