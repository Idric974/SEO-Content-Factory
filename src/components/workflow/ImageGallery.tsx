"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, RotateCcw, Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ImageItem {
  filename: string;
  prompt: string;
  publicUrl?: string;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
  cost?: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  onGenerate: (index: number) => void;
  onGenerateAll: () => void;
  isGeneratingAll: boolean;
}

export function ImageGallery({
  images,
  onGenerate,
  onGenerateAll,
  isGeneratingAll,
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const doneCount = images.filter((img) => img.status === "done").length;
  const totalCount = images.length;

  return (
    <div className="space-y-4">
      {/* Header avec bouton tout générer */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {doneCount}/{totalCount} images générées
        </div>
        <Button
          onClick={onGenerateAll}
          disabled={isGeneratingAll || doneCount === totalCount}
        >
          {isGeneratingAll ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : doneCount > 0 ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Générer les restantes
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Générer toutes les images
            </>
          )}
        </Button>
      </div>

      {/* Grille d'images */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, index) => (
          <Card
            key={index}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              selectedIndex === index ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedIndex(index === selectedIndex ? null : index)}
          >
            <CardContent className="p-3">
              {/* Zone image */}
              <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-muted">
                {img.status === "done" && img.publicUrl ? (
                  <Image
                    src={img.publicUrl}
                    alt={img.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : img.status === "generating" ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : img.status === "error" ? (
                  <div className="flex h-full flex-col items-center justify-center p-4">
                    <p className="text-center text-xs text-destructive">
                      {img.error ?? "Erreur"}
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}

                {/* Badge statut */}
                <div className="absolute right-1 top-1">
                  {img.status === "done" && (
                    <Badge className="bg-green-500 text-white">
                      <Check className="mr-1 h-3 w-3" />
                      OK
                    </Badge>
                  )}
                </div>
              </div>

              {/* Infos */}
              <p className="truncate text-xs font-medium">{img.filename}</p>

              {/* Bouton régénérer individuel */}
              <div className="mt-2 flex items-center justify-between">
                {img.cost && (
                  <span className="text-xs text-muted-foreground">
                    ${img.cost}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerate(index);
                  }}
                  disabled={img.status === "generating" || isGeneratingAll}
                  className="ml-auto"
                >
                  {img.status === "generating" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : img.status === "done" ? (
                    <>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Régénérer
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-1 h-3 w-3" />
                      Générer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Détail prompt de l'image sélectionnée */}
      {selectedIndex !== null && images[selectedIndex] && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Prompt DALL-E pour {images[selectedIndex].filename}
            </p>
            <p className="text-sm">{images[selectedIndex].prompt}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
