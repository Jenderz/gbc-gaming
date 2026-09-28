---
name: web-dev
description: Instrucciones y mejores prácticas para el desarrollo de aplicaciones web modernas usando React, TypeScript, Vite y con diseño Glassmorphism estilo iOS Premium.
---

# Desarrollo de Apps Web

Esta habilidad define el stack tecnológico, directrices de diseño y mejores prácticas a seguir obligatoriamente cuando se te pide desarrollar aplicaciones web, páginas o componentes.

## Stack Tecnológico Requerido

1. **Framework**: React (última versión). Es **obligatorio** el uso exclusivo de Functional Components y Hooks. No usar Class Components.
2. **Lenguaje**: TypeScript configurado en modo estricto (`strict: true`). Se debe asegurar un tipado fuerte y evitar el uso de `any`.
3. **Build Tool**: Vite. Se debe utilizar para inicializar los proyectos y para todo el entorno de desarrollo por su extrema rapidez.
4. **Enrutamiento**: React Router DOM (versión 6 o superior). Usa las APIs modernas como `createBrowserRouter` o componentes de `<Routes>`.
5. **Iconos**: Lucide React. Prioriza esta librería para cualquier icono en la interfaz.
6. **Gráficos/Dashboards**: Recharts. Utiliza esta librería para la visualización de datos de manera limpia y responsiva.
7. **Estilos y Diseño (CRÍTICO)**: 
   - Utiliza **CSS Puro (Vanilla CSS moderno)** como regla general.
   - Aplica técnicas modernas: **Variables CSS**, **Flexbox** y **CSS Grid**.
   - **Estética Premium**: El diseño debe basarse en un estilo **"Glassmorphism" iOS Premium**. Esto incluye fondos translúcidos, desenfoque de fondo (`backdrop-filter: blur()`), bordes sutiles semi-transparentes, sombras suaves y colores armoniosos y vibrantes.
   - Las interfaces deben sentirse dinámicas con micro-animaciones en interacciones de estado (hover, focus, active) y transiciones fluidas.
   - **EXCEPCIÓN DE TAILWIND**: Solo se debe utilizar **TailwindCSS** si el usuario lo indica explícitamente en el requerimiento. Si no se menciona Tailwind, debes usar Vanilla CSS.

## Directrices de Implementación

### 1. Componentes React y TypeScript
- Define siempre las `interfaces` o `types` para las propiedades (props) de tus componentes.
- Tipa correctamente los manejadores de eventos y estados.
```tsx
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const GlassButton: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return (
    <button className={`glass-btn ${variant}`} onClick={onClick}>
      {label}
    </button>
  );
};
```

### 2. Estilos Premium Glassmorphism
Para lograr el efecto "Glassmorphism" deseado, aplica estilos similares a este ejemplo en tu CSS vainilla:
```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  --blur-amount: 10px;
}

/* Modo oscuro base recomendado para que resalte el efecto */
body {
  background: linear-gradient(135deg, #2c3e50, #1a2a6c, #b21f1f, #fdbb2d);
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
  color: #fff;
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--blur-amount));
  -webkit-backdrop-filter: blur(var(--blur-amount)); /* Soporte Safari */
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 16px;
  padding: 24px;
}
```

### 3. Accesibilidad y Semántica (SEO)
- Usa etiquetas semánticas (`<header>`, `<main>`, `<section>`, `<article>`).
- Asegúrate de que el contraste sea suficiente a pesar del uso de transparencias (Glassmorphism).

Al aplicar esta habilidad, asegúrate de que el resultado final no sea un "Producto Mínimo Viable (MVP)" básico, sino un entregable con estética rica, premium y lista para el usuario final.
