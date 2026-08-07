// ui/app/utils/dql-queries.ts

export type QueryTimeframe = {
  from: string
  to: string
}

const toDqlTimeExpression = (value: string) => {
  const normalizedValue = value.trim()

  if (normalizedValue === "now") return "now()"
  if (normalizedValue.startsWith("now-")) {
    return `now()-${normalizedValue.slice(4)}`
  }
  if (normalizedValue.startsWith("now()")) return normalizedValue

  return JSON.stringify(normalizedValue)
}

const getFetchTimeframe = ({ from, to }: QueryTimeframe) =>
  `from: ${toDqlTimeExpression(from)}, to: ${toDqlTimeExpression(to)}`

export const buildUserQuery = (email: string, timeframe: QueryTimeframe) => {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return "fetch bizevents | limit 0"
  }

  const safeEmail = JSON.stringify(normalizedEmail)

  return `
    fetch bizevents, ${getFetchTimeframe(timeframe)}
    | filter event.type == "com.easytrade.deposit.start" or event.type == "com.easytrade.withdraw.start"
    | filter lower(email) == ${safeEmail}
    | sort timestamp desc
  `
}

export const buildCandidateUsersQuery = (
  timeframe: QueryTimeframe,
  suspiciousTradeThreshold: number
) => `
  fetch bizevents, ${getFetchTimeframe(timeframe)}
  | filter in(event.type, "com.easytrade.deposit.start", "com.easytrade.withdraw.start")
  | filter isNotNull(email) and amount > ${suspiciousTradeThreshold}
  | summarize suspiciousTradeCount = count(), by: { email = lower(email) }
  | sort suspiciousTradeCount desc
  | limit 20
`

export const buildOverviewQuery = (
  timeframe: QueryTimeframe,
  suspiciousTradeThreshold: number
) => `
  fetch bizevents, ${getFetchTimeframe(timeframe)}
  | filter event.type == "com.easytrade.deposit.start" or event.type == "com.easytrade.withdraw.start"
  | summarize {
      deposits = countIf(event.type == "com.easytrade.deposit.start"),
      withdrawals = countIf(event.type == "com.easytrade.withdraw.start"),
      suspiciousTrades = countIf(amount > ${suspiciousTradeThreshold})
    }
`

export const buildDepositsTotalQuery = (timeframe: QueryTimeframe) => `
  fetch bizevents, ${getFetchTimeframe(timeframe)}
  | filter event.type == "com.easytrade.deposit.start"
  | summarize deposits = count()
`

export const buildWithdrawalsTotalQuery = (timeframe: QueryTimeframe) => `
  fetch bizevents, ${getFetchTimeframe(timeframe)}
  | filter event.type == "com.easytrade.withdraw.start"
  | summarize withdrawals = count()
`

export const buildSuspiciousTradesTotalQuery = (
  timeframe: QueryTimeframe,
  suspiciousTradeThreshold: number
) => `
  fetch bizevents, ${getFetchTimeframe(timeframe)}
  | filter in(event.type, "com.easytrade.deposit.start", "com.easytrade.withdraw.start")
  | filter amount > ${suspiciousTradeThreshold}
  | summarize suspiciousTrades = count()
`
