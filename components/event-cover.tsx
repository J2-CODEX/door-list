import { EventCoverImage, EventCoverFallback } from './event-cover-image';
import { coverAlternative } from '@/lib/event-covers';
import type { EventCover } from '@/lib/event-covers';
export function EventCover({ cover, title, previewUrl, previewAltText, sizes, loading, accessToken, variant = "default" }: { cover: EventCover | null; title: string; previewUrl?: string | null; previewAltText?: string; sizes?: string; loading?: "eager" | "lazy"; accessToken?: string; variant?: "default" | "thumbnail" }) {
  const src = previewUrl ?? cover?.imageUrl;
  return <div data-slot="event-cover" className="relative aspect-video w-full overflow-hidden rounded-2xl bg-accent-surface">
    {src ? <EventCoverImage key={`${cover?.imageId ?? 'preview'}:${src}`} src={src} accessToken={previewUrl ? undefined : accessToken} sizes={sizes} loading={loading} compact={variant === "thumbnail"} alt={coverAlternative({ altText: previewAltText ?? cover?.altText ?? null }, title)} /> : <EventCoverFallback compact={variant === "thumbnail"} />}
  </div>;
}
