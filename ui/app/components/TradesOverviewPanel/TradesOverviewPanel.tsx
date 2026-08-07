import React, { useState } from "react"
import { useDql } from "@dynatrace-sdk/react-hooks"
import { Button } from "@dynatrace/strato-components/buttons"
import { MessageContainer } from "@dynatrace/strato-components/content"
import { DQLEditor } from "@dynatrace/strato-components/editors"
import { Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Modal } from "@dynatrace/strato-components/overlays"
import { Heading, Paragraph } from "@dynatrace/strato-components/typography"
import colors from "@dynatrace/strato-design-tokens/colors"

import { buildOverviewQuery } from "../../utils/dql-queries"
import { getNumericValue } from "../../utils/formatters"

type OverviewRecord = {
  deposits?: number | string
  withdrawals?: number | string
  suspiciousTrades?: number | string
}

type OverviewMetricProps = {
  label: string
  value: number
  background: string
  valueColor?: string
}

const OverviewMetric = ({
  label,
  value,
  background,
  valueColor
}: OverviewMetricProps) => (
  <Surface
    elevation="flat"
    padding={20}
    style={{
      background,
      flex: "1 1 200px",
      minHeight: 128
    }}>
    <Flex flexDirection="column" gap={8}>
      <Paragraph>{label}</Paragraph>
      <Heading level={2} style={{ color: valueColor }}>
        {value.toLocaleString()}
      </Heading>
    </Flex>
  </Surface>
)

interface TradesOverviewPanelProps {
  suspiciousTradeThreshold: number
  timeframeDays: number
}

export const TradesOverviewPanel = ({
  suspiciousTradeThreshold,
  timeframeDays
}: TradesOverviewPanelProps) => {
  const [isQueryOpen, setIsQueryOpen] = useState(false)
  const overviewQuery = buildOverviewQuery(
    timeframeDays,
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
            <Paragraph>Activity from the last {timeframeDays} days.</Paragraph>
          </Flex>
          <Button
            type="button"
            variant="default"
            onClick={() => setIsQueryOpen(true)}>
            View Query
          </Button>
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
              label="Total deposits"
              value={isLoading ? 0 : deposits}
              background={`linear-gradient(135deg, ${colors.Theme.Primary[20]}, ${colors.Theme.Background[20]})`}
            />
            <OverviewMetric
              label="Total withdrawals"
              value={isLoading ? 0 : withdrawals}
              background={`linear-gradient(135deg, ${colors.Theme.Warning[20]}, ${colors.Theme.Background[20]})`}
            />
            <OverviewMetric
              label="Suspicious trades"
              value={isLoading ? 0 : suspiciousTrades}
              background={`linear-gradient(135deg, ${colors.Theme.Critical[20]}, ${colors.Theme.Background[20]})`}
              valueColor={colors.Theme.Critical[70]}
            />
          </Flex>
        )}
      </Flex>

      {isQueryOpen && (
        <Modal
          title="DQL: EasyTrade overview"
          show
          onDismiss={() => setIsQueryOpen(false)}
          dismissible
          size="large"
          footer={
            <Button
              type="button"
              variant="default"
              onClick={() => setIsQueryOpen(false)}>
              Close
            </Button>
          }>
          <DQLEditor
            aria-label="EasyTrade overview DQL query"
            value={overviewQuery.trim()}
            readOnly
            lineWrap
            size="condensed"
          />
        </Modal>
      )}
    </>
  )
}
