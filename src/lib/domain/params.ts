// Business parameters, in one place so decision D3 changes a single file.
// Values marked (hipótese) in docs/produto/regras-de-negocio.md are still to be confirmed.

/** RN-02: percentage fee on the gross amount, in basis points (hipótese). */
export const PLATFORM_FEE_BP = 500;
/** RN-02: fixed fee per sale (hipótese). */
export const PLATFORM_FIXED_FEE_CENTS = 249;
/** Lowest offer price (modelo-de-dados section 2, hipótese); stays above the RN-02 fee. */
export const OFFER_MIN_PRICE_CENTS = 500;
/** RN-03: calendar days of guarantee; also the legal floor (CDC art. 49). */
export const GUARANTEE_DAYS = 7;
/** RN-08: days the producer has to answer a refund outside the guarantee (hipótese). */
export const PRODUCER_RESPONSE_DAYS = 3;
/** RN-08: days support has after an escalation or a contest (hipótese). */
export const SUPPORT_RESPONSE_DAYS = 3;
/** RN-12: maximum combined coproducer share of the net amount (hipótese). */
export const COPRODUCTION_MAX_BP = 9_000;
/** RN-13: minimum payout (hipótese). */
export const PAYOUT_MIN_CENTS = 5_000;
/** RN-13: fixed fee per payout, taken from the amount withdrawn (hipótese). */
export const PAYOUT_FEE_CENTS = 350;
