export const dynamic = 'force-dynamic'

const startedAt = Date.now()

export function GET() {
  return Response.json({
    ok: true,
    service: 'admin',
    externalCms: false,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startedAt) / 1000),
  })
}
