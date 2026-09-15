-- 0233 — search_path fixo nas funções do projeto + remoção de índice redundante.
--
-- Origem: avisos do Security/Performance Advisor do Supabase numa instalação
-- real (crm.atendemy.com.br, 2026-09-15). Dois achados legítimos, e o resto do
-- painel medido e descartado com motivo — registrado aqui para a próxima pessoa
-- não repetir a medição:
--
--   • `function_search_path_mutable`: 199 funções em `public` sem search_path,
--     mas 196 são DAS EXTENSÕES (citext, pg_trgm, vector, que o install.sh põe
--     em `public` de propósito). O Advisor não conta função de extensão, e
--     alterá-la seria errado duas vezes: o pg_dump não carrega a alteração e o
--     upgrade da extensão a desfaz. Sobram 3, todas do projeto.
--   • `unindexed_foreign_keys`: 175, consequência da estratégia de índices
--     compostos por `organization_id`. Criar 175 índices num banco sem dados
--     cobra escrita e disco por ganho não medido — contra a doutrina DIRC.
--   • `extension_in_public`: 3, intencional. Tirar `vector` de `public` quebra
--     o RAG.
--   • `duplicate_index`: 1 real. Os outros 15 pares que uma consulta ingênua
--     acusa são índices PARCIAIS com predicados diferentes (ex.:
--     `uniq_crm_stages_pipeline_won` vs `..._lost`) — comparar só `indkey`
--     produz falso positivo; é preciso comparar `pg_get_indexdef` inteiro.
--
-- Nenhuma das 3 é `SECURITY DEFINER`, então não havia escalada de privilégio
-- em jogo — é higiene, não incidente. Medido antes de aplicar: nenhuma delas
-- referencia `private.`, `auth.`, `extensions.` ou `storage.` no corpo, então
-- fixar em `public, pg_temp` não muda resolução de nome nenhuma.
--
-- `pg_temp` é declarado EXPLICITAMENTE e por ÚLTIMO: omiti-lo não o remove da
-- busca, apenas o deixa implícito e PRIMEIRO, que é exatamente o vetor de
-- shadowing por tabela temporária que o aviso existe para fechar.

-- Varredura em vez de lista: a lista conserta o estoque e reabre na próxima
-- função criada sem a cláusula. `alter routine` cobre função e procedure;
-- `prokind in ('f','p')` mantém agregada e window fora (onde a sintaxe difere).
-- `deptype='e'` é o que exclui o que pertence a extensão.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
     where n.nspname = 'public'
       and d.objid is null
       and p.prokind in ('f', 'p')
       and not exists (
         select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search\_path=%'
       )
  loop
    execute format('alter routine %s set search_path = public, pg_temp', f.assinatura);
  end loop;
end $$;

-- `ai_models_unique` (constraint UNIQUE) e `ai_models_provider_model_unique`
-- (índice solto) têm definição idêntica — provado comparando
-- `pg_get_indexdef`. Sai o índice solto: derrubar o outro exigiria derrubar a
-- constraint, que é quem garante a regra.
drop index if exists public.ai_models_provider_model_unique;
