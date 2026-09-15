---
impacto: nada_mudou
secao: corrigido
titulo: Avisos do Advisor do Supabase: search_path fixo e índice redundante
---

As três funções do projeto que não declaravam `search_path` passam a fixá-lo em `public, pg_temp`, e o índice `ai_models_provider_model_unique` — idêntico à constraint que já garantia a mesma regra — sai. A varredura é auto-curativa e roda a cada aplicação do baseline, porque `create or replace function` apaga a cláusula e um conserto feito à mão no banco seria revertido na atualização seguinte.

Nada a fazer por quem hospeda. Os demais avisos do painel foram medidos e descartados com motivo registrado na migration 0233 — entre eles as 196 funções sem `search_path` que pertencem a `citext`, `pg_trgm` e `vector`, que o Advisor não conta e que não se deve alterar.
