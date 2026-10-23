export class FlowConflictError extends Error {
  constructor() {
    super('기록이 계속 업데이트되고 있어요. 잠시 후 다시 눌러 주세요. 입력한 자료는 그대로 남아 있어요.');
    this.name = 'FlowConflictError';
  }
}

// Repeat the entire read → AI integration → transaction, never a stale write.
export async function retryFlowIntegration<T>(integrate: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await integrate(); }
    catch (cause) {
      if (!(cause instanceof FlowConflictError) || attempt >= 2) throw cause;
    }
  }
}
