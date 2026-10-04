export const INSTITUTION_TIME_ZONE = 'America/Porto_Velho'
export const INSTITUTION_TIME_ZONE_LABEL = 'Horário de Porto Velho'

type ZonedDateTime = {
  date: string
  time: string
}

export function getInstitutionDateTime(value = new Date()): ZonedDateTime {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: INSTITUTION_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? ''

  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  }
}
