"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { FiFilter, FiX } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  location: string;
  onLocationChange: (location: string) => void;
  locations: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  tags: string[];
  onClear: () => void;
  activeCount: number;
}

export default function FilterPanel({
  selectedDate,
  onSelectedDateChange,
  location,
  onLocationChange,
  locations,
  selectedTags,
  onToggleTag,
  tags,
  onClear,
  activeCount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="mb-3">
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="filters-toggle"
          aria-expanded={isOpen}
          aria-controls="event-filters"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold text-text dark:text-glow bg-card dark:bg-gradient-dark dark:border dark:border-glow rounded-lg shadow-lg hover:opacity-80"
        >
          <FiFilter className="w-4 h-4" />
          Filtres
          {activeCount > 0 && (
            <span
              data-testid="filters-active-count"
              className="flex items-center justify-center w-5 h-5 rounded-full bg-beteve text-white text-[10px] dark:bg-glow dark:text-black"
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          id="event-filters"
          data-testid="filters-panel"
          className="mt-2 p-4 bg-card dark:bg-gradient-dark dark:border dark:border-glow rounded-lg shadow-lg text-text dark:text-glow"
        >
          <div className="mb-4">
            <label
              htmlFor="filter-date"
              className="block mb-1 text-xs font-bold uppercase tracking-wide"
            >
              Dia concret
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="filter-date"
                data-testid="filter-date"
                type="date"
                min={today}
                value={selectedDate}
                onChange={(event) => onSelectedDateChange(event.target.value)}
                className="bg-white dark:bg-black border border-primary dark:border-glow rounded-md text-sm"
              />
              {selectedDate && (
                <button
                  type="button"
                  aria-label="Treure el filtre de dia"
                  onClick={() => onSelectedDateChange("")}
                  className="p-2 rounded-full hover:opacity-70"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="filter-location"
              className="block mb-1 text-xs font-bold uppercase tracking-wide"
            >
              Sala
            </label>
            <Input
              id="filter-location"
              data-testid="filter-location"
              type="text"
              list="filter-locations"
              placeholder="Cerca una sala"
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              className="bg-white dark:bg-black border border-primary dark:border-glow rounded-md text-sm"
            />
            <datalist id="filter-locations">
              {locations.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide">
              Estil
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-xs italic opacity-70">
                  No hi ha estils disponibles
                </span>
              ) : (
                tags.map((tag) => {
                  const isActive = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      data-testid={`filter-tag-${tag}`}
                      aria-pressed={isActive}
                      onClick={() => onToggleTag(tag)}
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-semibold border transition-colors",
                        isActive
                          ? "bg-btvgray text-white border-btvgray dark:bg-glow dark:text-black dark:border-glow"
                          : "bg-transparent text-text dark:text-glow border-btvgray dark:border-glow hover:opacity-70",
                      )}
                    >
                      {tag}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-btvgray/20 dark:border-glow/30">
            <button
              type="button"
              data-testid="clear-filters"
              onClick={onClear}
              disabled={activeCount === 0}
              className="text-xs font-bold uppercase tracking-wide disabled:opacity-40 hover:opacity-70"
            >
              Neteja filtres
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold uppercase tracking-wide hover:opacity-70"
            >
              Fet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
