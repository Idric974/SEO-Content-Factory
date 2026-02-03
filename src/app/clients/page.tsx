"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users, Trash2, Pencil } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  name: string;
  slug: string;
  persona: Record<string, unknown> | null;
  brandGuidelines: Record<string, unknown> | null;
  createdAt: string;
  _count: { projects: number };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const slug = newSlug.trim() || slugify(newName);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug }),
    });

    if (res.ok) {
      const client = await res.json();
      setDialogOpen(false);
      setNewName("");
      setNewSlug("");
      router.push(`/clients/${client.id}`);
    }
    setCreating(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le client "${name}" et tous ses projets ?`)) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <>
      <Header title="Clients" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gestion des clients</h2>
            <p className="text-muted-foreground">
              {clients.length} client{clients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du client</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Les Broderies de Paris"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setNewSlug(slugify(e.target.value));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    placeholder="les-broderies-de-paris"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="w-full"
                >
                  {creating ? "Création..." : "Créer le client"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">
                Aucun client pour le moment
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer votre premier client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card key={client.id} className="group relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {client.name}
                      </CardTitle>
                      <CardDescription>{client.slug}</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {client._count.projects} projet
                      {client._count.projects !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/clients/${client.id}`}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Éditer
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(client.id, client.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
