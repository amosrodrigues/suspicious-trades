import React, { useMemo, useState } from "react"

import { useDql } from "@dynatrace-sdk/react-hooks"
import { Button } from "@dynatrace/strato-components/buttons"
import { Chip, MessageContainer } from "@dynatrace/strato-components/content"
import { TextInput } from "@dynatrace/strato-components/forms"
import {
  DataTable,
  type DataTableColumnDef
} from "@dynatrace/strato-components/tables"
import { Divider, Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Heading, Paragraph } from "@dynatrace/strato-components/typography"
import { Tabs, Tab } from "@dynatrace/strato-components/navigation"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value)

const formatDate = (value: string) => {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
      }).format(date)
}

const buildUserQuery = (email: string) => {
  const safeEmail = email.replace(/"/g, '\\"')

  return `
    fetch bizevents, from: now() - 30d
    | filter lower(eventType) == "deposit" or lower(eventType) == "withdrawal"
    | filter lower(coalesce(userEmail, email)) == "${safeEmail.toLowerCase()}"
    | fields timestamp, eventType, amount, currency, userEmail, email
    | sort timestamp desc
  `
}

const buildCandidateUsersQuery = () => `
  fetch bizevents, from: now() - 30d
  | filter lower(eventType) == "deposit" or lower(eventType) == "withdrawal"
  | filter amount > 1000
  | fields userEmail, email
  | limit 1000
`

type TransactionRow = {
  id: string
  timestamp: string
  type: string
  amount: number
  currency: string
  email: string
  status: "Normal" | "Suspicious"
}

type CandidateUserRow = {
  id: string
  email: string
  suspiciousTradeCount: number
}

export const Home = () => {
  const [email, setEmail] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [selectedTab, setSelectedTab] = useState<
    "all" | "deposit" | "withdrawal" | "suspicious"
  >("all")
  const [showCandidateUsers, setShowCandidateUsers] = useState(false)

  const activeQuery = submittedEmail
    ? buildUserQuery(submittedEmail)
    : "fetch bizevents | limit 0"
  const { data, error, isLoading } = useDql({ query: activeQuery })

  const candidateQuery = showCandidateUsers
    ? buildCandidateUsersQuery()
    : "fetch bizevents | limit 0"
  const {
    data: candidateData,
    error: candidateError,
    isLoading: isCandidateLoading
  } = useDql({ query: candidateQuery, maxResultRecords: 1000 })

  const transactions = useMemo<TransactionRow[]>(() => {
    const records = Array.isArray(data?.records) ? data.records : []

    return records.map((record: Record<string, unknown>, index: number) => {
      const rawType = String(record.eventType ?? record.event_type ?? "unknown")
      const rawAmount = Number(record.amount ?? record.event_amount ?? 0)
      const rawTimestamp = String(
        record.timestamp ?? record.event_timestamp ?? ""
      )
      const rawCurrency = String(record.currency ?? "USD")
      const rawEmail = String(record.userEmail ?? record.email ?? "")
      const amount = Number.isFinite(rawAmount) ? rawAmount : 0

      return {
        id: `${rawTimestamp}-${rawType}-${index}`,
        timestamp: formatDate(rawTimestamp),
        type: rawType,
        amount,
        currency: rawCurrency,
        email: rawEmail,
        status: amount > 1000 ? "Suspicious" : "Normal"
      }
    })
  }, [data?.records])

  const suspiciousCount = transactions.filter(
    (item) => item.status === "Suspicious"
  ).length
  const depositCount = transactions.filter(
    (item) => item.type.toLowerCase() === "deposit"
  ).length
  const withdrawalCount = transactions.filter(
    (item) => item.type.toLowerCase() === "withdrawal"
  ).length
  const totalCount = transactions.length

  const candidateUsers = useMemo<CandidateUserRow[]>(() => {
    const records = Array.isArray(candidateData?.records)
      ? candidateData.records
      : []
    const counts = new Map<string, number>()

    records.forEach((record: Record<string, unknown>) => {
      const rawEmail = String(record.userEmail ?? record.email ?? "")
        .trim()
        .toLowerCase()
      if (!rawEmail) {
        return
      }
      counts.set(rawEmail, (counts.get(rawEmail) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([emailValue, count]) => ({
        id: `${emailValue}-${count}`,
        email: emailValue,
        suspiciousTradeCount: count
      }))
      .sort((a, b) => b.suspiciousTradeCount - a.suspiciousTradeCount)
      .slice(0, 20)
  }, [candidateData?.records])

  const candidateTableData =
    candidateUsers.length > 0
      ? candidateUsers
      : [
          {
            id: "no-results",
            email: "No suspicious user candidates found",
            suspiciousTradeCount: 0
          }
        ]

  const candidateExampleEmail = candidateUsers[0]?.email ?? ""
  const [copyMessage, setCopyMessage] = useState("")

  const copyExampleEmailToClipboard = async () => {
    if (!candidateExampleEmail) {
      return
    }

    try {
      await navigator.clipboard.writeText(candidateExampleEmail)
      setCopyMessage("Copied sample email to clipboard")
      window.setTimeout(() => setCopyMessage(""), 2000)
    } catch {
      setCopyMessage("Unable to copy email")
      window.setTimeout(() => setCopyMessage(""), 2000)
    }
  }

  const filteredTransactions = useMemo<TransactionRow[]>(() => {
    return transactions.filter((transaction) => {
      if (selectedTab === "deposit") {
        return transaction.type.toLowerCase() === "deposit"
      }
      if (selectedTab === "withdrawal") {
        return transaction.type.toLowerCase() === "withdrawal"
      }
      if (selectedTab === "suspicious") {
        return transaction.status === "Suspicious"
      }
      return true
    })
  }, [selectedTab, transactions])

  const paddedCell = (value: unknown) => (
    <div style={{ padding: "10px 12px" }}>{String(value ?? "")}</div>
  )

  const columns = useMemo<DataTableColumnDef<TransactionRow>[]>(
    () => [
      {
        id: "timestamp",
        header: "Date",
        accessor: "timestamp",
        width: "content",
        cell: ({ value }) => paddedCell(value)
      },
      {
        id: "type",
        header: "Type",
        accessor: "type",
        width: "content",
        cell: ({ value }) => paddedCell(value)
      },
      {
        id: "amount",
        header: "Amount",
        accessor: "amount",
        width: "content",
        sortType: "number",
        cell: ({ value }) => paddedCell(formatCurrency(Number(value ?? 0)))
      },
      {
        id: "currency",
        header: "Currency",
        accessor: "currency",
        width: "content",
        cell: ({ value }) => paddedCell(value)
      },
      {
        id: "email",
        header: "User Email",
        accessor: "email",
        width: "content",
        cell: ({ value }) => paddedCell(value)
      },
      {
        id: "status",
        header: "Status",
        accessor: "status",
        width: "content",
        cell: ({ rowData }) => (
          <div style={{ padding: "10px 12px" }}>
            <Chip
              color={rowData.status === "Suspicious" ? "critical" : "success"}
              variant="accent"
              size="condensed">
              {rowData.status}
            </Chip>
          </div>
        )
      }
    ],
    []
  )

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      return
    }

    setSubmittedEmail(normalizedEmail)
  }

  return (
    <Flex flexDirection="column" gap={24} padding={32}>
      <Surface elevation="raised" padding={24} style={{ borderRadius: 18 }}>
        <Flex flexDirection="column" gap={12}>
          <Heading level={1}>Suspicious Trade Checker</Heading>
          <Paragraph>
            Search EasyTrade users by email and review deposits and withdrawals
            from the last 30 days. Trades over $1,000 are flagged as suspicious.
          </Paragraph>
        </Flex>

        <form onSubmit={handleSearch}>
          <Flex gap={12} alignItems="center" flexWrap="wrap" paddingTop={20}>
            <div style={{ minWidth: 320, flex: 1 }}>
              <TextInput
                type="email"
                value={email}
                onChange={(value) => setEmail(value)}
                placeholder="Enter user email"
              />
            </div>
            <Button type="submit" variant="emphasized" color="primary">
              Search
            </Button>
          </Flex>
        </form>
      </Surface>

      {isLoading && (
        <MessageContainer variant="primary">
          <MessageContainer.Title>Loading transactions</MessageContainer.Title>
          <MessageContainer.Description>
            Fetching results for the requested user email.
          </MessageContainer.Description>
        </MessageContainer>
      )}

      {error && (
        <MessageContainer variant="critical">
          <MessageContainer.Title>Query error</MessageContainer.Title>
          <MessageContainer.Description>
            {error.message}
          </MessageContainer.Description>
        </MessageContainer>
      )}

      {submittedEmail && !isLoading && !error && (
        <Surface elevation="flat" padding={24} style={{ borderRadius: 16 }}>
          <Flex
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={12}>
            <Paragraph>
              Results for <strong>{submittedEmail}</strong>
            </Paragraph>
            <Flex gap={8} flexWrap="wrap">
              <Chip color="neutral" variant="accent" size="condensed">
                {totalCount} trades
              </Chip>
              <Chip color="critical" variant="accent" size="condensed">
                {suspiciousCount} suspicious
              </Chip>
            </Flex>
          </Flex>

          <Divider />

          <Tabs
            selectedIndex={[
              "all",
              "deposit",
              "withdrawal",
              "suspicious"
            ].indexOf(selectedTab)}
            onChange={(index) => {
              const tabMap: Array<
                "all" | "deposit" | "withdrawal" | "suspicious"
              > = ["all", "deposit", "withdrawal", "suspicious"]
              setSelectedTab(tabMap[index])
            }}>
            <Tab title={`All (${totalCount})`}>
              <DataTable
                data={filteredTransactions}
                columns={columns}
                fullWidth
                fullHeight
                style={{ minHeight: 240 }}
                sortable>
                <DataTable.EmptyState>
                  Nenhum resultado encontrado. Não há transações para este usuário no período selecionado.
                </DataTable.EmptyState>
                <DataTable.Pagination
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </DataTable>
            </Tab>
            <Tab title={`Deposits (${depositCount})`}>
              <DataTable
                data={filteredTransactions}
                columns={columns}
                fullWidth
                fullHeight
                style={{ minHeight: 240 }}
                sortable>
                <DataTable.EmptyState>
                  Nenhum depósito encontrado. Não há depósitos para este usuário no período selecionado.
                </DataTable.EmptyState>
                <DataTable.Pagination
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </DataTable>
            </Tab>
            <Tab title={`Withdrawals (${withdrawalCount})`}>
              <DataTable
                data={filteredTransactions}
                columns={columns}
                fullWidth
                fullHeight
                style={{ minHeight: 240 }}
                sortable>
                <DataTable.EmptyState>
                  Nenhum saque encontrado. Não há saques para este usuário no período selecionado.
                </DataTable.EmptyState>
                <DataTable.Pagination
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </DataTable>
            </Tab>
            <Tab title={`Suspicious (${suspiciousCount})`}>
              <DataTable
                data={filteredTransactions}
                columns={columns}
                fullWidth
                fullHeight
                style={{ minHeight: 240 }}
                sortable>
                <DataTable.EmptyState>
                  Nenhum registro suspeito. Não há transações acima de US$1.000 para este usuário.
                </DataTable.EmptyState>
                <DataTable.Pagination
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </DataTable>
            </Tab>
          </Tabs>
        </Surface>
      )}

      <Surface elevation="raised" padding={24} style={{ borderRadius: 18 }}>
        <Flex flexDirection="column" gap={12}>
          <Flex
            alignItems="center"
            justifyContent="space-between"
            gap={12}
            flexWrap="wrap">
            <Heading level={2}>Candidate suspicious users</Heading>
            <Button
              type="button"
              variant="emphasized"
              color="primary"
              onClick={() => setShowCandidateUsers(true)}>
              Load suspicious users
            </Button>
          </Flex>
          <Paragraph>
            Search globally for EasyTrade users with transactions over $1,000 in
            the last 30 days. Use an email from this list for testing.
          </Paragraph>

          {isCandidateLoading && (
            <MessageContainer variant="primary">
              <MessageContainer.Title>
                Loading candidates
              </MessageContainer.Title>
              <MessageContainer.Description>
                Fetching suspicious user candidates from EasyTrade.
              </MessageContainer.Description>
            </MessageContainer>
          )}

          {candidateError && (
            <MessageContainer variant="critical">
              <MessageContainer.Title>
                Unable to load candidate users
              </MessageContainer.Title>
              <MessageContainer.Description>
                {candidateError.message}
              </MessageContainer.Description>
            </MessageContainer>
          )}

          {showCandidateUsers && !isCandidateLoading && !candidateError && (
            <>
              {candidateUsers.length > 0 ? (
                <Flex alignItems="center" gap={8} flexWrap="wrap">
                  <Paragraph>
                    Try this email for testing: <strong>{candidateExampleEmail}</strong>
                  </Paragraph>
                  <Button type="button" variant="default" onClick={copyExampleEmailToClipboard}>
                    Copy email
                  </Button>
                  {copyMessage && <Paragraph>{copyMessage}</Paragraph>}
                </Flex>
              ) : (
                <MessageContainer variant="neutral">
                  <MessageContainer.Title>No candidates found</MessageContainer.Title>
                  <MessageContainer.Description>
                    There are no users with transactions above $1,000 in the last 30 days.
                  </MessageContainer.Description>
                </MessageContainer>
              )}

              <DataTable
                data={candidateTableData}
                columns={[
                  {
                    id: "email",
                    header: "User Email",
                    accessor: "email",
                    width: "content",
                    cell: ({ value }) => paddedCell(value)
                  },
                  {
                    id: "count",
                    header: "Suspicious Trades",
                    accessor: "suspiciousTradeCount",
                    width: "content",
                    sortType: "number",
                    cell: ({ value, rowData }) =>
                      paddedCell(rowData.id === "no-results" ? "" : value)
                  }
                ]}
                fullWidth
                sortable>
                <DataTable.Pagination
                  defaultPageSize={5}
                  pageSizeOptions={[5, 10, 20]}
                />
              </DataTable>
            </>
          )}
        </Flex>
      </Surface>
    </Flex>
  )
}
