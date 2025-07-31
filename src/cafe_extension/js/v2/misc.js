(async () => {
  const addCss = () => {
    const el = document.createElement('style');
    el.innerHTML = `
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.2/css/all.min.css');
      @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard-dynamic-subset.css");
    `;

    document.head.appendChild(el);
  }
  
  document.addEventListener('DOMContentLoaded', addCss);
  document.addEventListener('load', addCss);
  try {
    addCss();
  } catch { }
})();
