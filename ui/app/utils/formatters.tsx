// ui/app/utils/formatters.ts

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
