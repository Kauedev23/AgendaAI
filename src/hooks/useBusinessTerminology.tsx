import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessTerminology } from "@/utils/businessTerminology";

export const useBusinessTerminology = () => {
  const [terminology, setTerminology] = useState(getBusinessTerminology());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerminology();
  }, []);

  const loadTerminology = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Buscar barbearia do admin
      const { data: barbearia } = await supabase
        .from("barbearias")
        .select("tipo_comercio")
        .eq("admin_id", user.id)
        .maybeSingle();

      if (barbearia?.tipo_comercio) {
        setTerminology(getBusinessTerminology(barbearia.tipo_comercio));
      }
    } catch (error) {
      console.error("Erro ao carregar terminologia:", error);
    } finally {
      setLoading(false);
    }
  };

  return { terminology, loading };
};
