"use client";

import { useState } from "react";
import { Plus, Trash2, Edit, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Department = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([
    {
      id: "1",
      name: "Engineering",
      description: "Software development and infrastructure",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Sales",
      description: "Business development and customer relations",
      createdAt: "2024-01-15",
    },
  ]);

  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddDepartment = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      setDepartments((prev) =>
        prev.map((dept) =>
          dept.id === editingId
            ? { ...dept, name: formData.name, description: formData.description }
            : dept
        )
      );
      setEditingId(null);
    } else {
      const newDept: Department = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDepartments((prev) => [newDept, ...prev]);
    }

    setFormData({ name: "", description: "" });
  };

  const handleEdit = (dept: Department) => {
    setFormData({ name: dept.name, description: dept.description });
    setEditingId(dept.id);
  };

  const handleDelete = (id: string) => {
    setDepartments((prev) => prev.filter((dept) => dept.id !== id));
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "" });
    setEditingId(null);
  };

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Management</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Departments</h1>
        <p className="mt-2 text-sm text-zinc-400">Create, edit, and manage organizational departments.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {departments.length === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="mb-4 h-12 w-12 text-zinc-500" />
                <p className="text-center text-sm text-zinc-400">No departments created yet.</p>
              </CardContent>
            </Card>
          ) : (
            departments.map((dept) => (
              <Card key={dept.id} className="border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{dept.name}</CardTitle>
                      <CardDescription>{dept.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-zinc-500">Created: {dept.createdAt}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="border-white/10 bg-white/5 h-fit sticky top-6">
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? "Edit" : "Add"} Department</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Engineering"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-desc">Description</Label>
              <Input
                id="dept-desc"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddDepartment}
                className="flex-1 gap-2"
                disabled={!formData.name.trim()}
              >
                <Plus className="h-4 w-4" />
                {editingId ? "Update" : "Add"}
              </Button>
              {editingId && (
                <Button onClick={handleCancel} variant="outline" className="flex-1">
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
