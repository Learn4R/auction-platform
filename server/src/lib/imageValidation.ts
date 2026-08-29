// A client can lie about Content-Type/mimetype (e.g. an SVG renamed to
// "photo.jpg" with a forged image/jpeg header), but it can't easily fake the
// actual byte signature ("magic bytes") a genuine image file starts with.
// This sniffs the real format from the file's own bytes, independent of
// whatever the upload declared. SVG is deliberately never matched here —
// it's XML/text, not a binary raster format, and can carry a <script>.

function matchesBytes(buffer: Buffer, signature: number[], offset = 0): boolean {
  if (buffer.length < offset + signature.length) return false
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false
  }
  return true
}

function isWebp(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
}

const RASTER_SIGNATURES: number[][] = [
  [0xff, 0xd8, 0xff], // JPEG
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  [0x47, 0x49, 0x46, 0x38], // GIF ("GIF8", covers 87a and 89a)
]

export function isGenuineImage(buffer: Buffer): boolean {
  return isWebp(buffer) || RASTER_SIGNATURES.some((sig) => matchesBytes(buffer, sig))
}
