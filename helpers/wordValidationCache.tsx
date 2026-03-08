import { db } from "./db";

// Define a local type to avoid circular dependency with wordValidator
export interface CachedValidationResult {
  valid: boolean;
  word: string;
  definition?: string;
  fitsCategory?: boolean;
  rejectionReason?: string;
  error?: string;
}

const memoryValidationCache = new Map<string, CachedValidationResult>();

export interface CacheValidationParams {
  word: string;
  normalizedWord: string;
  category: string;
  isValid: boolean;
  definition?: string;
  fitsCategory?: boolean;
  rejectionReason?: string;
  validationSource?: string;
}

/**
 * Retrieves a validation result from the cache if it exists.
 */
export async function getCachedValidation(
  normalizedWord: string,
  category: string
): Promise<CachedValidationResult | null> {
  try {
    const cacheKey = `${normalizedWord}:${category}`;

    // 1. MEMORY CACHE CHECK
    const memoryResult = memoryValidationCache.get(cacheKey);
    if (memoryResult) {
      console.log(`[MemoryCache] Hit for "${normalizedWord}" in "${category}"`);
      return memoryResult;
    }

    // 2. DATABASE CACHE CHECK
    const result = await db
      .selectFrom("wordValidationCache")
      .select([
        "word",
        "isValid",
        "definition",
        "fitsCategory",
        "rejectionReason",
      ])
      .where("normalizedWord", "=", normalizedWord)
      .where("category", "=", category)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    const cachedResult = {
      valid: result.isValid,
      word: result.word,
      definition: result.definition || undefined,
      fitsCategory:
        result.fitsCategory === null ? undefined : result.fitsCategory,
      rejectionReason: result.rejectionReason || undefined,
    };

    // STORE IN MEMORY CACHE
    memoryValidationCache.set(cacheKey, cachedResult);

    console.log(`[Cache] DB hit for word "${normalizedWord}" in category "${category}"`);

    return cachedResult;
  } catch (error) {
    console.error("Error retrieving cached validation:", error);
    return null;
  }
}

/**
 * Saves or updates a validation result in the cache.
 */
export async function setCachedValidation(params: CacheValidationParams): Promise<void> {
  try {
    const {
      word,
      normalizedWord,
      category,
      isValid,
      definition,
      fitsCategory,
      rejectionReason,
      validationSource,
    } = params;
 const cacheKey = `${normalizedWord}:${category}`;

   memoryValidationCache.set(cacheKey, {
  valid: isValid,
  word,
  definition: definition || undefined,
  fitsCategory: fitsCategory === undefined ? undefined : fitsCategory,
  rejectionReason: rejectionReason || undefined,
});
    await db
      .insertInto("wordValidationCache")
      .values({
        word,
        normalizedWord,
        category,
        isValid,
        definition: definition || null,
        fitsCategory: fitsCategory === undefined ? null : fitsCategory,
        rejectionReason: rejectionReason || null,
        validationSource: validationSource || "system",
        updatedAt: new Date(), // Set explicit update time
        createdAt: new Date(), // Won't be used on update but needed for insert
      })
      .onConflict((oc) =>
        oc.columns(["normalizedWord", "category"]).doUpdateSet({
          isValid: (eb) => eb.ref("excluded.isValid"),
          definition: (eb) => eb.ref("excluded.definition"),
          fitsCategory: (eb) => eb.ref("excluded.fitsCategory"),
          rejectionReason: (eb) => eb.ref("excluded.rejectionReason"),
          validationSource: (eb) => eb.ref("excluded.validationSource"),
          updatedAt: new Date(), // Update timestamp
          word: (eb) => eb.ref("excluded.word"), // Update casing if changed
        })
      )
      .execute();

    console.log(`[Cache] Cached result for word "${word}" in category "${category}"`);
  } catch (error) {
    console.error("Error saving cached validation:", error);
    // Don't throw, just log error so we don't block the response
  }
}