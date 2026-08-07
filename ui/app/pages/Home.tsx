import React, { useState } from "react"

import { useDql } from "@dynatrace-sdk/react-hooks"
import { Flex } from "@dynatrace/strato-components/layouts"

import {
  buildUserQuery,
  type QueryTimeframe
} from "../utils/dql-queries"
import { UserSearchPanel } from "../components/UserSearchPanel/UserSearchPanel"
import { TransactionsTablePanel } from "../components/TransactionsTablePanel/TransactionsTablePanel"
import { CandidateUsersPanel } from "../components/CandidateUsersPanel/CandidateUsersPanel"
import { TradesOverviewPanel } from "../components/TradesOverviewPanel/TradesOverviewPanel"
import { EasyTradeDashboardsPanel } from "../components/EasyTradeDashboardsPanel/EasyTradeDashboardsPanel"

// CONFIGURATION CONSTANTS
const SUSPICIOUS_TRADE_THRESHOLD = 1000
const DEFAULT_TIMEFRAME: QueryTimeframe = {
  from: "now-30d",
  to: "now"
}

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
  const [timeframe, setTimeframe] = useState<QueryTimeframe>(DEFAULT_TIMEFRAME)

  const activeQuery = buildUserQuery(submittedEmail, timeframe)
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
      <TradesOverviewPanel
        suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      <UserSearchPanel
        suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
        onSearch={handleSearch}
      />

      <TransactionsTablePanel
        submittedEmail={submittedEmail}
        data={data}
        error={error}
        isLoading={isLoading}
        suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
      />

      <CandidateUsersPanel
        suspiciousTradeThreshold={SUSPICIOUS_TRADE_THRESHOLD}
        timeframe={timeframe}
        onSearch={handleSearch}
      />

      {!submittedEmail && <EasyTradeDashboardsPanel />}
    </Flex>
  )
}
