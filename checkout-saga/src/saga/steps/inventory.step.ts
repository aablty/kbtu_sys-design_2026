import { SagaStep, CheckoutContext } from "../../types";

export class InventoryStep implements SagaStep<CheckoutContext> {
  name = "Inventory";

  async execute(context: CheckoutContext): Promise<void> {
    console.log("Reserving inventory...");

    if (context.failInventory) {
      throw new Error("Inventory not available");
    }

    context.inventoryReserved = true;
  }

  async compensate(context: CheckoutContext): Promise<void> {
    console.log("Releasing inventory...");
  }
}
