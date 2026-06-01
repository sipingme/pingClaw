import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { runOpenClawDoctor, runOpenClawDoctorFix } from '../../utils/openclaw-doctor';
import { getPortableRuntimeInfo } from '../../utils/paths';
import {
  dismissPortableHostImport,
  getPortableImportStatus,
  importHostOpenClawToPortable,
} from '../../utils/portable-import';

export async function handleAppRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/events' && req.method === 'GET') {
    // CORS headers are already set by the server middleware.
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    ctx.eventBus.addSseClient(res);
    // Send a current-state snapshot immediately so renderer subscribers do not
    // miss lifecycle transitions that happened before the SSE connection opened.
    res.write(`event: gateway:status\ndata: ${JSON.stringify(ctx.gatewayManager.getStatus())}\n\n`);
    return true;
  }

  if (url.pathname === '/api/app/portable' && req.method === 'GET') {
    sendJson(res, 200, getPortableRuntimeInfo());
    return true;
  }

  if (url.pathname === '/api/app/portable/import-status' && req.method === 'GET') {
    sendJson(res, 200, await getPortableImportStatus());
    return true;
  }

  if (url.pathname === '/api/app/portable/import' && req.method === 'POST') {
    const gatewayWasRunning = ctx.gatewayManager.getStatus().state === 'running';
    const result = await importHostOpenClawToPortable({
      stopGateway: gatewayWasRunning
        ? () => ctx.gatewayManager.stop()
        : undefined,
      startGateway: gatewayWasRunning
        ? () => ctx.gatewayManager.restart()
        : undefined,
    });
    sendJson(res, result.success ? 200 : 400, result);
    return true;
  }

  if (url.pathname === '/api/app/portable/import/dismiss' && req.method === 'POST') {
    await dismissPortableHostImport();
    sendJson(res, 200, { success: true });
    return true;
  }

  if (url.pathname === '/api/app/openclaw-doctor' && req.method === 'POST') {
    const body = await parseJsonBody<{ mode?: 'diagnose' | 'fix' }>(req);
    const mode = body.mode === 'fix' ? 'fix' : 'diagnose';
    sendJson(res, 200, mode === 'fix' ? await runOpenClawDoctorFix() : await runOpenClawDoctor());
    return true;
  }

  // OPTIONS is handled by the server middleware; no route-level handler needed.

  return false;
}
