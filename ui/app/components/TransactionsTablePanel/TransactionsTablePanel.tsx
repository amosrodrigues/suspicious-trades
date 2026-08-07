import React, { useMemo, useRef, useState } from "react"
import type { TypedQueryResult } from "@dynatrace-sdk/react-hooks"
import { Chip, MessageContainer } from "@dynatrace/strato-components/content"
import {
  DataTable,
  DataTablePagination,
  type DataTableColumnDef
} from "@dynatrace/strato-components/tables"
import { Divider, Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Heading, Paragraph } from "@dynatrace/strato-components/typography"
import { Tabs, Tab } from "@dynatrace/strato-components/navigation"
import { _Drawer as Drawer } from "@dynatrace/strato-components/overlays"
import { XmarkIcon } from "@dynatrace/strato-icons"
import colors from "@dynatrace/strato-design-tokens/colors"

import {
  formatCurrency,
  formatDate,
  getNumericValue,
  getStringValue,
  paddedCell
} from "../../utils/formatters"
import type { TransactionQueryRecord } from "../../pages/Home"

type TransactionRow = {
  id: string
  timestamp: string
  type: string
  amount: number
  currency: string
  email: string
  status: "Normal" | "Suspicious"
  record: TransactionQueryRecord
}

type DetailItemProps = {
  label: string
  value: string
}

const DetailItem = ({ label, value }: DetailItemProps) => (
  <Flex flexDirection="column" gap={4}>
    <Paragraph>{label}</Paragraph>
    <strong>{value || "Not available"}</strong>
  </Flex>
)

const maskCardNumber = (value: string) =>
  value.length > 4 ? `•••• ${value.slice(-4)}` : "Not available"

