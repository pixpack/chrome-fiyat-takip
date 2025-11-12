// Tailwind CSS Runtime Injector
(function() {
  const tailwindCSS = `
    /* Tailwind CSS Base */
    *, ::before, ::after {
      box-sizing: border-box;
      border-width: 0;
      border-style: solid;
      border-color: #e5e7eb;
    }
    
    body {
      margin: 0;
      font-family: 'Roboto', sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
    }
    
    /* Container */
    .container {
      width: 100%;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
      padding-left: 1rem;
      padding-right: 1rem;
    }
    
    /* Display */
    .flex { display: flex; }
    .grid { display: grid; }
    .hidden { display: none; }
    
    /* Flex */
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-end { justify-content: flex-end; }
    .flex-shrink-0 { flex-shrink: 0; }
    .flex-1 { flex: 1 1 0%; }
    .self-start { align-self: flex-start; }
    
    /* Grid */
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .gap-2 { gap: 0.5rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    
    /* Spacing */
    .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
    .p-2 { padding: 0.5rem; }
    .p-6 { padding: 1.5rem; }
    .p-12 { padding: 3rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .mb-4 { margin-bottom: 1rem; }
    
    /* Sizing */
    .w-4 { width: 1rem; }
    .w-24 { width: 6rem; }
    .w-full { width: 100%; }
    .h-2 { height: 0.5rem; }
    .h-4 { height: 1rem; }
    .h-24 { height: 6rem; }
    .h-full { height: 100%; }
    .max-w-sm { max-width: 24rem; }
    
    /* Background */
    .bg-white { background-color: #ffffff; }
    .bg-gray-100 { background-color: #f3f4f6; }
    .bg-gray-200 { background-color: #e5e7eb; }
    .bg-gray-500 { background-color: #6b7280; }
    .bg-green-500 { background-color: #10b981; }
    .bg-red-500 { background-color: #ef4444; }
    
    /* Text Color */
    .text-white { color: #ffffff; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-900 { color: #111827; }
    .text-red-500 { color: #ef4444; }
    
    /* Font Size */
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    
    /* Font Weight */
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    
    /* Border Radius */
    .rounded { border-radius: 0.25rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-full { border-radius: 9999px; }
    
    /* Shadow */
    .shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
    
    /* Position */
    .relative { position: relative; }
    .absolute { position: absolute; }
    .right-0 { right: 0px; }
    .-bottom-5 { bottom: -1.25rem; }
    
    /* Overflow */
    .overflow-hidden { overflow: hidden; }
    
    /* Object Fit */
    .object-cover { object-fit: cover; }
    
    /* Text Decoration */
    .underline { text-decoration-line: underline; }
    .line-through { text-decoration-line: line-through; }
    
    /* Text Align */
    .text-center { text-align: center; }
    
    /* Cursor */
    .cursor-pointer { cursor: pointer; }
    
    /* Transition */
    .transition {
      transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    
    /* Hover */
    .hover\\:bg-gray-100:hover { background-color: #f3f4f6; }
    .hover\\:text-primary:hover { color: #2563eb; }
    
    /* Material Icons */
    .material-icons-outlined {
      font-family: 'Material Icons Outlined';
      font-size: 24px;
      font-weight: normal;
      font-style: normal;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
    }
    
    /* Custom Triangle */
    .triangle {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #1f2937;
    }
    
    /* Responsive */
    @media (min-width: 768px) {
      .md\\:grid-cols-\\[auto\\,1fr\\,auto\\] {
        grid-template-columns: auto 1fr auto;
      }
      .md\\:p-8 {
        padding: 2rem;
      }
      .container {
        padding-left: 2rem;
        padding-right: 2rem;
      }
    }
    
    @media (min-width: 640px) {
      .sm\\:flex-row { flex-direction: row; }
      .sm\\:items-center { align-items: center; }
    }
  `;

  // Inject CSS into page
  const style = document.createElement('style');
  style.textContent = tailwindCSS;
  document.head.appendChild(style);
})();
