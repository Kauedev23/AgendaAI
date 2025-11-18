import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

export const NotificationManager = () => {
  const { permission, isSupported, requestPermission } = useNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Mostra prompt apenas se notificações forem suportadas e ainda não foi decidido
    if (isSupported && permission === "default") {
      const hasSeenPrompt = localStorage.getItem("notificationPromptSeen");
      if (!hasSeenPrompt) {
        // Espera 3 segundos antes de mostrar o prompt
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, permission]);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    localStorage.setItem("notificationPromptSeen", "true");
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("notificationPromptSeen", "true");
    setShowPrompt(false);
  };

  if (!isSupported || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md">
      <Card className="border-primary/20 bg-background shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Ativar Notificações
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Receba lembretes dos seus agendamentos diretamente no seu
                dispositivo.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleRequestPermission} size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Ativar
                </Button>
                <Button onClick={handleDismiss} variant="ghost" size="sm">
                  Agora Não
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
