import { SagaStep, CheckoutContext } from "../../types";

export class PaymentStep implements SagaStep<CheckoutContext> {
  name = "Payment";

  async execute(context: CheckoutContext): Promise<void> {
    console.log("Charging payment...");

    if (context.failPayment) {
      throw new Error("Payment failed");
    }

    context.paymentId = "PAY-" + Date.now();
  }

  async compensate(context: CheckoutContext): Promise<void> {
    console.log("Refunding payment:", context.paymentId);
  }
}
