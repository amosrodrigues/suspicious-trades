// ui/app/utils/dql-queries.ts

export const buildUserQuery = (email: string, timeframeDays: number) => {
  const safeEmail = JSON.stringify(email.toLowerCase())

  return `
    fetch bizevents, from: now() - ${timeframeDays}d
    | filter event.type == "com.easytrade.deposit.start" or event.type == "com.easytrade.withdraw.start"
    | filter lower(email) == ${safeEmail}
    | fields timestamp, eventType=event.type, eventId=event.id, amount, email, accountId, cardType
    | sort timestamp desc
  `
}

export const buildCandidateUsersQuery = (
  timeframeDays: number,
  suspiciousTradeThreshold: number
) => `
  fetch bizevents, from: now() - ${timeframeDays}d
  | filter event.type == "com.easytrade.deposit.start" or event.type == "com.easytrade.withdraw.start"
  | filter amount > ${suspiciousTradeThreshold}
  | fields email
  | limit 1000
`
