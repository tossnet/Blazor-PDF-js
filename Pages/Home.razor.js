let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let zoom = 1.5;
const canvasId = 'pdfCanvas';
let currentRenderTask = null;
let isRendering = false;
let isDragging = false;
let startX = 0;
let startY = 0;
let initialScrollLeft = 0;
let initialScrollTop = 0;
let lastUserAction = null;
function renderPage(pageNum) {
    return new Promise((resolve, reject) => {
        const canvas = document.getElementById(canvasId);
        const context = canvas?.getContext('2d');
        if (!canvas || !context || !pdfDoc) {
            reject(new Error("Canvas or context not available"));
            return;
        }
        pdfDoc.getPage(pageNum).then((page) => {
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
            disableControls(true);
            currentRenderTask = page.render(renderContext);
            currentRenderTask.promise.then(() => {
                const info = document.getElementById('pageInfo');
                if (info) {
                    info.textContent = `Page ${currentPage} / ${totalPages}`;
                }
                const zoomInfo = document.getElementById('zoomDefault');
                if (zoomInfo) {
                    zoomInfo.textContent = `x ${zoom.toFixed(2)}`;
                }
                if (totalPages == 1) {
                    disableControls(true);
                }
                disableControls(false);
                resolve();
            }).catch((err) => {
                if (err?.name !== 'RenderingCancelledException') {
                    console.error("Error during renderPage :", err);
                }
                reject(err);
            });
        }).catch(reject);
    });
}
function setupControls() {
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1 && !isRendering) {
            currentPage--;
            isRendering = true;
            renderPage(currentPage).then(() => {
                isRendering = false;
            }).catch((err) => {
                console.error("Error during prevPage :", err);
                isRendering = false;
            });
        }
    });
    document.getElementById('nextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages && !isRendering) {
            currentPage++;
            isRendering = true;
            renderPage(currentPage).then(() => {
                isRendering = false;
            }).catch((err) => {
                console.error("Error during nextPage :", err);
                isRendering = false;
            });
        }
    });
    document.getElementById('zoomIn')?.addEventListener('click', () => {
        if (!isRendering) {
            zoom += 0.25;
            lastUserAction = 'zoom';
            isRendering = true;
            renderPage(currentPage).then(() => {
                isRendering = false;
            }).catch((err) => {
                console.error("Error during zoomIn :", err);
                isRendering = false;
            });
        }
    });
    document.getElementById('zoomDefault')?.addEventListener('click', () => {
        if (!isRendering) {
            zoom = 1.5;
            lastUserAction = 'zoom';
            isRendering = true;
            renderPage(currentPage).then(() => {
                isRendering = false;
            }).catch((err) => {
                console.error("Error during zoomDefault :", err);
                isRendering = false;
            });
        }
    });
    document.getElementById('zoomOut')?.addEventListener('click', () => {
        if (!isRendering) {
            zoom = Math.max(0.5, zoom - 0.25);
            lastUserAction = 'zoom';
            isRendering = true;
            renderPage(currentPage).then(() => {
                isRendering = false;
            }).catch((err) => {
                console.error("Error during zoomOut :", err);
                isRendering = false;
            });
        }
    });
    document.getElementById('fullWidth')?.addEventListener('click', () => {
        lastUserAction = 'fullWidth';
        adjustCanvasToFullWidth();
    });
    document.getElementById('fullHeight')?.addEventListener('click', () => {
        lastUserAction = 'fullHeight';
        adjustCanvasToFullHeight();
    });
}
function adjustCanvasToFullWidth() {
    if (isRendering)
        return;
    const container = document.getElementById('pdfContainer');
    const canvas = document.getElementById(canvasId);
    if (!container || !canvas || !pdfDoc)
        return;
    isRendering = true;
    const containerWidth = container.clientWidth - 2 * parseFloat(getComputedStyle(container).paddingLeft);
    pdfDoc.getPage(currentPage).then((page) => {
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        zoom = scale;
        renderPage(currentPage).then(() => {
            isRendering = false;
        }).catch((err) => {
            console.error("Error during adjustCanvasToFullWidth :", err);
            isRendering = false;
        });
    }).catch((err) => {
        console.error("Error retrieving page :", err);
        isRendering = false;
    });
}
function adjustCanvasToFullHeight() {
    if (isRendering)
        return;
    const container = document.getElementById('pdfContainer');
    const canvas = document.getElementById(canvasId);
    if (!container || !canvas || !pdfDoc)
        return;
    isRendering = true;
    const containerHeight = container.clientHeight - 2 * parseFloat(getComputedStyle(container).paddingTop);
    pdfDoc.getPage(currentPage).then((page) => {
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerHeight / viewport.height;
        zoom = scale;
        renderPage(currentPage).then(() => {
            isRendering = false;
        }).catch((err) => {
            console.error("Error during adjustCanvasToFullHeight :", err);
            isRendering = false;
        });
    }).catch((err) => {
        console.error("Error retrieving page :", err);
        isRendering = false;
    });
}
function setupDraggable() {
    const container = document.getElementById('pdfContainer');
    const canvas = document.getElementById('pdfCanvas');
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        initialScrollLeft = container.scrollLeft;
        initialScrollTop = container.scrollTop;
        e.preventDefault();
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging)
            return;
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
function disableControls(disabled) {
    document.getElementById('prevPage').toggleAttribute('disabled', disabled);
    document.getElementById('nextPage').toggleAttribute('disabled', disabled);
}
export function displayPdfBase64(base64Data) {
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
        const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
        loadingTask.promise.then((doc) => {
            pdfDoc = doc;
            totalPages = doc.numPages;
            currentPage = 1;
            zoom = 1.5;
            if (lastUserAction === 'fullWidth') {
                adjustCanvasToFullWidth();
            }
            else if (lastUserAction === 'fullHeight') {
                adjustCanvasToFullHeight();
            }
            else if (lastUserAction === 'zoom') {
                renderPage(currentPage);
            }
            else {
                adjustCanvasToFullWidth();
            }
            setupControls();
            setupDraggable();
        });
    }
    catch (e) {
        console.error("Error during decoding base64 :", e);
    }
}
