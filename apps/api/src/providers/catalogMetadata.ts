import type { MockCatalogItem } from "./types.js";
import { normalizeText } from "./matching.js";

type ProductMetadata = Pick<
  MockCatalogItem,
  | "category"
  | "categorySlug"
  | "subcategory"
  | "subcategorySlug"
  | "variant"
  | "size"
  | "unit"
  | "description"
>;

const METADATA_RULES: Array<{
  match: string;
  metadata: ProductMetadata;
  aliases: string[];
}> = [
  { match: "milk", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Dairy", subcategorySlug: "dairy", variant: "Toned Milk", size: "1", unit: "L" }, aliases: ["groceries", "dairy", "1l"] },
  { match: "bread", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Bakery", subcategorySlug: "bakery", variant: "Brown Bread", size: "400", unit: "g" }, aliases: ["groceries", "bakery", "400g"] },
  { match: "eggs", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Dairy", subcategorySlug: "dairy", variant: "Farm Fresh", size: "6", unit: "pcs" }, aliases: ["groceries", "dairy", "6 pcs"] },
  { match: "rice", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Staples", subcategorySlug: "staples", variant: "Basmati Rice", size: "1", unit: "kg" }, aliases: ["groceries", "staples", "1kg"] },
  { match: "atta", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Staples", subcategorySlug: "staples", variant: "Select Atta", size: "5", unit: "kg" }, aliases: ["groceries", "staples", "5kg"] },
  { match: "sugar", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Staples", subcategorySlug: "staples", variant: "Pure Sugar", size: "1", unit: "kg" }, aliases: ["groceries", "staples", "1kg"] },
  { match: "salt", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Staples", subcategorySlug: "staples", variant: "Iodized Salt", size: "1", unit: "kg" }, aliases: ["groceries", "staples", "1kg"] },
  { match: "oil", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Staples", subcategorySlug: "staples", variant: "Sunlite Oil", size: "1", unit: "L" }, aliases: ["groceries", "staples", "1l"] },
  { match: "noodles", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Snacks", subcategorySlug: "snacks", variant: "Masala", size: "70", unit: "g" }, aliases: ["groceries", "snacks", "70g"] },
  { match: "cookies", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Snacks", subcategorySlug: "snacks", variant: "Good Day Cookies", size: "600", unit: "g" }, aliases: ["groceries", "snacks", "600g"] },
  { match: "magic masala", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Snacks", subcategorySlug: "snacks", variant: "India's Magic Masala", size: "52", unit: "g" }, aliases: ["groceries", "snacks", "52g"] },
  { match: "coffee", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Beverages", subcategorySlug: "beverages", variant: "Classic Coffee", size: "50", unit: "g" }, aliases: ["groceries", "beverages", "50g"] },
  { match: "tea", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Beverages", subcategorySlug: "beverages", variant: "Premium Tea", size: "250", unit: "g" }, aliases: ["groceries", "beverages", "250g"] },
  { match: "soft drink", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Beverages", subcategorySlug: "beverages", variant: "Soft Drink", size: "750", unit: "ml" }, aliases: ["groceries", "beverages", "750ml"] },
  { match: "chocolate", metadata: { category: "Groceries", categorySlug: "groceries", subcategory: "Snacks", subcategorySlug: "snacks", variant: "Dairy Milk Silk", size: "60", unit: "g" }, aliases: ["groceries", "snacks", "60g"] },
  { match: "shampoo", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Hair Care", subcategorySlug: "hair-care", variant: "Intense Repair", size: "340", unit: "ml" }, aliases: ["personal care", "340ml"] },
  { match: "conditioner", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Hair Care", subcategorySlug: "hair-care", variant: "Keratin Smooth", size: "190", unit: "ml" }, aliases: ["personal care", "hair care", "190ml"] },
  { match: "bathing bar", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Bath & Body", subcategorySlug: "bath-body", variant: "Cream Beauty", size: "100", unit: "g" }, aliases: ["personal care", "bath body", "100g"] },
  { match: "toothpaste", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Oral Care", subcategorySlug: "oral-care", variant: "Strong Teeth", size: "200", unit: "g" }, aliases: ["personal care", "oral care", "200g", "colgate 200g"] },
  { match: "toothbrush", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Oral Care", subcategorySlug: "oral-care", variant: "Medium", size: "1", unit: "pc" }, aliases: ["personal care", "oral care"] },
  { match: "face wash", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Bath & Body", subcategorySlug: "bath-body", variant: "Purifying Neem", size: "150", unit: "ml" }, aliases: ["personal care", "150ml"] },
  { match: "deodorant", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Deodorants", subcategorySlug: "deodorants", variant: "Fresh Active", size: "150", unit: "ml" }, aliases: ["personal care", "deo", "150ml"] },
  { match: "condoms", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Wellness", subcategorySlug: "wellness", variant: "Extra Time", size: "10", unit: "pcs" }, aliases: ["personal care", "wellness", "10 pcs"] },
  { match: "sanitary pads", metadata: { category: "Personal Care", categorySlug: "personal-care", subcategory: "Wellness", subcategorySlug: "wellness", variant: "Ultra XL", size: "15", unit: "pcs" }, aliases: ["personal care", "wellness", "15 pcs"] },
  { match: "tissues", metadata: { category: "Household", categorySlug: "household", subcategory: "Home Essentials", subcategorySlug: "home-essentials", variant: "Soft Tissues", size: "100", unit: "pulls" }, aliases: ["household", "home essentials"] },
  { match: "detergent", metadata: { category: "Household", categorySlug: "household", subcategory: "Cleaning", subcategorySlug: "cleaning", variant: "Easy Wash", size: "1", unit: "kg" }, aliases: ["household", "cleaning", "1kg"] },
  { match: "dishwash", metadata: { category: "Household", categorySlug: "household", subcategory: "Cleaning", subcategorySlug: "cleaning", variant: "Lemon", size: "500", unit: "ml" }, aliases: ["household", "cleaning", "500ml"] },
  { match: "floor cleaner", metadata: { category: "Household", categorySlug: "household", subcategory: "Cleaning", subcategorySlug: "cleaning", variant: "Citrus", size: "1", unit: "L" }, aliases: ["household", "cleaning", "1l"] },
  { match: "garbage bags", metadata: { category: "Household", categorySlug: "household", subcategory: "Home Essentials", subcategorySlug: "home-essentials", variant: "Medium", size: "30", unit: "pcs" }, aliases: ["household", "home essentials", "30 pcs"] },
];

function getCatalogMetadata(item: MockCatalogItem) {
  const haystack = normalizeText([item.productName, ...(item.searchAliases ?? [])].join(" "));
  return METADATA_RULES.find((rule) => haystack.includes(rule.match));
}

export function withCatalogMetadata(items: MockCatalogItem[]): MockCatalogItem[] {
  return items.map((item) => {
    const rule = getCatalogMetadata(item);
    if (!rule) {
      return item;
    }

    return {
      ...rule.metadata,
      ...item,
      searchAliases: Array.from(
        new Set([...(item.searchAliases ?? []), ...rule.aliases]),
      ),
    };
  });
}
