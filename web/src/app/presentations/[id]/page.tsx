"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PresentationDetail } from "@/types/fabric";
import { api } from "@/lib/api";
import { SlideShowPlayer } from "@/components/presentations/SlideShowPlayer";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

export default function PresentationPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params?.id as string;

  const [presentation, setPresentation] = useState<PresentationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchDeck = async () => {
      if (!presentationId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getPresentation(presentationId);
        if (!cancelled) {
          if (!data.items || data.items.length === 0) {
            setError("This presentation deck does not have any fabric swatches assigned yet.");
          } else {
            setPresentation(data);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load presentation deck. It may have been deleted or the link is invalid."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchDeck();
    return () => {
      cancelled = true;
    };
  }, [presentationId]);

  const handleExit = () => {
    // If opened in a popup/new tab, close it; otherwise navigate back to main catalog
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    } else {
      router.push("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold tracking-wide text-zinc-200">
            Loading Presentation Deck...
          </p>
          <p className="text-xs text-zinc-500">Preparing high-resolution swatch slides</p>
        </div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Presentation Unavailable</h2>
            <p className="text-xs text-zinc-400">{error || "Deck not found"}</p>
          </div>
          <Button
            onClick={handleExit}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold h-10 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fabric Catalog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden">
      <SlideShowPlayer
        isOpen={true}
        onClose={handleExit}
        presentation={presentation}
        initialSlideIndex={0}
      />
    </div>
  );
}
