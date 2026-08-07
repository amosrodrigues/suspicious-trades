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

export const buildCandidateUsersQuery = (timeframeDays: number) => `
  fetch bizevents, from: now() - ${timeframeDays}d
  | filter event.type == "com.easytrade.deposit.start" or event.type == "com.easytrade.withdraw.start"
  | filter isNotNull(email)
  | fields email, amount
  | limit 5000
`
