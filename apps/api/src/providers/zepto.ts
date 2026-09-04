import type { CommerceProvider, NormalizedOffer } from "./types.js";

type MockCatalogItem = Omit<NormalizedOffer, "providerName" | "providerSlug">;

export class ZeptoProvider implements CommerceProvider {
  name = "Zepto";
  slug = "zepto";

  async search(query: string): Promise<NormalizedOffer[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return this.getCatalog()
      .filter((item) => {
        const nameMatch = item.productName.toLowerCase().includes(normalizedQuery);
        const brandMatch =
          item.brand?.toLowerCase().includes(normalizedQuery) ?? false;
        return nameMatch || brandMatch;
      })
      .map((item) => ({
        providerName: this.name,
        providerSlug: this.slug,
        ...item,
      }));
  }

  private getCatalog(): MockCatalogItem[] {
    return [
      {
        productName: "Amul Taaza Toned Milk 1L",
        brand: "Amul",
        price: 56,
        deliveryFee: 19,
        platformFee: 4,
        discount: 3,
        available: true,
        deliveryMinutes: 9,
        externalId: "zepto-amul-milk-1l",
        productUrl: "https://www.zeptonow.com/pn/amul-taaza-toned-milk-1l/pvid/2001",
      },
      {
        productName: "Britannia Good Day Cookies 600g",
        brand: "Britannia",
        price: 99,
        deliveryFee: 19,
        platformFee: 5,
        discount: 8,
        available: true,
        deliveryMinutes: 10,
        externalId: "zepto-britannia-good-day-600g",
        productUrl: "https://www.zeptonow.com/pn/britannia-good-day-cookies-600g/pvid/2002",
      },
      {
        productName: "Tata Salt 1kg",
        brand: "Tata",
        price: 26,
        deliveryFee: 15,
        platformFee: 2,
        discount: 0,
        available: true,
        deliveryMinutes: 8,
        externalId: "zepto-tata-salt-1kg",
        productUrl: "https://www.zeptonow.com/pn/tata-salt-1kg/pvid/2003",
      },
      {
        productName: "Maggi 2-Minute Noodles Masala 70g",
        brand: "Maggi",
        price: 15,
        deliveryFee: 15,
        platformFee: 2,
        discount: 0,
        available: true,
        deliveryMinutes: 7,
        externalId: "zepto-maggi-noodles-70g",
        productUrl: "https://www.zeptonow.com/pn/maggi-2-minute-noodles-masala-70g/pvid/2004",
      },
      {
        productName: "Surf Excel Easy Wash Detergent 1kg",
        brand: "Surf Excel",
        price: 142,
        deliveryFee: 22,
        platformFee: 5,
        discount: 12,
        available: true,
        deliveryMinutes: 14,
        externalId: "zepto-surf-excel-1kg",
        productUrl: "https://www.zeptonow.com/pn/surf-excel-easy-wash-detergent-1kg/pvid/2005",
      },
      {
        productName: "Aashirvaad Select Atta 5kg",
        brand: "Aashirvaad",
        price: 295,
        deliveryFee: 29,
        platformFee: 7,
        discount: 25,
        available: true,
        deliveryMinutes: 16,
        externalId: "zepto-aashirvaad-atta-5kg",
        productUrl: "https://www.zeptonow.com/pn/aashirvaad-select-atta-5kg/pvid/2006",
      },
    ].map((item) => ({ ...item }));
  }
}
