'use client';

import { useState, useEffect } from 'react';

export function EventBanner() {
  const [banner, setBanner] = useState<{ text: string; style: string } | null>(null);

  useEffect(() => {
    fetch('/api/events/active-dates')
      .then(r => r.json())
      .then(({ dates }: { dates: string[] }) => {
        if (!dates || dates.length === 0) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventDates = dates.map(d => {
          const date = new Date(d + 'T00:00:00');
          date.setHours(0, 0, 0, 0);
          return date;
        });

        // Find the nearest future or today date
        const upcoming = eventDates.filter(d => d >= today).sort((a, b) => a.getTime() - b.getTime());
        const allPast = upcoming.length === 0;

        if (allPast) {
          setBanner({ text: 'Thank you for attending!', style: 'bg-muted-bg text-secondary border-card-border' });
          return;
        }

        const nearest = upcoming[0];
        const diffMs = nearest.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          setBanner({ text: "Parents Evening is today!", style: 'bg-accent/10 text-green-700 border-accent/20' });
        } else if (diffDays === 1) {
          setBanner({ text: "Parents Evening is tomorrow!", style: 'bg-amber-50 text-amber-700 border-amber-200' });
        } else {
          setBanner({ text: `Parents Evening is in ${diffDays} days`, style: 'bg-primary/5 text-primary border-primary/10' });
        }
      })
      .catch(() => {});
  }, []);

  if (!banner) return null;

  return (
    <div className={`py-2 text-center text-sm font-medium border-b ${banner.style}`}>
      {banner.text}
    </div>
  );
}
