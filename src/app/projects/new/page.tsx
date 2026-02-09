"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Scale, CheckCircle, Target } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  slug: string;
}

const BUSINESS_OBJECTIVES = [
  {
    value: "explorer",
    label: "Explorateur",
    description: "Le lecteur découvre le sujet. CTA informatif.",
    icon: Search,
  },
  {
    value: "evaluator",
    label: "Évaluateur",
    description: "Le lecteur compare des options. CTA comparatif.",
    icon: Scale,
  },
  {
    value: "convinced",
    label: "Convaincu en attente",
    description: "Le lecteur est prêt mais hésite. CTA réassurance.",
    icon: CheckCircle,
  },
  {
    value: "decision_maker",
    label: "Décisionnaire",
    description: "Le lecteur veut agir maintenant. CTA action directe.",
    icon: Target,
  },
] as const;

export default function NewProjectPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchIntents, setSearchIntents] = useState("");
  const [businessObjective, setBusinessObjective] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data);
        setLoading(false);
      });
  }, []);

  async function handleCreate() {
    if (!clientId || !title.trim() || !keyword.trim()) return;
    setCreating(true);

    const intents = searchIntents
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        title: title.trim(),
        keyword: keyword.trim(),
        searchIntents: intents,
        businessObjective: businessObjective || undefined,
      }),
    });

    if (res.ok) {
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    }
    setCreating(false);
  }

  return (
    <>
      <Header title="Nouveau projet" />
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour au dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer un nouveau projet</CardTitle>
            <CardDescription>
              Un projet correspond à un article de blog SEO complet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : clients.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Aucun client disponible.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/clients">Créer un client d&apos;abord</Link>
                  </Button>
                </div>
              ) : (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre du projet</Label>
              <Input
                id="title"
                placeholder="Ex: Article sur les tendances broderie 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyword">Mot-clé principal</Label>
              <Input
                id="keyword"
                placeholder="Ex: tendances broderie"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Le mot-clé SEO principal autour duquel l&apos;article sera
                optimisé
              </p>
            </div>

            {/* Sélecteur d'objectif business */}
            <div className="space-y-3">
              <Label>Objectif business du contenu</Label>
              <div className="grid grid-cols-2 gap-3">
                {BUSINESS_OBJECTIVES.map((obj) => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => setBusinessObjective(obj.value)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                      businessObjective === obj.value &&
                        "border-primary bg-primary/5 ring-2 ring-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <obj.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{obj.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {obj.description}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Influence les suggestions de Call to Action et le ton de
                l&apos;article
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intents">
                Intentions de recherche (optionnel)
              </Label>
              <Textarea
                id="intents"
                placeholder="Une intention par ligne&#10;Ex:&#10;informationnel&#10;comparatif&#10;guide pratique"
                rows={4}
                value={searchIntents}
                onChange={(e) => setSearchIntents(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Les intentions de recherche associées au mot-clé
              </p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!clientId || !title.trim() || !keyword.trim() || creating}
              className="w-full"
            >
              {creating ? "Création en cours..." : "Créer le projet"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
