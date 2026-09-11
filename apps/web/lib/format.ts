export function formatPrice(value: number): string {
  const formatted = value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `₹${formatted}`;
}

export function formatDelivery(minutes?: number): string {
  if (minutes === undefined || minutes === null) {
    return "—";
  }
  return `${minutes} min`;
}
