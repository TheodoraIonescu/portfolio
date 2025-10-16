pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

    const pdfUrl = '../documents/vintigue_split.pdf'; // Adjust if needed
    let pdfDoc = null,
        currentSpread = 0,  // 0-based index for spreads
        totalSpreads = 0,
        canvasLeft = document.getElementById('pdf-canvas-left'),
        canvasRight = document.getElementById('pdf-canvas-right'),
        ctxLeft = canvasLeft.getContext('2d'),
        ctxRight = canvasRight.getContext('2d');

    // Render a single page into a given canvas. Scale dynamically to fit container width.
    function renderPage(pageNumber, canvas, ctx) {
    return pdfDoc.getPage(pageNumber).then(function (page) {
      const containerWidth = document.querySelector('.pdf-container').clientWidth / 2;
      const unscaledViewport = page.getViewport({ scale: 1 });

      // Increase scale for better quality (adjust according to screen DPI)
      const scale = window.devicePixelRatio * (containerWidth / unscaledViewport.width);
      const viewport = page.getViewport({ scale: scale });

      // Set higher resolution canvas
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Scale context for high DPI screens
      ctx.scale(outputScale, outputScale);

      return page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;
    });
  }

    // Render a spread based on currentSpread value.
    function renderSpread() {
      // Clear both canvases
      ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
      ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
      
      // Hide both canvases initially.
      canvasLeft.style.display = 'none';
      canvasRight.style.display = 'none';
      
      // Determine total pages and spread mapping:
      // Spread 0: first page (display right only, aligned right)
      // Last spread: last page (display left only, aligned left)
      // Otherwise, intermediate spreads display two pages:
      //   left = 2 + 2*(currentSpread-1), right = left + 1.
      const n = pdfDoc.numPages;
      if (currentSpread === 0) {
        // First spread: show page 1 on right.
        renderPage(1, canvasRight, ctxRight).then(() => {
          canvasRight.style.display = 'block';
          canvasRight.classList.add('align-right');
          canvasLeft.classList.remove('align-left');
        });
      } else if (currentSpread === totalSpreads - 1) {
        // Last spread: show last page on left.
        renderPage(n, canvasLeft, ctxLeft).then(() => {
          canvasLeft.style.display = 'block';
          canvasLeft.classList.add('align-left');
          canvasRight.classList.remove('align-right');
        });
      } else {
        // Intermediate spread: display two pages.
        let i = currentSpread - 1; // intermediate spread index
        let leftPage = 2 + 2 * i;
        let rightPage = leftPage + 1;
        Promise.all([
          renderPage(leftPage, canvasLeft, ctxLeft),
          renderPage(rightPage, canvasRight, ctxRight)
        ]).then(() => {
          canvasLeft.style.display = 'block';
          canvasRight.style.display = 'block';
          // Remove any alignment classes if present.
          canvasLeft.classList.remove('align-left');
          canvasRight.classList.remove('align-right');
        });
      }
    }

    // Navigation handlers.
    function onPrevPage() {
      if (currentSpread <= 0) return;
      currentSpread--;
      renderSpread();
    }

    function onNextPage() {
      if (currentSpread >= totalSpreads - 1) return;
      currentSpread++;
      renderSpread();
    }

    pdfjsLib.getDocument(pdfUrl).promise.then(function (pdfDoc_) {
    pdfDoc = pdfDoc_;
    totalSpreads = Math.ceil(pdfDoc.numPages / 2) + 1;
    renderSpread();
  }).catch(function (error) {
    console.error("Error loading PDF: ", error);
  });

    document.getElementById('prev-page').addEventListener('click', onPrevPage);
    document.getElementById('next-page').addEventListener('click', onNextPage);