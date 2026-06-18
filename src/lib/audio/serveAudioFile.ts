import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

type ByteRange = {
  start: number;
  end: number;
};

function parseRangeHeader(rangeHeader: string, fileSize: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const [, startStr, endStr] = match;
  let start: number;
  let end: number;

  if (startStr === "" && endStr !== "") {
    const suffixLength = Number.parseInt(endStr, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else {
    start = startStr === "" ? 0 : Number.parseInt(startStr, 10);
    end = endStr === "" ? fileSize - 1 : Number.parseInt(endStr, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  }

  if (start < 0 || end < start || start >= fileSize) return null;
  end = Math.min(end, fileSize - 1);
  return { start, end };
}

export async function createAudioFileResponse(
  filePath: string,
  request: Request,
): Promise<Response> {
  const fileStat = await stat(filePath);
  const fileSize = fileStat.size;
  const baseHeaders: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  };

  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) {
    const stream = createReadStream(filePath);
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        ...baseHeaders,
        "Content-Length": String(fileSize),
      },
    });
  }

  const range = parseRangeHeader(rangeHeader, fileSize);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const { start, end } = range;
  const chunkSize = end - start + 1;
  const stream = createReadStream(filePath, { start, end });

  return new Response(stream as unknown as ReadableStream, {
    status: 206,
    headers: {
      ...baseHeaders,
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    },
  });
}
