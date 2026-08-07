// ui/app/utils/formatters.tsx

import React from "react"

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value)

export const formatDate = (value: string) => {
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

export const paddedCell = (value: unknown) => {
  let text = ""

  if (value === null || value === undefined) {
    text = ""
  } else if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    text = String(value)
  } else {
    text = JSON.stringify(value)
  }
  return <div style={{ padding: "10px 12px" }}>{text}</div>
}

export const getStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback

// Grail can serialize numeric aggregates (e.g. count()) as strings to avoid precision loss
export const getNumericValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }

    // Supports locale-formatted numbers such as "1.294,00".
    const localeParsed = Number(value.replace(/\./g, "").replace(",", "."))
    return Number.isFinite(localeParsed) ? localeParsed : 0
  }

  return 0
}
