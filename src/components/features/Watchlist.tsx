"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Trash2 } from "lucide-react";

interface WatchlistItem {
  ticker: string;
  price?: number;
  changePercent?: number;
}

interface WatchlistProps {
  onSelect: (ticker: string) => void;
  selected: string;
}

export default function Watchlist({ onSelect, selected }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ticker: string, name: string}[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const watchlistRef = useRef(watchlist);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  // Load watchlist from MongoDB on mount
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const res = await fetch('/api/portfolio/watchlist');
        if (res.ok) {
          const data = await res.json();
          if (data.watchlist && data.watchlist.length > 0) {
            setWatchlist(data.watchlist.map((ticker: string) => ({ ticker })));
          } else {
            // Default if empty
            setWatchlist([
              { ticker: "RELIANCE.NS" },
              { ticker: "TCS.NS" },
              { ticker: "HDFCBANK.NS" },
              { ticker: "INFY.NS" }
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to load watchlist");
      } finally {
        setInitialLoaded(true);
      }
    };
    loadWatchlist();
  }, []);

  const saveWatchlist = async (newWatchlist: WatchlistItem[]) => {
    try {
      await fetch('/api/portfolio/watchlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist: newWatchlist.map(w => w.ticker) })
      });
    } catch (err) {
      console.error("Failed to save watchlist");
    }
  };

  // Search autocomplete
  useEffect(() => {
    const fetchResults = async () => {
      if (search.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/market/search?q=${search}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.quotes || []);
        }
      } catch (err) {
        // silent fail for suggestions
      }
    };
    
    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Poll prices
  useEffect(() => {
    if (!initialLoaded) return;
    
    const fetchPrices = async () => {
      const currentList = watchlistRef.current;
      if (currentList.length === 0) return;
      
      const updated = await Promise.all(
        currentList.map(async (item) => {
          try {
            const res = await fetch(`/api/market/quote?ticker=${item.ticker}`);
            if (res.ok) {
              const data = await res.json();
              if (data.price !== undefined) {
                  return { ...item, price: data.price, changePercent: data.changePercent };
              }
            }
          } catch (e) {
            console.error(e);
          }
          return item;
        })
      );
      // Prevent race conditions by merging the updated prices into the current state
      setWatchlist((prevWatchlist) => {
         return prevWatchlist.map(prevItem => {
             const fetchedItem = updated.find(u => u.ticker === prevItem.ticker);
             return fetchedItem ? { ...prevItem, price: fetchedItem.price, changePercent: fetchedItem.changePercent } : prevItem;
         });
      });
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, [initialLoaded]);

  const addTicker = async (tickerToAdd: string, fromInput: boolean = false) => {
    setError("");
    setLoading(true);

    try {
      const formatted = fromInput && !tickerToAdd.includes(".") ? `${tickerToAdd}.NS` : tickerToAdd;
      
      if (watchlist.find(i => i.ticker === formatted)) {
         setError("Already in watchlist");
         setLoading(false);
         return;
      }

      const res = await fetch(`/api/market/quote?ticker=${formatted}`);
      if (res.ok) {
          const data = await res.json();
          const newWatchlist = [...watchlist, { ticker: data.ticker, price: data.price, changePercent: data.changePercent }];
          setWatchlist(newWatchlist);
          saveWatchlist(newWatchlist);
          setSearch("");
          setResults([]);
      } else {
          setError("Ticker not found");
      }
    } catch (err) {
      setError("Error searching");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search) addTicker(search, true);
  };

  const removeTicker = (ticker: string) => {
    const newWatchlist = watchlist.filter((item) => item.ticker !== ticker);
    setWatchlist(newWatchlist);
    saveWatchlist(newWatchlist);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-2 border-b border-gray-200 relative">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
            placeholder="Search e.g. RELIANCE"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={loading} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">
            {loading ? "..." : "Add"}
          </button>
        </form>
        {results.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto rounded text-xs">
            {results.map((r, i) => (
              <li
                key={i}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                onClick={() => addTicker(r.ticker)}
              >
                <span className="font-medium truncate mr-2">{r.name}</span>
                <span className="text-gray-500 text-[10px]">{r.ticker}</span>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-red-500 text-[10px] mt-1">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {watchlist.map((item) => (
            <li
              key={item.ticker}
              onClick={() => onSelect(item.ticker)}
              className={`group relative flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-gray-50 ${selected === item.ticker ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-gray-800">{item.ticker.replace(".NS", "")}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end group-hover:invisible">
                  <span className={`text-xs font-medium ${item.changePercent !== undefined && item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.price ? item.price.toFixed(2) : "--"}
                  </span>
                  <span className={`text-[10px] ${item.changePercent !== undefined && item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.changePercent !== undefined ? (item.changePercent > 0 ? "+" : "") + item.changePercent.toFixed(2) + "%" : "--"}
                  </span>
                </div>
                {/* Hover Actions */}
                <div className="hidden group-hover:flex items-center space-x-1 absolute right-2 bg-gray-50 pl-2">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold transition-colors">B</button>
                  <button className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold transition-colors">S</button>
                  <button 
                     className="text-gray-400 hover:text-red-500 text-xs px-1 ml-1 transition-colors"
                     onClick={(e) => {
                       e.stopPropagation();
                       removeTicker(item.ticker);
                     }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {watchlist.length === 0 && (
             <div className="p-4 text-center text-xs text-gray-500">
                Search to add stocks to your watchlist.
             </div>
          )}
        </ul>
      </div>
    </div>
  );
}
