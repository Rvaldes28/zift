import 'server-only'

import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawn } from 'child_process'

import { backupFilename } from './config'

function adminDatabaseUrl(): string {
  return process.env.ADMIN_DATABASE_URL?.trim() || 'postgresql://localhost:5432/ziftlab_admin_dev'
}

function commandError(command: string, stderr: string): Error {
  return new Error(`${command} failed${stderr ? `: ${stderr.slice(0, 1200)}` : ''}`)
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(commandError(command, stderr))
    })
  })
}

export async function createDatabaseDump(backupId: string): Promise<{
  body: Buffer
  filename: string
}> {
  const dir = await mkdtemp(join(tmpdir(), 'ziftlab-db-backup-'))
  const filename = backupFilename('database', backupId, 'dump')
  const outputPath = join(dir, filename)

  try {
    await runCommand('pg_dump', [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--file',
      outputPath,
      adminDatabaseUrl(),
    ])

    return {
      body: await readFile(outputPath),
      filename,
    }
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

export async function restoreDatabaseDump(body: Buffer): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'ziftlab-db-restore-'))
  const inputPath = join(dir, 'restore.dump')

  try {
    await writeFile(inputPath, body)
    await runCommand('pg_restore', [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      '--dbname',
      adminDatabaseUrl(),
      inputPath,
    ])
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}
