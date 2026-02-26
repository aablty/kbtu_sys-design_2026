export interface CheckoutContext {
  orderId: string;
  userId: string;
  amount: number;
  items: string[];
  address: string;

  paymentId?: string;
  inventoryReserved?: boolean;
  shipmentId?: string;

  failPayment?: boolean;
  failInventory?: boolean;
  failShipping?: boolean;
}
