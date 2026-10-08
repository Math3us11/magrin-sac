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

export function institutionLocalToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new Error('Data ou horário institucional inválido.')
  }

  const wallClock = Date.UTC(year, month - 1, day, hour, minute)
  let result = new Date(wallClock)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rendered = getInstitutionDateTime(result)
    const [renderedYear, renderedMonth, renderedDay] = rendered.date.split('-').map(Number)
    const [renderedHour, renderedMinute] = rendered.time.split(':').map(Number)
    const renderedAsUtc = Date.UTC(
      renderedYear ?? 0,
      (renderedMonth ?? 1) - 1,
      renderedDay ?? 1,
      renderedHour ?? 0,
      renderedMinute ?? 0,
    )
    result = new Date(wallClock - (renderedAsUtc - result.getTime()))
  }

  const verification = getInstitutionDateTime(result)
  if (verification.date !== date || verification.time !== time) {
    throw new Error('Data ou horário inexistente no timezone institucional.')
  }

  return result
}
