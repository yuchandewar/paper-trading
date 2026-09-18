"use client";

import { useEffect, useState } from "react";

interface NewsFeedProps {
  ticker: string;
}

export default function NewsFeed({ ticker }: NewsFeedProps) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetch(`/api/market/news?ticker=${ticker}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.news) {
          setNews(data.news);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticker]);

  return (
    <div className="bg-white rounded-lg shadow p-4 h-[300px] flex flex-col">
      <h3 className="text-lg font-semibold mb-3 border-b pb-2">Latest News</h3>
      {loading ? (
        <div className="flex-1 flex justify-center items-center text-sm text-gray-500">
          Loading news...
        </div>
      ) : news.length === 0 ? (
        <div className="flex-1 flex justify-center items-center text-sm text-gray-500">
          No news found for {ticker.replace(".NS", "")}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-4">
          {news.map((item, idx) => (
            <li key={idx} className="text-sm">
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 hover:underline"
              >
                {item.title}
              </a>
              <p className="text-xs text-gray-500 mt-1">
                {item.publisher} &bull; {new Date(item.providerPublishTime * 1000).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
