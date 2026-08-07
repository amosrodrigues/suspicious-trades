import React, { useEffect, useMemo, useRef, useState } from "react"
import { useAppFunction, type TypedQueryResult } from "@dynatrace-sdk/react-hooks"
import { Chip, MessageContainer } from "@dynatrace/strato-components/content"
import {
  DataTable,
  DataTablePagination,
  type DataTableColumnDef
} from "@dynatrace/strato-components/tables"
import {
  Divider,
  Flex,
  PageLayout,
  Surface
} from "@dynatrace/strato-components/layouts"
import {
  ExternalLink,
  Heading,
  Paragraph
} from "@dynatrace/strato-components/typography"
import { Tab, Tabs } from "@dynatrace/strato-components/navigation"
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

type Coordinates = {
  latitude: number
  longitude: number
}

const MAP_ZOOM = 10
const MIN_MAP_ZOOM = 3
const MAX_MAP_ZOOM = 16
const TILE_SIZE = 256
const MAP_WIDTH = TILE_SIZE * 3
const MAP_HEIGHT = TILE_SIZE * 2

const DetailItem = ({ label, value }: DetailItemProps) => (
  <Flex flexDirection="column" gap={4} style={{ minWidth: 140 }}>
    <Paragraph>{label}</Paragraph>
    <strong>{value || "Not available"}</strong>
  </Flex>
)

const maskCardNumber = (value: string) =>
  value.length > 4 ? `•••• ${value.slice(-4)}` : "Not available"

const getLocationQuery = (city: string, country: string) =>
  [city, country].filter(Boolean).join(", ")

const getTilePosition = ({ latitude, longitude }: Coordinates, zoom: number) => {
  const tileCount = 2 ** zoom
  const latitudeInRadians = (latitude * Math.PI) / 180
  const x = ((longitude + 180) / 360) * tileCount
  const y =
    ((1 - Math.asinh(Math.tan(latitudeInRadians)) / Math.PI) / 2) *
    tileCount

  return { x, y, tileCount }
}

const getCoordinatesFromTilePosition = (
  x: number,
  y: number,
  zoom: number
): Coordinates => {
  const tileCount = 2 ** zoom
  const wrappedX = ((x % tileCount) + tileCount) % tileCount
  const clampedY = Math.min(Math.max(y, 0), tileCount)

  return {
    latitude:
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * clampedY) / tileCount))) *
        180) /
      Math.PI,
    longitude: (wrappedX / tileCount) * 360 - 180
  }
}

type DragStart = {
  clientX: number
  clientY: number
  center: Coordinates
}

