import { useEffect, useState } from "react";

/** True while the screen is wider than tall (phone turned sideways, desktop). */
export function useLandscape() {
  const [landscape, setLandscape] = useState(false);
  useEffect(() => {
    const update = () => setLandscape(window.innerWidth > window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("orientationchange", update); };
  }, []);
  return landscape;
}
