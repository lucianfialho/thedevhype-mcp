// Google Shopping client via serper.dev API
// Endpoint: POST https://google.serper.dev/shopping
// Docs: https://serper.dev

// ─── Types ───

export interface ShoppingProduct {
  title: string;
  price: number;
  priceStr: string;
  source: string;
  link: string;
  thumbnail: string;
  snippet?: string;
  position?: number;
}

export type ShoppingResult =
  | { ok: true; products: ShoppingProduct[]; queryUsed: string }
  | { ok: false; error: string; queryUsed: string };

// ─── serper.dev response shape ───

interface SerperShoppingItem {
  position: number;
  title: string;
  price: string;
  source: string;
  link: string;
  imageUrl: string;
  snippet?: string;
}

interface SerperShoppingResponse {
  shopping?: SerperShoppingItem[];
  searchParameters?: { q: string };
}

// ─── NFC-e product name normalizer ───

const NFC_STOPWORDS = new Set([
  'und', 'pct', 'cx', 'un', 'pc', 'pt', 'fd', 'dp',
  'tp1', 'tp2', 'sc1', 'sc2', 'sc3',
  'ref', 'cod', 'sku',
]);

export function normalizeProductName(nfceName: string): string {
  return nfceName
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')  // keep accented chars
    .split(/\s+/)
    .filter((word) => {
      if (word.length <= 1) return false;
      if (NFC_STOPWORDS.has(word)) return false;
      if (/^\d{5,}$/.test(word)) return false; // drop long numbers (EAN, codes)
      return true;
    })
    .join(' ')
    .trim();
}

// ─── Parse Brazilian price string ───

function parsePrice(priceStr: string): number {
  // "R$ 21,90" → 21.90 | "$19.99" → 19.99
  const cleaned = priceStr
    .replace(/[^\d.,]/g, '')  // keep digits, dots, commas
    .trim();

  // Brazilian format: 1.234,56
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  }

  // US format: 1,234.56 or 19.99
  const num = parseFloat(cleaned.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

// ─── Main search function ───

export async function searchGoogleShopping(
  query: string,
  options?: { limit?: number; location?: string },
): Promise<ShoppingResult> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'SERPER_API_KEY not configured', queryUsed: query };
  }

  try {
    const body: Record<string, unknown> = {
      q: query,
      gl: 'br',
      hl: 'pt',
      num: options?.limit ?? 10,
    };
    if (options?.location) {
      body.location = options.location;
    }

    const response = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Serper API error ${response.status}: ${text}`, queryUsed: query };
    }

    const json = (await response.json()) as SerperShoppingResponse;

    const products: ShoppingProduct[] = (json.shopping ?? []).map((item) => ({
      title: item.title,
      price: parsePrice(item.price),
      priceStr: item.price,
      source: item.source,
      link: item.link,
      thumbnail: item.imageUrl,
      snippet: item.snippet,
      position: item.position,
    }));

    return { ok: true, products, queryUsed: query };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error calling Serper API',
      queryUsed: query,
    };
  }
}
