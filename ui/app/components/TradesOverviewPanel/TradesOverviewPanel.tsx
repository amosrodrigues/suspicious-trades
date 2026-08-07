import React, { useState } from "react"
import { useDql } from "@dynatrace-sdk/react-hooks"
import { Button } from "@dynatrace/strato-components/buttons"
import { SingleValue } from "@dynatrace/strato-components/charts"
import { MessageContainer } from "@dynatrace/strato-components/content"
import { DQLEditor } from "@dynatrace/strato-components/editors"
import { TimeframeSelector } from "@dynatrace/strato-components/filters"
import { Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Modal } from "@dynatrace/strato-components/overlays"
import { Heading, Paragraph } from "@dynatrace/strato-components/typography"
import colors from "@dynatrace/strato-design-tokens/colors"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CriticalIcon
} from "@dynatrace/strato-icons"

import {
  buildDepositsTotalQuery,
  buildOverviewQuery,
  buildSuspiciousTradesTotalQuery,
  buildWithdrawalsTotalQuery,
  type QueryTimeframe
} from "../../utils/dql-queries"
import { getNumericValue } from "../../utils/formatters"

type OverviewRecord = {
  deposits?: number | string
  withdrawals?: number | string
  suspiciousTrades?: number | string
}

type OverviewMetricProps = {
  icon: React.ReactNode
  label: string
  loading: boolean
  onViewQuery: () => void
  value: number
  background: string
  valueColor: string
}

const OverviewMetric = ({
  icon,
  label,
  loading,
  onViewQuery,
  value,
  background,
  valueColor
}: OverviewMetricProps) => (
  <Surface
    elevation="flat"
    padding={20}
    style={{
      background,
      display: "flex",
      flex: "1 1 200px",
      minHeight: 128
    }}>
    <Flex flexDirection="column" gap={8} style={{ flex: 1 }}>
      <SingleValue
        aria-label={`${label}: ${value.toLocaleString()}`}
        alignment="center"
        color={valueColor}
        data={value}
        height="100%"
        label={label}
        loading={loading}
        prefixIcon={icon}
      />
      <Flex justifyContent="flex-end">
        <Button size="condensed" type="button" onClick={onViewQuery}>
          View query
        </Button>
      </Flex>
    </Flex>
  </Surface>
)

interface TradesOverviewPanelProps {
  suspiciousTradeThreshold: number
  timeframe: QueryTimeframe
  onTimeframeChange: (timeframe: QueryTimeframe) => void
}

export const TradesOverviewPanel = ({
  suspiciousTradeThreshold,
  timeframe,
  onTimeframeChange
}: TradesOverviewPanelProps) => {
  const [activeQuery, setActiveQuery] = useState<{
    query: string
    title: string
  } | null>(null)
  const overviewQuery = buildOverviewQuery(
    timeframe,
    suspiciousTradeThreshold
  )
  const depositsQuery = buildDepositsTotalQuery(timeframe)
  const withdrawalsQuery = buildWithdrawalsTotalQuery(timeframe)
  const suspiciousTradesQuery = buildSuspiciousTradesTotalQuery(
    timeframe,
    suspiciousTradeThreshold
  )
  const { data, error, isLoading } = useDql<OverviewRecord>({
    query: overviewQuery,
    maxResultRecords: 1
  })
  const record = data?.records?.[0]
  const deposits = getNumericValue(record?.deposits)
  const withdrawals = getNumericValue(record?.withdrawals)
  const suspiciousTrades = getNumericValue(record?.suspiciousTrades)

  return (
    <>
      <Flex flexDirection="column" gap={16}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={16}
          flexWrap="wrap">
          <Flex flexDirection="column" gap={4}>
            <Heading level={2}>EasyTrade overview</Heading>
            <Paragraph>Activity in the selected timeframe.</Paragraph>
          </Flex>
          <TimeframeSelector
            aria-label="Analysis timeframe"
            value={timeframe}
            onChange={(value) => {
              if (!value) return
              onTimeframeChange({
                from: value.from.value,
                to: value.to.value
              })
            }}
          />
        </Flex>

        {error ? (
          <MessageContainer variant="critical">
            <MessageContainer.Title>
              Unable to load overview
            </MessageContainer.Title>
            <MessageContainer.Description>
              {error.message}
            </MessageContainer.Description>
          </MessageContainer>
        ) : (
          <Flex gap={16} flexWrap="wrap">
            <OverviewMetric
              icon={<ArrowDownLeftIcon size={32} />}
              label="Total deposits"
              loading={isLoading}
              onViewQuery={() =>
                setActiveQuery({
                  query: depositsQuery,
                  title: "DQL: Total deposits"
                })
              }
              value={deposits}
              background={`linear-gradient(135deg, ${colors.Theme.Success[20]}, ${colors.Theme.Background[20]})`}
              valueColor={colors.Theme.Success[70]}
            />
            <OverviewMetric
              icon={<ArrowUpRightIcon size={32} />}
              label="Total withdrawals"
              loading={isLoading}
              onViewQuery={() =>
                setActiveQuery({
                  query: withdrawalsQuery,
                  title: "DQL: Total withdrawals"
                })
              }
              value={withdrawals}
              background={`linear-gradient(135deg, ${colors.Theme.Warning[20]}, ${colors.Theme.Background[20]})`}
              valueColor={colors.Theme.Warning[70]}
            />
            <OverviewMetric
              icon={<CriticalIcon size={32} />}
              label="Suspicious trades"
              loading={isLoading}
              onViewQuery={() =>
                setActiveQuery({
                  query: suspiciousTradesQuery,
                  title: "DQL: Suspicious trades"
                })
              }
              value={suspiciousTrades}
              background={`linear-gradient(135deg, ${colors.Theme.Critical[20]}, ${colors.Theme.Background[20]})`}
              valueColor={colors.Theme.Critical[70]}
            />
          </Flex>
        )}
      </Flex>

      {activeQuery && (
        <Modal
          title={activeQuery.title}
          show
          onDismiss={() => setActiveQuery(null)}
          dismissible
          size="large"
          footer={
            <Button
              type="button"
              variant="default"
              onClick={() => setActiveQuery(null)}>
              Close
            </Button>
          }>
          <DQLEditor
            aria-label={`${activeQuery.title} query`}
            value={activeQuery.query.trim()}
            readOnly
            lineWrap
            size="condensed"
          />
        </Modal>
      )}
    </>
  )
}
