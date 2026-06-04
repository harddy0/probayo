"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader, Search, X } from "lucide-react";
import { fetchAllUsers } from "@/lib/api/users";
import type { SimpleUser } from "@/lib/types/users";

type UserSelectProps = {
  value?: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
};

function formatUserLabel(user: SimpleUser): string {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name ? `${name} — ${user.email}` : user.email;
}

export function UserSelect({
  value,
  onChange,
  placeholder,
  disabled,
  label,
}: UserSelectProps) {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllUsers();
        if (mounted) setUsers(data);
      } catch {
        if (mounted) setError("Failed to load users");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setFocusedIndex(-1);
      // Small delay for the dropdown to render
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    // Use mousedown for faster response
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === value),
    [users, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim().toLowerCase();
      return u.email.toLowerCase().includes(q) || name.includes(q);
    });
  }, [users, search]);

  const handleSelect = (userId: string) => {
    onChange(userId);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        const focusedItem = filtered[focusedIndex];
        if (focusedIndex >= 0 && focusedIndex < filtered.length && focusedItem) {
          handleSelect(focusedItem.id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>(
      "[data-option-index]",
    );
    const focused = items[focusedIndex];
    if (focused) {
      focused.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  const selectedLabel = selectedUser ? formatUserLabel(selectedUser) : "";

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          {label}
        </label>
      ) : null}

      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
        disabled={disabled}
        className={`
          flex h-9 w-full items-center justify-between rounded-lg border px-3 text-sm text-left outline-none transition
          ${
            open
              ? "border-white/30 ring-2 ring-white/20"
              : "border-white/10 hover:border-white/20"
          }
          bg-white/5 disabled:cursor-not-allowed disabled:opacity-50
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={`truncate ${
            selectedUser ? "text-zinc-50" : "text-zinc-500"
          }`}
        >
          {selectedUser
            ? selectedLabel
            : placeholder || "Search users by name or email"}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selectedUser && (
            <span
              onClick={handleClear}
              className="rounded p-0.5 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
              role="button"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-[300] mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/50">
          {/* Search input */}
          <div className="relative border-b border-white/10">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or email…"
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-zinc-50 outline-none placeholder:text-zinc-500"
              aria-label="Search users"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFocusedIndex(-1);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-500 transition hover:text-white"
                tabIndex={-1}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto overscroll-contain"
            role="listbox"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
                <Loader className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-sm text-red-400">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-zinc-500">
                {search ? "No users match your search" : "No users found"}
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((user, index) => {
                  const isSelected = user.id === value;
                  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
                  const isFocused = index === focusedIndex;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-option-index={index}
                      onClick={() => handleSelect(user.id)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`
                        flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition
                        ${
                          isSelected
                            ? "bg-white/10 text-white"
                            : isFocused
                              ? "bg-white/5 text-white"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }
                      `}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={`
                          flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition
                          ${
                            isSelected
                              ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                              : "border-white/10 bg-white/5"
                          }
                        `}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      {/* User info */}
                      <div className="min-w-0 flex-1">
                        {name && (
                          <p className="truncate font-medium">{name}</p>
                        )}
                        <p
                          className={`truncate text-xs ${
                            isSelected ? "text-zinc-400" : "text-zinc-500"
                          }`}
                        >
                          {user.email}
                        </p>
                      </div>

                      {/* Role badge */}
                      <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                        {user.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSelect;
