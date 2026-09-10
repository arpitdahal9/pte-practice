"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ALL_TASK_TYPES, TASK_TYPES } from "@/lib/pte/taskTypes";
import { PAYLOAD_TEMPLATES } from "@/lib/pte/examples";
import type { Section, TaskType } from "@prisma/client";

interface QRow {
  id: string;
  section: Section;
  taskType: TaskType;
  title: string;
  instructions: string | null;
  promptText: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  difficulty: number;
  isSample: boolean;
  tags: string[];
  payload: unknown;
}

const empty = (taskType: TaskType) => ({
  id: "",
  section: TASK_TYPES[taskType].section,
  taskType,
  title: "",
  instructions: "",
  promptText: "",
  mediaUrl: "",
  mediaType: TASK_TYPES[taskType].media ?? "",
  difficulty: 2,
  isSample: true,
  tags: [] as string[],
  payloadText: JSON.stringify(PAYLOAD_TEMPLATES[taskType], null, 2),
});

type Editing = ReturnType<typeof empty> | null;

export function AdminQuestions() {
  const [rows, setRows] = useState<QRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/questions");
    const data = await res.json();
    setRows(data.questions ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  function startNew() {
    setError(null);
    setEditing(empty("WRITE_ESSAY"));
  }

  function startEdit(r: QRow) {
    setError(null);
    setEditing({
      id: r.id,
      section: r.section,
      taskType: r.taskType,
      title: r.title,
      instructions: r.instructions ?? "",
      promptText: r.promptText ?? "",
      mediaUrl: r.mediaUrl ?? "",
      mediaType: r.mediaType ?? "",
      difficulty: r.difficulty,
      isSample: r.isSample,
      tags: r.tags,
      payloadText: JSON.stringify(r.payload, null, 2),
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    let payload: unknown;
    try {
      payload = JSON.parse(editing.payloadText);
    } catch {
      setSaving(false);
      setError("Payload is not valid JSON.");
      return;
    }
    const body = {
      section: TASK_TYPES[editing.taskType].section,
      taskType: editing.taskType,
      title: editing.title,
      instructions: editing.instructions || null,
      promptText: editing.promptText || null,
      mediaUrl: editing.mediaUrl || null,
      mediaType: editing.mediaType || null,
      difficulty: Number(editing.difficulty),
      isSample: editing.isSample,
      tags: editing.tags,
      payload,
    };
    const res = await fetch(
      editing.id ? `/api/questions/${editing.id}` : "/api/questions",
      {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Save failed. Check payload matches the task type.");
      return;
    }
    setEditing(null);
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    void load();
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editing.id ? "Edit" : "New"} question</h2>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Task type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editing.taskType}
                onChange={(e) => {
                  const tt = e.target.value as TaskType;
                  setEditing({
                    ...editing,
                    taskType: tt,
                    section: TASK_TYPES[tt].section,
                    mediaType: TASK_TYPES[tt].media ?? "",
                    payloadText: editing.id
                      ? editing.payloadText
                      : JSON.stringify(PAYLOAD_TEMPLATES[tt], null, 2),
                  });
                }}
              >
                {ALL_TASK_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty (1–3)</Label>
              <Input
                type="number"
                min={1}
                max={3}
                value={editing.difficulty}
                onChange={(e) => setEditing({ ...editing, difficulty: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Instructions (optional)</Label>
            <Input value={editing.instructions} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Prompt / passage text (optional)</Label>
            <Textarea
              value={editing.promptText}
              onChange={(e) => setEditing({ ...editing, promptText: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Media URL (optional)</Label>
              <Input value={editing.mediaUrl} onChange={(e) => setEditing({ ...editing, mediaUrl: e.target.value })} placeholder="/uploads/... or https://..." />
            </div>
            <div className="space-y-2">
              <Label>Media type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editing.mediaType}
                onChange={(e) => setEditing({ ...editing, mediaType: e.target.value })}
              >
                <option value="">none</option>
                <option value="audio">audio</option>
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payload (JSON — must match the task type)</Label>
            <Textarea
              value={editing.payloadText}
              onChange={(e) => setEditing({ ...editing, payloadText: e.target.value })}
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startNew}>
          <Plus className="h-4 w-4" /> New question
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No questions yet. Create one or run <code>npm run db:seed</code>.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {TASK_TYPES[r.taskType].label}
                    </div>
                  </div>
                  <Badge variant="secondary">D{r.difficulty}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
