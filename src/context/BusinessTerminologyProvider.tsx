import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessTerminology } from "@/utils/businessTerminology";

interface TerminologyContextValue {
  terminology: ReturnType<typeof getBusinessTerminology>;
  loading: boolean;
}

const TerminologyContext = createContext<TerminologyContextValue | undefined>(undefined);

export const BusinessTerminologyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [terminology, setTerminology] = useState(getBusinessTerminology());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: barbearia } = await supabase
          .from("barbearias")
          .select("tipo_comercio")
          .eq("admin_id", user.id)
          .maybeSingle();

        if (barbearia?.tipo_comercio) {
          if (mounted) setTerminology(getBusinessTerminology(barbearia.tipo_comercio));
        }
      } catch (error) {
        console.error("Erro ao carregar terminologia de negócio:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    // Listen for global custom events when settings/save happens to refresh terminology immediately
    const onBusinessUpdated = (e: CustomEvent) => {
      try {
        const tipo = e?.detail?.tipo_comercio;
        if (tipo) setTerminology(getBusinessTerminology(tipo));
      } catch (err) {
        console.error('Erro ao processar evento business:updated', err);
      }
    };
    window.addEventListener('business:updated', onBusinessUpdated as EventListener);

    // Subscribe to realtime changes on barbearias for this admin to auto-refresh terminology
    let channel: any = null;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          channel = supabase.channel(`terminology-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'barbearias', filter: `admin_id=eq.${user.id}` }, (payload) => {
              try {
                // Define a type for payload
                interface Payload {
                  new?: {
                    tipo_comercio?: string;
                    [key: string]: unknown;
                  };
                }

                const newTipo = (payload as Payload)?.new?.tipo_comercio;
                if (newTipo) setTerminology(getBusinessTerminology(newTipo));
              } catch (err) {
                console.error('Erro ao tratar payload realtime', err);
              }
            })
            .subscribe();
        }
      } catch (err) {
        console.error('Erro ao subscribir canal de terminologia', err);
      }
    })();

    return () => {
      mounted = false;
      try {
        window.removeEventListener('business:updated', onBusinessUpdated as EventListener);
      } catch (err) {
        console.error('Erro ao remover listener business:updated', err);
      }
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (err) {
        console.error('Erro ao remover channel supabase', err);
      }
    };
  }, []);

  if (!terminology) {
    console.warn('Terminologia não encontrada');
  }

  return (
    <TerminologyContext.Provider value={{ terminology, loading }}>
      {children}
    </TerminologyContext.Provider>
  );
};

export const useTerminology = () => {
  const ctx = useContext(TerminologyContext);
  if (!ctx) {
    // fallback to default terminology
    return { terminology: getBusinessTerminology(), loading: false };
  }
  return ctx;
};

export default BusinessTerminologyProvider;
