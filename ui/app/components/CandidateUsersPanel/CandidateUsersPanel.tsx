import React, { useMemo, useState } from "react"
import { useDql } from "@dynatrace-sdk/react-hooks"
import { Button } from "@dynatrace/strato-components/buttons"
import { MessageContainer } from "@dynatrace/strato-components/content"
import {
  DataTable,
  DataTablePagination,
  type DataTableColumnDef
} from "@dynatrace/strato-components/tables"
import { Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Heading, Paragraph } from "@dynatrace/strato-components/typography"
import {
  formatCurrency,
  getNumericValue,
  getStringValue,
  paddedCell
} from "../../utils/formatters"
import { buildCandidateUsersQuery } from "../../utils/dql-queries"

type CandidateQueryRecord = {
  email?: string
  suspiciousTradeCount?: number | string
}

type CandidateUserRow = {
  id: string
  email: string
  suspiciousTradeCount: number
}

interface CandidateUsersPanelProps {
  suspiciousTradeThreshold: number
  queryTimeframeDays: number
  onSearch: (email: string) => void
}

export const CandidateUsersPanel = ({
  suspiciousTradeThreshold,
  queryTimeframeDays,
  onSearch
}: CandidateUsersPanelProps) => {
  const [showCandidateUsers, setShowCandidateUsers] = useState(false)

  const candidateQuery = buildCandidateUsersQuery(
    queryTimeframeDays,
    suspiciousTradeThreshold
  )

  const {
    data: candidateData,
    error: candidateError,
    isLoading: isCandidateLoading
  } = useDql<CandidateQueryRecord>(
    { query: candidateQuery, maxResultRecords: 5000 },
    { enabled: showCandidateUsers }
  )

  const candidateUsers = useMemo<CandidateUserRow[]>(() => {
    const records = Array.isArray(candidateData?.records)
      ? candidateData.records.filter(
          (record): record is CandidateQueryRecord =>
            record !== null && typeof record === "object"
        )
      : []
    return records
      .map((record) => ({
        id: getStringValue(record.email).trim().toLowerCase(),
        email: getStringValue(record.email).trim().toLowerCase(),
        suspiciousTradeCount: getNumericValue(record.suspiciousTradeCount)
      }))
      .filter((record) => Boolean(record.email))
      .sort((a, b) => b.suspiciousTradeCount - a.suspiciousTradeCount)
      .slice(0, 20)
  }, [candidateData?.records])

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

  const columns = useMemo<DataTableColumnDef<CandidateUserRow>[]>(
    () => [
      {
        id: "email",
        header: "User Email",
        accessor: "email",
        width: "content",
        cell: ({ value }) => (
          <Button
            type="button"
            variant="default"
            color="primary"
            onClick={() => onSearch(String(value ?? ""))}>
            {String(value ?? "")}
          </Button>
        )
      },
      {
        id: "count",
        header: "Suspicious Trades",
        accessor: "suspiciousTradeCount",
        width: "content",
        sortType: "number",
        cell: ({ value }) => paddedCell(value)
      }
    ],
    [onSearch]
  )

  return (
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
          Search globally for EasyTrade users with transactions over{" "}
          {formatCurrency(suspiciousTradeThreshold)} in the last{" "}
          {queryTimeframeDays} days. Use an email from this list for testing.
        </Paragraph>

        {isCandidateLoading && (
          <MessageContainer variant="primary">
            <MessageContainer.Title>Loading candidates</MessageContainer.Title>
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
                  Try this email for testing:{" "}
                  <strong>{candidateExampleEmail}</strong>
                </Paragraph>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => void copyExampleEmailToClipboard()}>
                  Copy email
                </Button>
                {copyMessage && <Paragraph>{copyMessage}</Paragraph>}
              </Flex>
            ) : (
              <MessageContainer variant="neutral">
                <MessageContainer.Title>
                  No candidates found
                </MessageContainer.Title>
                <MessageContainer.Description>
                  There are no users with transactions above{" "}
                  {formatCurrency(suspiciousTradeThreshold)} in the last{" "}
                  {queryTimeframeDays} days.
                </MessageContainer.Description>
              </MessageContainer>
            )}

            <div style={{ height: 360 }}>
              <DataTable
                data={candidateUsers}
                columns={columns}
                fullWidth
                fullHeight
                sortable>
                <DataTable.EmptyState>
                  No suspicious user candidates found.
                </DataTable.EmptyState>
                <DataTablePagination
                  defaultPageSize={5}
                  pageSizeOptions={[5, 10, 20]}
                />
              </DataTable>
            </div>
          </>
        )}
      </Flex>
    </Surface>
  )
}