interface TransactionsTablePanelProps {
  submittedEmail: string
  data?: TypedQueryResult<TransactionQueryRecord>
  error?: Error | null
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
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(
    null
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const isClosingDetailRef = useRef(false)

  const transactions = useMemo<TransactionRow[]>(() => {
    const records = Array.isArray(data?.records)
      ? data.records.filter(
          (record): record is TransactionQueryRecord =>
            record !== null && typeof record === "object"
        )
      : []

    return records.map((record: TransactionQueryRecord, index: number) => {
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
        status: amount > suspiciousTradeThreshold ? "Suspicious" : "Normal",
        record
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

  const selectedTransaction = transactions.find(
    (transaction) => transaction.id === activeTransactionId
  )

  const closeTransactionDetails = () => {
    isClosingDetailRef.current = true
    setIsDetailOpen(false)
    window.setTimeout(() => {
      isClosingDetailRef.current = false
    }, 500)
  }

  const handleActiveRowChange = (rowId: string | null) => {
    if (isClosingDetailRef.current) {
      return
    }

    setActiveTransactionId(rowId)
    setIsDetailOpen(rowId !== null)
  }

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
          <div style={{ height: 500 }}>
            <DataTable
              data={filteredTransactions}
              columns={columns}
              fullWidth
              fullHeight
              rowId={(transaction) => transaction.id}
              interactiveRows
              activeRow={isDetailOpen ? activeTransactionId : null}
              onActiveRowChange={handleActiveRowChange}
              sortable>
              <DataTable.EmptyState>
                {selectedTab === "all" &&
                  "No results found. There are no transactions for this user in the selected period."}
                {selectedTab === "deposit" &&
                  "No deposits found. There are no deposits for this user in the selected period."}
                {selectedTab === "withdrawal" &&
                  "No withdrawals found. There are no withdrawals for this user in the selected period."}
                {selectedTab === "suspicious" &&
                  `No suspicious records. There are no transactions above ${formatCurrency(suspiciousTradeThreshold)} for this user.`}
              </DataTable.EmptyState>
              <DataTablePagination
                defaultPageSize={10}
                pageSizeOptions={[10, 20, 50]}
              />
            </DataTable>
          </div>
        </Surface>
      )}

      {isDetailOpen && selectedTransaction && (
        <Drawer
          isDismissed={false}
          onDismiss={closeTransactionDetails}
          placement="right"
          width="50vw"
          aria-label="Transaction details">
          <Flex flexDirection="column" gap={24} padding={24}>
            <Flex alignItems="center" justifyContent="space-between" gap={16}>
              <Flex flexDirection="column" gap={4}>
                <Heading level={2}>Transaction details</Heading>
                <Paragraph>{selectedTransaction.timestamp}</Paragraph>
              </Flex>
              <button
                type="button"
                aria-label="Close transaction details"
                title="Close transaction details"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation()
                  closeTransactionDetails()
                }}
                style={{
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: colors.Theme.Foreground["10"],
                  display: "inline-flex",
                  height: 32,
                  justifyContent: "center",
                  width: 32
                }}>
                <XmarkIcon style={{ color: "currentColor" }} />
              </button>
            </Flex>

            <Flex alignItems="center" gap={8} flexWrap="wrap">
              <Chip
                color={
                  selectedTransaction.status === "Suspicious"
                    ? "critical"
                    : "success"
                }
                variant="accent"
                size="condensed">
                {selectedTransaction.status}
              </Chip>
              <Chip color="neutral" variant="accent" size="condensed">
                {selectedTransaction.type}
              </Chip>
            </Flex>

            <Flex flexDirection="column" gap={12}>
              <Heading level={3}>Transaction overview</Heading>
              <Flex gap={24} flexWrap="wrap">
                <DetailItem
                  label="Amount"
                  value={formatCurrency(selectedTransaction.amount)}
                />
                <DetailItem
                  label="Currency"
                  value={selectedTransaction.currency}
                />
                <DetailItem
                  label="Transaction ID"
                  value={
                    getStringValue(selectedTransaction.record.eventId) ||
                    getStringValue(selectedTransaction.record["event.id"])
                  }
                />
                <DetailItem
                  label="Account ID"
                  value={String(selectedTransaction.record.accountId ?? "")}
                />
              </Flex>
            </Flex>

            <Divider />

            <Flex flexDirection="column" gap={12}>
              <Heading level={3}>Customer and payment</Heading>
              <Flex gap={24} flexWrap="wrap">
                <DetailItem
                  label="Customer"
                  value={getStringValue(selectedTransaction.record.name)}
                />
                <DetailItem label="Email" value={selectedTransaction.email} />
                <DetailItem
                  label="Address"
                  value={getStringValue(selectedTransaction.record.address)}
                />
                <DetailItem
                  label="Card type"
                  value={getStringValue(selectedTransaction.record.cardType)}
                />
                <DetailItem
                  label="Card number"
                  value={maskCardNumber(
                    getStringValue(selectedTransaction.record.cardNumber)
                  )}
                />
              </Flex>
            </Flex>

            <Divider />

            <Flex flexDirection="column" gap={12}>
              <Heading level={3}>Client context</Heading>
              <Flex gap={24} flexWrap="wrap">
                <DetailItem
                  label="Browser"
                  value={[
                    getStringValue(selectedTransaction.record["browser.name"]),
                    getStringValue(
                      selectedTransaction.record["browser.version"]
                    )
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <DetailItem
                  label="Operating system"
                  value={getStringValue(selectedTransaction.record["os.name"])}
                />
                <DetailItem
                  label="Device"
                  value={getStringValue(
                    selectedTransaction.record["device.type"]
                  )}
                />
                <DetailItem
                  label="IP address"
                  value={getStringValue(
                    selectedTransaction.record["client.ip"]
                  )}
                />
                <DetailItem
                  label="Location"
                  value={[
                    getStringValue(selectedTransaction.record["geo.city.name"]),
                    getStringValue(
                      selectedTransaction.record["geo.country.name"]
                    )
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
                <DetailItem
                  label="User agent"
                  value={getStringValue(
                    selectedTransaction.record["browser.user_agent"]
                  )}
                />
              </Flex>
            </Flex>
          </Flex>
        </Drawer>
      )}
    </>
  )
}
