/**
 * Utility for chunking files into ArrayBuffers using Blob.slice()
 * This approach is memory-efficient as Blob regions are not loaded into RAM
 * until arrayBuffer() is called for the specific chunk.
 */

export async function readChunk(
  file: File | Blob,
  index: number,
  chunkSize: number,
): Promise<ArrayBuffer> {
  const start = index * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const blob = file.slice(start, end);
  return await blob.arrayBuffer();
}

export function calculateTotalChunks(
  fileSize: number,
  chunkSize: number,
): number {
  return Math.ceil(fileSize / chunkSize);
}

// Default chunk size of 256KB is a safe middle ground for WebRTC DataChannels
// across different browsers (Chrome, Firefox, Safari).
export const DEFAULT_CHUNK_SIZE = 256 * 1024;
