import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("Notificações não suportadas neste navegador");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Notificações ativadas!");
        return true;
      } else if (result === "denied") {
        toast.error("Permissão negada para notificações");
        return false;
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast.error("Erro ao ativar notificações");
      return false;
    }
    
    return false;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission === "granted" && isSupported) {
      try {
        new Notification(title, {
          icon: "/logo-192.png",
          badge: "/logo-192.png",
          ...options,
        });
      } catch (error) {
        console.error("Erro ao mostrar notificação:", error);
      }
    }
  };

  const scheduleAppointmentReminder = async (
    appointmentId: string,
    appointmentDate: string,
    appointmentTime: string,
    barbershopName: string,
    barberName: string
  ) => {
    // Calcula tempo para notificar (1 dia antes)
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();

    if (reminderTime > now) {
      const timeUntilReminder = reminderTime.getTime() - now.getTime();
      
      // Se for menos de 24h, agenda localmente
      if (timeUntilReminder < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          showNotification("Lembrete de Agendamento", {
            body: `Seu horário em ${barbershopName} com ${barberName} é amanhã às ${appointmentTime}`,
            tag: `appointment-${appointmentId}`,
            requireInteraction: true,
          });
        }, timeUntilReminder);
      }
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    scheduleAppointmentReminder,
  };
};
