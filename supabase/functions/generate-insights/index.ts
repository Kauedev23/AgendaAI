import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agendamentos, faturamento, servicosData, barbeirosData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Preparar prompt com dados do negócio
    const prompt = `Você é um consultor de negócios. Analise os seguintes dados e gere 3-5 insights acionáveis e práticos para melhorar o negócio:

DADOS DO NEGÓCIO:
- Total de agendamentos este mês: ${agendamentos.total}
- Agendamentos pendentes: ${agendamentos.pendentes}
- Agendamentos confirmados: ${agendamentos.confirmados}
- Agendamentos concluídos: ${agendamentos.concluidos}
- Faturamento total: R$ ${faturamento.total.toFixed(2)}
- Ticket médio: R$ ${faturamento.ticketMedio.toFixed(2)}

SERVIÇOS MAIS POPULARES:
${servicosData.map((s: any) => `- ${s.nome}: ${s.quantidade} agendamentos (R$ ${(s.faturamento || 0).toFixed(2)})`).join('\n')}

PERFORMANCE DOS PROFISSIONAIS:
${barbeirosData.map((b: any) => `- ${b.nome}: ${b.agendamentos} atendimentos (R$ ${(b.faturamento || 0).toFixed(2)})`).join('\n')}

Gere insights práticos e específicos, focando em:
1. Oportunidades de aumento de receita
2. Otimização de horários e operação
3. Melhorias no atendimento
4. Estratégias de marketing
5. Retenção de clientes

Formato: retorne APENAS um array JSON com objetos no formato:
[
  {
    "titulo": "Título do insight",
    "descricao": "Descrição detalhada e acionável",
    "categoria": "receita|operacao|marketing|atendimento",
    "prioridade": "alta|media|baixa"
  }
]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um consultor especializado em gestão de negócios. Gere insights práticos e acionáveis baseados em dados reais."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API Lovable AI:", response.status, errorText);
      throw new Error(`Erro ao chamar Lovable AI: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Tentar extrair JSON do conteúdo
    let insights = [];
    try {
      // Remover possíveis markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        insights = JSON.parse(content);
      }
    } catch (e) {
      console.error("Erro ao fazer parse do JSON:", e, content);
      // Fallback: criar insights genéricos
      insights = [
        {
          titulo: "Análise Gerada",
          descricao: content,
          categoria: "geral",
          prioridade: "media"
        }
      ];
    }

    return new Response(
      JSON.stringify({ insights }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
