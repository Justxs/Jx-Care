import type { Db } from '@/db';
import { i18n, languages, type Language } from '@/i18n';

import { commonRuleLabels } from './commonRules';
import { seedCommonRules } from './repo';

/** Adds the default conflict rules once, named in `language` (see `seedCommonRules`). */
export function seedDefaultRules(db: Db, language: Language) {
  return seedCommonRules(
    db,
    commonRuleLabels((key, options) => i18n.t(key, options), language, languages),
  );
}
