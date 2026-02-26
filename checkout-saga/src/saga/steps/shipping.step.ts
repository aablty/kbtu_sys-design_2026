import { SagaStep, CheckoutContext } from "../../types";

export class ShippingStep implements SagaStep<CheckoutContext> {
  name = "Shipping";

  async execute(context: CheckoutContext): Promise<void> {
    console.log("Creating shipment...");

    if (context.failShipping) {
      throw new Error("Shipping failed");
    }

    context.shipmentId = "SHIP-" + Date.now();
  }

  async compensate(context: CheckoutContext): Promise<void> {
    console.log("Cancelling shipment:", context.shipmentId);
  }
}
