// Tiện ích dùng chung (chỉ logic tất định: không Math.random / Date.now).
window.HF = {
  rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  },
  /** Rải n đốm sáng vào container; trả về danh sách phần tử. */
  dust(container, n, seed, opts = {}) {
    const r = HF.rng(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div");
      d.className = "dot";
      const size = (opts.min ?? 2) + r() * ((opts.max ?? 6) - (opts.min ?? 2));
      d.style.width = d.style.height = size + "px";
      d.style.left = r() * 1920 + "px";
      d.style.top = r() * 1080 + "px";
      d.style.opacity = 0.2 + r() * 0.6;
      d.style.boxShadow = `0 0 ${size * 4}px ${size}px rgba(255,210,122,.35)`;
      d.dataset.dx = (r() - 0.5) * 160;
      d.dataset.dy = -(40 + r() * 220);
      container.appendChild(d);
      out.push(d);
    }
    return out;
  },
  /** Bọc từng chữ (ký tự) vào span để animate, giữ khoảng trắng. */
  chars(el) {
    const text = el.textContent;
    el.textContent = "";
    return [...text].map((ch) => {
      const s = document.createElement("span");
      s.textContent = ch === " " ? " " : ch;
      s.style.display = "inline-block";
      el.appendChild(s);
      return s;
    });
  },
  vars() {
    return (window.__hyperframes && window.__hyperframes.getVariables()) || {};
  },
};
