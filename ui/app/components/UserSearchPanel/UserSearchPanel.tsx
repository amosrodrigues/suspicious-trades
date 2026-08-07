import React, { useState } from "react"
import { Button } from "@dynatrace/strato-components/buttons"
import { TextInput } from "@dynatrace/strato-components/forms"
import { Flex, Surface } from "@dynatrace/strato-components/layouts"
import { Heading, Paragraph } from "@dynatrace/strato-components/typography"
import { formatCurrency } from "../../utils/formatters"

interface UserSearchPanelProps {
  suspiciousTradeThreshold: number
  queryTimeframeDays: number
  onSearch: (email: string) => void
}

export const UserSearchPanel = ({
  suspiciousTradeThreshold,
  queryTimeframeDays,
  onSearch
}: UserSearchPanelProps) => {
  const [email, setEmail] = useState("")

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      return
    }
    onSearch(normalizedEmail)
  }

  return (
    <Surface elevation="raised" padding={24} style={{ borderRadius: 18 }}>
      <Flex flexDirection="column" gap={12}>
        <Heading level={1}>Suspicious Trade Checker</Heading>
        <Paragraph>
          Search EasyTrade users by email and review deposits and withdrawals
          from the last {queryTimeframeDays} days. Trades over{" "}
          {formatCurrency(suspiciousTradeThreshold)} are flagged as suspicious.
        </Paragraph>
      </Flex>

      <form onSubmit={handleSearch}>
        <Flex gap={12} alignItems="center" flexWrap="wrap" paddingTop={20}>
          <div style={{ flex: "0 1 420px", maxWidth: 420, width: "100%" }}>
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
  )
}
