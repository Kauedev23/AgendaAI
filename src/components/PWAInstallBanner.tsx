import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Monitor } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem("pwa-banner-dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowBanner(false);
      localStorage.setItem("pwa-banner-dismissed", "true");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (!showBanner || !deferredPrompt) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex gap-2 mt-1">
            <Smartphone className="h-5 w-5 text-primary" />
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              Instale o AgendaAI
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Use o AgendaAI como aplicativo no seu computador ou celular.
              Acesso rápido, funciona offline e não ocupa espaço!
            </p>
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Instalar Agora
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Dispensar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
