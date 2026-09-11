import type { CommerceProvider, NormalizedOffer } from "./types.js";
import type { MockCatalogItem } from "./types.js";
import { matchesQuery } from "./matching.js";

const CATALOG: MockCatalogItem[] = [
  { productName: "Amul Taaza Toned Milk 1L", brand: "Amul", price: 58, deliveryFee: 25, platformFee: 5, discount: 2, available: true, deliveryMinutes: 12, externalId: "blinkit-amul-milk-1l", searchAliases: ["milk", "toned milk", "amul"] },
  { productName: "Britannia Brown Bread 400g", brand: "Britannia", price: 48, deliveryFee: 20, platformFee: 4, discount: 0, available: true, deliveryMinutes: 14, externalId: "blinkit-britannia-bread", searchAliases: ["bread"] },
  { productName: "Eggoz Farm Fresh Eggs 6 pcs", brand: "Eggoz", price: 72, deliveryFee: 22, platformFee: 4, discount: 5, available: true, deliveryMinutes: 16, externalId: "blinkit-eggoz-eggs-6", searchAliases: ["eggs", "egg"] },
  { productName: "India Gate Basmati Rice 1kg", brand: "India Gate", price: 165, deliveryFee: 28, platformFee: 6, discount: 12, available: true, deliveryMinutes: 19, externalId: "blinkit-india-gate-rice", searchAliases: ["rice", "basmati"] },
  { productName: "Aashirvaad Select Atta 5kg", brand: "Aashirvaad", price: 289, deliveryFee: 35, platformFee: 8, discount: 20, available: false, deliveryMinutes: 25, externalId: "blinkit-aashirvaad-atta-5kg", searchAliases: ["atta", "wheat flour", "aashirvaad"] },
  { productName: "Madhur Pure Sugar 1kg", brand: "Madhur", price: 52, deliveryFee: 20, platformFee: 3, discount: 0, available: true, deliveryMinutes: 13, externalId: "blinkit-madhur-sugar", searchAliases: ["sugar"] },
  { productName: "Tata Salt 1kg", brand: "Tata", price: 28, deliveryFee: 20, platformFee: 3, discount: 0, available: true, deliveryMinutes: 10, externalId: "blinkit-tata-salt-1kg", searchAliases: ["salt", "tata salt"] },
  { productName: "Fortune Sunlite Oil 1L", brand: "Fortune", price: 142, deliveryFee: 28, platformFee: 5, discount: 8, available: true, deliveryMinutes: 18, externalId: "blinkit-fortune-oil", searchAliases: ["cooking oil", "oil"] },
  { productName: "Maggi 2-Minute Noodles Masala 70g", brand: "Maggi", price: 14, deliveryFee: 20, platformFee: 2, discount: 1, available: true, deliveryMinutes: 11, externalId: "blinkit-maggi-noodles-70g", searchAliases: ["noodles", "instant noodles", "maggi"] },
  { productName: "Britannia Good Day Cookies 600g", brand: "Britannia", price: 95, deliveryFee: 25, platformFee: 4, discount: 10, available: true, deliveryMinutes: 15, externalId: "blinkit-good-day-biscuits", searchAliases: ["biscuits", "cookies"] },
  { productName: "Lay's India's Magic Masala 52g", brand: "Lay's", price: 20, deliveryFee: 20, platformFee: 2, discount: 0, available: true, deliveryMinutes: 12, externalId: "blinkit-lays-chips", searchAliases: ["chips", "snacks"] },
  { productName: "Nescafe Classic Coffee 50g", brand: "Nescafe", price: 170, deliveryFee: 24, platformFee: 5, discount: 15, available: true, deliveryMinutes: 17, externalId: "blinkit-nescafe-coffee", searchAliases: ["coffee"] },
  { productName: "Tata Tea Premium 250g", brand: "Tata Tea", price: 135, deliveryFee: 24, platformFee: 4, discount: 6, available: true, deliveryMinutes: 15, externalId: "blinkit-tata-tea", searchAliases: ["tea", "chai"] },
  { productName: "Coca-Cola Soft Drink 750ml", brand: "Coca-Cola", price: 45, deliveryFee: 22, platformFee: 3, discount: 0, available: true, deliveryMinutes: 13, externalId: "blinkit-coke-soft-drink", searchAliases: ["soft drink", "soft drinks", "cola"] },
  { productName: "Cadbury Dairy Milk Silk 60g", brand: "Cadbury", price: 85, deliveryFee: 20, platformFee: 3, discount: 5, available: true, deliveryMinutes: 12, externalId: "blinkit-cadbury-chocolate", searchAliases: ["chocolate"] },
  { productName: "Dove Intense Repair Shampoo 340ml", brand: "Dove", price: 315, deliveryFee: 25, platformFee: 6, discount: 30, available: true, deliveryMinutes: 16, externalId: "blinkit-dove-shampoo", searchAliases: ["shampoo", "hair care"] },
  { productName: "Tresemme Keratin Smooth Conditioner 190ml", brand: "Tresemme", price: 210, deliveryFee: 25, platformFee: 5, discount: 20, available: true, deliveryMinutes: 18, externalId: "blinkit-tresemme-conditioner", searchAliases: ["conditioner"] },
  { productName: "Dove Cream Beauty Bathing Bar 100g", brand: "Dove", price: 62, deliveryFee: 20, platformFee: 3, discount: 4, available: true, deliveryMinutes: 12, externalId: "blinkit-dove-soap", searchAliases: ["soap", "bathing bar"] },
  { productName: "Colgate Strong Teeth Toothpaste 200g", brand: "Colgate", price: 110, deliveryFee: 20, platformFee: 3, discount: 8, available: true, deliveryMinutes: 11, externalId: "blinkit-colgate-toothpaste", searchAliases: ["toothpaste"] },
  { productName: "Oral-B Pro Health Toothbrush Medium", brand: "Oral-B", price: 55, deliveryFee: 18, platformFee: 3, discount: 0, available: true, deliveryMinutes: 14, externalId: "blinkit-oralb-toothbrush", searchAliases: ["toothbrush", "brush"] },
  { productName: "Himalaya Purifying Neem Face Wash 150ml", brand: "Himalaya", price: 165, deliveryFee: 22, platformFee: 4, discount: 12, available: true, deliveryMinutes: 16, externalId: "blinkit-himalaya-face-wash", searchAliases: ["face wash", "facewash"] },
  { productName: "Nivea Fresh Active Deodorant 150ml", brand: "Nivea", price: 199, deliveryFee: 22, platformFee: 4, discount: 18, available: false, deliveryMinutes: 20, externalId: "blinkit-nivea-deodorant", searchAliases: ["deodorant", "deo"] },
  { productName: "Durex Extra Time Condoms 10 pcs", brand: "Durex", price: 245, deliveryFee: 20, platformFee: 4, discount: 20, available: true, deliveryMinutes: 15, externalId: "blinkit-durex-condoms", searchAliases: ["condoms", "condom", "wellness"] },
  { productName: "Whisper Ultra Sanitary Pads XL 15 pcs", brand: "Whisper", price: 175, deliveryFee: 20, platformFee: 4, discount: 10, available: true, deliveryMinutes: 17, externalId: "blinkit-whisper-pads", searchAliases: ["sanitary pads", "pads"] },
  { productName: "Origami Soft Tissues 100 pulls", brand: "Origami", price: 89, deliveryFee: 20, platformFee: 3, discount: 5, available: true, deliveryMinutes: 14, externalId: "blinkit-origami-tissues", searchAliases: ["tissues", "tissue"] },
  { productName: "Surf Excel Easy Wash Detergent 1kg", brand: "Surf Excel", price: 145, deliveryFee: 30, platformFee: 6, discount: 15, available: true, deliveryMinutes: 18, externalId: "blinkit-surf-excel-1kg", searchAliases: ["detergent", "laundry"] },
  { productName: "Vim Dishwash Gel Lemon 500ml", brand: "Vim", price: 115, deliveryFee: 24, platformFee: 4, discount: 8, available: true, deliveryMinutes: 16, externalId: "blinkit-vim-dishwash", searchAliases: ["dishwash", "dish wash"] },
  { productName: "Lizol Citrus Floor Cleaner 1L", brand: "Lizol", price: 205, deliveryFee: 28, platformFee: 5, discount: 18, available: true, deliveryMinutes: 19, externalId: "blinkit-lizol-floor-cleaner", searchAliases: ["floor cleaner", "cleaner"] },
  { productName: "Bigbasket Garbage Bags Medium 30 pcs", brand: "Bigbasket", price: 120, deliveryFee: 24, platformFee: 4, discount: 10, available: true, deliveryMinutes: 18, externalId: "blinkit-garbage-bags", searchAliases: ["garbage bags", "trash bags"] },
];

export class BlinkitProvider implements CommerceProvider {
  name = "Blinkit";
  slug = "blinkit";

  async search(query: string): Promise<NormalizedOffer[]> {
    if (!query.trim()) {
      return [];
    }

    return CATALOG
      .filter((item) => matchesQuery(item, query))
      .map((item) => ({
        providerName: this.name,
        providerSlug: this.slug,
        productUrl: this.getProductUrl(item),
        ...item,
        searchAliases: undefined,
        providerProductPath: undefined,
      }));
  }

  private getProductUrl(item: MockCatalogItem): string | undefined {
    if (!item.providerProductPath) {
      return undefined;
    }

    return `https://blinkit.com${item.providerProductPath}`;
  }
}
