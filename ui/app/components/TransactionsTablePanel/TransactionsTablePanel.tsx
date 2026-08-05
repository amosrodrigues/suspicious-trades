import React, { useMemo, useState } from "react"
import { Chip, MessageContainer } from "@dynatrace/strato-components/content"
import {
  DataTable,
  type DataTableColumnDef
} from "@dynatrace/strato-components/tables"
import { Divider, Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Paragraph } from "@dynatrace/strato-components/typography"
import { Tabs, Tab } from "@dynatrace/strato-components/navigation"

import { formatCurrency, formatDate, paddedCell } from "../../utils/formatters"

type TransactionRow = {
  id: string
  timestamp: string
  type: string
  amount: number
  currency: string
  email: string
  status: "Normal" | "Suspicious"
}

type DqlUserQueryResponse = {
  records?: Array<Record<string, unknown>>
}

const getStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback

const getNumericValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

interface TransactionsTablePanelProps {
  submittedEmail: string
  data?: DqlUserQueryResponse
  error?: Error
  isLoading: boolean
  suspiciousTradeThreshold: number
  queryTimeframeDays: number
}

export const TransactionsTablePanel = ({
  submittedEmail,
  data,
  error,
  isLoading,
  suspiciousTradeThreshold,
  queryTimeframeDays
}: TransactionsTablePanelProps) => {
  const [selectedTab, setSelectedTab] = useState<
    "all" | "deposit" | "withdrawal" | "suspicious"
  >("all")

  const transactions = useMemo<TransactionRow[]>(() => {
    const records = Array.isArray(data?.records) ? data.records : []

    return records.map((record: Record<string, unknown>, index: number) => {
      const rawEventType =
        getStringValue(record.eventType) ||
        getStringValue(record["event.type"]) ||
        getStringValue(record.event_type) ||
        "unknown"
      const rawType = rawEventType.includes("withdraw")
        ? "Withdrawal"
        : rawEventType.includes("deposit")
          ? "Deposit"
          : rawEventType
      const rawAmount = getNumericValue(record.amount ?? record.event_amount)
      const rawTimestamp = getStringValue(record.timestamp)
      const rawCurrency = getStringValue(record.currency, "USD")
      const rawEmail = getStringValue(record.email)
      const amount = rawAmount

      return {
        id: `${rawTimestamp}-${rawType}-${index}`,
        timestamp: formatDate(rawTimestamp),
        type: rawType,
        amount,
        currency: rawCurrency,
        email: rawEmail,
        status: amount > suspiciousTradeThreshold ? "Suspicious" : "Normal"
      }
    })
  }, [data?.records, suspiciousTradeThreshold])

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

  return (
    <>
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
              Results for <strong>{submittedEmail}</strong> in the last{" "}
              {queryTimeframeDays} days.
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
            <Tab title={`All (${totalCount})`}>{null}</Tab>
            <Tab title={`Deposits (${depositCount})`}>{null}</Tab>
            <Tab title={`Withdrawals (${withdrawalCount})`}>{null}</Tab>
            <Tab title={`Suspicious (${suspiciousCount})`}>{null}</Tab>
          </Tabs>
          <DataTable
            data={filteredTransactions}
            columns={columns}
            fullWidth
            fullHeight
            style={{ minHeight: 240 }}
            sortable>
            <DataTable.EmptyState>
              {selectedTab === "all" &&
                "Nenhum resultado encontrado. Não há transações para este usuário no período selecionado."}
              {selectedTab === "deposit" &&
                "Nenhum depósito encontrado. Não há depósitos para este usuário no período selecionado."}
              {selectedTab === "withdrawal" &&
                "Nenhum saque encontrado. Não há saques para este usuário no período selecionado."}
              {selectedTab === "suspicious" &&
                "Nenhum registro suspeito. Não há transações acima de US$1.000 para este usuário."}
            </DataTable.EmptyState>
            <DataTable.Pagination
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50]}
            />
          </DataTable>
        </Surface>
      )}
    </>
  )
}
