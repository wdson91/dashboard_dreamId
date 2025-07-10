# Refatoração da API Flask para Next.js

## 📋 Visão Geral

Esta documentação descreve a refatoração da rota Flask `/api/stats/resumo` para Next.js, mantendo a mesma funcionalidade e otimizações.

## 🚀 Arquivos Criados

### 1. **Utils** - `src/app/api/stats/utils.ts`
- **Funcionalidade**: Funções utilitárias reutilizáveis baseadas no código Python original
- **Inclui**: Validação de NIF, cálculo de períodos, busca de faturas, processamento de dados
- **Reutilização**: Todas as rotas de stats podem usar essas funções

### 2. **API Route** - `src/app/api/stats/resumo/route.ts`
- **Endpoint**: `GET /api/stats/resumo`
- **Funcionalidade**: Retorna estatísticas resumidas de vendas
- **Parâmetros**:
  - `nif` (obrigatório): NIF do estabelecimento
  - `filial` (opcional): Número da filial
  - `periodo` (opcional): Período (0=Hoje, 1=Ontem, 2=Esta Semana, etc.)

### 3. **API Route Exemplo** - `src/app/api/stats/produtos/route.ts`
- **Endpoint**: `GET /api/stats/produtos`
- **Funcionalidade**: Retorna produtos mais vendidos
- **Demonstra**: Como reutilizar as funções do utils em outras rotas

### 4. **Hook** - `src/hooks/useStatsResumo.ts`
- **Funcionalidade**: Hook React para consumir a API
- **Retorna**: `{ data, loading, error, refetch }`
- **Uso**: `const { data, loading, error } = useStatsResumo(periodo)`

### 5. **Componente de Exemplo** - `src/app/components/StatsResumoExample.tsx`
- **Funcionalidade**: Componente de exemplo mostrando como usar a API
- **Características**: Cards de estatísticas, seletor de período, comparativo por hora

## 🔧 Principais Melhorias

### 1. **Arquivo Utils Reutilizável**
```typescript
// Todas as funções centralizadas em utils.ts
import { 
  is_valid_nif,
  get_periodo_datas,
  buscar_faturas_periodo,
  processar_faturas_otimizado
} from '../utils'
```

### 2. **Autenticação Integrada**
```typescript
// Verificação automática de sessão
const supabase = await createClient()
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

### 3. **Tipagem TypeScript Completa**
```typescript
interface VariacaoDados {
  valor: number
  variacao: number
  percentual: number
}

interface StatsResumo {
  periodo: string
  total_vendas: VariacaoDados
  numero_recibos: VariacaoDados
  itens_vendidos: VariacaoDados
  ticket_medio: VariacaoDados
  comparativo_por_hora: ComparativoHora[]
}
```

### 4. **Otimização de Consultas**
```typescript
// Uma única consulta ao banco para ambos os períodos
const data_mais_antiga = new Date(Math.min(dia.getTime(), di.getTime()))
const data_mais_recente = new Date(Math.max(dfan.getTime(), df.getTime()))
const faturas_completas = await buscar_faturas_periodo(nif, data_mais_antiga, data_mais_recente, filial)
```

### 5. **Tratamento de Erros Robusto**
```typescript
try {
  // Lógica da API
} catch (error) {
  console.error('Erro na API /api/stats/resumo:', error)
  return NextResponse.json(
    { error: 'Erro interno do servidor' }, 
    { status: 500 }
  )
}
```

## 📊 Estrutura de Resposta

```json
{
  "periodo": "Hoje",
  "total_vendas": {
    "valor": 130.8,
    "ontem": 224.1,
    "variacao": "-41.6%",
    "cor": "#dc3545"
  },
  "numero_recibos": {
    "valor": 15,
    "ontem": 12,
    "variacao": "+25.0%",
    "cor": "#28a745"
  },
  "itens_vendidos": {
    "valor": 45,
    "ontem": 38,
    "variacao": "+18.4%",
    "cor": "#28a745"
  },
  "ticket_medio": {
    "valor": 8.72,
    "ontem": 18.68,
    "variacao": "-53.3%",
    "cor": "#dc3545"
  },
  "comparativo_por_hora": [
    {
      "hora": "09:00",
      "atual": 25.00,
      "anterior": 20.00
    }
  ]
}
```

## 🎯 Como Usar

### 1. **No Frontend (React Hook)**
```typescript
import { useStatsResumo } from "@/hooks/useStatsResumo"

function Dashboard() {
  const { data, loading, error } = useStatsResumo(0) // período 0 = hoje
  
  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error}</div>
  
  return (
    <div>
      <h2>Total Vendas: {data?.total_vendas.valor}</h2>
      <p>Variação: {data?.total_vendas.percentual}%</p>
    </div>
  )
}
```

### 2. **Chamada Direta (fetch)**
```typescript
const response = await fetch('/api/stats/resumo?nif=123456789&periodo=0&filial=1')
const data = await response.json()
```

### 3. **Usando o Utilitário API**
```typescript
import { api } from "@/utils/api"

const data = await api.get('/api/stats/resumo?nif=123456789&periodo=0')
```

## 🔄 Migração da API Flask

### Antes (Flask):
```python
@app.route('/api/stats/resumo', methods=['GET'])
def resumo_stats():
    # Lógica da API
    return jsonify(data), 200
```

### Depois (Next.js):
```typescript
export async function GET(request: NextRequest) {
  // Lógica da API
  return NextResponse.json(data, { status: 200 })
}
```

## 🛠️ Funções Auxiliares

### 1. **Validação de NIF**
```typescript
function is_valid_nif(nif: string): boolean {
  return nif.length > 0
}
```

### 2. **Cálculo de Períodos**
```typescript
function get_periodo_datas(periodo: number): [Date, Date, Date, Date] {
  // Retorna [data_inicio_atual, data_fim_atual, data_inicio_anterior, data_fim_anterior]
}
```

### 3. **Processamento de Faturas**
```typescript
function processar_faturas_otimizado(
  faturas: Fatura[], 
  di: Date, 
  df: Date, 
  dia: Date, 
  dfan: Date
): DadosProcessados
```

## 🔒 Segurança

- ✅ Autenticação obrigatória via Supabase
- ✅ Validação de parâmetros de entrada
- ✅ Tratamento de erros robusto
- ✅ Sanitização de dados
- ✅ Rate limiting (pode ser adicionado)

## 🚀 Próximos Passos

1. **Implementar Rate Limiting**
2. **Adicionar Cache Redis**
3. **Implementar Logs Estruturados**
4. **Adicionar Métricas de Performance**
5. **Implementar Testes Unitários**

## 📝 Notas Importantes

- A API mantém compatibilidade com a versão Flask
- Todas as otimizações foram preservadas
- Suporte completo a TypeScript
- Integração nativa com Next.js e Supabase
- Suporte a CORS configurado 