import 'server-only'

import type { IntegrationRegistryItem } from './registry'

export interface IntegrationEnvState {
  configured: number
  missingRequired: string[]
  totalRequired: number
  vars: {
    configured: boolean
    label: string
    maskedValue: string | null
    name: string
    public: boolean
    required: boolean
    secret: boolean
  }[]
}

export function envValue(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export function maskValue(value: string | null, secret = false): string | null {
  if (!value) return null
  if (!secret && value.length <= 12) return value
  if (!secret) return `${value.slice(0, 6)}...${value.slice(-4)}`
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 3)}••••${value.slice(-3)}`
}

export function envStateForIntegration(integration: IntegrationRegistryItem): IntegrationEnvState {
  const vars = integration.envVars.map((item) => {
    const value = envValue(item.name)
    return {
      configured: Boolean(value),
      label: item.label,
      maskedValue: maskValue(value, item.secret),
      name: item.name,
      public: Boolean(item.public),
      required: Boolean(item.required),
      secret: Boolean(item.secret),
    }
  })

  const required = vars.filter((item) => item.required)
  return {
    configured: required.filter((item) => item.configured).length,
    missingRequired: required.filter((item) => !item.configured).map((item) => item.name),
    totalRequired: required.length,
    vars,
  }
}

export function integrationHasRequiredEnv(integration: IntegrationRegistryItem): boolean {
  return envStateForIntegration(integration).missingRequired.length === 0
}
