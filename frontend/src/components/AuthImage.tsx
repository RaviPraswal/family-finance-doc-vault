import { authFetch } from '../api/client';
import { useEffect, useState } from 'react';

/**
 * <img> cannot send the Authorization header, so protected images are fetched
 * with the session cookie (Sprint 7 T8) and shown from a temporary object URL.
 */
export default function AuthImage({ src, alt = '', className, onError }: {
  src: string;
  alt?: string;
  className?: string;
  onError?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    authFetch(src)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) onError?.(); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // onError is a callback from the parent; re-running on its identity would refetch every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return url ? <img src={url} alt={alt} className={className} /> : null;
}
