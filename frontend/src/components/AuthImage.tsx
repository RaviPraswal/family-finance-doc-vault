import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * <img> cannot send the Authorization header, so protected images are fetched
 * with the login token and shown from a temporary object URL.
 */
export default function AuthImage({ src, alt = '', className, onError }: {
  src: string;
  alt?: string;
  className?: string;
  onError?: () => void;
}) {
  const token = useAuthStore((s) => s.token);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
  }, [src, token]);

  return url ? <img src={url} alt={alt} className={className} /> : null;
}
