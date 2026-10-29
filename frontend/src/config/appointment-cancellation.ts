import { INSTITUTION_TIME_ZONE } from '@/config/date-time'

// O prazo vem calculado pelo backend a partir do parâmetro de antecedência mínima; o frontend
// apenas o compara com o relógio para habilitar a ação, sem repetir a regra.
export function isWithinCancellationDeadline(
  appointment: { cancellableUntil: string | null },
  now = Date.now(),
): boolean {
  return appointment.cancellableUntil !== null && now < Date.parse(appointment.cancellableUntil)
}

// Explica em texto visível por que o botão de cancelamento está desabilitado.
export function cancellationClosedMessage(appointment: {
  cancellableUntil: string | null
}): string {
  if (!appointment.cancellableUntil) return 'O cancelamento não está mais disponível.'

  const deadline = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: INSTITUTION_TIME_ZONE,
  }).format(new Date(appointment.cancellableUntil))
  return `O prazo para cancelar encerrou em ${deadline}.`
}
