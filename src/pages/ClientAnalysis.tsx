import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, TrendingUp, TrendingDown, Search, Phone, Mail, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { useTerminology } from "@/context/BusinessTerminologyProvider";

type ClientStats = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  totalAgendamentos: number;
  ultimoAgendamento: string | null;
  diasDesdeUltimo: number;
  status: "ativo" | "inativo" | "novo";
};

const ClientAnalysis = () => {
  const navigate = useNavigate();
  const { terminology } = useTerminology();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"frequencia" | "recente" | "nome">("frequencia");
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativo" | "inativo" | "novo">("todos");
  const [clientes, setClientes] = useState<ClientStats[]>([]);
  const [barbearia, setBarbearia] = useState<Tables<"barbearias"> | null>(null);

  const syncMissingProfiles = async () => {
    try {
      setSyncing(true);
      toast.info("Sincronizando profiles faltantes...");

      // Buscar todos os agendamentos
      const { data: agendamentosData } = await supabase
        .from("agendamentos")
        .select("cliente_id")
        .eq("barbearia_id", barbearia?.id || "");

      if (!agendamentosData || agendamentosData.length === 0) {
        toast.info("Nenhum agendamento encontrado");
        setSyncing(false);
        return;
      }

      // IDs únicos de clientes
      const clienteIds = [...new Set(agendamentosData.map(a => a.cliente_id))];

      // Buscar profiles existentes
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", clienteIds);

      const existingIds = new Set(existingProfiles?.map(p => p.id) || []);
      const missingIds = clienteIds.filter(id => !existingIds.has(id));

      console.log(`📊 Total de clientes: ${clienteIds.length}`);
      console.log(`✅ Profiles existentes: ${existingIds.size}`);
      console.log(`❌ Profiles faltantes: ${missingIds.length}`);

      if (missingIds.length === 0) {
        toast.success("Todos os profiles já existem!");
        setSyncing(false);
        return;
      }

      // Criar profiles faltantes com dados padrão
      // Usar Edge Function para criar com permissões de service_role
      toast.info(`Criando ${missingIds.length} profiles...`);
      
      const { data, error: functionError } = await supabase.functions.invoke("sync-client-profiles", {
        body: { clienteIds: missingIds }
      });

      if (functionError) {
        console.error("Erro ao invocar função:", functionError);
        toast.error(`Não foi possível sincronizar automaticamente. Total de clientes sem profile: ${missingIds.length}`);
      } else {
        toast.success(`✅ ${data?.created || 0} profiles criados com sucesso!`);
        // Recarregar dados
        loadData();
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro ao sincronizar profiles");
    } finally {
      setSyncing(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (profileData?.tipo !== 'admin') {
        toast.error("Acesso negado");
        navigate("/");
        return;
      }

      const { data: barbeariasData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .single();

      if (!barbeariasData) {
        toast.error("Configure sua barbearia primeiro");
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariasData);

      // Buscar todos os agendamentos
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from("agendamentos")
        .select("id, data, cliente_id")
        .eq("barbearia_id", barbeariasData.id);

      console.log("📊 Agendamentos encontrados:", agendamentosData);
      console.log("❌ Erro ao buscar agendamentos:", agendamentosError);

      if (agendamentosError) {
        console.error("Erro na query:", agendamentosError);
        toast.error("Erro ao buscar agendamentos");
        return;
      }

      if (!agendamentosData || agendamentosData.length === 0) {
        console.warn("⚠️ Nenhum agendamento encontrado");
        setClientes([]);
        return;
      }

      // Buscar profiles de todos os clientes
      const clienteIds = [...new Set(agendamentosData.map(a => a.cliente_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nome, email, telefone")
        .in("id", clienteIds);

      console.log("👥 Profiles encontrados:", profilesData);

      // Criar map de profiles para acesso rápido
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Processar dados dos clientes
      const clienteMap = new Map<string, ClientStats>();

      agendamentosData.forEach((apt) => {
        const cliente = profilesMap.get(apt.cliente_id);
        console.log(`👤 Agendamento ${apt.id} -> Cliente:`, cliente);
        
        if (!cliente) {
          console.warn("⚠️ Profile não encontrado para cliente_id:", apt.cliente_id);
          // Criar entrada mesmo sem profile
          const existing = clienteMap.get(apt.cliente_id);
          const dataAgendamento = new Date(apt.data);

          if (existing) {
            existing.totalAgendamentos++;
            if (!existing.ultimoAgendamento || dataAgendamento > new Date(existing.ultimoAgendamento)) {
              existing.ultimoAgendamento = apt.data;
            }
          } else {
            clienteMap.set(apt.cliente_id, {
              id: apt.cliente_id,
              nome: "Cliente sem cadastro",
              email: "sem-email@temporario.com",
              telefone: null,
              totalAgendamentos: 1,
              ultimoAgendamento: apt.data,
              diasDesdeUltimo: 0,
              status: "novo",
            });
          }
          return;
        }

        const existing = clienteMap.get(cliente.id);
        const dataAgendamento = new Date(apt.data);

        if (existing) {
          existing.totalAgendamentos++;
          if (!existing.ultimoAgendamento || dataAgendamento > new Date(existing.ultimoAgendamento)) {
            existing.ultimoAgendamento = apt.data;
          }
        } else {
          clienteMap.set(cliente.id, {
            id: cliente.id,
            nome: cliente.nome || "Cliente sem nome",
            email: cliente.email || "email@nao-cadastrado.com",
            telefone: cliente.telefone || null,
            totalAgendamentos: 1,
            ultimoAgendamento: apt.data,
            diasDesdeUltimo: 0,
            status: "novo",
          });
        }
      });

      // Calcular dias desde último agendamento e status
      const hoje = new Date();
      const clientesArray = Array.from(clienteMap.values()).map((cliente) => {
        const diasDesdeUltimo = cliente.ultimoAgendamento
          ? differenceInDays(hoje, new Date(cliente.ultimoAgendamento))
          : 999;

        let status: "ativo" | "inativo" | "novo" = "novo";
        if (cliente.totalAgendamentos >= 3) {
          status = diasDesdeUltimo <= 30 ? "ativo" : "inativo";
        }

        return {
          ...cliente,
          diasDesdeUltimo,
          status,
        };
      });

      console.log("✅ Total de clientes processados:", clientesArray.length);
      console.log("📋 Clientes:", clientesArray);

      setClientes(clientesArray);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar e ordenar clientes
  const filteredClientes = clientes
    .filter((cliente) => {
      const matchSearch = 
        cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cliente.telefone?.includes(searchTerm) ?? false);

      const matchFilter = filterStatus === "todos" || cliente.status === filterStatus;

      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === "frequencia") {
        return b.totalAgendamentos - a.totalAgendamentos;
      } else if (sortBy === "recente") {
        return a.diasDesdeUltimo - b.diasDesdeUltimo;
      } else {
        return a.nome.localeCompare(b.nome);
      }
    });

  const stats = {
    total: clientes.length,
    ativos: clientes.filter((c) => c.status === "ativo").length,
    inativos: clientes.filter((c) => c.status === "inativo").length,
    novos: clientes.filter((c) => c.status === "novo").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "inativo":
        return <Badge className="bg-red-100 text-red-800">Inativo</Badge>;
      case "novo":
        return <Badge className="bg-blue-100 text-blue-800">Novo</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando análise...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Análise de Clientes</h1>
                <p className="text-sm text-muted-foreground">{barbearia?.nome}</p>
              </div>
            </div>
            <Button 
              onClick={syncMissingProfiles} 
              disabled={syncing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? "Sincronizando..." : "Sincronizar Profiles"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inativos}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Novos</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.novos}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros e Ordenação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 border rounded-md bg-white"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                  <option value="novo">Novos</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border rounded-md bg-white"
                >
                  <option value="frequencia">Mais frequentes</option>
                  <option value="recente">Mais recentes</option>
                  <option value="nome">Nome A-Z</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes ({filteredClientes.length})</CardTitle>
            <CardDescription>
              Gerencie e analise sua base de clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredClientes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente encontrado</p>
                </div>
              ) : (
                filteredClientes.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{cliente.nome}</h3>
                        {getStatusBadge(cliente.status)}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {cliente.email}
                        </div>
                        {cliente.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {cliente.telefone}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {cliente.ultimoAgendamento
                            ? `Último: ${format(new Date(cliente.ultimoAgendamento), "dd/MM/yyyy", { locale: ptBR })}`
                            : "Sem agendamentos"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{cliente.totalAgendamentos}</p>
                      <p className="text-xs text-muted-foreground">agendamentos</p>
                      {cliente.diasDesdeUltimo < 999 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          há {cliente.diasDesdeUltimo} dias
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientAnalysis;
