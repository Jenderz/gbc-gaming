import html2canvas from 'html2canvas';

export interface RenderOptions {
    scale?: number;
    backgroundColor?: string;
}

/**
 * Fast and reliable ticket rendering utility.
 * Renders HTML element to PNG Data URL.
 */
export async function renderElementToDataUrl(
    element: HTMLElement,
    options: RenderOptions = {}
): Promise<string> {
    const scale = options.scale || 2;
    const backgroundColor = options.backgroundColor || '#ffffff';

    // 1. Intentar SVG foreignObject nativo con absolutización de imágenes
    try {
        const width = element.offsetWidth || element.clientWidth || 400;
        const height = element.offsetHeight || element.clientHeight || 600;

        if (width > 0 && height > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.scale(scale, scale);
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);

                const clone = element.cloneNode(true) as HTMLElement;

                // Reemplazar imágenes relativas por absolutas para el canvas
                const images = clone.querySelectorAll('img');
                images.forEach((img) => {
                    if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('http')) {
                        img.src = new URL(img.getAttribute('src') || '', window.location.href).href;
                    }
                });

                const htmlStr = new XMLSerializer().serializeToString(clone);

                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
                    `<foreignObject width="100%" height="100%">` +
                    `<div xmlns="http://www.w3.org/1999/xhtml" style="background-color: ${backgroundColor}; width: ${width}px; height: ${height}px; color: #000;">` +
                    `${htmlStr}` +
                    `</div>` +
                    `</foreignObject>` +
                    `</svg>`;

                const img = new Image();
                img.crossOrigin = 'anonymous';
                const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const loaded = await new Promise<boolean>((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                    img.src = url;
                });

                if (loaded) {
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(url);
                    const dataUrl = canvas.toDataURL('image/png');
                    if (dataUrl && dataUrl.length > 1000) {
                        return dataUrl;
                    }
                }
                URL.revokeObjectURL(url);
            }
        }
    } catch {
        // Continuar al fallback seguro
    }

    // 2. Fallback súper fiable con html2canvas
    const canvas = await html2canvas(element, {
        scale,
        backgroundColor,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
    });

    return canvas.toDataURL('image/png');
}

export async function renderElementToBlob(
    element: HTMLElement,
    options: RenderOptions = {}
): Promise<Blob | null> {
    const dataUrl = await renderElementToDataUrl(element, options);
    const res = await fetch(dataUrl);
    return await res.blob();
}
