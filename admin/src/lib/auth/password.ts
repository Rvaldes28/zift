import 'server-only'

import argon2 from 'argon2'

import { authConfig } from './config'

export async function hashPassword(password: string): Promise<string> {
  const config = authConfig()

  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: config.argon2Memory,
    timeCost: config.argon2Time,
    parallelism: config.argon2Parallelism,
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}
