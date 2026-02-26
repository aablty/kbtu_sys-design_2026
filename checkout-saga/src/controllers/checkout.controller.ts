import { Request, Response } from "express";
import { SagaOrchestrator } from "../saga/orchestrator";
import { PaymentStep, InventoryStep, ShippingStep } from "../saga/steps";
import { CheckoutContext } from "../types";

export const checkoutHandler = async (req: Request, res: Response) => {
  const context: CheckoutContext = req.body;

  const saga = new SagaOrchestrator<CheckoutContext>([
    new PaymentStep(),
    new InventoryStep(),
    new ShippingStep(),
  ]);

  const result = await saga.execute(context);

  res.json(result);
};
