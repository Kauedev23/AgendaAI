import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessTerminology } from "@/utils/businessTerminology";

export const usePublicBusinessTerminology = (slug: string) => {
  const [terminology, setTerminology] = useState(getBusinessTerminology());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerminology();
  }, [slug]);

  const loadTerminology = async () => {
    try {
      const { data: barbearia } = await supabase
        .from("barbearias")
        .select("tipo_comercio")
        .eq("slug", slug)
        .single();

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