const MapPreview = ({ coordinates }: { coordinates: Coordinates }) => {
  const [center, setCenter] = useState(coordinates)
  const [zoom, setZoom] = useState(MAP_ZOOM)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<DragStart | null>(null)
  const { x: centerX, y: centerY, tileCount } = getTilePosition(center, zoom)
  const { x: markerX, y: markerY } = getTilePosition(coordinates, zoom)
  const centerTileX = Math.floor(centerX)
  const centerTileY = Math.floor(centerY)
  const tiles = [-2, -1, 0, 1, 2].flatMap((row) =>
    [-2, -1, 0, 1, 2].map((column) => {
      const tileX = (centerTileX + column + tileCount) % tileCount
      const tileY = Math.min(Math.max(centerTileY + row, 0), tileCount - 1)

      return {
        id: `${zoom}-${tileX}-${tileY}`,
        left: 50 + ((centerTileX + column - centerX) * TILE_SIZE * 100) / MAP_WIDTH,
        top: 50 + ((centerTileY + row - centerY) * TILE_SIZE * 100) / MAP_HEIGHT,
        url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`
      }
    })
  )
  const markerLeft = 50 + ((markerX - centerX) * TILE_SIZE * 100) / MAP_WIDTH
  const markerTop = 50 + ((markerY - centerY) * TILE_SIZE * 100) / MAP_HEIGHT

  useEffect(() => {
    setCenter(coordinates)
    setZoom(MAP_ZOOM)
  }, [coordinates])

  const adjustZoom = (amount: number) => {
    setZoom((currentZoom) =>
      Math.min(Math.max(currentZoom + amount, MIN_MAP_ZOOM), MAX_MAP_ZOOM)
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      center
    }
    setIsDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current
    if (!dragStart) return

    const startPosition = getTilePosition(dragStart.center, zoom)
    const deltaX = ((event.clientX - dragStart.clientX) * MAP_WIDTH) / event.currentTarget.clientWidth
    const deltaY = ((event.clientY - dragStart.clientY) * MAP_HEIGHT) / event.currentTarget.clientHeight
    setCenter(
      getCoordinatesFromTilePosition(
        startPosition.x - deltaX / TILE_SIZE,
        startPosition.y - deltaY / TILE_SIZE,
        zoom
      )
    )
  }

  const stopDragging = () => {
    dragStartRef.current = null
    setIsDragging(false)
  }

  return (
    <Flex flexDirection="column" gap={8}>
      <Flex gap={8}>
        <button
          aria-label="Zoom in"
          disabled={zoom === MAX_MAP_ZOOM}
          onClick={() => adjustZoom(1)}
          type="button">
          +
        </button>
        <button
          aria-label="Zoom out"
          disabled={zoom === MIN_MAP_ZOOM}
          onClick={() => adjustZoom(-1)}
          type="button">
          −
        </button>
        <Paragraph>Scroll to zoom or drag to pan</Paragraph>
      </Flex>
      <div
        aria-label="Map showing the transaction location"
        onPointerCancel={stopDragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onWheel={(event) => {
          event.preventDefault()
          adjustZoom(event.deltaY < 0 ? 1 : -1)
        }}
        role="application"
        style={{
          background: "#e6e6e6",
          aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
          cursor: isDragging ? "grabbing" : "grab",
          overflow: "hidden",
          position: "relative",
          touchAction: "none",
          userSelect: "none",
          width: "100%"
        }}>
        {tiles.map((tile) => (
          <img
            alt=""
            height={TILE_SIZE}
            key={tile.id}
            src={tile.url}
            width={TILE_SIZE}
            style={{
              height: `${(TILE_SIZE * 100) / MAP_HEIGHT}%`,
              left: `${tile.left}%`,
              maxWidth: "none",
              pointerEvents: "none",
              position: "absolute",
              top: `${tile.top}%`,
              transform: "translate(-50%, -50%)",
              width: `${(TILE_SIZE * 100) / MAP_WIDTH}%`
            }}
          />
        ))}
        <span
          aria-hidden="true"
          style={{
            background: colors.Theme.Critical["70"],
            border: "2px solid white",
            borderRadius: "50% 50% 50% 0",
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.45)",
            height: 18,
            left: `${markerLeft}%`,
            position: "absolute",
            pointerEvents: "none",
            top: `${markerTop}%`,
            transform: "translate(-50%, -100%) rotate(-45deg)",
            width: 18
          }}
        />
      </div>
      <Paragraph>
        Map data ©{" "}
        <ExternalLink href="https://www.openstreetmap.org/copyright">
          OpenStreetMap contributors
        </ExternalLink>
      </Paragraph>
    </Flex>
  )
}

const LocationTab = ({
  city,
  country,
  ipAddress
}: {
  city: string
  country: string
  ipAddress: string
}) => {
  const locationQuery = getLocationQuery(city, country)
  const { data: coordinates, error, isLoading } = useAppFunction<Coordinates | null>(
    {
      name: "geo-location",
      data: { city, country }
    },
    {
      autoFetch: Boolean(locationQuery),
      autoFetchOnUpdate: true
    }
  )

  return (
    <Flex flexDirection="column" gap={16} paddingTop={16}>
      <Flex gap={24} flexWrap="wrap">
        <DetailItem label="City" value={city} />
        <DetailItem label="Country" value={country} />
        <DetailItem label="IP address" value={ipAddress} />
      </Flex>

      {!locationQuery && (
        <MessageContainer variant="neutral">
          <MessageContainer.Title>Location unavailable</MessageContainer.Title>
          <MessageContainer.Description>
            The transaction does not include a city or country for mapping.
          </MessageContainer.Description>
        </MessageContainer>
      )}

      {isLoading && <Paragraph>Loading map location...</Paragraph>}

      {error && locationQuery && (
        <MessageContainer variant="warning">
          <MessageContainer.Title>Map unavailable</MessageContainer.Title>
          <MessageContainer.Description>{error.message}</MessageContainer.Description>
        </MessageContainer>
      )}

      {locationQuery && !isLoading && !error && coordinates === null && (
        <MessageContainer variant="neutral">
          <MessageContainer.Title>Coordinates unavailable</MessageContainer.Title>
          <MessageContainer.Description>
            OpenStreetMap did not return coordinates for this location.
          </MessageContainer.Description>
        </MessageContainer>
      )}

      {coordinates && <MapPreview coordinates={coordinates} />}
    </Flex>
  )
}

interface TransactionsTablePanelProps {
  submittedEmail: string
  data?: TypedQueryResult<TransactionQueryRecord>
  error?: Error | null
  isLoading: boolean
  suspiciousTradeThreshold: number
}

export const TransactionsTablePanel = ({
  submittedEmail,
  data,
  error,
  isLoading,
  suspiciousTradeThreshold
}: TransactionsTablePanelProps) => {
  const [selectedTab, setSelectedTab] = useState<
    "all" | "deposit" | "withdrawal" | "suspicious"
  >("all")
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(
    null
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const transactions = useMemo<TransactionRow[]>(() => {
    const records = Array.isArray(data?.records)
      ? data.records.filter(
          (record): record is TransactionQueryRecord =>
            record !== null && typeof record === "object"
        )
      : []

    return records.map((record, index) => {
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
      const amount = getNumericValue(record.amount ?? record.event_amount)
      const rawTimestamp = getStringValue(record.timestamp)

      return {
        id: `${rawTimestamp}-${rawType}-${index}`,
        timestamp: formatDate(rawTimestamp),
        type: rawType,
        amount,
        currency: getStringValue(record.currency, "USD"),
        email: getStringValue(record.email),
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

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (selectedTab === "deposit") return transaction.type === "Deposit"
        if (selectedTab === "withdrawal") return transaction.type === "Withdrawal"
        if (selectedTab === "suspicious") return transaction.status === "Suspicious"
        return true
      }),
    [selectedTab, transactions]
  )

  const selectedTransaction = transactions.find(
    (transaction) => transaction.id === activeTransactionId
  )

  const closeTransactionDetails = () => {
    setIsDetailOpen(false)
    setActiveTransactionId(null)
  }

  const handleActiveRowChange = (rowId: string | null) => {
    setActiveTransactionId(rowId)
    setIsDetailOpen(rowId !== null)
  }

  const columns = useMemo<DataTableColumnDef<TransactionRow>[]>(
    () => [
      { id: "timestamp", header: "Date", accessor: "timestamp", width: "content", cell: ({ value }) => paddedCell(value) },
      { id: "type", header: "Type", accessor: "type", width: "content", cell: ({ value }) => paddedCell(value) },
      { id: "amount", header: "Amount", accessor: "amount", width: "content", sortType: "number", cell: ({ value }) => paddedCell(formatCurrency(Number(value ?? 0))) },
      { id: "currency", header: "Currency", accessor: "currency", width: "content", cell: ({ value }) => paddedCell(value) },
      { id: "email", header: "User Email", accessor: "email", width: "content", cell: ({ value }) => paddedCell(value) },
      {
        id: "status", header: "Status", accessor: "status", width: "content",
        cell: ({ rowData }) => (
          <div style={{ padding: "10px 12px" }}>
            <Chip color={rowData.status === "Suspicious" ? "critical" : "success"} variant="accent" size="condensed">
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
          <MessageContainer.Description>Fetching results for the requested user email.</MessageContainer.Description>
        </MessageContainer>
      )}
      {error && (
        <MessageContainer variant="critical">
          <MessageContainer.Title>Query error</MessageContainer.Title>
          <MessageContainer.Description>{error.message}</MessageContainer.Description>
        </MessageContainer>
      )}
      {submittedEmail && !isLoading && !error && (
        <Surface elevation="flat" padding={24} style={{ borderRadius: 16 }}>
          <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={12}>
            <Paragraph>Results for <strong>{submittedEmail}</strong> in the selected timeframe.</Paragraph>
            <Flex gap={8} flexWrap="wrap">
              <Chip color="neutral" variant="accent" size="condensed">{totalCount} trades</Chip>
              <Chip color="critical" variant="accent" size="condensed">{suspiciousCount} suspicious</Chip>
            </Flex>
          </Flex>
          <Divider />
          <Tabs selectedIndex={["all", "deposit", "withdrawal", "suspicious"].indexOf(selectedTab)} onChange={(index) => setSelectedTab(["all", "deposit", "withdrawal", "suspicious"][index] as typeof selectedTab)}>
            <Tab title={`All (${totalCount})`}>{null}</Tab>
            <Tab title={`Deposits (${depositCount})`}>{null}</Tab>
            <Tab title={`Withdrawals (${withdrawalCount})`}>{null}</Tab>
            <Tab title={`Suspicious (${suspiciousCount})`}>{null}</Tab>
          </Tabs>
          <div style={{ height: 500 }}>
            <DataTable data={filteredTransactions} columns={columns} fullWidth fullHeight rowId={(transaction) => transaction.id} interactiveRows activeRow={isDetailOpen ? activeTransactionId : null} onActiveRowChange={handleActiveRowChange} sortable>
              <DataTable.EmptyState>
                {selectedTab === "all" && "No results found. There are no transactions for this user in the selected period."}
                {selectedTab === "deposit" && "No deposits found. There are no deposits for this user in the selected period."}
                {selectedTab === "withdrawal" && "No withdrawals found. There are no withdrawals for this user in the selected period."}
                {selectedTab === "suspicious" && `No suspicious records. There are no transactions above ${formatCurrency(suspiciousTradeThreshold)} for this user.`}
              </DataTable.EmptyState>
              <DataTablePagination defaultPageSize={10} pageSizeOptions={[10, 20, 50]} />
            </DataTable>
          </div>
        </Surface>
      )}
      <PageLayout.Details
        aria-label="Transaction details"
        collapsed={!isDetailOpen || !selectedTransaction}
        defaultLayout="overlay"
        defaultWidth="50%"
        label="Resize transaction details"
        maxWidth="70%"
        minWidth={320}
        onCollapsedChange={(collapsed) => {
          if (collapsed) closeTransactionDetails()
        }}
        position="end">
        {selectedTransaction && (
          <Flex flexDirection="column" gap={24} padding={24}>
            <Flex alignItems="center" gap={16}>
              <Flex flexDirection="column" gap={4}>
                <Heading level={2}>Transaction details</Heading>
                <Paragraph>{selectedTransaction.timestamp}</Paragraph>
              </Flex>
              <PageLayout.Details.ControlBar aria-label="Transaction detail controls" />
            </Flex>
            <Flex alignItems="center" gap={8} flexWrap="wrap">
              <Chip color={selectedTransaction.status === "Suspicious" ? "critical" : "success"} variant="accent" size="condensed">{selectedTransaction.status}</Chip>
              <Chip color="neutral" variant="accent" size="condensed">{selectedTransaction.type}</Chip>
            </Flex>
            <Tabs defaultIndex={0}>
              <Tab title="Details">
                <Flex flexDirection="column" gap={24} paddingTop={16}>
                  <Flex flexDirection="column" gap={12}>
                    <Heading level={3}>Transaction overview</Heading>
                    <Flex gap={24} flexWrap="wrap">
                      <DetailItem label="Amount" value={formatCurrency(selectedTransaction.amount)} />
                      <DetailItem label="Currency" value={selectedTransaction.currency} />
                      <DetailItem label="Transaction ID" value={getStringValue(selectedTransaction.record.eventId) || getStringValue(selectedTransaction.record["event.id"])} />
                      <DetailItem label="Account ID" value={String(selectedTransaction.record.accountId ?? "")} />
                    </Flex>
                  </Flex>
                  <Divider />
                  <Flex flexDirection="column" gap={12}>
                    <Heading level={3}>Customer and payment</Heading>
                    <Flex gap={24} flexWrap="wrap">
                      <DetailItem label="Customer" value={getStringValue(selectedTransaction.record.name)} />
                      <DetailItem label="Email" value={selectedTransaction.email} />
                      <DetailItem label="Address" value={getStringValue(selectedTransaction.record.address)} />
                      <DetailItem label="Card type" value={getStringValue(selectedTransaction.record.cardType)} />
                      <DetailItem label="Card number" value={maskCardNumber(getStringValue(selectedTransaction.record.cardNumber))} />
                    </Flex>
                  </Flex>
                  <Divider />
                  <Flex flexDirection="column" gap={12}>
                    <Heading level={3}>Client context</Heading>
                    <Flex gap={24} flexWrap="wrap">
                      <DetailItem label="Browser" value={[getStringValue(selectedTransaction.record["browser.name"]), getStringValue(selectedTransaction.record["browser.version"])].filter(Boolean).join(" ")} />
                      <DetailItem label="Operating system" value={getStringValue(selectedTransaction.record["os.name"])} />
                      <DetailItem label="Device" value={getStringValue(selectedTransaction.record["device.type"])} />
                      <DetailItem label="User agent" value={getStringValue(selectedTransaction.record["browser.user_agent"])} />
                    </Flex>
                  </Flex>
                </Flex>
              </Tab>
              <Tab title="Location">
                <LocationTab city={getStringValue(selectedTransaction.record["geo.city.name"])} country={getStringValue(selectedTransaction.record["geo.country.name"])} ipAddress={getStringValue(selectedTransaction.record["client.ip"])} />
              </Tab>
            </Tabs>
          </Flex>
        )}
      </PageLayout.Details>
    </>
  )
}
