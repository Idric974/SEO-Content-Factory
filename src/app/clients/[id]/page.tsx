"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface Persona {
  name: string;
  age: string;
  profession: string;
  problems: string;
  goals: string;
  tone: string;
  description: string;
}

interface BrandGuidelines {
  tone: string;
  forbiddenWords: string;
  preferredStyle: string;
  additionalNotes: string;
}

const emptyPersona: Persona = {
  name: "",
  age: "",
  profession: "",
  problems: "",
  goals: "",
  tone: "",
  description: "",
};

const emptyBrand: BrandGuidelines = {
  tone: "",
  forbiddenWords: "",
  preferredStyle: "",
  additionalNotes: "",
};

export default function ClientEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [persona, setPersona] = useState<Persona>(emptyPersona);
  const [brand, setBrand] = useState<BrandGuidelines>(emptyBrand);

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) {
      router.push("/clients");
      return;
    }
    const data = await res.json();
    setName(data.name);
    setSlug(data.slug);
    if (data.persona) {
      setPersona({ ...emptyPersona, ...data.persona });
    }
    if (data.brandGuidelines) {
      setBrand({ ...emptyBrand, ...data.brandGuidelines });
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        persona,
        brandGuidelines: brand,
      }),
    });
    if (res.ok) {
      setSaving(false);
    }
  }

  function updatePersona(field: keyof Persona, value: string) {
    setPersona((prev) => ({ ...prev, [field]: value }));
  }

  function updateBrand(field: keyof BrandGuidelines, value: string) {
    setBrand((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <>
        <Header title="Client" />
        <div className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={name} />
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour
            </Link>
          </Button>
          <div className="flex-1" />
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="persona">Persona</TabsTrigger>
            <TabsTrigger value="brand">Charte éditoriale</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>
                  Nom et identifiant du client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du client</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="persona">
            <Card>
              <CardHeader>
                <CardTitle>Persona cible</CardTitle>
                <CardDescription>
                  Définissez le profil type du lecteur. Ces informations seront
                  injectées dans les prompts de génération.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="persona-name">Prénom du persona</Label>
                    <Input
                      id="persona-name"
                      placeholder="Ex: Sophie Dubois"
                      value={persona.name}
                      onChange={(e) => updatePersona("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="persona-age">Âge</Label>
                    <Input
                      id="persona-age"
                      placeholder="Ex: 35 ans"
                      value={persona.age}
                      onChange={(e) => updatePersona("age", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona-profession">Profession</Label>
                  <Input
                    id="persona-profession"
                    placeholder="Ex: Responsable marketing"
                    value={persona.profession}
                    onChange={(e) =>
                      updatePersona("profession", e.target.value)
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="persona-problems">
                    Problèmes / Frustrations
                  </Label>
                  <Textarea
                    id="persona-problems"
                    placeholder="Un problème par ligne"
                    rows={4}
                    value={persona.problems}
                    onChange={(e) => updatePersona("problems", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona-goals">Objectifs / Désirs</Label>
                  <Textarea
                    id="persona-goals"
                    placeholder="Un objectif par ligne"
                    rows={4}
                    value={persona.goals}
                    onChange={(e) => updatePersona("goals", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona-tone">Ton préféré</Label>
                  <Input
                    id="persona-tone"
                    placeholder="Ex: Professionnel mais accessible"
                    value={persona.tone}
                    onChange={(e) => updatePersona("tone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona-description">
                    Description libre
                  </Label>
                  <Textarea
                    id="persona-description"
                    placeholder="Description détaillée du persona..."
                    rows={4}
                    value={persona.description}
                    onChange={(e) =>
                      updatePersona("description", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand">
            <Card>
              <CardHeader>
                <CardTitle>Charte éditoriale</CardTitle>
                <CardDescription>
                  Règles de ton, style et mots interdits pour ce client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-tone">Ton de la marque</Label>
                  <Input
                    id="brand-tone"
                    placeholder="Ex: Expert, bienveillant, inspirant"
                    value={brand.tone}
                    onChange={(e) => updateBrand("tone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-style">Style d&apos;écriture</Label>
                  <Textarea
                    id="brand-style"
                    placeholder="Ex: Phrases courtes, voix active, pas de jargon technique..."
                    rows={3}
                    value={brand.preferredStyle}
                    onChange={(e) =>
                      updateBrand("preferredStyle", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-forbidden">Mots interdits</Label>
                  <Textarea
                    id="brand-forbidden"
                    placeholder="Un mot ou expression par ligne"
                    rows={4}
                    value={brand.forbiddenWords}
                    onChange={(e) =>
                      updateBrand("forbiddenWords", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-notes">Notes additionnelles</Label>
                  <Textarea
                    id="brand-notes"
                    placeholder="Toute information complémentaire..."
                    rows={4}
                    value={brand.additionalNotes}
                    onChange={(e) =>
                      updateBrand("additionalNotes", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
