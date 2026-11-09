import api from "../api";

export async function getHotelSettings() {
  const response = await api.get("/Settings");
  return response.data;
}

export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export function calculateTax(amount, gstPercentage = 18) {
  const subtotal = Number(amount) || 0;
  const tax = subtotal * (Number(gstPercentage) / 100);

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}