"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { LocationType } from "@/lib/types";
import { useGlobalContext } from "@/context/events.context";
import { motion, AnimatePresence } from "framer-motion";

interface LocationAutocompleteProps {
  value: string;
  onChange: (
    name: string,
    address: string | null,
    mapLink: string | null,
  ) => void;
  error?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  error,
}: LocationAutocompleteProps) {
  const { supabase } = useGlobalContext();
  const [suggestions, setSuggestions] = useState<LocationType[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .ilike("name", `%${searchTerm}%`)
        .limit(5);

      if (!error && data) {
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue, null, null); // Clear address and mapLink when typing manually
    fetchSuggestions(newValue);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (suggestion: LocationType) => {
    onChange(suggestion.name, suggestion.address, suggestion.map_link);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        data-testid="event-location"
        type="text"
        placeholder="ubicació"
        id="location"
        className="w-full border border-primary dark:border-glow p-2 rounded-md"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value.length >= 2 && setShowSuggestions(true)}
      />

      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || isLoading) && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-black border border-gray-200 dark:border-glow rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {isLoading ? (
              <li className="p-3 text-sm text-gray-500 italic">Buscant...</li>
            ) : (
              suggestions.map((suggestion) => (
                <li
                  key={suggestion.id}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <div className="font-bold text-sm">{suggestion.name}</div>
                  {suggestion.address && (
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.address}
                    </div>
                  )}
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
