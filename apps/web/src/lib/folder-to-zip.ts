// Lazy-init the WASM module once — subsequent calls reuse the cached Promise
import init, { zip_files } from "@/wasm/zip/zip_wasm";
const wasmReady = init();

// ── FileSystem Entry API helpers ──

function readEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

/** Drains a directory reader — browsers return ≤100 entries per call */
async function readAllEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  while (true) {
    const batch = await readEntries(reader);
    if (batch.length === 0) break;
    all.push(...batch);
  }
  return all;
}

function entryToFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

// ── Recursive walker ──

async function collectFiles(
  entry: FileSystemEntry,
  basePath: string,
  out: Map<string, File>,
): Promise<void> {
  if (entry.isFile) {
    const file = await entryToFile(entry as FileSystemFileEntry);
    out.set(basePath + entry.name, file);
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const children = await readAllEntries(reader);
    await Promise.all(
      children.map((child) =>
        collectFiles(child, basePath + entry.name + "/", out),
      ),
    );
  }
}

// ── Public API ──

export interface ZipProgress {
  filesProcessed: number;
  totalFiles: number;
}

/**
 * Zips a `FileSystemDirectoryEntry` using the Rust WASM zip module.
 * @returns A `File` named `<folderName>.zip`
 */
export async function folderToZip(
  entry: FileSystemDirectoryEntry,
  onProgress?: (p: ZipProgress) => void,
): Promise<File> {
  await wasmReady;

  // 1. Walk folder tree
  const fileMap = new Map<string, File>();
  await collectFiles(entry, "", fileMap);
  const totalFiles = fileMap.size;
  let filesProcessed = 0;

  // 2. Read each file into a Uint8Array
  const paths: string[] = [];
  const chunks: Uint8Array[] = [];

  for (const [path, file] of fileMap) {
    const buffer = await file.arrayBuffer();
    paths.push(path);
    chunks.push(new Uint8Array(buffer));
    filesProcessed++;
    onProgress?.({ filesProcessed, totalFiles });
  }

  // 3. Zip via Rust WASM
  const zipBytes = zip_files(paths, chunks);

  return new File([zipBytes.buffer as ArrayBuffer], `${entry.name}.zip`, {
    type: "application/zip",
  });
}

/**
 * Walks a `FileSystemDirectoryHandle` (from `showDirectoryPicker()`) recursively
 * and collects all files into the map with their relative paths.
 */
async function collectFromHandle(
  handle: FileSystemDirectoryHandle,
  basePath: string,
  out: Map<string, File>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [name, child] of (handle as any).entries()) {
    if (child.kind === "file") {
      const file = await (child as FileSystemFileHandle).getFile();
      out.set(basePath + name, file);
    } else if (child.kind === "directory") {
      await collectFromHandle(
        child as FileSystemDirectoryHandle,
        basePath + name + "/",
        out,
      );
    }
  }
}

/**
 * Zips a `FileSystemDirectoryHandle` (returned by `window.showDirectoryPicker()`)
 * using the Rust WASM module. No browser confirm dialog — this is the modern path.
 */
export async function dirHandleToZip(
  handle: FileSystemDirectoryHandle,
  onProgress?: (p: ZipProgress) => void,
): Promise<File> {
  await wasmReady;

  const fileMap = new Map<string, File>();
  await collectFromHandle(handle, "", fileMap);

  const totalFiles = fileMap.size;
  let filesProcessed = 0;

  const paths: string[] = [];
  const chunks: Uint8Array[] = [];

  for (const [path, file] of fileMap) {
    const buffer = await file.arrayBuffer();
    paths.push(path);
    chunks.push(new Uint8Array(buffer));
    filesProcessed++;
    onProgress?.({ filesProcessed, totalFiles });
  }

  const zipBytes = zip_files(paths, chunks);
  return new File([zipBytes.buffer as ArrayBuffer], `${handle.name}.zip`, {
    type: "application/zip",
  });
}

/**
 * Given a DataTransfer from a drag event, returns:
 *  - the raw File if a single file was dropped
 *  - a FileSystemDirectoryEntry if a folder was dropped
 *  - null if nothing usable was dropped
 */
export function extractDroppedItem(
  dataTransfer: DataTransfer,
): File | FileSystemDirectoryEntry | null {
  const item = dataTransfer.items[0];
  if (!item) return null;

  const entry = item.webkitGetAsEntry();
  if (!entry) return dataTransfer.files[0] ?? null;

  if (entry.isDirectory) return entry as FileSystemDirectoryEntry;
  return dataTransfer.files[0] ?? null;
}

/**
 * Zips an array of `File` objects using the Rust WASM module.
 * Caller must snapshot the FileList to a plain array BEFORE any input resets.
 */
export async function fileListToZip(
  files: File[],
  onProgress?: (p: ZipProgress) => void,
): Promise<File> {
  await wasmReady;

  if (files.length === 0) throw new Error("No files provided");

  const total = files.length;
  const paths: string[] = [];
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const buffer = await file.arrayBuffer();
    paths.push(file.webkitRelativePath || file.name);
    chunks.push(new Uint8Array(buffer));
    onProgress?.({ filesProcessed: i + 1, totalFiles: total });
  }

  const zipBytes = zip_files(paths, chunks);
  const folderName = files[0].webkitRelativePath.split("/")[0] || "folder";

  return new File([zipBytes.buffer as ArrayBuffer], `${folderName}.zip`, {
    type: "application/zip",
  });
}
