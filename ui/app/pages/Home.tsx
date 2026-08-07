import React, { useState } from "react"

import { useDql } from "@dynatrace-sdk/react-hooks"
import { Flex } from "@dynatrace/strato-components/layouts"

import { buildUserQuery } from "../utils/dql-queries"
import { UserSearchPanel } from "../components/UserSearchPanel/UserSearchPanel"
import { TransactionsTablePanel } from "../components/TransactionsTablePanel/TransactionsTablePanel"
import { CandidateUsersPanel } from "../components/CandidateUsersPanel/CandidateUsersPanel"
import { TradesOverviewPanel } from "../components/TradesOverviewPanel/TradesOverviewPanel"

// CONFIGURATION CONSTANTS
const SUSPICIOUS_TRADE_THRESHOLD = 1000
const QUERY_TIMEFRAME_DAYS = 30

export type TransactionQueryRecord = {
  [key: string]: unknown
  timestamp?: string
  eventType?: string
  "event.type"?: string
  event_type?: string
  amount?: number | string
  event_amount?: number | string
  currency?: string
  email?: string
  cardType?: string
  cardNumber?: string
  name?: string
  address?: string
  "browser.name"?: string
  "browser.version"?: string
  "browser.user_agent"?: string
  "os.name"?: string
  "device.type"?: string
  "client.ip"?: string
  "geo.city.name"?: string
  "geo.country.name"?: string
  accountId?: number | string
  eventId?: string
  "event.id"?: string
}

export const Home = () => {
  const [submittedEmail, setSubmittedEmail] = useState("")

  const activeQuery = buildUserQuery(submittedEmail, QUERY_TIMEFRAME_DAYS)
  const { data, error, isLoading, forceRefetch } =
    useDql<TransactionQueryRecord>(
      { query: activeQuery, maxResultRecords: 5000 },
      {
        enabled: Boolean(submittedEmail)
      }
    )

  const handleSearch = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      return
    }

    if (normalizedEmail === submittedEmail) {
      void forceRefetch()
      return
    }

    setSubmittedEmail(normalizedEmail)
  }

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <UserSearchPanel
        suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
        queryTimeframeDays={QUERY_TIMEFRAME_DAYS}
        onSearch={handleSearch}
      />

      {!submittedEmail && (
        <TradesOverviewPanel
          suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
          timeframeDays={QUERY_TIMEFRAME_DAYS}
        />
      )}

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
