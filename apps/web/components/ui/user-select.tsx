"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAllUsers, SimpleUser } from "@/lib/api/users";

type UserSelectProps = {
  value?: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
};

export function UserSelect({
  value,
  onChange,
  placeholder,
  disabled,
  label,
}: UserSelectProps) {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [filter, setFilter] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllUsers();
        if (mounted) setUsers(data);
      } catch (err) {
        if (mounted) setError("Failed to load users");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // when selected value changes externally, update displayValue
    const u = users.find((x) => x.id === value);
    if (u) {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      setDisplayValue(name ? `${name} — ${u.email}` : u.email);
    } else if (!value) {
      setDisplayValue("");
    }
  }, [value, users]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      return (
        u.email.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [users, filter]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === value),
    [users, value],
  );

  // datalist id
  const listId = `user-datalist-${Math.random().toString(36).slice(2, 8)}`;

  // map label -> id for lookup
  const labelMap = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      const label = name ? `${name} — ${u.email}` : u.email;
      m.set(label, u.id);
    });
    return m;
  }, [users]);

  const handleInputChange = (val: string) => {
    setDisplayValue(val);
    setFilter(val);
    const match = labelMap.get(val);
    if (match) {
      onChange(match);
    } else if (!val) {
      onChange("");
    }
  };

  return (
    <div>
      {label ? (
        <Label className="text-sm font-medium text-zinc-300">{label}</Label>
      ) : null}
      <div className="mt-2">
        <Input
          list={listId}
          value={displayValue ?? filter}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder ?? "Search users by name or email"}
          disabled={disabled || loading}
        />
        <datalist id={listId}>
          {users.map((u) => {
            const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
            const label = name ? `${name} — ${u.email}` : u.email;
            return <option key={u.id} value={label} />;
          })}
        </datalist>
        <div className="mt-2 text-xs text-zinc-500">
          {loading ? "Loading users..." : error ? error : null}
        </div>
      </div>
    </div>
  );
}

export default UserSelect;
