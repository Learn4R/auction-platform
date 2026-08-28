import crypto from 'node:crypto'
import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'item-images'

function normalizeSupabaseUrl(raw: string): string {
  const match = raw.match(/^(https:\/\/[a-z0-9-]+\.supabase\.co)/i)
  return match ? match[1] : raw.replace(/\/rest\/v1\/?$/, '')
}

let client: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!client) {
    const rawUrl = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!rawUrl || !key) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
    }
    client = createClient(normalizeSupabaseUrl(rawUrl), key)
  }
  return client
}

export async function ensureItemImagesBucket() {
  const supabase = getSupabase()
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error
  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (createError) throw createError
    console.log(`Created Supabase storage bucket "${BUCKET}"`)
  }
}

export interface UploadedImage {
  path: string
  url: string
}

export async function uploadItemImage(buffer: Buffer, mimetype: string, originalName: string): Promise<UploadedImage> {
  const supabase = getSupabase()
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: mimetype, upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { path, url: data.publicUrl }
}

export async function deleteItemImages(paths: string[]) {
  if (paths.length === 0) return
  const supabase = getSupabase()
  await supabase.storage.from(BUCKET).remove(paths)
}

export function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}
