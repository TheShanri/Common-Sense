export async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : typeof payload?.message === 'string'
          ? payload.message
          : null;
      return message?.trim() ? message : fallback;
    } catch {
      return fallback;
    }
  }

  try {
    const text = await response.text();
    if (!text) {
      return fallback;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return fallback;
    }

    try {
      const payload = JSON.parse(trimmedText) as { error?: unknown; message?: unknown };
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : typeof payload?.message === 'string'
          ? payload.message
          : null;
      if (message?.trim()) {
        return message;
      }
    } catch {
      // Not JSON, fall back to raw text below.
    }

    if (contentType.includes('text/html') || trimmedText.startsWith('<')) {
      return fallback;
    }

    return trimmedText;
  } catch {
    return fallback;
  }
}
