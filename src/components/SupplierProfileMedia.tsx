import { useMemo, useState } from 'react';

interface SupplierProfileMediaProps {
  supplierId: string;
  businessName: string;
}

interface MediaItem {
  id: string;
  title: string;
  type: 'storefront' | 'product' | 'certificate' | 'other';
  url: string;
  addedAt: number;
}

function useMediaStorage(key: string) {
  const [items, setItems] = useState<MediaItem[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const updateItems = (next: MediaItem[] | ((previous: MediaItem[]) => MediaItem[])) => {
    setItems((previous) => {
      const value = typeof next === 'function' ? (next as (p: MediaItem[]) => MediaItem[])(previous) : next;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore local storage failures.
      }
      return value;
    });
  };

  return [items, updateItems] as const;
}

export default function SupplierProfileMedia({ supplierId, businessName }: SupplierProfileMediaProps) {
  const storageKey = `supplier_profile_media_${supplierId}`;
  const [mediaItems, setMediaItems] = useMediaStorage(storageKey);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaItem['type']>('storefront');
  const [url, setUrl] = useState('');

  const mediaSummary = useMemo(() => {
    const byType = mediaItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return byType;
  }, [mediaItems]);

  const addMediaItem = () => {
    const normalizedTitle = title.trim();
    const normalizedUrl = url.trim();
    if (!normalizedTitle || !normalizedUrl) return;

    const item: MediaItem = {
      id: `media_${Date.now()}`,
      title: normalizedTitle,
      type,
      url: normalizedUrl,
      addedAt: Date.now(),
    };
    setMediaItems((previous) => [item, ...previous].slice(0, 60));
    setTitle('');
    setUrl('');
    setType('storefront');
  };

  const removeMedia = (id: string) => {
    setMediaItems((previous) => previous.filter((item) => item.id !== id));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Supplier profile media</h3>
          <p className="text-sm text-slate-500">
            Showcase storefront, product quality, and verification proof for {businessName}.
          </p>
        </div>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {mediaItems.length} assets uploaded
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          placeholder="Media title"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as MediaItem['type'])}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="storefront">Storefront</option>
          <option value="product">Product</option>
          <option value="certificate">Certificate</option>
          <option value="other">Other</option>
        </select>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:col-span-2"
          placeholder="https://image-url"
        />
      </div>
      <div className="mt-3">
        <button
          onClick={addMediaItem}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Add media
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(mediaSummary).map(([mediaType, count]) => (
          <span key={mediaType} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {mediaType}: {count}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {mediaItems.length === 0 && (
          <p className="text-sm text-slate-500">No media yet. Add storefront or product URLs to improve buyer trust.</p>
        )}
        {mediaItems.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-500">{item.type}</p>
              </div>
              <button
                onClick={() => removeMedia(item.id)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                Remove
              </button>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block truncate text-xs text-indigo-600 hover:text-indigo-700"
            >
              {item.url}
            </a>
            <img
              src={item.url}
              alt={item.title}
              className="mt-2 h-28 w-full rounded-md object-cover"
              loading="lazy"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

