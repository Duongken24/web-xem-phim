export function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_ADMIN_API_URL ||
    'http://127.0.0.1:5001'
  ).replace(/\/$/, '');
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export async function readApiJson<T = any>(
  response: Response,
  invalidPayloadMessage = 'Backend tra ve du lieu khong hop le.'
): Promise<T> {
  const text = await response.text();

  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error(invalidPayloadMessage);
  }
}
