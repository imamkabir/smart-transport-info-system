import { useEffect, useState } from 'react';

/**
 * Tiny hash router. Hash URLs (#/routes/r1) work on static hosting such as
 * GitHub Pages without any server rewrite rules.
 */
export function useHashPath(): string {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setPath(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export const href = (path: string) => `#${path}`;
