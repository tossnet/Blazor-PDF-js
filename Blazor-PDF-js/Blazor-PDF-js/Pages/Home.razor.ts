let pdfDoc: any = null;
let currentPage = 1;
let totalPages = 0;
let zoom = 1.5;
const canvasId = 'pdfCanvas';

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

        page.render(renderContext);

        const info = document.getElementById('pageInfo');
        if (info) {
            info.textContent = `Page ${currentPage} / ${totalPages}`;
        }
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

    document.getElementById('zoomOut')?.addEventListener('click', () => {
        zoom = Math.max(0.5, zoom - 0.25);
        renderPage(currentPage);
    });
}

export function displayPdfBase64(base64Data: string): void {
    try {
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
        });
    } catch (e) {
        console.error("Erreur lors du décodage base64 :", e);
    }
}
