// AuditService falso: guarda cada registro com a transação recebida para as asserções.
export function createAuditFake() {
  const entries = [];

  return {
    entries,
    service: {
      record: async (entry, transaction) => {
        for (const item of [entry].flat()) entries.push({ ...item, transaction });
      },
    },
  };
}
