import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const UpdatePrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: " + r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-primary/20 bg-background shadow-lg">
        <CardContent className="p-4">
          {needRefresh && (
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Nova versão disponível
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Uma nova versão do AgendaAI está disponível. Clique para
                  atualizar.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateServiceWorker(true)}
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar Agora
                  </Button>
                  <Button onClick={close} variant="ghost" size="sm">
                    Mais Tarde
                  </Button>
                </div>
              </div>
            </div>
          )}
          {offlineReady && (
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  App pronto para uso offline
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  O AgendaAI agora funciona offline!
                </p>
                <Button onClick={close} variant="ghost" size="sm">
                  Ok
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
