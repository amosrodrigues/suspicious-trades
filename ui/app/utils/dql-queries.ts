// ui/app/utils/dql-queries.ts

export const buildUserQuery = (email: string, timeframeDays: number) => {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return "fetch bizevents | limit 0"
  }

  const safeEmail = JSON.stringify(normalizedEmail)

  return `
    fetch bizevents, from: now() - ${timeframeDays}d
    | filter event.type == "com.easytrade.deposit.start" or event.type == "com.easytrade.withdraw.start"
    | filter lower(email) == ${safeEmail}
    | sort timestamp desc
  `
}

export const buildCandidateUsersQuery = (
  timeframeDays: number,
  suspiciousTradeThreshold: number
) => `
  fetch bizevents, from: now() - ${timeframeDays}d
  | filter in(event.type, "com.easytrade.deposit.start", "com.easytrade.withdraw.start")
  | filter isNotNull(email) and amount > ${suspiciousTradeThreshold}
  | summarize suspiciousTradeCount = count(), by: { email = lower(email) }
  | sort suspiciousTradeCount desc
  | limit 20
`

export const buildOverviewQuery = (
  timeframeDays: number,
  suspiciousTradeThreshold: number
) => `
  fetch bizevents, from: now() - ${timeframeDays}d
  | filter event.type == "com.easytrade.deposit.start" or event.type == "com.easytrade.withdraw.start"
  | summarize {
      deposits = countIf(event.type == "com.easytrade.deposit.start"),
      withdrawals = countIf(event.type == "com.easytrade.withdraw.start"),
      suspiciousTrades = countIf(amount > ${suspiciousTradeThreshold})
    }
`

export const buildDepositsTotalQuery = (timeframeDays: number) => `
  fetch bizevents, from: now() - ${timeframeDays}d
  | filter event.type == "com.easytrade.deposit.start"
  | summarize deposits = count()
`
