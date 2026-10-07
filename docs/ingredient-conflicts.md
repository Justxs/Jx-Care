# Default ingredient conflicts: evidence

The app's default conflict rules (spec, [Empty states](feature-spec.md#empty-states)) are limited to pairs that a drug label, an FDA monograph or a published study warns about. Justas asked for this on 2026-10-07: "conflict data must be based on scientific research". The rules live in [`src/features/conflicts/commonRules.ts`](../src/features/conflicts/commonRules.ts), where each rule names its sources and a test checks that every rule has one.

Conflicts are checked across the whole day, so a rule here means "don't use both on the same day", which matches how the labels phrase it ("concomitant use", "at the same time").

## Rules and their sources

| Rule | What happens | Evidence | Strength |
| --- | --- | --- | --- |
| Prescription retinoids (tretinoin, adapalene) × salicylic acid | More irritation and dryness | FDA label, [tretinoin gel (microsphere)](https://www.accessdata.fda.gov/drugsatfda_docs/label/2013/202567Orig1s000lbl.pdf): "Particular caution should be exercised with the concomitant use of topical over-the-counter acne preparations containing benzoyl peroxide, sulfur, resorcinol, or salicylic acid with tretinoin gel." FDA labels, [Differin gel](https://www.accessdata.fda.gov/drugsatfda_docs/label/2007/020380s004lbl.pdf) and [Differin lotion](https://www.accessdata.fda.gov/drugsatfda_docs/nda/2010/022502s000Lbl.pdf): "Particular caution should be exercised in using preparations containing sulfur, resorcinol, or salicylic acid in combination with DIFFERIN." | Regulatory label warning |
| Prescription retinoids × sulfur | Same | Same labels | Regulatory label warning |
| Prescription retinoids × resorcinol | Same | Same labels | Regulatory label warning |
| Tretinoin × benzoyl peroxide | Benzoyl peroxide breaks tretinoin down, and both irritate | The tretinoin gel label above names benzoyl peroxide. Nighland M, Yusuf M, Wisniewski S, Huddleston K, Nyirady J. [The effect of simulated solar UV irradiation on tretinoin in tretinoin gel microsphere 0.1% and tretinoin gel 0.025%](https://www.mdedge.com/dermatology/article/67367/acne/effect-simulated-solar-uv-irradiation-tretinoin-tretinoin-gel). Cutis. 2006: tretinoin gel 0.025% mixed with an erythromycin and benzoyl peroxide gel kept 7% of its tretinoin after 2 hours and 0% after 6. | Label warning plus a laboratory stability study |
| Benzoyl peroxide × salicylic acid | More irritation and dryness | [21 CFR 333.350](https://www.law.cornell.edu/cfr/text/21/333.350), the required labeling for OTC acne products (benzoyl peroxide, resorcinol, salicylic acid, sulfur): "skin irritation and dryness is more likely to occur if you use another topical acne medication at the same time. If irritation occurs, only use one topical acne medication at a time." | FDA monograph (regulation) |
| Benzoyl peroxide × sulfur | Same | Same | FDA monograph |
| Benzoyl peroxide × resorcinol | Same | Same | FDA monograph |
| Hydroquinone × benzoyl peroxide | Temporary staining of the skin | [Hydroquinone topical, drug information](https://www.drugs.com/mtm/hydroquinone-topical.html): "Using hydroquinone topical together with benzoyl peroxide, hydrogen peroxide, or other peroxide products may stain your skin." | Drug information (label-derived) |
| Hydroquinone × hydrogen peroxide | Same | Same | Drug information (label-derived) |

Only tretinoin and adapalene are in the Prescription retinoids group because theirs are the labels checked. Tazarotene and trifarotene labels may carry the same caution; add them when someone has checked.

## Pairs left out on purpose

| Pair | Why it isn't a default |
| --- | --- |
| Adapalene × benzoyl peroxide | Not a conflict: the two are sold together as an approved fixed combination, and adapalene stays stable with benzoyl peroxide. |
| Retinol (cosmetic) × AHA/BHA | Only brand and blog advice found; no label covers cosmetic retinol. People who find it too much can add it as their own rule. |
| Vitamin C × AHA/BHA | Only brand and blog advice found, mostly about pH. |
| Vitamin C × benzoyl peroxide | A plausible chemistry argument (an oxidiser with an antioxidant) but no study or label found. |
| Copper peptides × vitamin C, copper peptides × acids | Only brand advice found. |
| Niacinamide × vitamin C | An old myth; no evidence of harm. |
| Retinoids × vitamin C | Commonly split morning and evening; since conflicts are checked across the whole day, a rule would flag the recommended routine. |

## Not checked

The 1998 stability study often cited for tretinoin and adapalene with benzoyl peroxide (Martin B et al., Br J Dermatol 1998;139 Suppl 52, [PubMed 9990414](https://pubmed.ncbi.nlm.nih.gov/9990414/)) couldn't be opened on 2026-10-07 (the site rate-limited the request), so nothing here relies on it.

## Adding a rule

Add a default only with a citable drug label, FDA monograph, peer-reviewed study or dermatology guideline. Put the source in `sources` in `commonRules.ts`, add a row here, and bump `COMMON_RULES_VERSION` so existing installs receive it.
