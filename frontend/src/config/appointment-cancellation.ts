// O prazo vem calculado pelo backend a partir do parâmetro de antecedência mínima; o frontend
// apenas o compara com o relógio para habilitar a ação, sem repetir a regra.
export function isWithinCancellationDeadline(
  appointment: { cancellableUntil: string | null },
  now = Date.now(),
): boolean {
  return appointment.cancellableUntil !== null && now < Date.parse(appointment.cancellableUntil)
}
