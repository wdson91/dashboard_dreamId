# Sistema de Autenticação Simplificado

Este documento explica como o sistema de autenticação está implementado na aplicação.

## Visão Geral

O sistema de autenticação foi simplificado para evitar problemas de rate limits. **Não faz refresh automático** para evitar sobrecarga no Supabase. O Supabase gerencia automaticamente a renovação de tokens quando necessário.

## Componentes Principais

### 1. Hook useAuth (`src/hooks/useAuth.ts`)

O hook principal que gerencia a autenticação:

- **Sessão Simples**: Obtém e gerencia a sessão atual
- **Refresh Manual**: Permite refresh manual quando necessário
- **Indicador Visual**: Mostra quando o token está sendo renovado
- **Tratamento de Erros**: Faz logout automático se a sessão expirar

### 2. Middleware (`src/middleware.ts`)

O middleware do Next.js que protege as rotas:

- **Verificação Simples**: Verifica se o usuário está autenticado
- **Proteção de Rotas**: Redireciona usuários não autenticados para login
- **Sem Refresh Automático**: Não tenta renovar tokens automaticamente

### 3. API Utils (`src/utils/api.ts`)

Utilitário para fazer requisições à API:

- **Sessão Atual**: Usa a sessão atual sem tentar renovar
- **Sem Retry Automático**: Não tenta refresh em caso de 401
- **Tratamento Simples**: Deixa o Supabase gerenciar a renovação

### 4. Header (`src/app/components/Header.tsx`)

Componente que mostra o status da autenticação:

- **Indicador de Refresh**: Mostra quando o token está sendo renovado
- **Status da Sessão**: Exibe informações do usuário e estabelecimento

## Configurações

As configurações estão centralizadas em `src/lib/constants.ts`:

```typescript
auth: {
  sessionTimeout: 60 * 60 * 1000, // 1 hora
}
```

## Abordagem Simplificada

### Problema Resolvido
O Supabase tem limites de taxa de requisições que podem ser atingidos se o refresh for feito muito frequentemente.

### Solução Implementada

**Não fazer refresh automático** - deixar o Supabase gerenciar a renovação de tokens automaticamente quando necessário.

### Vantagens

1. **Sem Rate Limits**: Não há risco de atingir limites de taxa
2. **Mais Simples**: Menos código e complexidade
3. **Mais Confiável**: O Supabase gerencia a renovação de forma otimizada
4. **Melhor Performance**: Menos requisições desnecessárias

## Fluxo de Funcionamento

### 1. Login Inicial
1. Usuário faz login com email/senha
2. Supabase retorna access_token e refresh_token
3. Tokens são armazenados em cookies seguros
4. Sistema inicia com a sessão atual

### 2. Gerenciamento de Sessão
1. O Supabase gerencia automaticamente a renovação de tokens
2. Sistema apenas verifica se a sessão está válida
3. Não há refresh automático programado

### 3. Requisições à API
1. Usa a sessão atual para autenticar requisições
2. Se receber 401, não tenta refresh automaticamente
3. Deixa o Supabase lidar com a renovação

### 4. Middleware
1. Em cada requisição, verifica se o usuário está autenticado
2. Se não estiver autenticado, redireciona para login
3. Não tenta renovar tokens automaticamente

## Indicadores Visuais

### Header
- **"Renovando sessão..."**: Quando o token está sendo renovado manualmente
- **Ícone de refresh animado**: Durante o processo de renovação

### Console
- Logs simples para debugging:
  - `Auth state changed: SIGNED_IN`
  - `Auth state changed: TOKEN_REFRESHED`
  - `Tentando refresh da sessão...` (apenas quando manual)

## Tratamento de Erros

### Cenários de Erro
1. **Token Expirado**: O Supabase renova automaticamente
2. **Sessão Inválida**: Logout automático
3. **Erro de Rede**: Logout e redirecionamento
4. **Erro do Servidor**: Logout e redirecionamento

### Ações Automáticas
- Logout automático em caso de erro de autenticação
- Redirecionamento para página de login
- Limpeza de dados de sessão

## Segurança

### Medidas Implementadas
- Tokens armazenados em cookies seguros (httpOnly)
- Gerenciamento automático pelo Supabase
- Logout automático em caso de erro
- Proteção de rotas no middleware

### Boas Práticas
- Tokens de acesso com vida útil curta
- Refresh tokens com vida útil mais longa
- Renovação automática pelo Supabase
- Logout automático em caso de comprometimento
- Sem risco de rate limits

## Debugging

### Logs Disponíveis
- Console do navegador para logs de refresh
- Network tab para ver requisições de refresh
- Application tab para ver cookies de sessão

### Comandos Úteis
```javascript
// Verificar sessão atual
const { data: { session } } = await supabase.auth.getSession()
console.log('Sessão:', session)

// Forçar refresh manual
const { data, error } = await supabase.auth.refreshSession()
console.log('Refresh result:', data, error)
```

## Configuração do Supabase

Para que o refresh token funcione corretamente, certifique-se de que:

1. **JWT Expiry**: Configure o tempo de expiração do JWT no Supabase
2. **Refresh Token Rotation**: Ative a rotação de refresh tokens
3. **Cookie Settings**: Configure cookies seguros no Supabase
4. **Rate Limits**: Monitore os limites de taxa de requisições

## Troubleshooting

### Problemas Comuns

1. **Logout Inesperado**
   - Verificar se a sessão não expirou
   - Verificar configurações de cookies
   - Verificar logs de erro

2. **Erro 401 Persistente**
   - Verificar se a API está aceitando o token
   - Verificar se o token está sendo enviado corretamente
   - Fazer logout e login novamente

3. **Problemas de Sessão**
   - Limpar cookies e fazer login novamente
   - Verificar se o Supabase está funcionando

### Soluções

1. **Limpar Cookies**: Remover cookies de sessão e fazer login novamente
2. **Verificar Configuração**: Confirmar configurações do Supabase
3. **Verificar Logs**: Analisar logs de erro no console
4. **Reiniciar Aplicação**: Parar e iniciar o servidor de desenvolvimento

## Melhorias Recentes

### v3.0 - Sistema Simplificado
- ✅ Remoção de refresh automático
- ✅ Sem risco de rate limits
- ✅ Código mais simples e confiável
- ✅ Gerenciamento automático pelo Supabase
- ✅ Melhor performance
- ✅ Menos complexidade 