# Dashboard App

Uma aplicação moderna de dashboard construída com Next.js 15, TypeScript, Tailwind CSS e Supabase para autenticação.

## 🚀 Funcionalidades

- **Autenticação completa** com Supabase (login, signup, reset de senha)
- **Dashboard interativo** com gráficos e métricas em tempo real
- **Listagem de produtos** com filtros por período e formatação de dados
- **Listagem de faturas** com cache inteligente
- **Interface responsiva** com sidebar desktop e menu mobile
- **Proteção de rotas** via middleware
- **Cache de dados** para melhor performance

## 🛠️ Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Supabase** - Autenticação e backend
- **Recharts** - Gráficos interativos
- **Lucide React** - Ícones
- **Radix UI** - Componentes acessíveis

## 📦 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd my-next-app
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

Adicione suas credenciais do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse [http://localhost:3000](http://localhost:3000)

## 🏗️ Estrutura do Projeto

```
src/
├── app/                    # App Router do Next.js
│   ├── components/         # Componentes específicos da app
│   ├── dashboard/          # Página do dashboard
│   ├── faturas/           # Página de faturas
│   ├── login/             # Página de autenticação
│   ├── produtos/          # Página de produtos
│   └── types/             # Tipos TypeScript
├── components/            # Componentes UI reutilizáveis
├── hooks/                 # Custom hooks
├── lib/                   # Utilitários e constantes
├── middleware.ts          # Middleware de autenticação
└── utils/                 # Utilitários de API e Supabase
```

## 🔧 Configuração

### Supabase
1. Crie um projeto no [Supabase](https://supabase.com)
2. Configure autenticação por email/senha
3. Adicione as variáveis de ambiente

### API Externa
A aplicação consome uma API externa para dados do dashboard. Configure as URLs em `src/lib/constants.ts`.

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Outras plataformas
A aplicação é compatível com qualquer plataforma que suporte Next.js.

## 📝 Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run start` - Servidor de produção
- `npm run lint` - Verificação de código

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.
