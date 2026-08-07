import React from "react"
import { useListDocuments } from "@dynatrace-sdk/react-hooks"
import { Chip, MessageContainer, Skeleton } from "@dynatrace/strato-components/content"
import { Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Heading, Paragraph } from "@dynatrace/strato-components/typography"

const EASYTRADE_DASHBOARDS_FILTER =
  "type = 'dashboard' and name contains 'EasyTrade'"

const getDashboardLink = (documentId: string) =>
  `/ui/apps/dynatrace.dashboards/dashboard/${encodeURIComponent(documentId)}`

const formatLastModified = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value)

export const EasyTradeDashboardsPanel = () => {
  const { data, error, isLoading } = useListDocuments({
    addFields: "description",
    filter: EASYTRADE_DASHBOARDS_FILTER,
    pageSize: 12,
    sort: "-modificationInfo.lastModifiedTime"
  })
  const dashboards = data?.documents ?? []

  return (
    <Surface elevation="raised" padding={24} style={{ borderRadius: 18 }}>
      <Flex flexDirection="column" gap={16}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={12}
          flexWrap="wrap">
          <Flex flexDirection="column" gap={4}>
            <Heading level={2}>Ready-made EasyTrade dashboards</Heading>
            <Paragraph>
              Dashboards available to you with “EasyTrade” in the title.
            </Paragraph>
          </Flex>
          {!isLoading && (
            <Chip color="neutral" variant="accent" size="condensed">
              {data?.totalCount ?? 0} dashboards
            </Chip>
          )}
        </Flex>

        {isLoading && (
          <div
            aria-label="Loading EasyTrade dashboards"
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
            }}>
            {[0, 1, 2].map((index) => (
              <Skeleton height={144} key={index} variant="rounded" />
            ))}
          </div>
        )}

        {error && (
          <MessageContainer variant="warning">
            <MessageContainer.Title>
              Unable to load EasyTrade dashboards
            </MessageContainer.Title>
            <MessageContainer.Description>
              {error.message}
            </MessageContainer.Description>
          </MessageContainer>
        )}

        {!isLoading && !error && dashboards.length === 0 && (
          <MessageContainer variant="neutral">
            <MessageContainer.Title>No dashboards found</MessageContainer.Title>
            <MessageContainer.Description>
              There are no accessible dashboards with “EasyTrade” in the title.
            </MessageContainer.Description>
          </MessageContainer>
        )}

        {!isLoading && !error && dashboards.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
            }}>
            {dashboards.map((dashboard) => (
              <Surface
                aria-label={`Open dashboard ${dashboard.name}`}
                as="a"
                elevation="flat"
                href={getDashboardLink(dashboard.id)}
                key={dashboard.id}
                padding={16}
                style={{
                  color: "inherit",
                  cursor: "pointer",
                  minHeight: 144,
                  textDecoration: "none"
                }}>
                <Flex flexDirection="column" gap={8}>
                  <Chip color="primary" variant="accent" size="condensed">
                    Dashboard
                  </Chip>
                  <Heading level={3}>{dashboard.name}</Heading>
                  <Paragraph>
                    {dashboard.description || "No description available."}
                  </Paragraph>
                  <Paragraph>
                    Last updated {formatLastModified(dashboard.modificationInfo.lastModifiedTime)}
                  </Paragraph>
                </Flex>
              </Surface>
            ))}
          </div>
        )}
      </Flex>
    </Surface>
  )
}
