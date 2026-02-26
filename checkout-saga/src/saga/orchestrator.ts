import { SagaStep } from "../types";

export class SagaOrchestrator<TContext> {
  private steps: SagaStep<TContext>[];
  private completedSteps: SagaStep<TContext>[] = [];

  constructor(steps: SagaStep<TContext>[]) {
    this.steps = steps;
  }

  async execute(context: TContext) {
    try {
      for (const step of this.steps) {
        console.log(`Executing step: ${step.name}`);
        await step.execute(context);
        this.completedSteps.push(step);
      }

      return { success: true };
    } catch (error) {
      console.error("Saga failed. Starting compensation...");
      await this.compensate(context);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async compensate(context: TContext) {
    for (const step of [...this.completedSteps].reverse()) {
      try {
        console.log(`Compensating step: ${step.name}`);
        await step.compensate(context);
      } catch (err) {
        console.error(`Compensation failed for ${step.name}`);
      }
    }
  }
}
