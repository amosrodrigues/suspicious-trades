import React, { useState } from "react"

import { useDql } from "@dynatrace-sdk/react-hooks"
import { Flex } from "@dynatrace/strato-components/layouts"

import { buildUserQuery } from "../utils/dql-queries"
import { UserSearchPanel } from "../components/UserSearchPanel/UserSearchPanel"
import { TransactionsTablePanel } from "../components/TransactionsTablePanel/TransactionsTablePanel"
import { CandidateUsersPanel } from "../components/CandidateUsersPanel/CandidateUsersPanel"

// CONFIGURATION CONSTANTS
const SUSPICIOUS_TRADE_THRESHOLD = 1000
const QUERY_TIMEFRAME_DAYS = 30

export const Home = () => {
  const [submittedEmail, setSubmittedEmail] = useState("")

  const activeQuery = submittedEmail
    ? buildUserQuery(submittedEmail, QUERY_TIMEFRAME_DAYS)
    : "fetch bizevents | limit 0"
  const { data, error, isLoading } = useDql({ query: activeQuery })

  const handleSearch = (email: string) => {
    setSubmittedEmail(email)
  }

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <UserSearchPanel
        queryTimeframeDays={QUERY_TIMEFRAME_DAYS}
        onSearch={handleSearch}
      />

      <TransactionsTablePanel
        submittedEmail={submittedEmail}
        data={data}
        error={error}
        isLoading={isLoading}
        suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
        queryTimeframeDays={QUERY_TIMEFRAME_DAYS}
      />

      <CandidateUsersPanel
        suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
        queryTimeframeDays={QUERY_TIMEFRAME_DAYS}
        onSearch={handleSearch}
      />
    </Flex>
  )
}
