/** The four the spec lists first, then every other ISO code the phone knows. */
export const FIRST_CURRENCIES = ['EUR', 'USD', 'GBP', 'PLN'] as const;
const FALLBACK = ['CHF', 'SEK', 'NOK', 'DKK', 'CZK'];

type IntlWithValues = typeof Intl & { supportedValuesOf?: (key: 'currency') => string[] };

export function currencyCodes(intl: IntlWithValues = Intl): string[] {
  let others = FALLBACK;
  try {
    const all = intl.supportedValuesOf?.('currency');
    if (all && all.length > 0) others = all;
  } catch {
    // Hermes builds without the full Intl API: keep the short list.
  }
  const first: readonly string[] = FIRST_CURRENCIES;
  return [...first, ...others.filter((c) => !first.includes(c)).sort()];
}

/** Options for the currency picker: "EUR · Euro" when the phone can name it, else the code. */
export function currencyOptions(locale: string, codes: readonly string[] = currencyCodes()) {
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames([locale], { type: 'currency' });
  } catch {
    names = undefined;
  }
  return codes.map((code) => {
    let name: string | undefined;
    try {
      name = names?.of(code);
    } catch {
      name = undefined;
    }
    return { value: code, label: name && name !== code ? `${code} · ${name}` : code };
  });
}

/** The currency's short symbol for field suffixes ("€", "$"); the code when there is none. */
export function currencySymbol(code: string, locale?: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}
