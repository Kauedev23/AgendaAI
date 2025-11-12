import { Button } from "@/components/ui/button";
import { Calendar, Scissors, Users, Clock, TrendingUp, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const user = session.user;
        const tipoFromUser = (user.user_metadata as any)?.tipo as ('admin' | 'barbeiro' | 'cliente') | undefined;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("tipo")
          .eq("id", user.id)
          .maybeSingle();

        const effectiveTipo = profileData?.tipo ?? tipoFromUser;

        // Sincroniza divergências entre metadata e perfil
        if (tipoFromUser && profileData && profileData.tipo !== tipoFromUser) {
          await supabase
            .from("profiles")
            .update({ tipo: tipoFromUser })
            .eq("id", user.id);
        } else if (tipoFromUser && !profileData) {
          await supabase
            .from("profiles")
            .insert({ 
              id: user.id, 
              email: user.email || '', 
              nome: (user.user_metadata as any)?.nome || 'Usuário', 
              tipo: tipoFromUser 
            });
        }

        if (effectiveTipo === 'barbeiro') {
          navigate("/barber-dashboard", { replace: true });
        } else if (effectiveTipo === 'admin') {
          navigate("/dashboard", { replace: true });
        }
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzEzIDAgNiAyLjY4NiA2IDZzLTIuNjg3IDYtNiA2LTYtMi42ODYtNi02IDIuNjg3LTYgNi02ek0yNCA2YzMuMzEzIDAgNiAyLjY4NiA2IDZzLTIuNjg3IDYtNiA2LTYtMi42ODYtNi02IDIuNjg3LTYgNi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
        
        <nav className="container mx-auto px-6 py-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scissors className="h-8 w-8 text-secondary" />
              <span className="text-2xl font-bold">BarberTime</span>
            </div>
            <div className="flex gap-4">
              <Link to="/auth">
                <Button variant="ghost" className="text-white hover:text-secondary">
                  Entrar
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-secondary hover:bg-secondary/90 text-white">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              O Sistema de Agendamento que sua Barbearia Merece
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
              Modernize sua barbearia com agendamento online, gestão completa e experiência premium para seus clientes
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              <Link to="/auth">
                <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                  Começar Agora
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 text-lg px-8 py-6">
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 82.5C1200 85 1320 80 1380 77.5L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema completo e profissional para gerenciar sua barbearia
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: "Agendamento Online",
                description: "Seus clientes agendam 24/7 pelo celular ou computador"
              },
              {
                icon: Users,
                title: "Gestão de Barbeiros",
                description: "Controle completo da equipe, horários e disponibilidade"
              },
              {
                icon: Clock,
                title: "Horários Flexíveis",
                description: "Configure os horários de funcionamento e bloqueios"
              },
              {
                icon: TrendingUp,
                title: "Relatórios Completos",
                description: "Acompanhe estatísticas e performance em tempo real"
              },
              {
                icon: Shield,
                title: "Sistema Seguro",
                description: "Seus dados protegidos com a melhor tecnologia"
              },
              {
                icon: Scissors,
                title: "Multi-tenant",
                description: "Cada barbearia com seu próprio espaço e identidade"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl border border-border bg-card card-hover"
              >
                <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzEzIDAgNiAyLjY4NiA2IDZzLTIuNjg3IDYtNiA2LTYtMi42ODYtNi02IDIuNjg3LTYgNi02ek0yNCA2YzMuMzEzIDAgNiAyLjY4NiA2IDZzLTIuNjg3IDYtNiA2LTYtMi42ODYtNi02IDIuNjg3LTYgNi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pronto para Modernizar sua Barbearia?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Comece gratuitamente hoje e veja como o BarberTime pode transformar seu negócio
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-white text-lg px-8 py-6 shadow-xl">
              Criar Conta Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Scissors className="h-6 w-6 text-secondary" />
            <span className="text-xl font-bold">BarberTime</span>
          </div>
          <p className="text-white/70">
            © 2024 BarberTime. Sistema profissional de agendamento para barbearias.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;