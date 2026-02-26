export interface SagaStep<TContext> {
  name: string;
  execute(context: TContext): Promise<void>;
  compensate(context: TContext): Promise<void>;
}
