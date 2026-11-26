export const MAX_COVER_BYTES = 5_242_880;
export const MAX_CANONICAL_BYTES = 32 * 1024 * 1024;
export const COVER_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type CoverContentType = typeof COVER_CONTENT_TYPES[number];
export type EventCover = { imageId: string; altText: string | null; width: number; height: number; contentType: 'image/webp'; imageUrl: string | null };
export type EventCoverState = { coverRevision: string | null; cover: EventCover | null };
export type EventCoverUploadStatus = 'pending' | 'processing' | 'committed' | 'rejected' | 'expired';
export type EventCoverUpload = { uploadId: string; status: EventCoverUploadStatus; committedRevision: string | null; state: EventCoverState };
export type StartCoverUploadRequest = { expectedRevision: string | null; contentType: CoverContentType; byteLength: number };
export type StartCoverUploadResponse = { uploadId: string; uploadToken: string; uploadPath: string; uploadBucket: string; uploadExpiresAt: string; expiresAt: string };
export type ConfirmCoverRequest = { altText?: string };
export type ConfirmCoverResponse = { uploadId: string; committedRevision: string; state: EventCoverState };
export type UpdateCoverRequest = { expectedRevision: string | null; altText: string };
export type DeleteCoverRequest = { expectedRevision: string | null };
export const EMPTY_COVER_STATE: EventCoverState = { coverRevision: null, cover: null };
export function normalizeCoverAltText(text?: string | null): string | null { return text?.trim() || null; }
export function coverAlternative(cover: Pick<EventCover, 'altText'>, title: string) { return normalizeCoverAltText(cover.altText) ?? title; }
export class EventCoverError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.name = 'EventCoverError'; this.status = status; }
}
export type PendingCoverChange =
  | { kind: 'patch'; baseRevision: string | null; imageId: string; altText: string }
  | { kind: 'delete'; baseRevision: string | null }
  | { kind: 'upload'; baseRevision: string | null; uploadId: string };
export function reconcileCoverChange(change: PendingCoverChange, state: EventCoverState): 'matching' | 'retry' | 'conflict' {
  const matches = change.kind === 'delete' ? state.cover === null : change.kind === 'patch'
    && state.cover?.imageId === change.imageId && normalizeCoverAltText(state.cover.altText) === normalizeCoverAltText(change.altText);
  return matches ? 'matching' : state.coverRevision === change.baseRevision ? 'retry' : 'conflict';
}
