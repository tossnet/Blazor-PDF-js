let pdfDoc: any = null;
let currentPage = 1;
let totalPages = 0;
let zoom = 1.5;
const canvasId = 'pdfCanvas';
let currentRenderTask: any = null;

let isDragging = false;
let startX = 0;
let startY = 0;
let initialScrollLeft = 0;
let initialScrollTop = 0;
function renderPage(pageNum: number): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !pdfDoc) return;

    pdfDoc.getPage(pageNum).then((page: any) => {
        const viewport = page.getViewport({ scale: zoom });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: context,
            viewport,
        };

        if (currentRenderTask) {
            currentRenderTask.cancel();
        }

        disableControls(false);

        currentRenderTask = page.render(renderContext);

        currentRenderTask.promise.then(() => {
            const info = document.getElementById('pageInfo');
            if (info) {
                info.textContent = `Page ${currentPage} / ${totalPages}`;
            }

            const zoomInfo = document.getElementById('zoomDefault');
            if (zoomInfo) {
                zoomInfo.textContent = `x ${zoom}`;
            }

            if (totalPages == 1) {
                disableControls(true);
            }

        }).catch((err: any) => {
            // Ne loggue que si l’erreur n’est pas due à une annulation
            if (err?.name !== 'RenderingCancelledException') {
                console.error("Erreur de rendu PDF :", err);
            }
        });
    });
}

function setupControls(): void {
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
        }
    });

    document.getElementById('zoomIn')?.addEventListener('click', () => {
        zoom += 0.25;
        renderPage(currentPage);
    });

    document.getElementById('zoomDefault')?.addEventListener('click', () => {
        zoom = 1.5;
        renderPage(currentPage);
    });

    document.getElementById('zoomOut')?.addEventListener('click', () => {
        zoom = Math.max(0.5, zoom - 0.25);
        renderPage(currentPage);
    });
}

function setupDraggable(): void {
    const container = document.getElementById('pdfContainer') as HTMLElement;
    const canvas = document.getElementById('pdfCanvas') as HTMLCanvasElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true;
        canvas.style.cursor = 'grabbing';

        // Position de la souris relative au container
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;

        // Mémorise le scroll initial
        initialScrollLeft = container.scrollLeft;
        initialScrollTop = container.scrollTop;

        // Empêche le texte ou l’image d’être sélectionné
        e.preventDefault();
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();

        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const dx = x - startX;
        const dy = y - startY;

        container.scrollLeft = initialScrollLeft - dx;
        container.scrollTop = initialScrollTop - dy;
    });

    ['mouseup', 'mouseleave'].forEach(evt => {
        canvas.addEventListener(evt, () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });
    });
}

function disableControls(disabled: boolean): void {
    document.getElementById('prevPage')!.toggleAttribute('disabled', disabled);
    document.getElementById('nextPage')!.toggleAttribute('disabled', disabled);
}

export function displayPdfBase64(base64Data: string): void {
    try {

        if (pdfDoc) {
            pdfDoc.destroy();
            pdfDoc = null;
        }

        const binary = atob(base64Data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const loadingTask = (window as any).pdfjsLib.getDocument({ data: bytes });

        loadingTask.promise.then((doc: any) => {
            pdfDoc = doc;
            totalPages = doc.numPages;
            currentPage = 1;
            zoom = 1.5;

            renderPage(currentPage);
            setupControls();
            setupDraggable();
        });
    } catch (e) {
        console.error("Erreur lors du décodage base64 :", e);
    }
}
