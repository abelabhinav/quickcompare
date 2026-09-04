import type { CommerceProvider, NormalizedOffer } from "./types.js";

type MockCatalogItem = Omit<NormalizedOffer, "providerName" | "providerSlug">;

export class BlinkitProvider implements CommerceProvider {
  name = "Blinkit";
  slug = "blinkit";

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
        price: 58,
        deliveryFee: 25,
        platformFee: 5,
        discount: 2,
        available: true,
        deliveryMinutes: 12,
        externalId: "blinkit-amul-milk-1l",
        productUrl: "https://blinkit.com/prn/amul-taaza-toned-milk-1l/prid/1001",
      },
      {
        productName: "Britannia Good Day Cookies 600g",
        brand: "Britannia",
        price: 95,
        deliveryFee: 25,
        platformFee: 4,
        discount: 10,
        available: true,
        deliveryMinutes: 15,
        externalId: "blinkit-britannia-good-day-600g",
        productUrl: "https://blinkit.com/prn/britannia-good-day-cookies-600g/prid/1002",
      },
      {
        productName: "Tata Salt 1kg",
        brand: "Tata",
        price: 28,
        deliveryFee: 20,
        platformFee: 3,
        discount: 0,
        available: true,
        deliveryMinutes: 10,
        externalId: "blinkit-tata-salt-1kg",
        productUrl: "https://blinkit.com/prn/tata-salt-1kg/prid/1003",
      },
      {
        productName: "Maggi 2-Minute Noodles Masala 70g",
        brand: "Maggi",
        price: 14,
        deliveryFee: 20,
        platformFee: 2,
        discount: 1,
        available: true,
        deliveryMinutes: 11,
        externalId: "blinkit-maggi-noodles-70g",
        productUrl: "https://blinkit.com/prn/maggi-2-minute-noodles-masala-70g/prid/1004",
      },
      {
        productName: "Surf Excel Easy Wash Detergent 1kg",
        brand: "Surf Excel",
        price: 145,
        deliveryFee: 30,
        platformFee: 6,
        discount: 15,
        available: true,
        deliveryMinutes: 18,
        externalId: "blinkit-surf-excel-1kg",
        productUrl: "https://blinkit.com/prn/surf-excel-easy-wash-detergent-1kg/prid/1005",
      },
      {
        productName: "Aashirvaad Select Atta 5kg",
        brand: "Aashirvaad",
        price: 289,
        deliveryFee: 35,
        platformFee: 8,
        discount: 20,
        available: false,
        deliveryMinutes: 25,
        externalId: "blinkit-aashirvaad-atta-5kg",
        productUrl: "https://blinkit.com/prn/aashirvaad-select-atta-5kg/prid/1006",
      },
    ].map((item) => ({ ...item }));
  }
}
