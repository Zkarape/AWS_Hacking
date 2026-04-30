export const TRANSLATION_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export async function translateText(
  text: string,
  targetLang: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLang }),
    signal,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Translation failed (${res.status})`);
  }

  const data = (await res.json()) as { translation?: string };
  return data.translation ?? '';
}
