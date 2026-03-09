import { db } from "./db";
import { CategoryItem } from "./categoryPool";

export const GOOGLE_SHEET_ID = "1tEleNU1mI1CLiPqoiOA8OJZFyUtEgygySPCP580on0A";

/**
 * Parses a CSV string into a 2D array of strings.
 * Handles quoted strings with commas and escaped quotes.
 * Handles Windows/Unix line endings.
 */
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        // Handle escaped quote ("") inside a quoted string
        currentVal += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      // End of cell
      currentRow.push(currentVal);
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuote) {
      // End of row
      // Handle \r\n sequence
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      // Only push if the row has content or we have accumulated values
      if (currentRow.length > 0 || currentVal.length > 0) {
        currentRow.push(currentVal);
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  // Push the last row if there's any remaining data
  if (currentRow.length > 0 || currentVal.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  return rows;
};

/**
 * Fetches Base Categories from the configured Google Sheet.
 * Expects data in Column B (index 1).
 * Column A contains row numbers, Column B contains category names.
 */
export const fetchBaseCategoriesFromSheet = async (): Promise<CategoryItem[]> => {
  try {
    const rows = await db
      .selectFrom("base_categories")
      .select(["category"])
      .where("status", "=", true)
      .execute();

    return rows.map((r) => ({
      id: r.category,
      name: r.category,
    }));
  } catch (error) {
    console.error("Error fetching categories from Supabase:", error);
    return [];
  }
};

/**
 * Tries to fetch categories from Google Sheets.
 * If successful and returns data, uses it.
 * Otherwise, falls back to the provided local pool.
 */
export const getBaseCategoriesWithFallback = async (
  fallbackCategories: CategoryItem[]
): Promise<CategoryItem[]> => {
  console.log("Fetching Base Categories from Supabase...");

  const rows = await db
    .selectFrom("base_categories")
    .select(["category"])
    .where("status", "=", true)
    .execute();

  const sheetCategories = rows.map((r) => ({
    id: r.category,
    name: r.category,
  }));

  if (sheetCategories && sheetCategories.length > 0) {
    console.log(
      `Successfully fetched ${sheetCategories.length} categories from Supabase.`
    );
    return sheetCategories;
  }

  console.warn(
    "Supabase fetch failed or returned empty. Using fallback categories."
  );
  return fallbackCategories;
};

// Re-export CategoryItem for convenience if needed by consumers of this file
export type { CategoryItem };