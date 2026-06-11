import { useEffect, useState } from "react";

const VIS_SCRIPT = "https://unpkg.com/vis-network@9.1.2/standalone/umd/vis-network.min.js";
const VIS_CSS    = "https://unpkg.com/vis-network@9.1.2/styles/vis-network.min.css";

export function isVisAvailable(): boolean {
  const v = (window as any).vis;
  return !!(v?.DataSet && v?.Network);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () =>
      isVisAvailable() ? resolve() : reject(new Error(`vis missing after load: ${src}`));
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (isVisAvailable()) { resolve(); return; }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = finish;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href;
  document.head.appendChild(l);
}


export function useVisNetwork(): { visReady: boolean } {
  const [visReady, setVisReady] = useState(isVisAvailable);

  useEffect(() => {
    if (isVisAvailable()) { setVisReady(true); return; }
    loadCss(VIS_CSS);
    loadScript(VIS_SCRIPT)
      .then(() => setVisReady(true))
      .catch((err) => console.error("vis-network:", err));
  }, []);

  return { visReady };
}
