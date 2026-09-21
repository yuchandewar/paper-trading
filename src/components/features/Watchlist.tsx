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
    <div className="flex flex-col h-full bg-white relative rounded-xl">
      <div className="p-3 border-b border-gray-100 relative bg-white">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#00d09c] focus:border-[#00d09c] uppercase transition-colors"
            placeholder="Search e.g. RELIANCE"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={loading} className="px-3 py-2 bg-[#00d09c] text-white text-xs rounded-lg hover:bg-[#00b386] font-semibold shadow-sm transition-colors">
            {loading ? "..." : "Add"}
          </button>
        </form>
        {results.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 top-full mt-2 bg-white border border-gray-100 shadow-xl max-h-48 overflow-y-auto rounded-xl text-xs">
            {results.map((r, i) => (
              <li
                key={i}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors border-b border-gray-50 last:border-0"
                onClick={() => addTicker(r.ticker)}
              >
                <span className="font-semibold text-gray-800 truncate mr-2">{r.name}</span>
                <span className="text-gray-400 text-[10px]">{r.ticker}</span>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-red-500 text-[10px] mt-1 px-1">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-50">
          {watchlist.map((item) => (
            <li
              key={item.ticker}
              onClick={() => onSelect(item.ticker)}
              className={`group relative flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected === item.ticker ? 'bg-[#00d09c]/5 border-l-4 border-[#00d09c]' : 'border-l-4 border-transparent'}`}
            >
              <div className="flex flex-col">
                <span className={`font-bold text-sm ${selected === item.ticker ? 'text-[#00d09c]' : 'text-gray-800'}`}>{item.ticker.replace(".NS", "")}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end group-hover:invisible">
                  <span className={`text-sm font-semibold ${item.changePercent !== undefined && item.changePercent >= 0 ? 'text-[#00d09c]' : 'text-red-500'}`}>
                    {item.price ? item.price.toFixed(2) : "--"}
                  </span>
                  <span className={`text-[11px] font-medium ${item.changePercent !== undefined && item.changePercent >= 0 ? 'text-[#00d09c]' : 'text-red-500'}`}>
                    {item.changePercent !== undefined ? (item.changePercent > 0 ? "+" : "") + item.changePercent.toFixed(2) + "%" : "--"}
                  </span>
                </div>
                {/* Hover Actions */}
                <div className="hidden group-hover:flex items-center space-x-2 absolute right-3 bg-gray-50 pl-2">
                  <button className="bg-[#00d09c] hover:bg-[#00b386] text-white text-[11px] px-3 py-1.5 rounded font-bold transition-colors shadow-sm">B</button>
                  <button className="bg-red-500 hover:bg-red-600 text-white text-[11px] px-3 py-1.5 rounded font-bold transition-colors shadow-sm">S</button>
                  <button 
                     className="text-gray-400 hover:text-red-500 p-1.5 ml-1 transition-colors rounded-full hover:bg-red-50"
                     onClick={(e) => {
                       e.stopPropagation();
                       removeTicker(item.ticker);
                     }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {watchlist.length === 0 && (
             <div className="p-6 text-center text-sm font-medium text-gray-400">
                Search to add stocks to your watchlist.
             </div>
          )}
        </ul>
      </div>
    </div>
  );
}
