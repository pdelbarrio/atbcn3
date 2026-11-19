"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { FiFilter, FiX } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FilterState = {
  date: string;
  location: string;
  tags: string[];
};

interface Props {
  filters: FilterState;
  locations: string[];
  tags: string[];
  activeCount: number;
  onApply: (filters: FilterState) => void;
}

export default function FilterPanel({
  filters,
  locations,
  tags: availableTags,
  activeCount,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(filters);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggleTag = (tag: string) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  };

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-testid="filters-toggle"
          className="flex items-center gap-2 px-2 py-2 text-xs md:text-sm font-bold text-text dark:text-glow bg-card dark:bg-gradient-dark dark:border dark:border-glow rounded-lg shadow-lg hover:opacity-80"
        >
          <FiFilter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtres</span>
          {activeCount > 0 && (
            <span
              data-testid="filters-active-count"
              className="flex items-center justify-center w-5 h-5 rounded-full bg-beteve text-white text-[10px] dark:bg-glow dark:text-black"
            >
              {activeCount}
            </span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent
        data-testid="filters-panel"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto bg-card text-text dark:bg-gradient-dark dark:text-glow"
      >
        <DialogHeader>
          <DialogTitle>Filtra els esdeveniments</DialogTitle>
          <DialogDescription>
            Tria un dia, una sala o un estil. Pots combinar-los i aplicar-los
            tots junts.
          </DialogDescription>
        </DialogHeader>

        <div>
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
              value={draft.date}
              onChange={(event) =>
                setDraft((current) => ({ ...current, date: event.target.value }))
              }
              className="bg-white dark:bg-black border border-primary dark:border-glow rounded-md text-sm"
            />
            {draft.date && (
              <button
                type="button"
                aria-label="Treure el filtre de dia"
                onClick={() => setDraft((current) => ({ ...current, date: "" }))}
                className="p-2 rounded-full hover:opacity-70"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div>
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
            value={draft.location}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            className="bg-white dark:bg-black border border-primary dark:border-glow rounded-md text-sm"
          />
          <datalist id="filter-locations">
            {locations.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide">Estil</p>
          <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
            {availableTags.length === 0 ? (
              <span className="text-xs italic opacity-70">
                No hi ha estils disponibles
              </span>
            ) : (
              availableTags.map((tag) => {
                const isActive = draft.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    data-testid={`filter-tag-${tag}`}
                    aria-pressed={isActive}
                    onClick={() => toggleTag(tag)}
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

        <DialogFooter className="flex-row justify-end gap-3">
          <button
            type="button"
            data-testid="clear-filters"
            onClick={() => setDraft({ date: "", location: "", tags: [] })}
            className="text-xs font-bold uppercase tracking-wide hover:opacity-70"
          >
            Neteja
          </button>
          <button
            type="button"
            data-testid="apply-filters"
            onClick={apply}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md bg-beteve text-white dark:bg-glow dark:text-black hover:opacity-80"
          >
            Aplica
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
